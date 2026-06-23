import express from 'express';
import { param } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Book from '../models/bookModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'books');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    // Sanitize extension — only allow a strict whitelist, strip path separators
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext === '.pdf' ? '.pdf' : '';
    cb(null, `${unique}${safeExt}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Upload book — moduleIds sent as JSON array string or comma-separated
router.post('/books/upload', requireAdmin, upload.single('file'), catchAsync(async (req, res) => {
  try {
    const { title, moduleIds } = req.body;
    if (!title || !moduleIds) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'title and moduleIds are required' });
    }
    let ids;
    try { ids = Array.isArray(moduleIds) ? moduleIds : JSON.parse(moduleIds); }
    catch { if (req.file) fs.unlinkSync(req.file.path); return res.status(400).json({ message: 'moduleIds must be a valid JSON array' }); }
    if (!Array.isArray(ids) || !ids.length) { fs.unlinkSync(req.file.path); return res.status(400).json({ message: 'moduleIds must be a non-empty array' }); }
    const book = await Book.create({
      title, moduleIds: ids,
      filename: req.file.filename,
      originalName: req.file.originalname,
    });
    delPattern('GET:/api/books');
    res.status(201).json(book);
  } catch (err) {
    logger.error({ err, title: req.body?.title }, 'Book upload failed');
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Upload failed' });
  }
}));

// List books — filter by moduleId, year, or keyword search (cached 5 min)
router.get('/books', cacheMiddleware(), catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.moduleId) filter.moduleIds = String(req.query.moduleId);
  if (req.query.search)   filter.title = { $regex: escapeRegex(String(req.query.search)), $options: 'i' };
  const { skip, limit, page } = getPagination(req.query);
  const [books, total] = await Promise.all([
    Book.find(filter).populate('moduleIds', 'name year').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Book.countDocuments(filter),
  ]);
  res.json(paginatedResponse(books, total, page, limit));
}));

const serveSafe = (filename) => {
  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) throw new Error('Invalid file path');
  return resolved;
};

// Download book PDF
router.get('/books/download/:id', [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const filePath = serveSafe(book.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });
  res.setHeader('Content-Type', 'application/pdf');
  const safeName = (book.originalName || 'download.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  const stream = fs.createReadStream(filePath);
  let sent = false;
  const guard = () => { if (!sent) { sent = true; return true; } return false; };
  stream.on('error', () => { if (guard()) { try { res.end(); } catch {} } });
  req.on('close', () => stream.destroy());
  stream.pipe(res);
}));

// Serve PDF file
router.get('/books/file/:id', [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const filePath = serveSafe(book.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on disk' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${book.originalName}"`);
  const stream = fs.createReadStream(filePath);
  let sent = false;
  const guard = () => { if (!sent) { sent = true; return true; } return false; };
  stream.on('error', () => { if (guard()) { try { res.end(); } catch {} } });
  req.on('close', () => stream.destroy());
  stream.pipe(res);
}));

// Delete book
router.delete('/books/:id', requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return res.status(404).json({ message: 'Book not found' });
  const filePath = path.join(UPLOAD_DIR, book.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  delPattern('GET:/api/books');
  res.json({ message: 'Book deleted successfully' });
}));

export default router;
