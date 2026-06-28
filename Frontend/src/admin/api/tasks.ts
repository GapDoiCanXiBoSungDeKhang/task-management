import adminApi from './client';

const BASE = '/admin/api/v1/tasks';

export async function fetchAdminTaskDropdowns() {
  const res = await adminApi.get(`${BASE}/dropdowns/users`);
  return res.data;
}
export async function fetchAdminTasks(params?: any) {
  const res = await adminApi.get(BASE, { params });
  return res.data;
}
export async function fetchAdminTaskDetail(id: string) {
  const res = await adminApi.get(`${BASE}/detail/${id}`);
  return res.data;
}
export async function fetchAdminTaskSubtasks(id: string) {
  const res = await adminApi.get(`${BASE}/detail/${id}/subtasks`);
  return res.data;
}
export async function createAdminTask(payload: any) {
  const res = await adminApi.post(`${BASE}/create`, payload);
  return res.data;
}
export async function editAdminTask(id: string, payload: any) {
  const res = await adminApi.patch(`${BASE}/edit/${id}`, payload);
  return res.data;
}
export async function deleteAdminTask(id: string) {
  const res = await adminApi.delete(`${BASE}/delete/${id}`);
  return res.data;
}
export async function changeAdminTaskStatus(id: string, status: string) {
  const res = await adminApi.patch(`${BASE}/change-status/${id}`, { status });
  return res.data;
}
export async function changeMultiAdminTasks(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/change-multi`, { ids, key, value });
  return res.data;
}
// TRASH
export async function fetchAdminTasksTrash(params?: any) {
  const res = await adminApi.get(`${BASE}/trash`, { params });
  return res.data;
}
export async function deleteAdminTaskPermanently(id: string) {
  const res = await adminApi.delete(`${BASE}/trash/delete-permanently/${id}`);
  return res.data;
}
export async function restoreAdminTask(id: string) {
  const res = await adminApi.patch(`${BASE}/trash/restore/${id}`);
  return res.data;
}
export async function changeMultiAdminTasksTrash(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/trash/change-multi`, { ids, key, value });
  return res.data;
}
