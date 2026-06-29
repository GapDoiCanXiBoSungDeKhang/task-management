import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb, Button, Card, Descriptions, Empty,
  Skeleton, Space, Tag, Timeline, Typography, message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchAdminUserDetail } from '../api/users';
import SafeAvatar from '../../components/SafeAvatar';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetchAdminUserDetail(id)
      .then(res => setUser(res.data))
      .catch(err => {
        message.error(err?.response?.data?.message || 'Lỗi tải người dùng');
        navigate('/admin/users');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>;
  if (!user) return <Empty description="Không tìm thấy người dùng" />;

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/admin/users">Người dùng</Link> },
          { title: user.fullName },
        ]}
      />

      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/admin/users')} />
            <SafeAvatar src={user.avatar} name={user.fullName} size={40} />
            <div>
              <div style={{ fontWeight: 600 }}>{user.fullName}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{user.email}</div>
            </div>
            <Tag color={user.status === 'active' ? 'green' : 'red'}>
              {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
            </Tag>
          </Space>
        }
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Thông tin cơ bản */}
          <Descriptions bordered column={{ xs: 1, sm: 2 }} title="Thông tin cơ bản">
            <Descriptions.Item label="Họ tên">{user.fullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="SĐT">{user.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={user.status === 'active' ? 'green' : 'red'}>
                {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {user.createdAt ? dayjs(user.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Tạo bởi">
              {user.createdBy?.fullName || user.createdBy?.accountFullName || '—'}
            </Descriptions.Item>
          </Descriptions>

          {/* Lịch sử cập nhật */}
          {user.updatedBy && user.updatedBy.length > 0 && (
            <div>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                Lịch sử cập nhật ({user.updatedBy.length})
              </Typography.Title>
              <Timeline
                items={[...user.updatedBy].reverse().slice(0, 10).map((u: any) => ({
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.title || 'Cập nhật thông tin'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Bởi: {u.accountFullName || u.fullName || '—'} &nbsp;·&nbsp;
                        {u.updatedAt ? dayjs(u.updatedAt).format('DD/MM/YYYY HH:mm') : ''}
                      </div>
                    </div>
                  ),
                }))}
              />
            </div>
          )}
        </Space>
      </Card>
    </>
  );
}
