import axios from 'axios';

// In production (Vercel) there is no dev-server proxy, so VITE_API_URL must
// point at the deployed backend (e.g. https://your-app.onrender.com).
// In local dev the Vite proxy rewrites /api → http://localhost:3000/api, so
// the env var is not needed and the fallback '/api' keeps things working.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
