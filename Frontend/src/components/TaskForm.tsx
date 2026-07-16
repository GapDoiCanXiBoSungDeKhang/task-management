import { DatePicker, Form, Input, Modal, Select, Typography } from 'antd';
import { Task, TASK_STATUS_OPTIONS } from '../types';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { fetchUsersDropdowns, fetchAllTasksForDropdown } from '../api/tasks';

interface Props {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<Task>;
  onCancel: () => void;
  onSubmit: (values: Partial<Task>) => void;
}

interface ParentTaskOption {
  value: string;
  label: JSX.Element;
  searchText: string;
}

function statusDot(status: string): string {
  const map: Record<string, string> = {
    initial: '#8c8c8c',
    doing: '#1677ff',
    finish: '#52c41a',
    pending: '#faad14',
    notFinish: '#ff4d4f',
  };
  return map[status] || '#d9d9d9';
}

export default function TaskForm({ open, loading, initialValues, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm();
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);
  const [parentTaskOptions, setParentTaskOptions] = useState<ParentTaskOption[]>([]);

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      title: initialValues?.title || '',
      content: initialValues?.content || '',
      status: initialValues?.status || 'initial',
      timeStart: initialValues?.timeStart ? dayjs(initialValues.timeStart) : undefined,
      timeFinish: initialValues?.timeFinish ? dayjs(initialValues.timeFinish) : undefined,
      listUsers: (initialValues as any)?.listUsers || [],
      taskParentId: (initialValues as any)?.taskParentId || undefined,
    });

    // Fetch dropdown users + all tasks in parallel
    Promise.all([
      fetchUsersDropdowns(),
      fetchAllTasksForDropdown(),
    ]).then(([usersRes, tasksRes]) => {
      // Users: { data: { users, accounts } }
      const accounts = (usersRes?.data?.accounts || []).map((a: any) => ({
        label: `${a.fullName} (admin)`,
        value: a._id,
      }));
      const users = (usersRes?.data?.users || []).map((u: any) => ({
        label: u.fullName,
        value: u._id,
      }));
      setUserOptions([...accounts, ...users]);

      // Parent task dropdown — exclude the task itself when editing (avoid circular ref)
      const currentId = initialValues?._id;
      const tasks: ParentTaskOption[] = (tasksRes?.data || [])
        .filter((t: any) => t._id !== currentId)
        .map((t: any) => ({
          value: t._id,
          searchText: t.title || '',
          label: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusDot(t.status),
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.title}
              </span>
            </span>
          ),
        }));
      setParentTaskOptions(tasks);
    }).catch(() => {});
  }, [open, initialValues?._id]);

  const handleOk = () => {
    form.validateFields().then((vals: any) => {
      const payload: Partial<Task> = {
        ...vals,
        timeStart: vals.timeStart ? vals.timeStart.toISOString() : undefined,
        timeFinish: vals.timeFinish ? vals.timeFinish.toISOString() : undefined,
        listUsers: vals.listUsers || [],
        taskParentId: vals.taskParentId || undefined,
      };
      onSubmit(payload);
    }).catch(() => {});
  };

  return (
    <Modal
      title={initialValues?._id ? 'Chỉnh sửa Task' : 'Tạo Task mới'}
      open={open}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={handleOk}
      okText={initialValues?._id ? 'Lưu' : 'Tạo'}
      cancelText="Hủy"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="content" label="Nội dung">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái">
          <Select options={TASK_STATUS_OPTIONS} />
        </Form.Item>

        {/* Task cha — dùng logic subtask có sẵn ở backend (taskParentId) */}
        <Form.Item
          name="taskParentId"
          label={
            <span>
              Task cha&nbsp;
              <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                (để trống nếu đây là task gốc)
              </Typography.Text>
            </span>
          }
        >
          <Select
            allowClear
            showSearch
            placeholder="Chọn task cha..."
            options={parentTaskOptions}
            filterOption={(input, opt) =>
              (opt as any)?.searchText?.toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent="Không có task nào"
          />
        </Form.Item>

        <Form.Item name="timeStart" label="Bắt đầu">
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
        <Form.Item name="timeFinish" label="Kết thúc">
          <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
        </Form.Item>
        <Form.Item name="listUsers" label="Người tham gia">
          <Select
            mode="multiple"
            placeholder="Chọn người tham gia"
            options={userOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string).toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
