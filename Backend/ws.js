import { verifyToken } from '@clerk/backend';
import { WebSocketServer } from 'ws';
import logger from './utils/logger.js';

let wss = null;

export function initWS(server) {
  wss = new WebSocketServer({ server, path: '/ws/admin' });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws._alive === false) return ws.terminate();
      ws._alive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://x');
    const token = url.searchParams.get('token');
    if (!token) { ws.close(4001, 'Token required'); return; }
    verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
      .then((payload) => {
        if (payload.role !== 'admin') { ws.close(4001, 'Admin only'); return; }
        ws._alive = true;
        ws.on('pong', () => { ws._alive = true; });
        ws.on('error', (err) => logger.error({ err }, 'WebSocket error'));
      })
      .catch(() => { ws.close(4001, 'Invalid token'); });
  });

  logger.info('WebSocket server initialized at /ws/admin');
}

export function broadcast(event, data) {
  if (!wss) return;
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      try { ws.send(msg); } catch { /* ignore dead socket */ }
    }
  });
}
