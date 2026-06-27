import express from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import Quiz from '../models/quizModel.js';
import Module from '../models/moduleModel.js';
import Case from '../models/caseModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { validate } from '../middleware/validate.js';
import { genQuizId } from '../utils/idGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const csvUpload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    const allowedExt = path.extname(file.originalname).toLowerCase();
    if (allowedExt === '.csv' || file.mimetype === 'text/csv') cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const QUIZ_IMG_DIR = path.join(__dirname, '..', 'uploads', 'quiz-images');
if (!fs.existsSync(QUIZ_IMG_DIR)) fs.mkdirSync(QUIZ_IMG_DIR, { recursive: true });

const quizImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, QUIZ_IMG_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});
const quizImageUpload = multer({
  storage: quizImageStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed (png, jpg, jpeg, gif, webp, svg)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
router.get('/quizzes', catchAsync(async (req, res) => {
  if (!req.query.discipline || !req.query.year) return res.json(paginatedResponse([], 0, 1, 1));
  const filter = { published: true, discipline: req.query.discipline };
  const isResidanat = Number(req.query.year) === 7 && req.query.discipline === 'medicine';
  if (!isResidanat) filter.year = Number(req.query.year);
  if (req.query.moduleId)   filter.moduleId   = Array.isArray(req.query.moduleId) ? String(req.query.moduleId[0]) : String(req.query.moduleId);
  if (req.query.course)     filter.course     = String(req.query.course);
  if (req.query.search)   filter.$or = [
    { quizId: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    { 'question.questionText': { $regex: escapeRegex(req.query.search), $options: 'i' } },
  ];
  const { skip, limit, page } = getPagination(req.query);
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter).populate('moduleId', 'name year').populate('caseId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quiz.countDocuments(filter),
  ]);
  res.json(paginatedResponse(quizzes.map(stripAnswers), total, page, limit));
}));

// GET /api/quizzes/:id — single quiz (student-safe: no correctAnswers, only published)
router.get('/quizzes/:id', [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('moduleId').populate('caseId');
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (!quiz.published) return res.status(404).json({ message: 'Quiz not found' });
  res.json(stripAnswers(quiz));
}));



// GET /api/admin/quizzes — full quiz list including correctAnswers (admin only)
router.get('/admin/quizzes', requireAdmin, catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.discipline) filter.discipline = req.query.discipline;
  if (req.query.year)       filter.year       = Number(req.query.year);
  if (req.query.moduleId)   filter.moduleId   = Array.isArray(req.query.moduleId) ? String(req.query.moduleId[0]) : String(req.query.moduleId);
  if (req.query.search)   filter.$or = [
    { quizId: { $regex: escapeRegex(req.query.search), $options: 'i' } },
    { 'question.questionText': { $regex: escapeRegex(req.query.search), $options: 'i' } },
  ];
  const { skip, limit, page } = getPagination(req.query);
  const [quizzes, total] = await Promise.all([
    Quiz.find(filter).populate('moduleId', 'name year').populate('caseId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Quiz.countDocuments(filter),
  ]);
  res.json(paginatedResponse(quizzes, total, page, limit));
}));

