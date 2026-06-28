import { Button, Card, Form, Input, message } from 'antd';
import { resetPassword } from '../api/user';
import { clearAuth } from '../store/auth';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();

  const onFinish = async (values: { password: string }) => {
    try {
      await resetPassword(values);
      message.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại');
      clearAuth();
      navigate('/login');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi đổi mật khẩu');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
      <Card title="Đặt lại mật khẩu" style={{ width: 400 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Mật khẩu mới" name="password" rules={[{ required: true, min: 6, message: 'Tối thiểu 6 ký tự' }]}>
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
          <Button type="primary" htmlType="submit" block>Đặt lại mật khẩu</Button>
        </Form>
      </Card>
    </div>
  );
}
