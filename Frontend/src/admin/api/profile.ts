import adminApi from './client';

export async function getAdminProfile() {
  const res = await adminApi.get('/admin/api/v1/profile');
  return res.data;
}
export async function editAdminProfile(formData: FormData) {
  const res = await adminApi.patch('/admin/api/v1/profile/edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
