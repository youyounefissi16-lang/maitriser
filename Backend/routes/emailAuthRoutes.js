import express from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/userModel.js';
import { sendEmail, verificationEmailHtml, resetPasswordHtml } from '../utils/email.js';
import logger from '../utils/logger.js';

const router = express.Router();
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// POST /api/auth/send-verification — send verification email to existing unverified user
router.post(
  '/send-verification',
  [body('email').isEmail().normalizeEmail()],
  handleValidation,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (user.emailVerified) return res.json({ message: 'Email already verified' });

      const token = crypto.randomBytes(32).toString('hex');
      user.verificationToken = token;
      user.verificationExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const sent = await sendEmail({ to: email, subject: 'Verify your email', html: verificationEmailHtml(token, baseUrl) });
      if (!sent) return res.status(500).json({ message: 'Failed to send verification email. Check SMTP configuration.' });

      res.json({ message: 'Verification email sent' });
    } catch (err) {
      logger.error({ err }, 'send-verification failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/verify-email — verify email with token
router.post(
  '/verify-email',
  [body('token').notEmpty()],
  handleValidation,
  async (req, res) => {
    try {
      const { token } = req.body;
      const user = await User.findOne({
        verificationToken: token,
        verificationExpiry: { $gt: new Date() },
      });
      if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

      user.emailVerified = true;
      user.verificationToken = null;
      user.verificationExpiry = null;
      await user.save();

      res.json({ message: 'Email verified successfully' });
    } catch (err) {
      logger.error({ err }, 'verify-email failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/forgot-password — send reset email
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  handleValidation,
  async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' });

      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const sent = await sendEmail({ to: email, subject: 'Reset your password', html: resetPasswordHtml(token, baseUrl) });
      if (!sent) {
        return res.status(500).json({ message: 'Failed to send reset email. Check SMTP configuration.' });
      }

      res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
      logger.error({ err }, 'forgot-password failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/auth/reset-password — reset password with token
router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { token, password } = req.body;
      const user = await User.findOne({
        resetToken: token,
        resetExpiry: { $gt: new Date() },
      });
      if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

      user.password = password;
      user.resetToken = null;
      user.resetExpiry = null;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (err) {
      logger.error({ err }, 'reset-password failed');
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
