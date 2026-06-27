import jwt from 'jsonwebtoken';
import { verifyToken as clerkVerify } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { isBlacklisted } from '../middleware/jwtBlacklist.js';

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
      req.user = { id: user._id, userId: user.userId, clerkId: payload.sub, role: user.role, discipline: user.discipline || '', year: user.year || null };
      return next();
    } catch (err) {
      logger.warn({ err }, 'Clerk verification failed, falling back to JWT');
    }
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isBlacklisted(token)) return res.status(401).json({ message: 'Token revoked.' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found.' });
    req.user = { id: user._id, userId: user.userId, role: user.role, email: user.email, name: user.name, discipline: user.discipline || '', year: user.year || null };
    return next();
  } catch (err) {
    logger.debug({ err }, 'JWT token verification failed');
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};
