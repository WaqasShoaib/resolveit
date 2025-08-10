// /server/src/routes/adminRoutes.ts
import express from 'express';
import {
  getAdminDashboardStats,
  getAllCasesAdmin,
  adminUpdateCaseStatus,
  getAllUsersAdmin,
  updateUserAdmin,     
  deleteUserAdmin,
  createPanelAdmin,
  activatePanelAdmin,
  removeWitnessAdmin,
  addWitnessesAdmin
} from '../controllers/adminController';  // Import from adminController.ts
import { authenticate, authorize } from '../middleware/auth';
import { notifyOppositeParty } from '../controllers/caseController';

import {
  addWitnesses,
  removeWitness,
  createPanel,
  activatePanel,
} from '../controllers/caseController';


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

router.post('/cases/:caseId/notify-opposite-party', notifyOppositeParty);


// Witnesses
router.post('/cases/:id/witnesses', addWitnessesAdmin);
router.delete('/cases/:id/witnesses/:wid',removeWitnessAdmin);

// Panel
router.put('/panels/:panelId/activate', activatePanelAdmin);
router.post('/cases/:caseId/panel', createPanelAdmin);



export default router;
