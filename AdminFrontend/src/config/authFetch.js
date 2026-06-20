import { API_BASE_URL } from './api';
import { getToken } from '../utils/tokenStore';

export async function authFetch(path, options = {}) {
  const token = getToken();

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

  if (res.status === 401 || res.status === 403) {
    window.location.href = '/logging';
  }

  return res;
}
