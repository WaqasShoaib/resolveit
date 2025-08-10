// server/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './authRoutes';
import caseRoutes from './caseRoutes';
import adminRoutes from './adminRoutes';
import publicRoutes from './publicRoutes';

const router = Router();

// Order: public (no auth), then auth, cases, admin
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/cases', caseRoutes);
router.use('/admin', adminRoutes);

// API info
router.get('/', (_req, res) => {
  res.json({
    message: 'ResolveIt API v1.0',
    status: 'active',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/profile',
        test: 'GET /api/auth/test'
      },
      cases: {
        create: 'POST /api/cases',
        list: 'GET /api/cases',
        getById: 'GET /api/cases/:id',
        updateStatus: 'PUT /api/cases/:id/status',
        addDocument: 'POST /api/cases/:id/documents'
      },
      admin: {
        dashboardStats: 'GET /api/admin/dashboard/stats',
        getAllCases: 'GET /api/admin/cases',
        updateCaseStatus: 'PUT /api/admin/cases/:caseId/status',
        getAllUsers: 'GET /api/admin/users',
        updateUser: 'PUT /api/admin/users/:userId',
        deleteUser: 'DELETE /api/admin/users/:userId'
      },
      public: {
        consentAccept: 'GET /api/public/consent/accept?token=...',
        consentDecline: 'GET /api/public/consent/decline?token=...'
      }
    }
  });
});

export default router;
