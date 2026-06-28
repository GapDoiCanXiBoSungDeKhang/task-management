import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Button, Card, Input, Popconfirm, Select, Space, Table, Tag, message,
} from 'antd';
import { DeleteOutlined, EyeOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Task, TaskStatus, TASK_STATUS_OPTIONS, TASK_STATUS_COLOR } from '../types';
import TaskForm from '../components/TaskForm';
import {
  fetchTasks, changeMulti, changeTaskStatus, createTask, deleteTask, editTask,
} from '../api/tasks';
import dayjs from 'dayjs';

export default function TasksList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Read from URL
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '4');
  const keyword = searchParams.get('keyword') || '';
  const status = (searchParams.get('status') || '') as TaskStatus | '';
  const sortKey = searchParams.get('sort_key') || '';
  const sortValue = (searchParams.get('sort_value') || '') as 'asc' | 'desc' | '';

  // Helpers to update URL params
  const setParam = (key: string, val: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val); else sp.delete(key);
    if (key !== 'page') sp.set('page', '1');
    setSearchParams(sp);
  };
  const setPage = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(p));
    setSearchParams(sp);
  };
  const setLimit = (l: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('limit', String(l));
    sp.set('page', '1');
    setSearchParams(sp);
  };

  async function load() {
    setLoading(true);
    try {
      const res = await fetchTasks({
        page, limit,
        keyword: keyword || undefined,
        status: status || undefined,
        sort_key: sortKey || undefined,
        sort_value: sortValue || undefined,
      });
      setData(res.data || []);
      const pg = res.pagination || {};
      const t = pg.totalItems || pg.total || (pg.totalPages * pg.limit) || 0;
      setTotal(t || (page - 1) * limit + (res.data?.length || 0));
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [searchParams.toString()]);

  const handleChangeStatus = async (id: string, s: TaskStatus) => {
    try {
      await changeTaskStatus(id, s);
      message.success('Cập nhật trạng thái thành công');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      message.success('Xóa thành công');
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi xóa');
    }
  };

  const handleSubmitForm = async (vals: Partial<Task>) => {
    setFormLoading(true);
    try {
      if (editing?._id) {
        await editTask(editing._id, vals);
        message.success('Cập nhật thành công');
      } else {
        await createTask(vals);
        message.success('Tạo thành công');
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi lưu');
    } finally {
      setFormLoading(false);
    }
  };

  const handleBulk = async (key: string, value: any) => {
    if (!selectedRowKeys.length) { message.warning('Chọn ít nhất 1 task'); return; }
    try {
      await changeMulti(selectedRowKeys as string[], key, value);
      message.success('Cập nhật hàng loạt thành công');
      setSelectedRowKeys([]);
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      render: (text, record) => (
        <Link to={`/tasks/${record._id}`} style={{ fontWeight: 500 }}>{text}</Link>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: TaskStatus) => (
        <Tag color={TASK_STATUS_COLOR[v]}>
          {TASK_STATUS_OPTIONS.find(o => o.value === v)?.label || v}
        </Tag>
      ),
    },
    {
      title: 'Bắt đầu',
      dataIndex: 'timeStart',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Kết thúc',
      dataIndex: 'timeFinish',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="small" wrap>
          <Select
            size="small"
            placeholder="Đổi trạng thái"
            style={{ width: 130 }}
            value={record.status}
            onChange={(v) => handleChangeStatus(record._id, v as TaskStatus)}
            options={TASK_STATUS_OPTIONS}
          />
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/tasks/${record._id}`)}>
            Chi tiết
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setFormOpen(true); }}>
            Sửa
          </Button>
          <Popconfirm title="Xóa task này?" onConfirm={() => handleDelete(record._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách Tasks"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>
          Tạo Task
        </Button>
      }
    >
      {/* Filters */}
      <Space style={{ marginBottom: 16, width: '100%', flexWrap: 'wrap' }} wrap>
        <Input.Search
          placeholder="Tìm theo tiêu đề"
          allowClear
          value={keyword}
          onChange={(e) => setParam('keyword', e.target.value)}
          onSearch={() => load()}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 180 }}
          value={status || undefined}
          onChange={(v) => setParam('status', v || '')}
          options={TASK_STATUS_OPTIONS}
        />
        <Select
          placeholder="Sort theo"
          allowClear
          style={{ width: 160 }}
          value={sortKey || undefined}
          onChange={(v) => setParam('sort_key', v || '')}
          options={[
            { value: 'title', label: 'Tiêu đề' },
            { value: 'timeStart', label: 'Ngày bắt đầu' },
            { value: 'timeFinish', label: 'Ngày kết thúc' },
          ]}
        />
        <Select
          placeholder="Thứ tự"
          allowClear
          style={{ width: 130 }}
          value={sortValue || undefined}
          onChange={(v) => setParam('sort_value', v || '')}
          options={[{ value: 'asc', label: 'Tăng dần' }, { value: 'desc', label: 'Giảm dần' }]}
        />
      </Space>

      {/* Bulk actions */}
      {selectedRowKeys.length > 0 && (
        <Space style={{ marginBottom: 12 }} wrap>
          <span style={{ color: '#666' }}>Đã chọn {selectedRowKeys.length} task:</span>
          <Select
            placeholder="Đổi trạng thái hàng loạt"
            style={{ width: 200 }}
            onChange={(v) => handleBulk('status', v)}
            options={TASK_STATUS_OPTIONS}
          />
          <Popconfirm title="Xóa các task đã chọn?" onConfirm={() => handleBulk('deleted', true)} okText="Xóa" cancelText="Hủy">
            <Button danger icon={<DeleteOutlined />}>Xóa hàng loạt</Button>
          </Popconfirm>
        </Space>
      )}

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={columns}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: [4, 8, 12, 20, 50] as any,
          showTotal: (t) => `Tổng ${t} task`,
          onChange: (p, ps) => { setPage(p); setLimit(ps); },
          onShowSizeChange: (_, ps) => { setPage(1); setLimit(ps); },
        }}
      />

      <TaskForm
        open={formOpen}
        loading={formLoading}
        initialValues={editing || undefined}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
      />
    </Card>
  );
}
