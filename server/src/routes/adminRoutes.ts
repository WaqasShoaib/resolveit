// /server/src/routes/adminRoutes.ts
import express from 'express';
import {
  getAdminDashboardStats,
  getAllCasesAdmin,
  adminUpdateCaseStatus,
  getAllUsersAdmin,
  updateUserAdmin,     
  deleteUserAdmin,
} from '../controllers/adminController';  // Import from adminController.ts
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard statistics
router.get('/dashboard/stats', getAdminDashboardStats);

// Case management
router.get('/cases', getAllCasesAdmin);  // Get all cases for admin
router.put('/cases/:caseId/status', adminUpdateCaseStatus);  // Update case status

// User management
router.get('/users', getAllUsersAdmin);

router.put('/users/:userId', updateUserAdmin);   // <- add
router.delete('/users/:userId', deleteUserAdmin);
export default router;
