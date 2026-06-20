import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Use a test database
const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizapp_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
