import express from 'express';
import { submitFeedback, getAllFeedback, updateFeedbackStatus } from '../controllers/feedbackController.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

const router = express.Router();

router.post('/', verifyToken, submitFeedback);

router.get('/all', verifyToken, requireAdmin, (req, res, next) => {
  const { skip, limit, page } = getPagination(req.query);
  req.pagination = { skip, limit, page };
  next();
}, getAllFeedback);

router.patch('/:id/status', verifyToken, requireAdmin, updateFeedbackStatus);

export default router;
