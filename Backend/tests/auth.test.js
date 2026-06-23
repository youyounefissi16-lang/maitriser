import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

const post = (url, body) =>
  request(app).post(url).set('Origin', 'http://localhost:5173').send(body);

describe('Auth validation', () => {
  it('rejects missing fields on register', async () => {
    const res = await post('/api/users/register', {});
    expect(res.status).toBe(400);
  });

  it('rejects weak password', async () => {
    const res = await post('/api/users/register', {
      userId: 'test', name: 'Test', email: 'test@test.com', password: 'short',
    });
    expect(res.status).toBe(400);
  });
});
