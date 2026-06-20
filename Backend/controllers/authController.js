import jwt from 'jsonwebtoken';
import { verifyToken as clerkVerify } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

export const verifyToken = async (req, res, next) => {
  if (req.user) return next();

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  if (process.env.CLERK_SECRET_KEY) {
    try {
      const payload = await clerkVerify(token, { secretKey: process.env.CLERK_SECRET_KEY });
      const user = await User.findOne({ clerkId: payload.sub });
      if (!user) return res.status(401).json({ message: 'User not found. Sync your account first.' });
      req.user = { id: user._id, userId: user.userId, clerkId: payload.sub, role: user.role };
      return next();
    } catch (err) {
      logger.warn({ err }, 'Clerk verification failed, falling back to JWT');
    }
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};
