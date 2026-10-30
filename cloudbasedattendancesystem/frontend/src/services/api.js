import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling & 401 auto-logout
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || error.message || 'An unexpected error occurred.';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error(message || 'Access denied. You lack required permissions.');
    } else if (status >= 400 && status < 500) {
      toast.error(message);
    } else if (status >= 500) {
      toast.error('Internal server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED' || !error.response) {
      toast.error('Network error or server unreachable. Please check backend status.');
    }

    return Promise.reject(error?.response?.data || error);
  }
);

export default api;
