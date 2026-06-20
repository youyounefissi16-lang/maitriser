import express from 'express';
import { param, validationResult } from 'express-validator';
import Quiz from '../models/quizModel.js';
import QuizResult from '../models/quizResultModel.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

// POST /api/quizzes/:quizId/submit
// Body: { selectedAnswers: [] }
router.post('/quizzes/:quizId/submit', [param('quizId').isMongoId()], handleValidation, async (req, res) => {
  const { quizId } = req.params;
  const { selectedAnswers } = req.body;
  const userId = req.user?.userId;

  try {
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (!quiz.published) return res.status(404).json({ error: 'Quiz not found' });

    const correct = quiz.question.correctAnswers;

    const isCorrect =
      Array.isArray(selectedAnswers) &&
      selectedAnswers.length === correct.length &&
      selectedAnswers.every((a) => correct.includes(a)) &&
      correct.every((c) => selectedAnswers.includes(c));

    const score = isCorrect ? 1 : 0;

    await QuizResult.create({
      userId,
      quizId,
      score,
      answers: { [quizId]: selectedAnswers },
    });

    res.status(200).json({
      correct: isCorrect,
      score,
      correctAnswers: correct,
      selectedAnswers,
      explanation: quiz.explanation || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:userId — fetch attempt history
router.get('/results/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.userId !== req.params.userId)
      return res.status(403).json({ message: 'Access denied' });
    const { skip, limit, page } = getPagination(req.query);
    const [results, total] = await Promise.all([
      QuizResult.find({ userId: req.params.userId })
        .populate({ path: 'quizId', select: 'question.questionText quizId explanation year course moduleId', populate: { path: 'moduleId', select: 'name year' } })
        .sort({ timestamp: -1 }).skip(skip).limit(limit),
      QuizResult.countDocuments({ userId: req.params.userId }),
    ]);
    res.json(paginatedResponse(results, total, page, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
