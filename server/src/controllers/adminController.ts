// /server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { Case, User } from '../models';

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
export const adminUpdateCaseStatus = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { status, notes, adminAction } = req.body;

    const caseDoc = await Case.findById(caseId)
      .populate('complainant', 'name email phone');

    if (!caseDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Case not found'
      });
    }

    // Admin can update any case status
    caseDoc.status = status;
    if (notes) caseDoc.notes = notes;

    // Log admin action (you can expand this to create an audit trail)
    if (adminAction) {
      // Here you could log to an audit table
      console.log(`Admin action: ${adminAction} on case ${caseDoc.caseNumber} by ${req.user._id}`);
    }

    await caseDoc.save();

    res.status(200).json({
      status: 'success',
      message: 'Case status updated successfully',
      data: {
        case: caseDoc
      }
    });
  } catch (error: any) {
    console.error('Admin update case status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update case status',
      error: error.message
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