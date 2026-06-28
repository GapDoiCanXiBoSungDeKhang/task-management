import axios from 'axios';
import { getAdminAccessToken, getAdminRefreshToken, setAdminAuth, clearAdminAuth } from '../store/auth';

const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

let isRefreshing = false;
let subscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}

adminApi.interceptors.request.use((config) => {
  const token = getAdminAccessToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
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
            resolve(adminApi(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = getAdminRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');
        const resp = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/admin/api/v1/auth/refresh-token`,
          { refreshToken }
        );
        const newAccess = resp.data?.accessToken as string;
        setAdminAuth(newAccess);
        isRefreshing = false;
        onRefreshed(newAccess);
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
        return adminApi(originalRequest);
      } catch {
        isRefreshing = false;
        clearAdminAuth();
        return Promise.reject(axiosError);
      }
    }
    return Promise.reject(axiosError);
  }
);

export default adminApi;
