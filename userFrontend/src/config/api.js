import { getToken, refreshToken } from '../utils/tokenStore';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const authHeaders = () => {
  const token = getToken();
  if (!token) console.warn('[authHeaders] No token in store');
  else console.log('[authHeaders] Token present, length=' + token.length);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchWithAuth = async (url, options = {}) => {
  const doFetch = async (token) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options = { ...options, body: JSON.stringify(options.body) };
    }
    return fetch(url, { ...options, headers });
  };

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let token = await refreshToken();
    if (!token) {
      console.error('[fetchWithAuth] No token available at all');
      throw new Error('No auth token');
    }
    const res = await doFetch(token);
    if (res.status !== 401) return res;
    const body = await res.clone().text();
    console.warn(`[fetchWithAuth] Attempt ${attempt}/${maxAttempts} got 401:`, body);
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  console.error('[fetchWithAuth] All attempts exhausted');
  throw new Error('Token rejected after 3 retries');
};
