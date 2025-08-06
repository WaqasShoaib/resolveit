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
import { validate, validateFormData } from '../middleware/validation';
import { uploadCaseEvidence } from '../middleware/upload';
import { caseRegistrationSchema, caseUpdateSchema } from '../utils/validation';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Case CRUD operations
router.post(
  '/',
  uploadCaseEvidence,
  validateFormData(caseRegistrationSchema),
  createCase
);

router.get('/', getUserCases);
router.get('/statistics', authorize('admin'), getCaseStatistics);
router.get('/:caseId', getCaseById);

// Update case details - Keep regular validation for JSON data
router.put(
  '/:caseId',
  validate(caseUpdateSchema),
  updateCase
);

router.put('/:caseId/status', updateCaseStatus);

// Document upload - No schema validation needed, just file validation
router.post('/:caseId/documents', uploadCaseEvidence, addDocumentToCase);

export default router;