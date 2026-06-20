import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger, httpLogger } from './utils/logger.js';
import mongoose from 'mongoose';
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

dotenv.config();

if (!process.env.JWT_SECRET) {
  logger.fatal('JWT_SECRET is not set'); process.exit(1);
}
if (!process.env.MONGODB_URI) {
  logger.fatal('MONGODB_URI is not set'); process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  logger.warn('CLERK_SECRET_KEY is not set — Clerk auth will fail');
}
if (!process.env.ADMIN_SECRET_CODE) {
  logger.warn('ADMIN_SECRET_CODE is not set — admin claim route will reject all requests');
}

const app  = express();
const PORT = process.env.PORT || 4000;

// CORS
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

app.use(express.json());

// Rate limiting
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

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
})
  .then(() => logger.info('Database connected'))
  .catch((err) => { logger.fatal({ err }, 'Database connection failed'); process.exit(1); });

// Health check — responds immediately even if DB is down
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({ status: 'ok', db: states[dbState] || 'unknown', timestamp: new Date().toISOString() });
});

// ── Public routes (no auth required) ────────────────────────────────
app.use('/api/user', sinupRoute);           // /register, /logging
app.use('/api/auth', authRoutes);           // /verify
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api', userAuthRoutes);            // /users/login, /users/register
app.use('/api/auth', emailAuthRoutes);      // /send-verification, /verify-email, /forgot-password, /reset-password
app.use('/api/auth', clerkRoutes);          // /clerk-sync
app.use('/api', adminRoutes);               // /admin/claim

// Student-accessible (token required, any role)
app.use('/api', verifyToken, quizRoutes);
app.use('/api', verifyToken, quizResultRoutes);
app.use('/api', verifyToken, bookRoutes);
app.use('/api', verifyToken, voiceExamRoutes);
app.use('/api', verifyToken, moduleRoutes);
app.use('/api', verifyToken, bookmarkRoutes);

// ── Admin-only routes (token + admin role required) ─────────────────
app.use('/api', verifyToken, requireAdmin, userRoutes);
app.use('/api', verifyToken, requireAdmin, dashboardRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

app.listen(PORT, () => logger.info({ port: PORT }, `Server running at http://localhost:${PORT}`));
