import express from 'express';
import User from '../models/userModel.js';
import Quiz from '../models/quizModel.js';
import QuizResult from '../models/quizResultModel.js';
import Module from '../models/moduleModel.js';
import VoiceExam from '../models/voiceExamModel.js';
import VoiceExamResult from '../models/voiceExamResultModel.js';
import Case from '../models/caseModel.js';
import Book from '../models/bookModel.js';
import Contact from '../models/contactModel.js';

const router = express.Router();

router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      totalUsers, totalQuizzes, totalModules,
      totalAttempts, totalVoiceExams, totalVoiceResults,
      totalCases, totalBooks, totalContacts,
      publishedQuizzes,
    ] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments(),
      Module.countDocuments(),
      QuizResult.countDocuments(),
      VoiceExam.countDocuments(),
      VoiceExamResult.countDocuments(),
      Case.countDocuments(),
      Book.countDocuments(),
      Contact.countDocuments(),
      Quiz.countDocuments({ published: true }),
    ]);

    const passed         = await QuizResult.countDocuments({ score: 1 });
    const passRate       = totalAttempts > 0 ? ((passed / totalAttempts) * 100).toFixed(1) : 0;
    const draftQuizzes   = totalQuizzes - publishedQuizzes;

    res.json({
      users: totalUsers, quizzes: totalQuizzes, modules: totalModules,
      attempts: totalAttempts, passRate: Number(passRate),
      voiceExams: totalVoiceExams, voiceResults: totalVoiceResults,
      cases: totalCases, books: totalBooks, contacts: totalContacts,
      published: publishedQuizzes, drafts: draftQuizzes,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;