import adminApi from './client';

const BASE = '/admin/api/v1/projects';

export async function fetchAdminProjectDropdowns() {
  const res = await adminApi.get(`${BASE}/dropdowns`);
  return res.data;
}
export async function fetchAdminProjects(params?: any) {
  const res = await adminApi.get(BASE, { params });
  return res.data;
}
export async function fetchAdminProjectDetail(id: string) {
  const res = await adminApi.get(`${BASE}/detail/${id}`);
  return res.data;
}
export async function createAdminProject(payload: any) {
  const res = await adminApi.post(`${BASE}/create`, payload);
  return res.data;
}
export async function editAdminProject(id: string, payload: any) {
  const res = await adminApi.patch(`${BASE}/edit/${id}`, payload);
  return res.data;
}
export async function deleteAdminProject(id: string) {
  const res = await adminApi.delete(`${BASE}/delete/${id}`);
  return res.data;
}
export async function changeAdminProjectStatus(id: string, status: string) {
  const res = await adminApi.patch(`${BASE}/change-status/${id}`, { status });
  return res.data;
}
export async function changeMultiAdminProjects(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/change-multi`, { ids, key, value });
  return res.data;
}
// TRASH
export async function fetchAdminProjectsTrash(params?: any) {
  const res = await adminApi.get(`${BASE}/trash`, { params });
  return res.data;
}
export async function deleteAdminProjectPermanently(id: string) {
  const res = await adminApi.delete(`${BASE}/trash/delete-permanently/${id}`);
  return res.data;
}
export async function restoreAdminProject(id: string) {
  const res = await adminApi.patch(`${BASE}/trash/restore/${id}`);
  return res.data;
}
export async function changeMultiAdminProjectsTrash(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/trash/change-multi`, { ids, key, value });
  return res.data;
}
