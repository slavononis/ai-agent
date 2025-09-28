import axios from 'axios';
import { localStorageHelper } from './localStorage.client';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorageHelper.get<string>('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('Unauthorized, redirecting...');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
