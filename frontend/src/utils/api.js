import axios from 'axios';

// Falls back to localhost for local-only dev, but should be set in
// frontend/.env as VITE_API_URL=http://<your-lan-ip>:5000/api so phones
// on the same Wi-Fi can actually reach the backend (localhost on a phone
// means "the phone itself", not your dev machine).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eventhub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 = token missing/invalid/expired -> the session itself is dead, log out.
// 403 = token is fine, but this role isn't allowed on this route -> NOT a
// session problem. Logging the user out here was wiping valid sessions any
// time a role-restricted request happened (e.g. a page calling an admin-only
// endpoint). Let the calling code handle 403s (e.g. show a toast) instead.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('eventhub_token');
      localStorage.removeItem('eventhub_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;