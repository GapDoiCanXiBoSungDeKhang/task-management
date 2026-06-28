import { Button, Card, Form, Input, Typography, message } from 'antd';
import { forgotPassword } from '../api/user';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const onFinish = async (values: { email: string }) => {
    try {
      await forgotPassword(values);
      message.success('Đã gửi mã OTP vào email');
      navigate('/otp', { state: { email: values.email } });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi gửi OTP');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Card title="Quên mật khẩu" style={{ width: 400 }}>
        <Typography.Paragraph type="secondary">
          Nhập email của bạn để nhận mã OTP đặt lại mật khẩu.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input placeholder="you@example.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Gửi OTP</Button>
          <Typography.Paragraph style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/login">← Quay lại đăng nhập</Link>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
