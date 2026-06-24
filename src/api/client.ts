import axios from 'axios';
import { TOKEN_KEY, USER_KEY } from '../constants';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== '/login') {
        // Use custom event instead of hard redirect — lets React handle the navigation
        window.dispatchEvent(new CustomEvent('pria:auth-expired'));
      }
    }
    return Promise.reject(error);
  },
);

// Listen for auth expiry events and redirect gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('pria:auth-expired', () => {
    // Small delay to let in-flight requests complete
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?reason=session-expired';
      }
    }, 100);
  }, { once: true });
}

export default client;