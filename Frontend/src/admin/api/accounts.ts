import adminApi from './client';

const BASE = '/admin/api/v1/accounts';

export async function fetchAccounts(params?: any) {
  const res = await adminApi.get(BASE, { params });
  return res.data;
}
export async function fetchAccountDetail(id: string) {
  const res = await adminApi.get(`${BASE}/detail/${id}`);
  return res.data;
}
export async function createAccount(formData: FormData) {
  const res = await adminApi.post(`${BASE}/create`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function editAccount(id: string, formData: FormData) {
  const res = await adminApi.patch(`${BASE}/edit/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deleteAccount(id: string) {
  const res = await adminApi.delete(`${BASE}/delete/${id}`);
  return res.data;
}
export async function changeAccountStatus(id: string, status: string) {
  const res = await adminApi.patch(`${BASE}/change-status/${id}`, { status });
  return res.data;
}
export async function changeMultiAccounts(ids: string[], key: string, value: any) {
  const res = await adminApi.patch(`${BASE}/change-multi`, { ids, key, value });
  return res.data;
}
