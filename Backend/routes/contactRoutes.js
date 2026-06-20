import express from 'express';
import { addContactMessage, getAllContactMessages } from '../controllers/contactController.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';

const router = express.Router();

// Route to submit a contact message
router.post('/submit', addContactMessage);

// Route to get all contact messages (admin only)
router.get('/all', verifyToken, requireAdmin, getAllContactMessages);

export default router;
