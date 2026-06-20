import express from 'express';
import Bookmark from '../models/bookmarkModel.js';

const router = express.Router();

router.get('/bookmarks', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const bookmarks = await Bookmark.find({ userId }).populate('quizId');
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bookmarks/toggle', async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/bookmarks/:quizId', async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const bookmark = await Bookmark.findOne({ userId, quizId: req.params.quizId });
    res.json({ bookmarked: !!bookmark });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
