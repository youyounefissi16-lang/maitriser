import { API_BASE_URL } from './api';
import { refreshToken } from '../utils/tokenStore';

export async function authFetch(path, options = {}) {
  let token = await refreshToken();

  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  if (options.body && !(options.body instanceof FormData)) {
    if (typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options = { ...options, body: JSON.stringify(options.body) };
    }
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    token = await refreshToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      const res2 = await fetch(url, { ...options, headers });
      if (res2.ok) return res2;
    }
    throw new Error('Unauthorized');
  }

  return res;
}
