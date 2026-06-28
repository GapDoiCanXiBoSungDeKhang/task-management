import adminApi from './client';

export async function getDashboardDropdowns() {
  const res = await adminApi.get('/admin/api/v1/dashboard/dropdowns');
  return res.data;
}
export async function getDashboardProgress(params?: any) {
  const res = await adminApi.get('/admin/api/v1/dashboard/progress', { params });
  return res.data;
}
export async function getDashboardProjectsProgress(params?: any) {
  const res = await adminApi.get('/admin/api/v1/dashboard/projects-progress', { params });
  return res.data;
}
export async function getDashboardChart() {
  const res = await adminApi.get('/admin/api/v1/dashboard/chart');
  return res.data;
}
export async function getDashboardSystem() {
  const res = await adminApi.get('/admin/api/v1/dashboard/system');
  return res.data;
}
