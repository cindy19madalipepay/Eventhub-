import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eventhub_token');

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
      console.error('AUTH 401:', {
        url: error.config?.url,
        method: error.config?.method,
        message: error.response?.data?.message,
      });

      localStorage.removeItem('eventhub_token');
      localStorage.removeItem('eventhub_user');

      // Only redirect if we are not already on login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;