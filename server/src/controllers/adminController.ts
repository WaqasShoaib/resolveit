// /server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { Case, User } from '../models';
import { Server as SocketIOServer } from 'socket.io';

type CaseStatus =
  | 'registered'
  | 'under_review'
  | 'awaiting_response'
  | 'accepted'
  | 'witness_nomination'
  | 'panel_formation'
  | 'mediation_in_progress'
  | 'resolved'
  | 'unresolved'
  | 'cancelled';

const CASE_STATUSES = [
  'registered',
  'under_review',
  'awaiting_response',
  'accepted',
  'witness_nomination',
  'panel_formation',
  'mediation_in_progress',
  'resolved',
  'unresolved',
  'cancelled',
] as const;


// Get admin dashboard statistics
export const getAdminDashboardStats = async (req: Request, res: Response) => {
  try {
    // Total cases by status
    const casesByStatus = await Case.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Cases by type
    const casesByType = await Case.aggregate([
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCases = await Case.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Priority breakdown
    const casesByPriority = await Case.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Quick counts
    const totalCases = await Case.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeCases = await Case.countDocuments({ 
      status: { 
        $in: ['registered', 'under_review', 'awaiting_response', 'accepted', 'mediation_in_progress'] 
      }
    });
    const resolvedCases = await Case.countDocuments({ status: 'resolved' });

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalCases,
          totalUsers,
          activeCases,
          resolvedCases,
          recentCases
        },
        breakdowns: {
          byStatus: casesByStatus,
          byType: casesByType,
          byPriority: casesByPriority
        }
      }
    });
  } catch (error: any) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get all cases for admin management
export const getAllCasesAdmin = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      caseType, 
      priority,
      page = 1, 
      limit = 10,
      search 
    } = req.query;

    // Build filter object
    const filter: any = {};
    
    if (status) filter.status = status;
    if (caseType) filter.caseType = caseType;
    if (priority) filter.priority = priority;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { caseNumber: { $regex: search, $options: 'i' } },
        { 'oppositeParty.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get cases with pagination and population
    const cases = await Case.find(filter)
      .populate('complainant', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCases = await Case.countDocuments(filter);
    const totalPages = Math.ceil(totalCases / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        cases,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCases,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Get all cases admin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cases',
      error: error.message
    });
  }
};

// Admin update case status (with more permissions than regular users)
// Admin update case status (with more permissions than regular users)
export const adminUpdateCaseStatus = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;

    // Make the incoming status a proper union type
    const { status, notes, adminAction } = req.body as {
      status: CaseStatus;
      notes?: string;
      adminAction?: string;
    };

    // Early guard: invalid status value
    if (!CASE_STATUSES.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status value "${status}".`,
      });
    }

    const caseDoc = await Case.findById(caseId).populate('complainant', 'name email phone');

    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found',
      });
    }

    // Enforce lifecycle (same as FE)
    const validTransitions: Record<CaseStatus, CaseStatus[]> = {
    registered: ['under_review', 'awaiting_response'],
    under_review: ['awaiting_response', 'accepted'],
    awaiting_response: ['accepted', 'witness_nomination'],
    accepted: ['panel_formation'],
    witness_nomination: ['panel_formation'],               // ✅ add this
    panel_formation: ['mediation_in_progress'],
    mediation_in_progress: ['resolved', 'unresolved'],
    resolved: [],
    unresolved: [],
    cancelled: [],
  };

    const current = caseDoc.status as CaseStatus;

    if (!validTransitions[current]?.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition from "${current}" to "${status}".`,
      });
    }

    // Update
    caseDoc.status = status;
    if (notes) caseDoc.notes = notes;

    // Optional: audit
    if (adminAction) {
      console.log(
        `Admin action: ${adminAction} on case ${caseDoc.caseNumber} by ${req.user?._id}`
      );
    }

    await caseDoc.save();

    // Realtime notify (use .id which is a string; avoids _id: unknown)
    try {
      const io = req.app.get('io') as SocketIOServer | undefined;
      io?.emit('caseStatusUpdated', {
        _id: caseDoc.id,
        status: caseDoc.status as CaseStatus,
      });
    } catch (emitErr) {
      console.warn('Socket emit failed (non-fatal):', emitErr);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Case status updated successfully',
      data: { case: caseDoc },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Admin update case status error:', msg);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update case status',
      error: msg,
    });
  }
};

// Get all users for admin management
export const getAllUsersAdmin = async (req: Request, res: Response) => {
  try {
    const { 
      role = 'user', 
      page = 1, 
      limit = 10,
      search 
    } = req.query;

    // Build filter object
    const filter: any = { role };
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get users with pagination (exclude password)
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / Number(limit));

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalUsers,
          hasNextPage: Number(page) < totalPages,
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Get all users admin error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};


// PUT /admin/users/:userId
export const updateUserAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      name,
      email,
      role,
      isEmailVerified,
      isPhoneVerified,
    } = req.body as {
      name?: string;
      email?: string;
      role?: 'user' | 'admin' | 'panel_member';
      isEmailVerified?: boolean;
      isPhoneVerified?: boolean;
    };

    const allowedRoles = ['user', 'admin', 'panel_member'] as const;
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid role. Allowed: user, admin, panel_member',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (typeof name === 'string') user.name = name.trim();

    if (typeof email === 'string' && email.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
      if (exists) {
        return res.status(409).json({ status: 'error', message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
      // Optional: re-verify if email changed
      user.isEmailVerified = false;
    }

    if (role) user.role = role;
    if (typeof isEmailVerified === 'boolean') user.isEmailVerified = isEmailVerified;
    if (typeof isPhoneVerified === 'boolean') user.isPhoneVerified = isPhoneVerified;

    await user.save();

    const safeUser = await User.findById(userId).select(
      '-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -phoneVerificationToken'
    );

    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: safeUser },
    });
  } catch (err: any) {
    console.error('Admin update user error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to update user', error: err.message });
  }
};

// DELETE /admin/users/:userId
export const deleteUserAdmin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent self-delete (optional but nice to have)
    if (req.user && req.user._id?.toString() === userId) {
      return res.status(400).json({
        status: 'error',
        message: "You can't delete your own account.",
      });
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (err: any) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to delete user', error: err.message });
  }
};
