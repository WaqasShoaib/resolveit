import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { hashPassword, generateVerificationToken } from '../utils/auth';

// Helper to get JWT secret
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
  }
  return secret;
};

// User registration
export const register = async (req: Request, res: Response) => {
  try {
    const { name, age, gender, address, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or phone already exists'
      });
    }

    // Hash password using the utility function
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const emailVerificationToken = generateVerificationToken();

    // Create new user
    const user = new User({
      name,
      age,
      gender,
      address,
      email,
      phone,
      password: hashedPassword,
      emailVerificationToken
    });

    await user.save();

    // Generate JWT token - Using type assertion to bypass TypeScript issues
    const secret = getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const payload = { userId: user._id, role: user.role };
    const token = (jwt.sign as any)(payload, secret, { expiresIn });

    // Return user data without password
    const userResponse = {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    };

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message
    });
  }
};

// User login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email and ensure password is selected
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check password directly with bcrypt for consistency
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token - Using type assertion to bypass TypeScript issues
    const secret = getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const payload = { userId: user._id, role: user.role };
    const token = (jwt.sign as any)(payload, secret, { expiresIn });

    // Remove password from response - safe way
    const { password: _, ...userResponse } = user.toObject();

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser; // Added type assertion for clarity

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: (user as any)._id.toString(),
          name: user.name,
          age: user.age,
          gender: user.gender,
          address: user.address,
          email: user.email,
          phone: user.phone,
          photo: user.photo,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id.toString();
    const updates: Partial<IUser> = req.body;

    // Remove sensitive fields that shouldn't be updated this way
    const sensitiveFields = ['password', 'email', 'phone', 'role', 'isEmailVerified', 'isPhoneVerified'];
    sensitiveFields.forEach((field) => {
      if (field in updates) {
        delete (updates as any)[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates }, // Use $set for safer updates
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Enhanced login function with role information
export const enhancedLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user and include role
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token - Using type assertion to bypass TypeScript issues
    const secret = getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const payload = { userId: user._id, role: user.role };
    const token = (jwt.sign as any)(payload, secret, { expiresIn });

    // Remove password from response - safe way
    const { password: _, ...userResponse } = user.toObject();

    // Determine redirect based on role
    let redirectUrl = '/dashboard';
    if (user.role === 'admin') {
      redirectUrl = '/admin';
    } else if (user.role === 'panel_member') {
      redirectUrl = '/panel';
    }

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        redirectUrl
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};