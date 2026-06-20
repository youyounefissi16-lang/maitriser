import express from 'express';
import { verifyToken as clerkVerify, createClerkClient } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

const getClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) return null;
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
};

router.post('/admin/claim', async (req, res) => {
  try {
    const clerkClient = getClerkClient();
    if (!clerkClient) return res.status(500).json({ message: 'Clerk not configured' });

    const { code } = req.body;
    if (code !== process.env.ADMIN_SECRET_CODE) {
      return res.status(403).json({ message: 'Invalid admin code' });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = await clerkVerify(authHeader.split(' ')[1], { secretKey: process.env.CLERK_SECRET_KEY });
    const user = await User.findOne({ clerkId: payload.sub });
    if (!user) return res.status(404).json({ message: 'User not found. Sync first.' });

    user.role = 'admin';
    await user.save();

    res.json({ message: 'Admin access granted', role: 'admin' });
  } catch (err) {
    logger.error({ err }, 'admin claim failed');
    res.status(500).json({ message: 'Failed to claim admin' });
  }
});

export default router;
