import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select,
  Space, Table, Tabs, Tag, Typography, message, Descriptions, Skeleton,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, RedoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { TASK_STATUS_OPTIONS, TASK_STATUS_COLOR, TaskStatus } from '../../types';
import {
  fetchAdminTaskDropdowns, fetchAdminTasks, fetchAdminTaskDetail, fetchAdminTaskSubtasks,
  createAdminTask, editAdminTask, deleteAdminTask, changeAdminTaskStatus,
  changeMultiAdminTasks, fetchAdminTasksTrash, deleteAdminTaskPermanently,
  restoreAdminTask, changeMultiAdminTasksTrash, fetchAllAdminTasksForDropdown,
} from '../api/tasks';
import SubtaskCard from '../../components/SubtaskCard';

function statusDot(status: string): string {
  const map: Record<string, string> = {
    initial: '#8c8c8c', doing: '#1677ff', finish: '#52c41a',
    pending: '#faad14', notFinish: '#ff4d4f',
  };
  return map[status] || '#d9d9d9';
}

// dropdowns data shape: { data: { users: [], projects: [] } }
function TaskFormModal({ open, loading, editing, dropdowns, onCancel, onSubmit }: any) {
  const [form] = Form.useForm();
  const [parentTaskOptions, setParentTaskOptions] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        content: editing.content,
        status: editing.status,
        timeStart: editing.timeStart ? dayjs(editing.timeStart) : undefined,
        timeFinish: editing.timeFinish ? dayjs(editing.timeFinish) : undefined,
        listUsers: editing.listUsers || [],
        projectId: editing.projectId || undefined,
        taskParentId: editing.taskParentId || undefined,
      });
    } else {
      form.resetFields();
      form.setFieldValue('status', 'initial');
    }

    // Load all tasks for parent dropdown, exclude the task itself (avoid circular ref)
    fetchAllAdminTasksForDropdown()
      .then(res => {
        const currentId = editing?._id;
        const opts = (res.data || [])
          .filter((t: any) => t._id !== currentId)
          .map((t: any) => ({
            value: t._id,
            searchText: t.title || '',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                  background: statusDot(t.status), flexShrink: 0,
                }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
              </span>
            ),
          }));
        setParentTaskOptions(opts);
      })
      .catch(() => {});
  }, [open, editing?._id]);

  const handleOk = async () => {
    try {
      const vals = await form.validateFields();
      onSubmit({
        ...vals,
        timeStart: vals.timeStart?.toISOString?.() || undefined,
        timeFinish: vals.timeFinish?.toISOString?.() || undefined,
        taskParentId: vals.taskParentId || undefined,
      });
    } catch { }
  };

  // Backend giờ trả thêm accounts (admin) — trước đây bị thiếu hoàn toàn
  const userOptions = [
    ...(dropdowns?.users || []).map((u: any) => ({ value: u._id, label: u.fullName })),
    ...(dropdowns?.accounts || []).map((a: any) => ({ value: a._id, label: `${a.fullName} (admin)` })),
  ];
  const projectOptions = (dropdowns?.projects || []).map((p: any) => ({ value: p._id, label: p.title }));

  return (
    <Modal
      title={editing ? 'Chỉnh sửa Task' : 'Tạo Task mới'}
      open={open} onCancel={onCancel} onOk={handleOk}
      confirmLoading={loading} okText={editing ? 'Lưu' : 'Tạo'}
      cancelText="Hủy" destroyOnClose width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="content" label="Nội dung">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái" initialValue="initial">
          <Select options={TASK_STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item name="projectId" label="Dự án">
          <Select options={projectOptions} allowClear placeholder="Chọn dự án" />
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
        <Form.Item name="listUsers" label="Người thực hiện">
          <Select
            mode="multiple"
            options={userOptions}
            placeholder="Chọn người thực hiện"
            showSearch
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function TaskDetailModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || !open) { setTask(null); setSubtasks([]); return; }
    setLoading(true);
    Promise.allSettled([fetchAdminTaskDetail(id), fetchAdminTaskSubtasks(id)])
      .then(([d, s]) => {
        if (d.status === 'fulfilled') setTask(d.value?.data);
        if (s.status === 'fulfilled') setSubtasks(s.value?.data || []);
      })
      .finally(() => setLoading(false));
  }, [id, open]);

  return (
    <Modal title="Chi tiết Task" open={open} onCancel={onClose} footer={null} width={640} destroyOnClose>
      {loading ? <Skeleton active /> : task ? (
        <div>
          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Tiêu đề">{task.title}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={TASK_STATUS_COLOR[task.status as TaskStatus]}>
                {TASK_STATUS_OPTIONS.find(o => o.value === task.status)?.label || task.status}
              </Tag>
            </Descriptions.Item>
            {task.content && (
              <Descriptions.Item label="Nội dung">
                <div style={{ whiteSpace: 'pre-wrap' }}>{task.content}</div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Bắt đầu">
              {task.timeStart ? dayjs(task.timeStart).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Kết thúc">
              {task.timeFinish ? dayjs(task.timeFinish).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
          </Descriptions>
          {subtasks.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Subtasks ({subtasks.length}):</div>
              {subtasks.map(s => (
                <SubtaskCard
                  key={s._id}
                  item={s}
                  onOpenDetail={(sid) => { onClose(); navigate(`/admin/tasks?detail=${sid}`); }}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export default function AdminTasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [trashData, setTrashData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [trashTotal, setTrashTotal] = useState(0);
  const [dropdowns, setDropdowns] = useState<{ users: any[]; accounts: any[]; projects: any[] }>({ users: [], accounts: [], projects: [] });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [trashSelectedKeys, setTrashSelectedKeys] = useState<React.Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '4');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';
  const trashPage = parseInt(searchParams.get('trash_page') || '1');

  function setParam(key: string, val: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val); else sp.delete(key);
    if (!['page', 'trash_page'].includes(key)) sp.set('page', '1');
    setSearchParams(sp);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminTasks({
        page, limit,
        keyword: keyword || undefined,
        status: status || undefined,
      });
      setData(res.data || []);
      // Backend returns totalTasks at top level AND pagination
      setTotal(res.totalTasks ?? res.pagination?.totalItems ?? 0);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  }

  async function loadTrash() {
    try {
      const res = await fetchAdminTasksTrash({ page: trashPage, limit });
      setTrashData(res.data || []);
      setTrashTotal(res.totalTasks ?? res.pagination?.totalItems ?? 0);
    } catch { }
  }

  useEffect(() => {
    fetchAdminTaskDropdowns()
      .then(res => setDropdowns(res.data || { users: [], accounts: [], projects: [] }))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); loadTrash(); }, [searchParams.toString()]);

  const handleSubmit = async (payload: any) => {
    setFormLoading(true);
    try {
      if (editing?._id) {
        await editAdminTask(editing._id, payload);
        message.success('Cập nhật thành công');
      } else {
        await createAdminTask(payload);
        message.success('Tạo thành công');
      }
      setFormOpen(false); load();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminTask(id);
      message.success('Xóa thành công');
      load(); loadTrash();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulk = async (key: string, value: any) => {
    if (!selectedRowKeys.length) { message.warning('Chọn ít nhất 1 task'); return; }
    try {
      await changeMultiAdminTasks(selectedRowKeys as string[], key, value);
      message.success('Thành công'); setSelectedRowKeys([]); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulkTrash = async (key: string, value: any) => {
    if (!trashSelectedKeys.length) return;
    try {
      await changeMultiAdminTasksTrash(trashSelectedKeys as string[], key, value);
      message.success('Thành công'); setTrashSelectedKeys([]); load(); loadTrash();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Tiêu đề', dataIndex: 'title', ellipsis: true,
      render: (v, r) => (
        <a onClick={() => setDetailId(r._id)} style={{ fontWeight: 500 }}>{v}</a>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status',
      render: (v: TaskStatus) => (
        <Tag color={TASK_STATUS_COLOR[v]}>{TASK_STATUS_OPTIONS.find(o => o.value === v)?.label || v}</Tag>
      ),
    },
    {
      title: 'Tạo bởi', dataIndex: 'createdBy',
      render: (v) => typeof v === 'string' ? v : (v?.fullName || '—'),
    },
    {
      title: 'Kết thúc', dataIndex: 'timeFinish',
      render: (v) => {
        if (!v) return '—';
        const diff = dayjs(v).diff(dayjs(), 'day');
        if (diff < 0) return <Tag color="red">{dayjs(v).format('DD/MM/YYYY')} (Quá hạn)</Tag>;
        if (diff <= 3) return <Tag color="orange">{dayjs(v).format('DD/MM/YYYY')}</Tag>;
        return dayjs(v).format('DD/MM/YYYY');
      },
    },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small" wrap>
          <Select
            size="small" style={{ width: 130 }} value={r.status}
            onChange={(v) => changeAdminTaskStatus(r._id, v).then(() => { message.success('Đã cập nhật'); load(); })}
            options={TASK_STATUS_OPTIONS}
          />
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailId(r._id)}>Chi tiết</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setFormOpen(true); }}>Sửa</Button>
          <Popconfirm title="Xóa task này?" onConfirm={() => handleDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const trashColumns: ColumnsType<any> = [
    { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
    {
      title: 'Trạng thái', dataIndex: 'status',
      render: (v: TaskStatus) => (
        <Tag color={TASK_STATUS_COLOR[v]}>{TASK_STATUS_OPTIONS.find(o => o.value === v)?.label || v}</Tag>
      ),
    },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small" icon={<RedoOutlined />}
            onClick={() => restoreAdminTask(r._id).then(() => { message.success('Khôi phục thành công'); load(); loadTrash(); })}
          >
            Khôi phục
          </Button>
          <Popconfirm
            title="Xóa vĩnh viễn task này?"
            onConfirm={() => deleteAdminTaskPermanently(r._id).then(() => { message.success('Đã xóa vĩnh viễn'); loadTrash(); })}
            okText="Xóa" cancelText="Hủy"
          >
            <Button size="small" danger>Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const paginationChange = (p: number, ps: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(p)); sp.set('limit', String(ps));
    setSearchParams(sp);
  };

  return (
    <Card
      title="Quản lý Tasks"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Tạo Task
        </Button>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'active',
            label: 'Danh sách',
            children: (
              <>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Input.Search
                    placeholder="Tìm task" allowClear value={keyword}
                    onChange={(e) => setParam('keyword', e.target.value)}
                    style={{ width: 260 }}
                  />
                  <Select
                    placeholder="Trạng thái" allowClear style={{ width: 170 }}
                    value={status || undefined}
                    onChange={(v) => setParam('status', v || '')}
                    options={TASK_STATUS_OPTIONS}
                  />
                </Space>
                {selectedRowKeys.length > 0 && (
                  <Space style={{ marginBottom: 12 }}>
                    <span style={{ color: '#666' }}>Đã chọn {selectedRowKeys.length}:</span>
                    <Select
                      placeholder="Đổi trạng thái" style={{ width: 180 }}
                      onChange={(v) => handleBulk('status', v)} options={TASK_STATUS_OPTIONS}
                    />
                    <Popconfirm title="Xóa các task đã chọn?" onConfirm={() => handleBulk('deleted', true)} okText="Xóa" cancelText="Hủy">
                      <Button danger icon={<DeleteOutlined />}>Xóa hàng loạt</Button>
                    </Popconfirm>
                  </Space>
                )}
                <Table
                  rowKey="_id" loading={loading} dataSource={data} columns={columns}
                  rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                  scroll={{ x: 700 }}
                  pagination={{
                    current: page, pageSize: limit, total,
                    showSizeChanger: true, showTotal: (t) => `Tổng ${t} task`,
                    onChange: paginationChange,
                  }}
                />
              </>
            ),
          },
          {
            key: 'trash',
            label: `Thùng rác (${trashTotal})`,
            children: (
              <>
                {trashSelectedKeys.length > 0 && (
                  <Space style={{ marginBottom: 12 }}>
                    <span style={{ color: '#666' }}>Đã chọn {trashSelectedKeys.length}:</span>
                    <Button icon={<RedoOutlined />} onClick={() => handleBulkTrash('restore', false)}>
                      Khôi phục hàng loạt
                    </Button>
                    <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => handleBulkTrash('deleted-permanently', true)} okText="Xóa" cancelText="Hủy">
                      <Button danger>Xóa vĩnh viễn hàng loạt</Button>
                    </Popconfirm>
                  </Space>
                )}
                <Table
                  rowKey="_id" dataSource={trashData} columns={trashColumns}
                  rowSelection={{ selectedRowKeys: trashSelectedKeys, onChange: setTrashSelectedKeys }}
                  pagination={{
                    current: trashPage, pageSize: limit, total: trashTotal,
                    showTotal: (t) => `Tổng ${t}`,
                    onChange: (p) => { const sp = new URLSearchParams(searchParams.toString()); sp.set('trash_page', String(p)); setSearchParams(sp); },
                  }}
                />
              </>
            ),
          },
        ]}
      />

      <TaskFormModal
        open={formOpen} loading={formLoading} editing={editing}
        dropdowns={dropdowns}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
      <TaskDetailModal id={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
}
