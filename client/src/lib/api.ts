import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach bearer token if present (for cross-origin dual auth fallback)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('proofcart_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.headers) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  return config;
});

// Response interceptor: normalize error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // If unauthorized, clear token and redirect safely (UX-05)
    if (error.response?.status === 401) {
      localStorage.removeItem('proofcart_token');
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        window.location.pathname !== '/'
      ) {
        window.location.href = '/login?expired=true';
      }
    }

    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected network error occurred.';

    return Promise.reject({
      message,
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      status: error.response?.status,
      details: error.response?.data?.error?.details,
    });
  }
);
