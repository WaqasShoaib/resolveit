import express from 'express';
import { register, login, getProfile, updateProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { userRegistrationSchema, userLoginSchema } from '../utils/validation';

const router = express.Router();

// Public routes
router.post('/register', validate(userRegistrationSchema), register);
router.post('/login', validate(userLoginSchema), login);

// Protected routes (require authentication)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

// Test route to check if auth is working
router.get('/test', authenticate, (req, res) => {
  res.json({
    status: 'success',
    message: 'Authentication is working!',
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

export default router;