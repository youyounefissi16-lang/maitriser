import express from 'express';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// GET /api/auth/verify — clients poll this to check if their token is still valid
router.get('/verify', verifyToken, (req, res) => {
  res.json({ message: 'Token valid', user: req.user });
});

export default router;