// POST /api/create-quiz
router.post('/create-quiz', requireAdmin, quizImageUpload.single('questionImage'), [
  body('moduleId').isMongoId(),
  body('questionText').trim().notEmpty(),
  body('options').isArray({ min: 2 }),
  body('correctAnswers').isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], validate, catchAsync(async (req, res) => {
  const { moduleId, questionText, options, correctAnswers, course, published, explanation, timer } = req.body;
  if (!moduleId || !questionText || !options?.length || !correctAnswers?.length)
    return res.status(400).json({ message: 'All fields are required' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  const quizId = await genQuizId();
  const questionImage = req.file ? req.file.filename : null;
  const quiz = await Quiz.create({
    quizId, moduleId, year: module.year, discipline: module.discipline, course, published, explanation, timer,
    question: { questionText, questionImage, options, correctAnswers },
  });
  res.status(201).json({ message: 'Quiz created successfully', quiz });
}));

// PUT /api/edit-quiz/:id
router.put('/edit-quiz/:id', requireAdmin, quizImageUpload.single('questionImage'), [
  param('id').isMongoId(),
  body('moduleId').optional().isMongoId(),
  body('questionText').optional().trim().notEmpty(),
  body('options').optional().isArray({ min: 2 }),
  body('correctAnswers').optional().isArray({ min: 1 }),
  body('course').optional().trim(),
  body('published').optional().isBoolean(),
  body('explanation').optional().trim(),
  body('timer').optional().isInt({ min: 0 }),
], validate, catchAsync(async (req, res) => {
  const { moduleId, questionText, options, correctAnswers, course, published, explanation, timer } = req.body;
  let year, discipline;
  if (moduleId) {
    const module = await Module.findById(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    year = module.year;
    discipline = module.discipline;
  }

  const updates = {
    ...(moduleId   && { moduleId }),
    ...(year       && { year }),
    ...(discipline && { discipline }),
    ...(course     !== undefined && { course }),
    ...(published  !== undefined && { published }),
    ...(explanation !== undefined && { explanation }),
    ...(timer      !== undefined && { timer }),
    ...(questionText    && { 'question.questionText': questionText }),
    ...(options         && { 'question.options': options }),
    ...(correctAnswers  && { 'question.correctAnswers': correctAnswers }),
  };

  if (req.file) {
    updates['question.questionImage'] = req.file.filename;
  } else if (req.body.removeImage === 'true') {
    updates['question.questionImage'] = null;
  }

  const updated = await Quiz.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!updated) return res.status(404).json({ message: 'Quiz not found' });
  res.json({ message: 'Quiz updated successfully', quiz: updated });
}));

// DELETE /api/delete-quiz/:id
router.delete('/delete-quiz/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const quiz = await Quiz.findByIdAndDelete(req.params.id);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  if (quiz.question?.questionImage) {
    const imgPath = path.join(QUIZ_IMG_DIR, quiz.question.questionImage);
    if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch {}
  }
  res.json({ message: 'Quiz deleted successfully' });
}));

// GET /api/cases/:id — single case with its linked quizzes (student-safe)
router.get('/cases/:id', [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const c = await Case.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Case not found' });
  const quizzes = await Quiz.find({ caseId: c._id }).populate('moduleId', 'name year');
  res.json({ case: c, quizzes: quizzes.map(stripAnswers) });
}));

// POST /api/admin/create-case-quizzes — creates 1 Case + quizzes (inline or placeholder)
router.post('/admin/create-case-quizzes', requireAdmin, catchAsync(async (req, res) => {
  const { title, description, moduleId, quizzes } = req.body;
  if (!title || !description || !moduleId || !quizzes?.length)
    return res.status(400).json({ message: 'title, description, moduleId, and quizzes are required' });
  if (quizzes.length > 50)
    return res.status(400).json({ message: 'Maximum 50 quizzes per case' });

  const module = await Module.findById(moduleId);
  if (!module) return res.status(404).json({ message: 'Module not found' });

  const caseDoc = await Case.create({ title, description, moduleId: module._id, year: module.year });

  const created = [];
  for (let i = 0; i < quizzes.length; i++) {
    const q = quizzes[i];
    if (!q.questionText || !q.options?.length || !q.correctIndices?.length)
      return res.status(400).json({ message: `Quiz ${i + 1}: questionText, options, and correctIndices are required` });

    const correctAnswers = q.correctIndices.map((idx) => q.options[idx]);
    if (correctAnswers.some((a) => a === undefined))
      return res.status(400).json({ message: `Quiz ${i + 1}: correctIndices out of range` });

    const quizId = await genQuizId();
    const quiz = await Quiz.create({
      quizId,
      quizName: `${title} — Q${i + 1}`,
      moduleId: module._id,
      year: module.year,
      discipline: module.discipline,
      caseId: caseDoc._id,
      published: false,
      explanation: q.explanation || '',
      question: { questionText: q.questionText, options: q.options, correctAnswers },
    });
    created.push(quiz);
  }

  res.status(201).json({ message: `Case and ${created.length} quizzes created`, case: caseDoc, quizzes: created });
}));

