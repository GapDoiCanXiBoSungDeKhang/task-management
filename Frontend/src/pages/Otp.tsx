import { Button, Card, Form, Input, Typography, message } from 'antd';
import { otpPassword } from '../api/user';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { setAuth } from '../store/auth';

export default function Otp() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const email = location.state?.email || '';

  const onFinish = async (values: { email: string; otp: string }) => {
    try {
      const res = await otpPassword(values);
      setAuth(res.accessToken, res.refreshToken);
      message.success('Xác thực thành công, hãy đặt lại mật khẩu');
      navigate('/reset');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'OTP không hợp lệ');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Card title="Xác thực OTP" style={{ width: 400 }}>
        <Typography.Paragraph type="secondary">
          Nhập mã OTP đã được gửi đến email của bạn.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Mã OTP" name="otp" rules={[{ required: true, message: 'Nhập mã OTP' }]}>
            <Input placeholder="Nhập mã OTP 8 chữ số" maxLength={8} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Xác thực</Button>
          <Typography.Paragraph style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/forgot">← Gửi lại OTP</Link>
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
