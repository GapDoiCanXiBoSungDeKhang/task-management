import adminApi from './client';

const BASE = '/admin/api/v1/roles';

export async function fetchRoles(params?: any) {
  const res = await adminApi.get(BASE, { params });
  return res.data;
}
export async function createRole(payload: any) {
  const res = await adminApi.post(`${BASE}/create`, payload);
  return res.data;
}
export async function editRole(id: string, payload: any) {
  const res = await adminApi.patch(`${BASE}/edit/${id}`, payload);
  return res.data;
}
export async function deleteRole(id: string) {
  const res = await adminApi.delete(`${BASE}/delete/${id}`);
  return res.data;
}
export async function deleteMultipleRoles(ids: string[]) {
  const res = await adminApi.delete(`${BASE}/delete-multiple`, { data: { ids } });
  return res.data;
}
