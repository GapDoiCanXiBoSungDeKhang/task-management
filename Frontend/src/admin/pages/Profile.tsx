import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Form, Input, Space, Tag, Upload, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getAdminProfile, editAdminProfile } from '../api/profile';

export default function AdminProfile() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [roleTitle, setRoleTitle] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminProfile();
        const u = res.data || {};
        form.setFieldsValue({ fullName: u.fullName, email: u.email, phone: u.phone });
        setAvatarUrl(u.avatar);
        setRoleTitle(u.role);
      } catch (err: any) {
        message.error(err?.response?.data?.message || 'Lỗi tải hồ sơ');
      }
    })();
  }, [form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const fd = new FormData();
      if (values.fullName) fd.append('fullName', values.fullName);
      if (values.phone) fd.append('phone', values.phone);
      if (avatarFile) fd.append('avatar', avatarFile);
      await editAdminProfile(fd);
      message.success('Cập nhật hồ sơ thành công');
      setAvatarFile(null);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Hồ sơ Admin" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Space align="start" size={32} wrap>
        <Space direction="vertical" align="center">
          <Avatar size={96} src={avatarUrl} icon={<UserOutlined />} />
          {roleTitle && <Tag color="gold">{roleTitle}</Tag>}
          <Upload
            beforeUpload={(f) => { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); return false; }}
            showUploadList={false} maxCount={1} accept="image/*"
          >
            <Button size="small">Chọn ảnh</Button>
          </Upload>
        </Space>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ flex: 1, minWidth: 280 }}>
          <Form.Item label="Họ tên" name="fullName" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>Lưu thay đổi</Button>
        </Form>
      </Space>
    </Card>
  );
}
