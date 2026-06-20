import ContactMessage from '../models/contactModel.js';
import logger from '../utils/logger.js';
import { catchAsync } from '../utils/asyncHandler.js';

// Add a new contact message
export const addContactMessage = catchAsync(async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    if (name.length < 2 || name.length > 100) {
        return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
    }
    if (message.length < 10 || message.length > 5000) {
        return res.status(400).json({ message: 'Message must be between 10 and 5000 characters' });
    }

    const newContactMessage = new ContactMessage({
        name,
        email,
        message,
    });

    await newContactMessage.save();
    res.status(201).json({ 
        message: 'Message submitted successfully', 
        contactMessage: newContactMessage 
    });
});

// Get all contact messages (for administrative purposes)
export const getAllContactMessages = catchAsync(async (req, res) => {
    const contactMessages = await ContactMessage.find();
    res.status(200).json(contactMessages);
});
