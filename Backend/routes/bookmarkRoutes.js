import express from 'express';
import Bookmark from '../models/bookmarkModel.js';
import { catchAsync } from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/bookmarks', catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const bookmarks = await Bookmark.find({ userId }).populate('quizId');
  res.json(bookmarks);
}));

router.post('/bookmarks/toggle', catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  const { quizId } = req.body;
  if (!userId || !quizId) return res.status(400).json({ message: 'userId and quizId required' });

  const existing = await Bookmark.findOne({ userId, quizId });
  if (existing) {
    await Bookmark.deleteOne({ _id: existing._id });
    return res.json({ bookmarked: false });
  }
  await Bookmark.create({ userId, quizId });
  res.json({ bookmarked: true });
}));

router.get('/bookmarks/:quizId', catchAsync(async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const bookmark = await Bookmark.findOne({ userId, quizId: req.params.quizId });
  res.json({ bookmarked: !!bookmark });
}));

export default router;
