import axios from 'axios';

// Pre-configured Axios instance pointing to Django Backend API
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;