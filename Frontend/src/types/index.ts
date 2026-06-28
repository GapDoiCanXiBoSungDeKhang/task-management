export type TaskStatus = 'initial' | 'doing' | 'finish' | 'pending' | 'notFinish';
export type ProjectStatus = 'active' | 'completed' | 'archived' | 'inactive';

export interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
  content?: string;
  timeStart?: string;
  timeFinish?: string;
  deleted?: boolean;
  listUsers?: string[];
  projectId?: string;
  taskParentId?: string;
  createdBy?: string;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  deadline?: string;
  members?: string[];
  createdBy?: { createdById?: string; fullName?: string; createdAt?: string };
}

export interface PaginationInfo {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  skip: number;
}

export const TASK_STATUS_OPTIONS = [
  { value: 'initial', label: 'Chờ xử lý' },
  { value: 'doing', label: 'Đang làm' },
  { value: 'finish', label: 'Hoàn thành' },
  { value: 'pending', label: 'Tạm dừng' },
  { value: 'notFinish', label: 'Không hoàn thành' },
];

export const PROJECT_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'archived', label: 'Lưu trữ' },
  { value: 'inactive', label: 'Không hoạt động' },
];

export const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  initial: 'default',
  doing: 'blue',
  finish: 'green',
  pending: 'orange',
  notFinish: 'red',
};

export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  active: 'blue',
  completed: 'green',
  archived: 'default',
  inactive: 'red',
};
