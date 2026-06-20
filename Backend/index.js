import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import app from './app.js';

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

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
})
  .then(() => logger.info('Database connected'))
  .catch((err) => { logger.fatal({ err }, 'Database connection failed'); process.exit(1); });

const PORT = process.env.PORT || 4000;
let server;

const gracefulShutdown = (exitCode = 0) => {
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        logger.info('Server and DB connections closed');
        process.exit(exitCode);
      });
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(exitCode);
    }, 10000);
  } else {
    process.exit(exitCode);
  }
};

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason instanceof Error ? reason : new Error(String(reason)) }, 'Unhandled rejection — shutting down');
  gracefulShutdown(1);
});

process.on('SIGTERM', () => { logger.info('SIGTERM received — shutting down'); gracefulShutdown(0); });
process.on('SIGINT', () => { logger.info('SIGINT received — shutting down'); gracefulShutdown(0); });

server = app.listen(PORT, () => logger.info({ port: PORT }, `Server running at http://localhost:${PORT}`));
