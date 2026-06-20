import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import Module from '../models/moduleModel.js';
import { requireAdmin } from '../controllers/authController.js';
import { cacheMiddleware, delPattern } from '../utils/cache.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// GET all modules (optionally filter by year) — cached 5 min
router.get('/modules', cacheMiddleware(), async (req, res) => {
  try {
    const filter = req.query.year ? { year: Number(req.query.year) } : {};
    const modules = await Module.find(filter).sort({ year: 1, name: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create module
router.post('/modules', requireAdmin, async (req, res) => {
  try {
    const { name, year, courses } = req.body;
    if (!name || !year) return res.status(400).json({ message: 'name and year are required' });
    const module = await Module.create({ name, year, courses: courses || [] });
    delPattern('GET:/api/modules');
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update module
router.put('/modules/:id', requireAdmin, async (req, res) => {
  try {
    const { name, year, courses } = req.body;
    const updated = await Module.findByIdAndUpdate(req.params.id, { name, year, courses: courses || [] }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Module not found' });
    delPattern('GET:/api/modules');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE module
router.delete('/modules/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Module.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Module not found' });
    delPattern('GET:/api/modules');
    res.json({ message: 'Module deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/import-modules-csv
router.post('/import-modules-csv', requireAdmin, upload.single('file'), async (req, res) => {
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
        const name = row.name?.trim();
        const year = Number(row.year);
        if (!name || !year) { results.errors.push(`Row missing name or year`); continue; }

        const existing = await Module.findOne({ name, year });
        if (existing) { results.skipped.push(name); continue; }

        const courses = row.courses ? row.courses.split('|').map((c) => c.trim()).filter(Boolean) : [];

        await Module.create({ name, year, courses });
        results.created++;
      } catch (e) {
        results.errors.push(`Row "${row.name}": import error`);
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
