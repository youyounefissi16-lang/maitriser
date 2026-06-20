import express from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import Quiz from '../models/quizModel.js';
import Module from '../models/moduleModel.js';
import Case from '../models/caseModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ── Student-safe helpers ──────────────────────────────────────────────────────
// Strip correctAnswers before sending to students
const stripAnswers = (quiz) => {
  const obj = quiz.toObject ? quiz.toObject() : { ...quiz };
  if (obj.question) {
    const { correctAnswers, ...safeQuestion } = obj.question;
    obj.question = safeQuestion;
  }
  return obj;
};

// GET /api/quizzes — list (student-safe: no correctAnswers, only published)
router.get('/quizzes', async (req, res) => {
  try {
    const filter = { published: true };
    if (req.query.year)     filter.year     = Number(req.query.year);
    if (req.query.moduleId) filter.moduleId = req.query.moduleId;
    if (req.query.course)   filter.course   = req.query.course;
    const { skip, limit, page } = getPagination(req.query);
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter).populate('moduleId').populate('caseId').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Quiz.countDocuments(filter),
    ]);
    res.json(paginatedResponse(quizzes.map(stripAnswers), total, page, limit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/quizzes/:id — single quiz (student-safe: no correctAnswers, only published)
router.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('moduleId').populate('caseId');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!quiz.published) return res.status(404).json({ message: 'Quiz not found' });
    res.json(stripAnswers(quiz));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/quizzes — full quiz list including correctAnswers (admin only)
router.get('/admin/quizzes', requireAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.year)     filter.year     = Number(req.query.year);
    if (req.query.moduleId) filter.moduleId = req.query.moduleId;
    if (req.query.search)   filter.$or = [
      { quizId: { $regex: req.query.search, $options: 'i' } },
      { 'question.questionText': { $regex: req.query.search, $options: 'i' } },
    ];
    const { skip, limit, page } = getPagination(req.query);
    const [quizzes, total] = await Promise.all([
      Quiz.find(filter).populate('moduleId').populate('caseId').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Quiz.countDocuments(filter),
    ]);
    res.json(paginatedResponse(quizzes, total, page, limit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/create-quiz
router.post('/create-quiz', requireAdmin, [
  body('quizId').trim().notEmpty().isAlphanumeric(),
  body('moduleId').isMongoId(),
  body('questionText').trim().notEmpty(),
  body('options').isArray({ min: 2 }),
  body('correctAnswers').isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], handleValidation, async (req, res) => {
  try {
    const { quizId, moduleId, questionText, options, correctAnswers, course, published, explanation, timer } = req.body;
    if (!quizId || !moduleId || !questionText || !options?.length || !correctAnswers?.length)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await Quiz.findOne({ quizId });
    if (existing) return res.status(400).json({ message: `Quiz ID "${quizId}" already exists` });

    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const quiz = await Quiz.create({
      quizId, moduleId, year: module.year, course, published, explanation, timer,
      question: { questionText, options, correctAnswers },
    });
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/edit-quiz/:id
router.put('/edit-quiz/:id', requireAdmin, [
  param('id').isMongoId(),
  body('quizId').optional().trim().notEmpty(),
  body('moduleId').optional().isMongoId(),
  body('questionText').optional().trim().notEmpty(),
  body('options').optional().isArray({ min: 2 }),
  body('correctAnswers').optional().isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], handleValidation, async (req, res) => {
  try {
    const { quizId, moduleId, questionText, options, correctAnswers, course, published, explanation, timer } = req.body;
    let year;
    if (moduleId) {
      const module = await Module.findById(moduleId);
      if (!module) return res.status(404).json({ message: 'Module not found' });
      year = module.year;
    }
    const updated = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        ...(quizId     && { quizId }),
        ...(moduleId   && { moduleId }),
        ...(year       && { year }),
      ...(course     !== undefined && { course }),
      ...(published  !== undefined && { published }),
      ...(explanation !== undefined && { explanation }),
      ...(timer      !== undefined && { timer }),
        ...(questionText    && { 'question.questionText': questionText }),
        ...(options         && { 'question.options': options }),
        ...(correctAnswers  && { 'question.correctAnswers': correctAnswers }),
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz updated successfully', quiz: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/delete-quiz/:id
router.delete('/delete-quiz/:id', requireAdmin, [
  param('id').isMongoId(),
], handleValidation, async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json({ message: 'Quiz deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cases/:id — single case with its linked quizzes (student-safe)
router.get('/cases/:id', async (req, res) => {
  try {
    const c = await Case.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Case not found' });
    const quizzes = await Quiz.find({ caseId: c._id }).populate('moduleId');
    res.json({ case: c, quizzes: quizzes.map(stripAnswers) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/create-case-quizzes — creates 1 Case + quizzes (inline or placeholder)
router.post('/admin/create-case-quizzes', requireAdmin, async (req, res) => {
  try {
    const { title, description, moduleId, quizzes } = req.body;
    if (!title || !description || !moduleId || !quizzes?.length)
      return res.status(400).json({ message: 'title, description, moduleId, and quizzes are required' });
    if (quizzes.length > 50)
      return res.status(400).json({ message: 'Maximum 50 quizzes per case' });

    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const caseDoc = await Case.create({ title, description, moduleId: module._id, year: module.year });

    const caseNum = String(await Case.countDocuments()).padStart(3, '0');
    const created = [];
    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      if (!q.questionText || !q.options?.length || !q.correctIndices?.length)
        return res.status(400).json({ message: `Quiz ${i + 1}: questionText, options, and correctIndices are required` });

      const correctAnswers = q.correctIndices.map((idx) => q.options[idx]);
      if (correctAnswers.some((a) => a === undefined))
        return res.status(400).json({ message: `Quiz ${i + 1}: correctIndices out of range` });

      const quiz = await Quiz.create({
        quizId: `CASE-${caseNum}-Q${i + 1}`,
        quizName: `${title} — Q${i + 1}`,
        moduleId: module._id,
        year: module.year,
        caseId: caseDoc._id,
        published: false,
        explanation: q.explanation || '',
        question: { questionText: q.questionText, options: q.options, correctAnswers },
      });
      created.push(quiz);
    }

    res.status(201).json({ message: `Case and ${created.length} quizzes created`, case: caseDoc, quizzes: created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bulk-publish
router.post('/bulk/publish', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
    await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: true } });
    res.json({ message: `${ids.length} quiz publiés` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bulk-unpublish
router.post('/bulk/unpublish', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
    await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: false } });
    res.json({ message: `${ids.length} quiz dépubliés` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/bulk-delete
router.post('/bulk/delete', requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
    const result = await Quiz.deleteMany({ _id: { $in: ids } });
    res.json({ message: `${result.deletedCount} quiz supprimés` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/import-quizzes-csv
router.post('/import-quizzes-csv', requireAdmin, upload.single('file'), async (req, res) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
    filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ }

    const records = parse(content, { columns: true, skip_empty_lines: true });

    if (records.length === 0) return res.status(400).json({ message: 'CSV is empty' });

    const results = { created: 0, skipped: [], errors: [] };

    for (const row of records) {
      try {
        const module = await Module.findOne({ name: row.moduleName?.trim(), year: Number(row.year) });
        if (!module) { results.errors.push(`Row "${row.quizId}": module "${row.moduleName}" year ${row.year} not found`); continue; }

        const existing = await Quiz.findOne({ quizId: row.quizId?.trim() });
        if (existing) { results.skipped.push(row.quizId); continue; }

        await Quiz.create({
          quizId:   row.quizId.trim(),
          quizName: row.quizName?.trim() || '',
          moduleId: module._id,
          year:     module.year,
          question: {
            questionText:   row.questionText.trim(),
            options:        row.options.split('|').map((o) => o.trim()),
            correctAnswers: row.correctAnswers.split('|').map((a) => a.trim()),
          },
        });
        results.created++;
      } catch (e) {
        results.errors.push(`Row "${row.quizId}": import error`);
      }
    }

    res.status(201).json({
      message: `Import complete: ${results.created} created, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      ...results,
    });
  } catch (err) {
    if (filePath) try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ }
    res.status(500).json({ message: err.message });
  }
});

export default router;
