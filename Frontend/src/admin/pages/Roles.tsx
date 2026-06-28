import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button, Card, Checkbox, Form, Input, Modal, Popconfirm,
  Space, Table, Tag, message, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchRoles, createRole, editRole, deleteRole, deleteMultipleRoles } from '../api/roles';
import dayjs from 'dayjs';

// All permissions in the system (based on backend role checks)
const ALL_PERMISSIONS = [
  { group: 'Tasks', perms: ['tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete'] },
  { group: 'Projects', perms: ['projects_view', 'projects_create', 'projects_edit', 'projects_delete'] },
  { group: 'Accounts', perms: ['accounts_view', 'accounts_create', 'accounts_edit', 'accounts_delete'] },
  { group: 'Users', perms: ['users_view', 'users_create', 'users_edit', 'users_delete'] },
  { group: 'Roles', perms: ['roles_view', 'roles_create', 'roles_edit', 'roles_delete'] },
];

const PERM_LABELS: Record<string, string> = {
  tasks_view: 'Xem', tasks_create: 'Tạo', tasks_edit: 'Sửa', tasks_delete: 'Xóa',
  projects_view: 'Xem', projects_create: 'Tạo', projects_edit: 'Sửa', projects_delete: 'Xóa',
  accounts_view: 'Xem', accounts_create: 'Tạo', accounts_edit: 'Sửa', accounts_delete: 'Xóa',
  users_view: 'Xem', users_create: 'Tạo', users_edit: 'Sửa', users_delete: 'Xóa',
  roles_view: 'Xem', roles_create: 'Tạo', roles_edit: 'Sửa', roles_delete: 'Xóa',
};

export default function Roles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '4');
  const keyword = searchParams.get('keyword') || '';

  function setParam(key: string, val: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val); else sp.delete(key);
    if (key !== 'page') sp.set('page', '1');
    setSearchParams(sp);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetchRoles({ page, limit, keyword: keyword || undefined });
      setData(res.data || []);
      setTotal(res.pagination?.totalItems || 0);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [searchParams.toString()]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('permissions', []);
    setFormOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      permissions: record.permissions || [],
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setFormLoading(true);
      if (editing?._id) {
        await editRole(editing._id, vals);
        message.success('Cập nhật nhóm quyền thành công');
      } else {
        await createRole(vals);
        message.success('Tạo nhóm quyền thành công');
      }
      setFormOpen(false); load();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || 'Lỗi');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteRole(id); message.success('Xóa thành công'); load(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulkDelete = async () => {
    if (!selectedRowKeys.length) return;
    try {
      await deleteMultipleRoles(selectedRowKeys as string[]);
      message.success('Xóa thành công'); setSelectedRowKeys([]); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Tên nhóm quyền',
      dataIndex: 'title',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          {r.description && <div style={{ color: '#888', fontSize: 12 }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      render: (perms: string[]) => (
        <Space size={[4, 4]} wrap style={{ maxWidth: 480 }}>
          {(perms || []).map(p => <Tag key={p} color="blue" style={{ fontSize: 11 }}>{p}</Tag>)}
        </Space>
      ),
    },
    {
      title: 'Tạo bởi',
      dataIndex: ['createdBy', 'accountFullName'],
      render: (v) => v || '—',
    },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa nhóm quyền này?" onConfirm={() => handleDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Nhóm quyền"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo nhóm quyền</Button>}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm tên nhóm quyền" allowClear
          value={keyword}
          onChange={(e) => setParam('keyword', e.target.value)}
          style={{ width: 280 }}
        />
        {selectedRowKeys.length > 0 && (
          <Popconfirm title={`Xóa ${selectedRowKeys.length} nhóm quyền?`} onConfirm={handleBulkDelete} okText="Xóa" cancelText="Hủy">
            <Button danger icon={<DeleteOutlined />}>Xóa hàng loạt ({selectedRowKeys.length})</Button>
          </Popconfirm>
        )}
      </Space>

      <Table
        rowKey="_id" loading={loading} dataSource={data} columns={columns}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pagination={{
          current: page, pageSize: limit, total,
          showSizeChanger: true, showTotal: (t) => `Tổng ${t} nhóm quyền`,
          onChange: (p, ps) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set('page', String(p)); sp.set('limit', String(ps));
            setSearchParams(sp);
          },
        }}
      />

      <Modal
        title={editing ? 'Chỉnh sửa nhóm quyền' : 'Tạo nhóm quyền mới'}
        open={formOpen} onCancel={() => setFormOpen(false)}
        onOk={handleSubmit} confirmLoading={formLoading}
        okText={editing ? 'Lưu' : 'Tạo'} cancelText="Hủy"
        destroyOnClose width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tên nhóm quyền" rules={[{ required: true, message: 'Nhập tên nhóm quyền' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="permissions" label="Phân quyền">
            <Checkbox.Group style={{ width: '100%' }}>
              {ALL_PERMISSIONS.map(({ group, perms }) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 6, color: '#1677ff' }}>
                    {group}
                  </Typography.Text>
                  <Space wrap>
                    {perms.map(p => (
                      <Checkbox key={p} value={p}>
                        {PERM_LABELS[p] || p}
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
