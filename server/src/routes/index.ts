import express from 'express';
import authRoutes from './authRoutes';
import caseRoutes from './caseRoutes';
import adminRoutes from './adminRoutes'; // Add this import
import publicRoutes from './publicRoutes';

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/cases', caseRoutes);
router.use('/admin', adminRoutes); // Add this line


router.use('/admin', adminRoutes);
router.use('/public', publicRoutes); // <-- add this




// API Info route
router.get('/', (req, res) => {
  res.json({
    message: 'ResolveIt API v1.0',
    status: 'active',
    endpoints: {
      health: '/health',
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
        addDocument: 'POST /api/cases/:id/documents',
        statistics: 'GET /api/cases/statistics (admin only)'
      },
      admin: { // Add admin endpoints documentation
        dashboardStats: 'GET /api/admin/dashboard/stats',
        getAllCases: 'GET /api/admin/cases',
        updateCaseStatus: 'PUT /api/admin/cases/:caseId/status',
        getAllUsers: 'GET /api/admin/users'
      }
    },
    documentation: 'See Postman collection for API testing'
  });
});

export default router;