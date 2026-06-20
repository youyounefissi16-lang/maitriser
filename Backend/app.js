import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { httpLogger } from './utils/logger.js';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/userRoutes.js';
import moduleRoutes from './routes/moduleRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import sinupRoute from './routes/sinupRoute.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import quizResultRoutes from './routes/quizResultRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import authRoutes from './routes/authRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import voiceExamRoutes from './routes/voiceExamRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';
import emailAuthRoutes from './routes/emailAuthRoutes.js';
import clerkRoutes from './routes/clerkRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { verifyToken, requireAdmin } from './controllers/authController.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',').map((o) => o.trim());

app.use(helmet());
app.use(compression());
app.use(httpLogger);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  message: { message: 'Too many requests, slow down.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
const submitLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { message: 'Too many submissions, slow down.' },
});
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { message: 'Too many messages, please try again later.' },
});

app.use(['/api/users/login', '/api/users/register', '/api/user/logging', '/api/user/register'], authLimiter);
app.use(['/api/quizzes', '/api/voice-exams'], (req, res, next) => {
  if (req.method === 'POST' && /\/(submit|grade)$/.test(req.path)) return submitLimiter(req, res, next);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/user', sinupRoute);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api', userAuthRoutes);
app.use('/api/auth', emailAuthRoutes);
app.use('/api/auth', clerkRoutes);
app.use('/api', adminRoutes);

app.use('/api', verifyToken, quizRoutes);
app.use('/api', verifyToken, quizResultRoutes);
app.use('/api', verifyToken, bookRoutes);
app.use('/api', verifyToken, voiceExamRoutes);
app.use('/api', verifyToken, moduleRoutes);
app.use('/api', verifyToken, bookmarkRoutes);

app.use('/api', verifyToken, requireAdmin, userRoutes);
app.use('/api', verifyToken, requireAdmin, dashboardRoutes);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

export default app;
