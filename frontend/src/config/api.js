import { getToken, refreshToken } from '../utils/tokenStore';
import { logger } from '../utils/logger';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const authHeaders = () => {
  const token = getToken();
  if (!token) logger.warn('No token in store');
  else logger.info('Token present, length=' + token.length);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchWithAuth = async (url, options = {}) => {
  const doFetch = async (token) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    return fetch(url, { ...options, headers, body });
  };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let token = await refreshToken();
    if (!token) {
      logger.error('No token available at all');
      throw new Error('No auth token');
    }
    const res = await doFetch(token);
    if (res.status !== 401) return res;
    const body = await res.clone().text();
    logger.warn(`Attempt ${attempt}/${maxAttempts} got 401:`, body);
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  logger.error('All attempts exhausted');
  throw new Error('Token rejected after 3 retries');
};
