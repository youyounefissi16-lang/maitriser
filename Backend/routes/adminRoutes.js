import express from 'express';
import { verifyToken as clerkVerify, createClerkClient } from '@clerk/backend';
import User from '../models/userModel.js';
import logger from '../utils/logger.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';

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

router.post('/admin/sync-all-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const clerkClient = getClerkClient();
    if (!clerkClient) return res.status(500).json({ message: 'Clerk not configured' });

    let offset = 0;
    const limit = 100;
    let synced = 0;

    while (true) {
      const clerkUsers = await clerkClient.users.getUserList({ limit, offset });
      if (!clerkUsers.data || clerkUsers.data.length === 0) break;

      for (const cu of clerkUsers.data) {
        const existingUser = await User.findOne({ clerkId: cu.id });
        if (existingUser) continue;

        const email = cu.emailAddresses?.[0]?.emailAddress;
        const name = `${cu.firstName || ''} ${cu.lastName || ''}`.trim() || email?.split('@')[0] || 'User';
        const userId = email?.split('@')[0] || `user_${cu.id.slice(-8)}`;

        const linkedUser = await User.findOne({ email });
        if (linkedUser) {
          linkedUser.clerkId = cu.id;
          linkedUser.name = name;
          linkedUser.emailVerified = !!cu.emailAddresses?.[0]?.verification?.status;
          await linkedUser.save();
        } else {
          await new User({
            userId,
            clerkId: cu.id,
            name,
            email: email || `${cu.id}@placeholder.quizapp`,
            emailVerified: !!cu.emailAddresses?.[0]?.verification?.status,
            role: 'user',
          }).save();
        }
        synced++;
      }

      offset += limit;
    }

    res.json({ message: `Synced ${synced} new users from Clerk`, synced });
  } catch (err) {
    logger.error({ err }, 'sync-all-users failed');
    res.status(500).json({ message: 'Failed to sync users from Clerk' });
  }
});

export default router;
