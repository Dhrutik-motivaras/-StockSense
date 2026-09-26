import axios from 'axios';

// Pre-configured Axios instance pointing to Django Backend API
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT bearer token if user is logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stocksense_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to catch 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected routes, can clear token
      // But don't forcefully redirect if on login/register page
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        // optional: redirect or dispatch auth event
      }
    }
    return Promise.reject(error);
  }
);

export default api;