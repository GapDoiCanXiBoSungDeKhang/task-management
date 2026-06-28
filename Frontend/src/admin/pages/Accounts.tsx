import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Avatar, Button, Card, Form, Input, Modal, Popconfirm, Select,
  Space, Table, Tag, Upload, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import {
  fetchAccounts, createAccount, editAccount, deleteAccount,
  changeAccountStatus, changeMultiAccounts,
} from '../api/accounts';
import { fetchRoles } from '../api/roles';

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Bị khóa' },
];

export default function Accounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [form] = Form.useForm();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '4');
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';

  function setParam(key: string, val: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (val) sp.set(key, val); else sp.delete(key);
    if (key !== 'page') sp.set('page', '1');
    setSearchParams(sp);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAccounts({ page, limit, keyword: keyword || undefined, status: status || undefined });
      setData(res.data || []);
      setTotal(res.pagination?.totalItems || 0);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải dữ liệu');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [searchParams.toString()]);
  useEffect(() => {
    fetchRoles().then(res => setRoles(res.data || [])).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null); setAvatarFile(null); setAvatarPreview(null);
    form.resetFields(); setFormOpen(true);
  };
  const openEdit = (record: any) => {
    setEditing(record); setAvatarFile(null);
    setAvatarPreview(record.avatar || null);
    form.setFieldsValue({
      fullName: record.fullName, email: record.email,
      phone: record.phone, role_id: record.role_id, status: record.status,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const vals = await form.validateFields();
      setFormLoading(true);
      const fd = new FormData();
      Object.entries(vals).forEach(([k, v]) => { if (v !== undefined && v !== null && k !== 'confirmPassword') fd.append(k, v as string); });
      if (avatarFile) fd.append('avatar', avatarFile);
      if (editing?._id) {
        await editAccount(editing._id, fd);
        message.success('Cập nhật thành công');
      } else {
        await createAccount(fd);
        message.success('Tạo tài khoản thành công');
      }
      setFormOpen(false); load();
    } catch (err: any) {
      if (err?.response) message.error(err.response.data?.message || 'Lỗi');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteAccount(id); message.success('Xóa thành công'); load(); }
    catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const handleBulk = async (key: string, value: any) => {
    if (!selectedRowKeys.length) { message.warning('Chọn ít nhất 1 tài khoản'); return; }
    try {
      await changeMultiAccounts(selectedRowKeys as string[], key, value);
      message.success('Cập nhật thành công'); setSelectedRowKeys([]); load();
    } catch (err: any) { message.error(err?.response?.data?.message || 'Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Tài khoản',
      render: (_, r) => (
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
    { title: 'Nhóm quyền', dataIndex: 'roleTitle', render: (v) => v ? <Tag color="blue">{v}</Tag> : '—' },
    {
      title: 'Trạng thái', dataIndex: 'status',
      render: (v) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? 'Hoạt động' : 'Bị khóa'}</Tag>,
    },
    {
      title: 'Hành động', key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Select
            size="small" style={{ width: 120 }} value={r.status}
            onChange={(v) => changeAccountStatus(r._id, v).then(load)}
            options={ACCOUNT_STATUS_OPTIONS}
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Sửa</Button>
          <Popconfirm title="Xóa tài khoản này?" onConfirm={() => handleDelete(r._id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Quản lý Tài khoản Admin"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo tài khoản</Button>}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Tìm tên, email, SĐT"
          allowClear value={keyword}
          onChange={(e) => setParam('keyword', e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          placeholder="Trạng thái" allowClear style={{ width: 160 }}
          value={status || undefined}
          onChange={(v) => setParam('status', v || '')}
          options={ACCOUNT_STATUS_OPTIONS}
        />
      </Space>

      {selectedRowKeys.length > 0 && (
        <Space style={{ marginBottom: 12 }}>
          <span style={{ color: '#666' }}>Đã chọn {selectedRowKeys.length}:</span>
          <Select placeholder="Đổi trạng thái" style={{ width: 180 }}
            onChange={(v) => handleBulk('status', v)} options={ACCOUNT_STATUS_OPTIONS} />
          <Popconfirm title="Xóa các tài khoản đã chọn?" onConfirm={() => handleBulk('deleted', true)} okText="Xóa" cancelText="Hủy">
            <Button danger icon={<DeleteOutlined />}>Xóa hàng loạt</Button>
          </Popconfirm>
        </Space>
      )}

      <Table
        rowKey="_id" loading={loading} dataSource={data} columns={columns}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        pagination={{
          current: page, pageSize: limit, total,
          showSizeChanger: true, showTotal: (t) => `Tổng ${t}`,
          onChange: (p, ps) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set('page', String(p)); sp.set('limit', String(ps));
            setSearchParams(sp);
          },
        }}
      />

      <Modal
        title={editing ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
        open={formOpen} onCancel={() => setFormOpen(false)}
        onOk={handleSubmit} confirmLoading={formLoading}
        okText={editing ? 'Lưu' : 'Tạo'} cancelText="Hủy" destroyOnClose
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
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input />
          </Form.Item>
          {!editing && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="phone" label="SĐT">
            <Input />
          </Form.Item>
          <Form.Item name="role_id" label="Nhóm quyền" rules={[{ required: true, message: 'Chọn nhóm quyền' }]}>
            <Select placeholder="Chọn nhóm quyền"
              options={roles.map(r => ({ value: r._id, label: r.title }))} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="active">
            <Select options={ACCOUNT_STATUS_OPTIONS} />
          </Form.Item>
          {!editing && (
            <>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
                <Input.Password />
              </Form.Item>
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
    </Card>
  );
}
