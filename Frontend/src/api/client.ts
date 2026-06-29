import axios from 'axios';
import { getAccessToken, getRefreshToken, setAuth, clearAuth } from '../store/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let isRefreshing = false;
let subscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const axiosError = error as import('axios').AxiosError;
    const originalRequest = (axiosError.config || {}) as any;

    if (axiosError.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribers.push((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const resp = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/api/v1/user/refresh-token`,
          { refreshToken }
        );
        const newAccess = resp.data?.accessToken as string;
        if (!newAccess) throw new Error('No access token');

        setAuth(newAccess);
        isRefreshing = false;
        onRefreshed(newAccess);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        subscribers = [];
        clearAuth();
        // Redirect to client login
        window.location.href = '/login';
        return Promise.reject(axiosError);
      }
    }

    return Promise.reject(axiosError);
  }
);

export default api;
