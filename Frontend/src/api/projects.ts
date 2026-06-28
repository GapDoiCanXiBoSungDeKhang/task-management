import api from './client';
import { Project } from '../types';

export async function fetchProjects(params: any) {
  const res = await api.get('/api/v1/projects', { params });
  return res.data;
}

export async function fetchProjectDetail(id: string) {
  const res = await api.get(`/api/v1/projects/detail/${id}`);
  return res.data;
}

export async function fetchProjectMembers(id: string) {
  const res = await api.get(`/api/v1/projects/detail/${id}/list-member`);
  return res.data;
}

export async function fetchProjectTasks(id: string) {
  const res = await api.get(`/api/v1/projects/detail/${id}/list-tasks`);
  return res.data;
}
