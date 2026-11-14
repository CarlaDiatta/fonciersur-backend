import axios from 'axios';

const cadastreApiUrl = import.meta.env.VITE_CADASTRE_API_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:5000/api/v1';
const promoteurApiUrl = import.meta.env.VITE_PROMOTEUR_API_URL
  || 'http://localhost:5001/api/v1';

export const axiosClient = axios.create({
  baseURL: cadastreApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    let role: string | undefined;
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null') as { role?: string } | null;
      role = user?.role;
    } catch {
      role = undefined;
    }

    config.baseURL = role === 'PROMOTEUR' && !config.url?.startsWith('/auth/')
      ? promoteurApiUrl
      : cadastreApiUrl;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);