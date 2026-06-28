import adminApi from './client';

export async function adminLogin(payload: { email: string; password: string }) {
  const res = await adminApi.post('/admin/api/v1/auth/login', payload);
  return res.data;
}
export async function adminLogout() {
  const res = await adminApi.post('/admin/api/v1/auth/logout');
  return res.data;
}
