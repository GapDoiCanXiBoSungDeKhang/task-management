import { Button, Card, Form, Input, Typography, message } from 'antd';
import { register } from '../api/user';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    try {
      await register(values);
      message.success('Đăng ký thành công, vui lòng đăng nhập');
      navigate('/login');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Card title="Đăng ký tài khoản" style={{ width: 420 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Họ tên" name="fullName" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu không khớp'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Đăng ký</Button>
          <Typography.Paragraph style={{ marginTop: 12, textAlign: 'center' }}>
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
