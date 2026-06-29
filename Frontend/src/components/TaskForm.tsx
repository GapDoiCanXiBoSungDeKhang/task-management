import { DatePicker, Form, Input, Modal, Select } from 'antd';
import { Task } from '../types';
import { TASK_STATUS_OPTIONS } from '../types';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { fetchUsersDropdowns } from '../api/tasks';

interface Props {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<Task>;
  onCancel: () => void;
  onSubmit: (values: Partial<Task>) => void;
}

export default function TaskForm({ open, loading, initialValues, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm();
  const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: initialValues?.title || '',
        content: initialValues?.content || '',
        status: initialValues?.status || 'initial',
        timeStart: initialValues?.timeStart ? dayjs(initialValues.timeStart) : undefined,
        timeFinish: initialValues?.timeFinish ? dayjs(initialValues.timeFinish) : undefined,
        listUsers: (initialValues as any)?.listUsers || [],
      });

      // Fetch dropdown users: { data: { users, accounts } }
      fetchUsersDropdowns()
        .then((res) => {
          const accounts = (res?.data?.accounts || []).map((a: any) => ({
            label: `${a.fullName} (admin)`,
            value: a._id,
          }));
          const users = (res?.data?.users || []).map((u: any) => ({
            label: u.fullName,
            value: u._id,
          }));
          setUserOptions([...accounts, ...users]);
        })
        .catch(() => {});
    }
  }, [open, initialValues?._id]);  // only re-run when open or task changes

  const handleOk = () => {
    form.validateFields().then((vals: any) => {
      const payload: Partial<Task> = {
        ...vals,
        timeStart: vals.timeStart ? vals.timeStart.toISOString() : undefined,
        timeFinish: vals.timeFinish ? vals.timeFinish.toISOString() : undefined,
        listUsers: vals.listUsers || [],
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
