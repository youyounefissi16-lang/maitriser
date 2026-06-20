import express from 'express';
import { body, param, validationResult } from 'express-validator';
import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// Create a user — admin generates a random initial password and returns it once
router.post(
  '/add-user',
  [
    body('userId').trim().notEmpty().isAlphanumeric().withMessage('userId must be alphanumeric'),
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
  ],
  handleValidation,
  async (req, res) => {
    const { userId, name, email, role } = req.body;

    // Generate a random temporary password (the model hashes it on save)
    const tempPassword = Math.random().toString(36).slice(-10);

    const newUser = new User({ userId, name, email, password: tempPassword, role });

    try {
      await newUser.save();
      // Return the temp password ONCE so admin can share it with the user securely
      res.status(201).json({ message: 'User created successfully', tempPassword });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ message: 'userId or email already exists' });
      res.status(500).json({ message: 'Error creating user' });
    }
  }
);

// Get all users (password excluded)
router.get('/users', async (req, res) => {
  try {
    const { skip, limit, page } = getPagination(req.query);
    const [users, total] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    res.status(200).json(paginatedResponse(users, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Delete user by ID
router.delete('/users/delete-user/:id', [param('id').isMongoId()], handleValidation, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Edit user by ID
router.put(
  '/users/edit-user/:id',
  [
    param('id').isMongoId(),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['user', 'admin']),
  ],
  handleValidation,
  async (req, res) => {
    const { name, email, role } = req.body;
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { ...(name && { name }), ...(email && { email }), ...(role && { role }) },
        { new: true }
      ).select('-password');
      if (!updatedUser) return res.status(404).json({ message: 'User not found' });
      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch {
      res.status(500).json({ message: 'Failed to update user' });
    }
  }
);

// Change password (authenticated user)
router.put(
  '/change-password',
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
