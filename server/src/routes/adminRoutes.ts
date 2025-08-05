// /server/src/routes/adminRoutes.ts
import express from 'express';
import {
  getAdminDashboardStats,
  getAllCasesAdmin,
  adminUpdateCaseStatus,
  getAllUsersAdmin
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard statistics
router.get('/dashboard/stats', getAdminDashboardStats);

// Case management
router.get('/cases', getAllCasesAdmin);
router.put('/cases/:caseId/status', adminUpdateCaseStatus);

// User management
router.get('/users', getAllUsersAdmin);

export default router;