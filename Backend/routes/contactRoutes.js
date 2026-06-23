import express from 'express';
import { addContactMessage, getAllContactMessages } from '../controllers/contactController.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

// Route to submit a contact message
router.post('/submit', addContactMessage);

// Route to get all contact messages (admin only, paginated)
router.get('/all', verifyToken, requireAdmin, (req, res, next) => {
  const { skip, limit, page } = getPagination(req.query);
  req.pagination = { skip, limit, page };
  next();
}, getAllContactMessages);

export default router;
