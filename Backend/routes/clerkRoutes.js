import express from 'express';
import { verifyToken, createClerkClient } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';

const router = express.Router();

const getClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) return null;
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
};

router.post('/clerk-sync', async (req, res) => {
  try {
    const clerkClient = getClerkClient();
    if (!clerkClient) return res.status(500).json({ message: 'Clerk not configured' });

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = await verifyToken(authHeader.split(' ')[1], { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkUser = await clerkClient.users.getUser(payload.sub);
    if (!clerkUser) return res.status(404).json({ message: 'Clerk user not found' });

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email?.split('@')[0] || 'User';
    const userId = email?.split('@')[0] || `user_${payload.sub.slice(-8)}`;

    let user = await User.findOne({ clerkId: payload.sub });
    if (user) {
      user.name = name;
      user.email = email || user.email;
      user.emailVerified = !!clerkUser.emailAddresses?.[0]?.verification?.status;
      await user.save();
    } else {
      user = await User.findOne({ email });
      if (user) {
        user.clerkId = payload.sub;
        user.name = name;
        user.emailVerified = !!clerkUser.emailAddresses?.[0]?.verification?.status;
        await user.save();
      } else {
        user = new User({
          userId,
          clerkId: payload.sub,
          name,
          email: email || `${payload.sub}@placeholder.quizapp`,
          emailVerified: !!clerkUser.emailAddresses?.[0]?.verification?.status,
          role: 'user',
        });
        await user.save();
      }
    }

    res.json({ message: 'Account synced', userId: user.userId, role: user.role });
  } catch (err) {
    logger.error({ err }, 'clerk-sync failed');
    res.status(500).json({ message: 'Failed to sync account' });
  }
});

export default router;
