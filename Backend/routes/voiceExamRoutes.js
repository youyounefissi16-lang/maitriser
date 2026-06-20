import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import VoiceExam from '../models/voiceExamModel.js';
import VoiceExamResult from '../models/voiceExamResultModel.js';
import Module from '../models/moduleModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';

const router = express.Router();

const UPLOAD_DIR = path.resolve('uploads/voice-exam-images');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp, svg)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/voice-exams', cacheMiddleware(), async (req, res) => {
  try {
    const filter = {};
    if (req.query.year)     filter.year     = Number(req.query.year);
    if (req.query.moduleId) filter.moduleId = req.query.moduleId;
    const exams = await VoiceExam.find(filter).populate('moduleId').sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/voice-exams/:id', async (req, res) => {
  try {
    const exam = await VoiceExam.findById(req.params.id).populate('moduleId');
    if (!exam) return res.status(404).json({ message: 'Voice exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/voice-exams', requireAdmin, upload.array('images', 10), async (req, res) => {
  try {
    let { title, moduleId, clinicalCasePrompt, questions } = req.body;
    if (!title || !moduleId || !clinicalCasePrompt)
      return res.status(400).json({ message: 'title, moduleId, and clinicalCasePrompt are required' });

    if (typeof questions === 'string') questions = JSON.parse(questions);
    if (!Array.isArray(questions) || questions.length === 0)
      return res.status(400).json({ message: 'At least one question is required' });

    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const images = req.files ? req.files.map((f) => f.filename) : [];

    const exam = await VoiceExam.create({
      title, moduleId, year: module.year, clinicalCasePrompt, questions, images,
    });
    delPattern('GET:/api/voice-exams');
    res.status(201).json({ message: 'Voice exam created successfully', exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/voice-exams/:id', requireAdmin, upload.array('images', 10), async (req, res) => {
  try {
    let { title, moduleId, clinicalCasePrompt, questions, existingImages } = req.body;
    let year;
    if (moduleId) {
      const module = await Module.findById(moduleId);
      if (!module) return res.status(404).json({ message: 'Module not found' });
      year = module.year;
    }

    if (typeof questions === 'string') questions = JSON.parse(questions);

    let images = existingImages
      ? (Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages))
      : [];
    if (req.files && req.files.length > 0) {
      images = [...images, ...req.files.map((f) => f.filename)];
    }

    const updateFields = {};
    if (title)              updateFields.title = title;
    if (moduleId)           updateFields.moduleId = moduleId;
    if (year)               updateFields.year = year;
    if (clinicalCasePrompt) updateFields.clinicalCasePrompt = clinicalCasePrompt;
    if (questions)          updateFields.questions = questions;
    updateFields.images = images;

    const updated = await VoiceExam.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    if (!updated) return res.status(404).json({ message: 'Voice exam not found' });
    delPattern('GET:/api/voice-exams');
    res.json({ message: 'Voice exam updated successfully', exam: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/voice-exams/:id', requireAdmin, async (req, res) => {
  try {
    const exam = await VoiceExam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Voice exam not found' });

    if (exam.images && exam.images.length > 0) {
      exam.images.forEach((img) => {
        const p = path.join(UPLOAD_DIR, img);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }

    await VoiceExam.findByIdAndDelete(req.params.id);
    delPattern('GET:/api/voice-exams');
    res.json({ message: 'Voice exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/voice-exam-images/:filename', (req, res) => {
  const filepath = path.join(UPLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'Image not found' });
  res.sendFile(filepath);
});

router.post('/voice-exams/:id/submit', async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers))
      return res.status(400).json({ message: 'answers array is required' });

    const exam = await VoiceExam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Voice exam not found' });

    const resultAnswers = [];
    let overallPassed = 0;
    let overallTotal = 0;

    for (const ans of answers) {
      const question = exam.questions[ans.questionIndex];
      if (!question) return res.status(400).json({ message: `Question index ${ans.questionIndex} not found` });

      const text = (ans.text || '').toLowerCase();
      const criteriaResults = question.criteria.map((c) => {
        const passed = c.keywords.some((kw) => text.includes(kw.toLowerCase()));
        return { label: c.label, passed };
      });

      const allPassed = criteriaResults.every((cr) => cr.passed);
      if (allPassed) overallPassed++;
      overallTotal++;

      resultAnswers.push({ questionIndex: ans.questionIndex, text: ans.text || '', criteriaResults, allPassed });
    }

    const result = await VoiceExamResult.create({
      userId: req.user.userId || req.user.id || req.user._id,
      examId: exam._id,
      answers: resultAnswers,
      overallPassed,
      overallTotal,
      overallMax: exam.questions.length,
    });

    res.status(201).json({
      resultId: result._id,
      answers: resultAnswers,
      overallPassed,
      overallTotal,
      overallMax: exam.questions.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/voice-exam-results/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.userId !== req.params.userId)
      return res.status(403).json({ message: 'Access denied' });
    const results = await VoiceExamResult.find({ userId: req.params.userId })
      .populate('examId', 'title')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/voice-exam-results/:userId/:resultId', async (req, res) => {
  try {
    const result = await VoiceExamResult.findById(req.params.resultId).populate('examId');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    if (req.user.role !== 'admin' && result.userId !== req.params.userId)
      return res.status(403).json({ message: 'Access denied' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;