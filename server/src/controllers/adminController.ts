// /server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { Case, User } from '../models';
import { Server as SocketIOServer } from 'socket.io';
import { Types } from 'mongoose';
import Panel from '../models/Panel'; // if your barrel already exports Panel, you can: import { Panel } from '../models';



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

// POST /admin/cases/:id/witnesses
export const addWitnessesAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      witnesses: Array<{
        name: string;
        email?: string;
        phone?: string;
        relation?: string;
        side: 'complainant' | 'opposite';
      }>;
    };

    if (!body?.witnesses?.length) {
      return res.status(400).json({ status: 'error', message: 'No witnesses provided' });
    }

    const doc = await Case.findById(id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    // Only allow in accepted → witness_nomination
    if (!['accepted', 'witness_nomination'].includes(doc.status)) {
      return res.status(400).json({ status: 'error', message: `Cannot add witnesses in status "${doc.status}"` });
    }

    const toAdd = body.witnesses.map(w => ({
      _id: new Types.ObjectId(),
      name: w.name,
      email: w.email,
      phone: w.phone,
      relation: w.relation,
      side: w.side,
    }));

    doc.witnesses = [ ...(doc.witnesses || []), ...toAdd ];

    if (doc.status === 'accepted') {
      doc.status = 'witness_nomination';
    }

    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Witnesses added',
      data: { witnesses: doc.witnesses, status: doc.status },
    });
  } catch (err: any) {
    console.error('addWitnessesAdmin error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to add witnesses', error: err.message });
  }
};

// DELETE /admin/cases/:id/witnesses/:wid
export const removeWitnessAdmin = async (req: Request, res: Response) => {
  try {
    const { id, wid } = req.params;
    const doc = await Case.findById(id);
    if (!doc) return res.status(404).json({ status: 'error', message: 'Case not found' });

    const before = doc.witnesses?.length || 0;
    doc.witnesses = (doc.witnesses || []).filter(w => w._id?.toString() !== wid);
    const after = doc.witnesses.length;

    if (before === after) {
      return res.status(404).json({ status: 'error', message: 'Witness not found' });
    }

    await doc.save();
    return res.status(200).json({ status: 'success', message: 'Witness removed', data: { witnesses: doc.witnesses } });
  } catch (err: any) {
    console.error('removeWitnessAdmin error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to remove witness', error: err.message });
  }
};


export const createPanelAdmin = async (req: Request, res: Response) => {
  try {
    // 🔎 Log entry + request context
    console.log('[createPanelAdmin] START', {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      body: req.body,
    });

    // ⚠️ Make sure this matches your route: /admin/cases/:caseId/panel
    const { caseId } = req.params as { caseId: string }; // <-- adjust to { id } if your route is :id
    const body = req.body as {
      members: Array<{ userId: string; role: 'lawyer' | 'scholar' | 'community' }>;
    };

    // Validate members array
    if (!body?.members || body.members.length !== 3) {
      console.warn('[createPanelAdmin] invalid members length', {
        received: body?.members?.length,
      });
      return res
        .status(400)
        .json({ status: 'error', message: 'Provide exactly 3 members (lawyer, scholar, community)' });
    }

    const requiredRoles = ['lawyer', 'scholar', 'community'] as const;
    const roles = body.members.map((m) => m.role);
    console.log('[createPanelAdmin] roles in payload:', roles);

    const hasAll = requiredRoles.every((r) => body.members.some((m) => m.role === r));
    if (!hasAll) {
      console.warn('[createPanelAdmin] missing required roles', { roles });
      return res
        .status(400)
        .json({ status: 'error', message: 'Panel must include roles: lawyer, scholar, community' });
    }

    // (Optional) log duplicates without blocking – client already enforces
    const ids = body.members.map((m) => m.userId);
    if (new Set(ids).size !== ids.length) {
      console.warn('[createPanelAdmin] duplicate userIds detected', { ids });
      // You can return 400 here if you want to enforce uniqueness on server too
    }

    console.log('[createPanelAdmin] fetching case', { caseId });
    const doc = await Case.findById(caseId);
    if (!doc) {
      console.warn('[createPanelAdmin] case not found', { caseId });
      return res.status(404).json({ status: 'error', message: 'Case not found' });
    }

    console.log('[createPanelAdmin] case loaded', {
    caseId: String(doc._id),
    status: doc.status,
    panelId: doc.panelId ? String(doc.panelId) : null,
  });

    if (!['witness_nomination', 'panel_formation'].includes(doc.status)) {
      console.warn('[createPanelAdmin] invalid case status for panel creation', { status: doc.status });
      return res
        .status(400)
        .json({ status: 'error', message: `Cannot create panel in status "${doc.status}"` });
    }

    if (doc.panelId) {
      console.warn('[createPanelAdmin] panel already exists for case', { panelId: doc.panelId.toString() });
      return res.status(409).json({ status: 'error', message: 'Panel already exists for this case' });
    }

    const userIds = body.members.map((m) => m.userId);
    console.log('[createPanelAdmin] validating users', { userIds });

    const users = await User.find({ _id: { $in: userIds }, role: 'panel_member' }).select('_id role');
    console.log('[createPanelAdmin] case loaded', {
    caseId: String(doc._id),
    status: doc.status,
    panelId: doc.panelId ? String(doc.panelId) : null,
  });

    if (users.length !== 3) {
      return res.status(400).json({
        status: 'error',
        message: 'All members must be valid users with role panel_member',
      });
    }

    console.log('[createPanelAdmin] creating panel doc…');
    const newPanel = await Panel.create({
      case: doc._id,
      members: body.members.map((m) => ({ user: new Types.ObjectId(m.userId), role: m.role })),
      status: 'created',
    });
    console.log('[createPanelAdmin] panel created', { panelId: String(newPanel._id) });

    doc.panelId = newPanel._id as unknown as Types.ObjectId;
    doc.status = 'panel_formation';
    await doc.save();
    console.log('[createPanelAdmin] case updated', {
    caseId: String(doc._id),
    newStatus: doc.status,
    panelId: String(doc.panelId),
  });

    return res.status(201).json({
      status: 'success',
      message: 'Panel created',
      data: { panel: newPanel, caseStatus: doc.status },
    });
  } catch (err: any) {
    console.error('[createPanelAdmin] ERROR', {
      message: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ status: 'error', message: 'Failed to create panel', error: err?.message });
  }
};


// PUT /admin/panels/:panelId/activate
export const activatePanelAdmin = async (req: Request, res: Response) => {
  try {
    const { panelId } = req.params;

    const panel = await Panel.findById(panelId);
    if (!panel) return res.status(404).json({ status: 'error', message: 'Panel not found' });

    panel.status = 'active';
    await panel.save();

    return res.status(200).json({ status: 'success', message: 'Panel activated', data: { panel } });
  } catch (err: any) {
    console.error('activatePanelAdmin error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to activate panel', error: err.message });
  }
};
