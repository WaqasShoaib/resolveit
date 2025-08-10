import express from 'express';
import { getConsentByToken, postConsentResponse } from '../controllers/caseController';

const router = express.Router();

router.get('/consent/:token', getConsentByToken);
router.post('/consent/:token', postConsentResponse);

export default router;
