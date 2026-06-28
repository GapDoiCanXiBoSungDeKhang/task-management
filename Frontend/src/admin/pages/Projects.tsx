import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Card, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Select,
  Skeleton, Space, Table, Tabs, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, RedoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_COLOR, ProjectStatus } from '../../types';
import {
  fetchAdminProjectDropdowns, fetchAdminProjects, fetchAdminProjectDetail,
  createAdminProject, editAdminProject, deleteAdminProject, changeAdminProjectStatus,
  changeMultiAdminProjects, fetchAdminProjectsTrash, deleteAdminProjectPermanently,
  restoreAdminProject, changeMultiAdminProjectsTrash,
} from '../api/projects';

function ProjectFormModal({ open, loading, editing, adminOptions, onCancel, onSubmit }: any) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({
          title: editing.title,
          description: editing.description,
          status: editing.status,
          deadline: editing.deadline ? dayjs(editing.deadline) : undefined,
          members: editing.members || [],
        });
      } else {
        form.resetFields();
        form.setFieldValue('status', 'active');
      }
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const vals = await form.validateFields();
    onSubmit({
      ...vals,
      deadline: vals.deadline?.toISOString() || undefined,
    });
  };

  return (
    <Modal title={editing ? 'Chỉnh sửa Dự án' : 'Tạo Dự án mới'} open={open}
      onCancel={onCancel} onOk={handleOk} confirmLoading={loading}
      okText={editing ? 'Lưu' : 'Tạo'} cancelText="Hủy" destroyOnClose width={560}>
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Tên dự án" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="status" label="Trạng thái" initialValue="active">
          <Select options={PROJECT_STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item name="deadline" label="Deadline">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="members" label="Thành viên (Admin)">
          <Select mode="multiple" options={adminOptions}
            placeholder="Chọn thành viên admin"
            showSearch filterOption={(input, opt) => (opt?.label as string).toLowerCase().includes(input.toLowerCase())} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ProjectDetailModal({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || !open) return;
    setLoading(true);
    fetchAdminProjectDetail(id)
      .then(res => setProject(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, open]);

  return (
    <Modal title="Chi tiết Dự án" open={open} onCancel={onClose} footer={null} width={640}>
      {loading ? <Skeleton active /> : project ? (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Tên dự án">{project.title}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={(PROJECT_STATUS_COLOR as any)[project.status]}>
              {PROJECT_STATUS_OPTIONS.find(o => o.value === project.status)?.label || project.status}
            </Tag>
          </Descriptions.Item>
          {project.description && <Descriptions.Item label="Mô tả"><div style={{ whiteSpace: 'pre-wrap' }}>{project.description}</div></Descriptions.Item>}
          <Descriptions.Item label="Deadline">
            {project.deadline ? dayjs(project.deadline).format('DD/MM/YYYY') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Tạo bởi">{project.createdBy?.fullName || '—'}</Descriptions.Item>
          {project.updatedBy?.length > 0 && (
            <Descriptions.Item label="Cập nhật gần nhất">
              {project.updatedBy[project.updatedBy.length - 1]?.fullName || '—'}
              {' — '}
              {project.updatedBy[project.updatedBy.length - 1]?.title || ''}
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : null}
    </Modal>
  );
}

export default function AdminProjects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [trashData, setTrashData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [trashTotal, setTrashTotal] = useState(0);
  const [adminOptions, setAdminOptions] = useState<any[]>([]);
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
      const res = await fetchAdminProjects({ page, limit, keyword: keyword || undefined, status: status || undefined });
      setData(res.data || []); setTotal(res.totalProjects || 0);
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
    finally { setLoading(false); }
  }

  async function loadTrash() {
    try {
      const res = await fetchAdminProjectsTrash({ page: trashPage, limit });
      setTrashData(res.data || []); setTrashTotal(res.pagination?.totalItems || 0);
    } catch { }
  }

  useEffect(() => {
    fetchAdminProjectDropdowns().then(res => {
      setAdminOptions((res.data || []).map((a: any) => ({ value: a._id, label: a.fullName })));
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); loadTrash(); }, [searchParams.toString()]);

  const handleSubmit = async (payload: any) => {
    setFormLoading(true);
    try {
      if (editing?._id) { await editAdminProject(editing._id, payload); message.success('Cập nhật thành công'); }
      else { await createAdminProject(payload); message.success('Tạo thành công'); }
      setFormOpen(false); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteAdminProject(id); message.success('Xóa thành công'); load(); loadTrash(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulk = async (key: string, value: any) => {
    if (!selectedRowKeys.length) { message.warning('Chọn ít nhất 1 dự án'); return; }
    try {
      await changeMultiAdminProjects(selectedRowKeys as string[], key, value);
      message.success('Thành công'); setSelectedRowKeys([]); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulkTrash = async (key: string, value: any) => {
    if (!trashSelectedKeys.length) return;
    try {
      await changeMultiAdminProjectsTrash(trashSelectedKeys as string[], key, value);
      message.success('Thành công'); setTrashSelectedKeys([]); load(); loadTrash();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    { title: 'Tên dự án', dataIndex: 'title', ellipsis: true, render: (v, r) => (
      <a onClick={() => setDetailId(r._id)} style={{ fontWeight: 500 }}>{v}</a>
    )},
    { title: 'Trạng thái', dataIndex: 'status', render: (v: ProjectStatus) => (
      <Tag color={(PROJECT_STATUS_COLOR as any)[v]}>{PROJECT_STATUS_OPTIONS.find(o => o.value === v)?.label || v}</Tag>
    )},
    { title: 'Deadline', dataIndex: 'deadline', render: (v) => {
      if (!v) return '—';
      const diff = dayjs(v).diff(dayjs(), 'day');
      if (diff < 0) return <Tag color="red">Quá hạn</Tag>;
      if (diff <= 7) return <Tag color="orange">{dayjs(v).format('DD/MM/YYYY')}</Tag>;
      return dayjs(v).format('DD/MM/YYYY');
    }},
    { title: 'Tạo bởi', dataIndex: ['createdBy', 'fullName'], render: (v) => v || '—' },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small" wrap>
          <Select size="small" style={{ width: 140 }} value={r.status}
            onChange={(v) => changeAdminProjectStatus(r._id, v).then(() => { message.success('Đã cập nhật'); load(); })}
            options={PROJECT_STATUS_OPTIONS} />
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailId(r._id)}>Chi tiết</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setFormOpen(true); }}>Sửa</Button>
          <Popconfirm title="Xóa dự án?" onConfirm={() => handleDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const trashColumns: ColumnsType<any> = [
    { title: 'Tên dự án', dataIndex: 'title', ellipsis: true },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: ProjectStatus) => (
      <Tag color={(PROJECT_STATUS_COLOR as any)[v]}>{PROJECT_STATUS_OPTIONS.find(o => o.value === v)?.label || v}</Tag>
    )},
    { title: 'Xóa bởi', dataIndex: ['deletedBy', 'fullName'], render: (v) => v || '—' },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<RedoOutlined />}
            onClick={() => restoreAdminProject(r._id).then(() => { message.success('Khôi phục thành công'); load(); loadTrash(); })}>
            Khôi phục
          </Button>
          <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => deleteAdminProjectPermanently(r._id).then(() => { message.success('Đã xóa'); loadTrash(); })} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger>Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Dự án"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>Tạo Dự án</Button>}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'active', label: 'Danh sách',
          children: (
            <>
              <Space wrap style={{ marginBottom: 16 }}>
                <Input.Search placeholder="Tìm tên, mô tả" allowClear value={keyword}
                  onChange={(e) => setParam('keyword', e.target.value)} style={{ width: 280 }} />
                <Select placeholder="Trạng thái" allowClear style={{ width: 170 }}
                  value={status || undefined}
                  onChange={(v) => setParam('status', v || '')} options={PROJECT_STATUS_OPTIONS} />
              </Space>
              {selectedRowKeys.length > 0 && (
                <Space style={{ marginBottom: 12 }}>
                  <span style={{ color: '#666' }}>Đã chọn {selectedRowKeys.length}:</span>
                  <Select placeholder="Đổi trạng thái" style={{ width: 180 }}
                    onChange={(v) => handleBulk('status', v)} options={PROJECT_STATUS_OPTIONS} />
                  <Popconfirm title="Xóa các dự án?" onConfirm={() => handleBulk('deleted', true)} okText="Xóa" cancelText="Hủy">
                    <Button danger icon={<DeleteOutlined />}>Xóa hàng loạt</Button>
                  </Popconfirm>
                </Space>
              )}
              <Table rowKey="_id" loading={loading} dataSource={data} columns={columns}
                rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                pagination={{ current: page, pageSize: limit, total, showSizeChanger: true, showTotal: (t) => `Tổng ${t}`,
                  onChange: (p, ps) => { const sp = new URLSearchParams(searchParams.toString()); sp.set('page', String(p)); sp.set('limit', String(ps)); setSearchParams(sp); } }} />
            </>
          ),
        },
        {
          key: 'trash', label: `Thùng rác (${trashTotal})`,
          children: (
            <>
              {trashSelectedKeys.length > 0 && (
                <Space style={{ marginBottom: 12 }}>
                  <Button icon={<RedoOutlined />} onClick={() => handleBulkTrash('restore', false)}>Khôi phục hàng loạt</Button>
                  <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => handleBulkTrash('deleted-permanently', true)} okText="Xóa" cancelText="Hủy">
                    <Button danger>Xóa vĩnh viễn hàng loạt</Button>
                  </Popconfirm>
                </Space>
              )}
              <Table rowKey="_id" dataSource={trashData} columns={trashColumns}
                rowSelection={{ selectedRowKeys: trashSelectedKeys, onChange: setTrashSelectedKeys }}
                pagination={{ current: trashPage, pageSize: limit, total: trashTotal, showTotal: (t) => `Tổng ${t}`,
                  onChange: (p) => { const sp = new URLSearchParams(searchParams.toString()); sp.set('trash_page', String(p)); setSearchParams(sp); } }} />
            </>
          ),
        },
      ]} />

      <ProjectFormModal open={formOpen} loading={formLoading} editing={editing}
        adminOptions={adminOptions} onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
      <ProjectDetailModal id={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </Card>
  );
}
