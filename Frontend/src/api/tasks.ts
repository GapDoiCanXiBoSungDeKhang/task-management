import api from './client';
import { Task, TaskStatus } from '../types';

export async function fetchTasks(params: any) {
  const res = await api.get('/api/v1/tasks', { params });
  return res.data;
}

export async function fetchTaskDetail(id: string) {
  const res = await api.get(`/api/v1/tasks/detail/${id}`);
  return res.data;
}

export async function fetchTaskSubtasks(id: string) {
  const res = await api.get(`/api/v1/tasks/detail/${id}/subtasks`);
  return res.data;
}

// Dropdowns for assigning members when creating/editing task
export async function fetchUsersDropdowns() {
  const res = await api.get(`/api/v1/tasks/dropdowns/users`);
  return res.data;
}

// Members of a task for detail view
export async function fetchTaskUsers(id: string) {
  const res = await api.get(`/api/v1/tasks/detail/${id}/list-user`);
  return res.data;
}

export async function createTask(payload: Partial<Task>) {
  const res = await api.post('/api/v1/tasks/create', payload);
  return res.data;
}

export async function editTask(id: string, payload: Partial<Task>) {
  const res = await api.patch(`/api/v1/tasks/edit/${id}`, payload);
  return res.data;
}

export async function deleteTask(id: string) {
  const res = await api.delete(`/api/v1/tasks/delete/${id}`);
  return res.data;
}

export async function changeTaskStatus(id: string, status: TaskStatus) {
  const res = await api.patch(`/api/v1/tasks/change-status/${id}`, { status });
  return res.data;
}

export async function changeMulti(ids: string[], key: string, value: any) {
  const res = await api.patch(`/api/v1/tasks/change-multi`, { ids, key, value });
  return res.data;
}

// Fetch all tasks without pagination (for parent task dropdown)
export async function fetchAllTasksForDropdown() {
  const res = await api.get('/api/v1/tasks', { params: { limit: 200, page: 1 } });
  return res.data;
}
