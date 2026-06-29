import api from './client';

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// Auth
export async function register(payload: RegisterPayload) {
  const res = await api.post('/api/v1/user/register', payload);
  return res.data;
}

export async function login(payload: { email: string; password: string }) {
  const res = await api.post('/api/v1/user/login', payload);
  return res.data;
}

export async function logout() {
  const res = await api.post('/api/v1/user/logout');
  return res.data;
}

// Password flow
export async function forgotPassword(payload: { email: string }) {
  const res = await api.post('/api/v1/user/password/forgot', payload);
  return res.data;
}

export async function otpPassword(payload: { email: string; otp: string }) {
  const res = await api.post('/api/v1/user/password/otp', payload);
  return res.data;
}

export async function resetPassword(payload: { password: string }) {
  const res = await api.post('/api/v1/user/password/reset', payload);
  return res.data;
}

// Profile
export async function getProfile() {
  const res = await api.get('/api/v1/profile');
  return res.data;
}

export async function editProfile(formData: FormData) {
  const res = await api.patch('/api/v1/profile/edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// User list (for task assignment dropdowns)
export async function getUserList() {
  const res = await api.get('/api/v1/user/list');
  return res.data;
}
