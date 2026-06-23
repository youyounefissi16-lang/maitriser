import axios from 'axios';
import { API_BASE_URL } from './api';
import { getToken } from '../utils/tokenStore';

const axiosAdmin = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
});

axiosAdmin.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosAdmin.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosAdmin;