// POST /api/admin/bulk-publish
router.post('/bulk/publish', requireAdmin, [
  body('ids').isArray({ min: 1 }),
  body('ids.*').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: true } });
  res.json({ message: `${ids.length} quiz publiés` });
}));

// POST /api/admin/bulk-unpublish
router.post('/bulk/unpublish', requireAdmin, [
  body('ids').isArray({ min: 1 }),
  body('ids.*').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  await Quiz.updateMany({ _id: { $in: ids } }, { $set: { published: false } });
  res.json({ message: `${ids.length} quiz dépubliés` });
}));

// POST /api/admin/bulk-delete
router.post('/bulk/delete', requireAdmin, [
  body('ids').isArray({ min: 1 }),
  body('ids.*').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: 'ids array is required' });
  const result = await Quiz.deleteMany({ _id: { $in: ids } });
  res.json({ message: `${result.deletedCount} quiz supprimés` });
}));

// GET /api/quiz-images/:filename — serve quiz images
router.get('/quiz-images/:filename', catchAsync(async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(QUIZ_IMG_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'Image not found' });
  await res.sendFile(filepath);
}));

// POST /api/import-quizzes-csv
router.post('/import-quizzes-csv', requireAdmin, csvUpload.single('file'), catchAsync(async (req, res) => {
  let filePath;
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
    filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ }

    const records = parse(content, { columns: true, skip_empty_lines: true });

    if (records.length === 0) return res.status(400).json({ message: 'CSV is empty' });

    const results = { created: 0, skipped: [], errors: [] };

    const moduleKeys = [...new Set(records.map((r) => `${r.discipline?.trim()}|${r.moduleName?.trim()}|${Number(r.year)}`))];
    const modules = await Module.find({ $or: moduleKeys.map((k) => {
      const [discipline, name, year] = k.split('|');
      return { discipline, name, year: Number(year) };
    }) });
    const moduleMap = {};
    modules.forEach((m) => { moduleMap[`${m.discipline}|${m.name}|${m.year}`] = m; });

    const quizIds = records.map((r) => r.quizId?.trim()).filter(Boolean);
    const existingQuizzes = await Quiz.find({ quizId: { $in: quizIds } }, { quizId: 1 });
    const existingMap = {};
    existingQuizzes.forEach((q) => { existingMap[q.quizId] = true; });

    for (const row of records) {
      try {
        const discipline = row.discipline?.trim();
        if (!discipline) { results.errors.push(`Row "${row.quizId || '?'}": missing discipline column`); continue; }

        const key = `${discipline}|${row.moduleName?.trim()}|${Number(row.year)}`;
        const module = moduleMap[key];
        if (!module) { results.errors.push(`Row "${row.quizId || '?'}": module "${row.moduleName}" year ${row.year} discipline ${discipline} not found`); continue; }

        const csvQuizId = row.quizId?.trim();
        if (csvQuizId) {
          if (existingMap[csvQuizId]) { results.skipped.push(csvQuizId); continue; }
        }
        const quizId = csvQuizId || await genQuizId();

        await Quiz.create({
          quizId,
          quizName: row.quizName?.trim() || '',
          moduleId: module._id,
          year:     module.year,
          discipline: module.discipline,
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
    logger.error({ err }, 'Quiz CSV import failed');
    if (filePath) try { fs.unlinkSync(filePath); } catch { /* best-effort cleanup */ }
    res.status(500).json({ message: 'Import failed' });
  }
}));

export default router;
