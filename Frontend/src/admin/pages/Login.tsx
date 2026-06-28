import { Button, Card, Form, Input, Typography, message } from 'antd';
import { adminLogin } from '../api/auth';
import { setAdminAuth } from '../store/auth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      const res = await adminLogin(values);
      setAdminAuth(res.accessToken, res.refreshToken);
      message.success('Đăng nhập thành công');
      const from = location.state?.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card
        title={
          <div style={{ textAlign: 'center' }}>
            <LockOutlined style={{ fontSize: 32, color: '#1677ff', display: 'block', marginBottom: 8 }} />
            <span>Admin Panel</span>
          </div>
        }
        style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input placeholder="admin@example.com" size="large" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password placeholder="••••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Đăng nhập Admin
          </Button>
          <Typography.Paragraph style={{ marginTop: 16, textAlign: 'center' }}>
            <Link to="/login">← Về trang người dùng</Link>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
