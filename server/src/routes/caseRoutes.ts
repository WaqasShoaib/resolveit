import express from 'express';
import { 
   createCase,
   getUserCases,
   getCaseById,
   updateCase,           
   updateCaseStatus,
   addDocumentToCase,
   getCaseStatistics
} from '../controllers/caseController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { uploadCaseEvidence, uploadSingle } from '../middleware/upload';
import { caseRegistrationSchema, caseUpdateSchema } from '../utils/validation';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Case CRUD operations
router.post(
  '/',
  uploadCaseEvidence,
  validate(caseRegistrationSchema),
  createCase
);

router.get('/', getUserCases);
router.get('/statistics', authorize('admin'), getCaseStatistics);
router.get('/:caseId', getCaseById);

// Update case details
router.put(
  '/:caseId',
  validate(caseUpdateSchema),
  updateCase
);

router.put('/:caseId/status', updateCaseStatus);

// UPDATED: Changed from uploadSingle to uploadCaseEvidence for multiple files
router.post('/:caseId/documents', uploadCaseEvidence, addDocumentToCase);

export default router;