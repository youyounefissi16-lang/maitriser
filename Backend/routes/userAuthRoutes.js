import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/userModel.js';
import { verifyToken } from '../controllers/authController.js';
import logger from '../utils/logger.js';

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// POST /api/users/register — self-registration for students
router.post(
  '/users/register',
  [
    body('userId').trim().notEmpty().isAlphanumeric().withMessage('userId must be alphanumeric'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  handleValidation,
  async (req, res) => {
    const { userId, name, email, password } = req.body;
    try {
      const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
      if (existingUser) return res.status(400).json({ message: 'userId or email already exists.' });

      const user = new User({ userId, name, email, password, role: 'user' });
      await user.save();

      const token = jwt.sign(
        { id: user._id, userId: user.userId, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      return res.status(201).json({ message: 'Registration successful!', token, userId: user.userId, role: user.role });
    } catch (err) {
      logger.error({ err }, 'User registration failed');
      if (err.code === 11000) return res.status(409).json({ message: 'userId or email already exists' });
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// POST /api/users/login — student login
router.post(
  '/users/login',
  [
    body('userId').trim().notEmpty().isAlphanumeric().withMessage('Invalid userId'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  async (req, res) => {
    const { userId, password } = req.body;
    try {
      const user = await User.findOne({ userId });
      if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

      const token = jwt.sign(
        { id: user._id, userId: user.userId, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      return res.status(200).json({ message: 'Login successful!', token, userId: user.userId, role: user.role });
    } catch (err) {
      logger.error({ err }, 'User login failed');
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// GET /api/users/profile — get own profile (authenticated)
router.get(
  '/users/profile',
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ user });
    } catch {
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  }
);

// PUT /api/users/profile — update own name/email (authenticated)
router.put(
  '/users/profile',
  verifyToken,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, email } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (!Object.keys(updates).length) return res.status(400).json({ message: 'Nothing to update' });

      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'Profile updated', user });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Email already in use' });
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }
);

// PUT /api/users/change-password — change own password (authenticated)
router.put(
  '/users/change-password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
      user.password = req.body.newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully' });
    } catch {
      res.status(500).json({ message: 'Failed to change password' });
    }
  }
);

export default router;
