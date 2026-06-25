import express from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import User from '../models/userModel.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';

const router = express.Router();

// Create a user — admin generates a random initial password and returns it once
router.post(
  '/add-user',
  verifyToken,
  requireAdmin,
  [
    body('userId').trim().notEmpty().isAlphanumeric().withMessage('userId must be alphanumeric'),
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
  ],
  validate,
  async (req, res) => {
    const { userId, name, email, role } = req.body;

    // Generate a random temporary password (the model hashes it on save)
    const tempPassword = crypto.randomBytes(12).toString('hex');

    const newUser = new User({ userId, name, email, password: tempPassword, role });

    try {
      await newUser.save();
      // Return the temp password ONCE so admin can share it with the user securely
      res.status(201).json({ message: 'User created successfully', tempPassword });
    } catch (error) {
      logger.error({ err: error, userId }, 'Add user failed');
      if (error.code === 11000) return res.status(409).json({ message: 'userId or email already exists' });
      res.status(500).json({ message: 'Error creating user' });
    }
  }
);

// Get all users (password excluded)
router.get('/users', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const [users, total] = await Promise.all([
    User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);
  res.status(200).json(paginatedResponse(users, total, page, limit));
}));

// Delete user by ID
router.delete('/users/delete-user/:id', verifyToken, requireAdmin, [param('id').isMongoId()], validate, catchAsync(async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.params.id);
  if (!deletedUser) return res.status(404).json({ message: 'User not found' });
  res.status(200).json({ message: 'User deleted successfully' });
}));

// Edit user by ID
router.put(
  '/users/edit-user/:id',
  verifyToken,
  requireAdmin,
  [
    param('id').isMongoId(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
  ],
  validate,
  catchAsync(async (req, res) => {
    const { name, email, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
      { new: true }
    ).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  })
);

// Change password (authenticated user)
router.put(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  })
);

export default router;
