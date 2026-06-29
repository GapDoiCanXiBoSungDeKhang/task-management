import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Avatar, Button, Card, Form, Input, Modal, Popconfirm, Select,
  Space, Table, Tabs, Tag, Upload, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, RedoOutlined, EyeOutlined } from '@ant-design/icons';
import {
  fetchAdminUsers, createAdminUser, editAdminUser, deleteAdminUser,
  changeAdminUserStatus, changeMultiAdminUsers,
  fetchAdminUsersTrash, deleteAdminUserPermanently, restoreAdminUser,
  changeMultiAdminUsersTrash,
} from '../api/users';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Bị khóa' },
];

function UserFormModal({
  open, loading, editing, onCancel, onSubmit,
}: {
  open: boolean; loading: boolean; editing: any; onCancel: () => void; onSubmit: (fd: FormData) => void;
}) {
  const [form] = Form.useForm();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        form.setFieldsValue({ fullName: editing.fullName, email: editing.email, phone: editing.phone, status: editing.status });
        setAvatarPreview(editing.avatar || null);
      } else {
        form.resetFields();
        setAvatarPreview(null);
      }
      setAvatarFile(null);
    }
  }, [open, editing, form]);

  const handleOk = async () => {
    const vals = await form.validateFields();
    const fd = new FormData();
    Object.entries(vals).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'confirmPassword') fd.append(k, v as string);
    });
    if (avatarFile) fd.append('avatar', avatarFile);
    onSubmit(fd);
  };

  return (
    <Modal
      title={editing ? 'Chỉnh sửa người dùng' : 'Tạo người dùng'}
      open={open} onCancel={onCancel} onOk={handleOk}
      confirmLoading={loading} okText={editing ? 'Lưu' : 'Tạo'} cancelText="Hủy" destroyOnClose
    >
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Avatar size={72} src={avatarPreview} icon={<UserOutlined />} />
        <div style={{ marginTop: 8 }}>
          <Upload beforeUpload={(f) => { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); return false; }}
            showUploadList={false} accept="image/*">
            <Button size="small">Chọn ảnh</Button>
          </Upload>
        </div>
      </div>
      <Form form={form} layout="vertical">
        <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
        {!editing && (
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        )}
        <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
        <Form.Item name="status" label="Trạng thái" initialValue="active">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
        {!editing && (
          <>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
            <Form.Item name="confirmPassword" label="Xác nhận mật khẩu"
              dependencies={['password']}
              rules={[{ required: true }, ({ getFieldValue }) => ({
                validator(_, v) {
                  if (!v || getFieldValue('password') === v) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu không khớp'));
                },
              })]}>
              <Input.Password />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [trashData, setTrashData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [trashTotal, setTrashTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [trashSelectedKeys, setTrashSelectedKeys] = useState<React.Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
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
      const res = await fetchAdminUsers({ page, limit, keyword: keyword || undefined, status: status || undefined });
      setData(res.data || []); setTotal(res.pagination?.totalItems || 0);
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
    finally { setLoading(false); }
  }

  async function loadTrash() {
    try {
      const res = await fetchAdminUsersTrash({ page: trashPage, limit });
      setTrashData(res.data || []); setTrashTotal(res.pagination?.totalItems || 0);
    } catch { }
  }

  useEffect(() => { load(); loadTrash(); }, [searchParams.toString()]);

  const handleSubmit = async (fd: FormData) => {
    setFormLoading(true);
    try {
      if (editing?._id) { await editAdminUser(editing._id, fd); message.success('Cập nhật thành công'); }
      else { await createAdminUser(fd); message.success('Tạo thành công'); }
      setFormOpen(false); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteAdminUser(id); message.success('Xóa thành công'); load(); loadTrash(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleRestore = async (id: string) => {
    try { await restoreAdminUser(id); message.success('Khôi phục thành công'); load(); loadTrash(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handlePermanentDelete = async (id: string) => {
    try { await deleteAdminUserPermanently(id); message.success('Xóa vĩnh viễn thành công'); loadTrash(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulk = async (key: string, value: any) => {
    if (!selectedRowKeys.length) { message.warning('Chọn ít nhất 1 người dùng'); return; }
    try {
      await changeMultiAdminUsers(selectedRowKeys as string[], key, value);
      message.success('Thành công'); setSelectedRowKeys([]); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulkTrash = async (key: string, value: any) => {
    if (!trashSelectedKeys.length) return;
    try {
      await changeMultiAdminUsersTrash(trashSelectedKeys as string[], key, value);
      message.success('Thành công'); setTrashSelectedKeys([]); load(); loadTrash();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Người dùng', render: (_, r) => (
        <Space>
          <Avatar size={36} src={r.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{r.fullName}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    { title: 'SĐT', dataIndex: 'phone', render: (v) => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status',
      render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? 'Hoạt động' : 'Bị khóa'}</Tag>,
    },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small" wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/admin/users/${r._id}`)}>Chi tiết</Button>
          <Select size="small" style={{ width: 130 }} value={r.status}
            onChange={(v) => changeAdminUserStatus(r._id, v).then(() => { message.success('Đã cập nhật'); load(); })}
            options={STATUS_OPTIONS} />
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); setFormOpen(true); }}>Sửa</Button>
          <Popconfirm title="Xóa người dùng này?" onConfirm={() => handleDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const trashColumns: ColumnsType<any> = [
    {
      title: 'Người dùng', render: (_, r) => (
        <Space>
          <Avatar size={32} src={r.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{r.fullName}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    { title: 'Xóa bởi', dataIndex: ['deletedBy', 'fullName'], render: (v) => v || '—' },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<RedoOutlined />} onClick={() => handleRestore(r._id)}>Khôi phục</Button>
          <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => handlePermanentDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger>Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Người dùng"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setFormOpen(true); }}>Tạo người dùng</Button>}
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
                  <Input.Search placeholder="Tìm tên, email, SĐT" allowClear value={keyword}
                    onChange={(e) => setParam('keyword', e.target.value)} style={{ width: 280 }} />
                  <Select placeholder="Trạng thái" allowClear style={{ width: 160 }}
                    value={status || undefined}
                    onChange={(v) => setParam('status', v || '')} options={STATUS_OPTIONS} />
                </Space>
                {selectedRowKeys.length > 0 && (
                  <Space style={{ marginBottom: 12 }}>
                    <span style={{ color: '#666' }}>Đã chọn {selectedRowKeys.length}:</span>
                    <Select placeholder="Đổi trạng thái" style={{ width: 180 }}
                      onChange={(v) => handleBulk('status', v)} options={STATUS_OPTIONS} />
                    <Popconfirm title="Xóa các người dùng đã chọn?" onConfirm={() => handleBulk('deleted', true)} okText="Xóa" cancelText="Hủy">
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
            key: 'trash',
            label: `Thùng rác (${trashTotal})`,
            children: (
              <>
                {trashSelectedKeys.length > 0 && (
                  <Space style={{ marginBottom: 12 }}>
                    <span style={{ color: '#666' }}>Đã chọn {trashSelectedKeys.length}:</span>
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
        ]}
      />
      <UserFormModal open={formOpen} loading={formLoading} editing={editing}
        onCancel={() => setFormOpen(false)} onSubmit={handleSubmit} />
    </Card>
  );
}
