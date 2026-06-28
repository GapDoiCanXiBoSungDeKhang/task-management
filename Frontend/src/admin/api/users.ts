import adminApi from './client';

const BASE = '/admin/api/v1/users';

export async function fetchAdminUsers(params?: any) {
  const res = await adminApi.get(BASE, { params });
  return res.data;
}
export async function fetchAdminUserDetail(id: string) {
  const res = await adminApi.get(`${BASE}/detail/${id}`);
  return res.data;
}
export async function createAdminUser(formData: FormData) {
  const res = await adminApi.post(`${BASE}/create`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}
export async function editAdminUser(id: string, formData: FormData) {
  const res = await adminApi.patch(`${BASE}/edit/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}
export async function deleteAdminUser(id: string) {
  const res = await adminApi.delete(`${BASE}/delete/${id}`);
  return res.data;
}
export async function changeAdminUserStatus(id: string, status: string) {
  const res = await adminApi.patch(`${BASE}/change-status/${id}`, { status });
  return res.data;
}
export async function changeMultiAdminUsers(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/change-multi`, { ids, key, value });
  return res.data;
}
// TRASH
export async function fetchAdminUsersTrash(params?: any) {
  const res = await adminApi.get(`${BASE}/trash`, { params });
  return res.data;
}
export async function deleteAdminUserPermanently(id: string) {
  const res = await adminApi.delete(`${BASE}/trash/delete-permanently/${id}`);
  return res.data;
}
export async function restoreAdminUser(id: string) {
  const res = await adminApi.patch(`${BASE}/trash/restore/${id}`);
  return res.data;
}
export async function changeMultiAdminUsersTrash(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/trash/change-multi`, { ids, key, value });
  return res.data;
}
