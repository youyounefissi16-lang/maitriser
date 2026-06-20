import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// Admin registration — creates user in the unified User collection
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists.' });

      const userId = `A${email.split('@')[0]}`;
      const name = email.split('@')[0];
      const user = new User({ userId, name, email, password, role: 'admin' });
      await user.save();

      return res.status(201).json({ message: 'Admin registered successfully!' });
    } catch (err) {
      logger.error({ err }, 'Admin registration failed');
      if (err.code === 11000) return res.status(409).json({ message: 'Email already exists' });
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// Admin login — queries User collection with role: 'admin'
router.post(
  '/logging',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email, role: 'admin' });
      if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials.' });

      const token = jwt.sign(
        { id: user._id, userId: user.userId, email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({ token, message: 'Login successful!' });
    } catch (err) {
      logger.error({ err }, 'Admin login failed');
      return res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

export default router;
