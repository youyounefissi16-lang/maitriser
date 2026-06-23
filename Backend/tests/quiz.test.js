import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Quiz access', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(401);
  });
});
