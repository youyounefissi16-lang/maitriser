import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Health endpoint', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('404 handling', () => {
  it('returns 401 for protected route without token', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(401);
  });
});
