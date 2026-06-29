import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Avatar, Breadcrumb, Button, Card, Descriptions, Empty,
  Skeleton, Space, Tag, Timeline, Typography, message,
} from 'antd';
import { ArrowLeftOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { fetchAccountDetail } from '../api/accounts';
import SafeAvatar from '../../components/SafeAvatar';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetchAccountDetail(id)
      .then(res => setAccount(res.data))
      .catch(err => {
        message.error(err?.response?.data?.message || 'Lỗi tải tài khoản');
        navigate('/admin/accounts');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>;
  if (!account) return <Empty description="Không tìm thấy tài khoản" />;

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/admin/accounts">Tài khoản Admin</Link> },
          { title: account.fullName },
        ]}
      />

      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/admin/accounts')} />
            <SafeAvatar src={account.avatar} name={account.fullName} size={40} />
            <div>
              <div style={{ fontWeight: 600 }}>{account.fullName}</div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{account.email}</div>
            </div>
            <Tag color={account.status === 'active' ? 'green' : 'red'}>
              {account.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
            </Tag>
          </Space>
        }
        extra={
          <Button onClick={() => navigate(`/admin/accounts?edit=${id}`)}>Chỉnh sửa</Button>
        }
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Thông tin cơ bản */}
          <Descriptions bordered column={{ xs: 1, sm: 2 }} title="Thông tin cơ bản">
            <Descriptions.Item label="Họ tên">{account.fullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{account.email}</Descriptions.Item>
            <Descriptions.Item label="SĐT">{account.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={account.status === 'active' ? 'green' : 'red'}>
                {account.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {account.createdAt ? dayjs(account.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Tạo bởi">
              {account.createdBy?.accountFullName || '—'}
            </Descriptions.Item>
          </Descriptions>

          {/* Nhóm quyền */}
          {account.role && (
            <Card
              size="small"
              title={
                <Space>
                  <CrownOutlined style={{ color: '#faad14' }} />
                  <span>Nhóm quyền: <strong>{account.role.title}</strong></span>
                </Space>
              }
            >
              {account.role.description && (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  {account.role.description}
                </Typography.Paragraph>
              )}
              <Space wrap>
                {(account.role.permissions || []).map((p: string) => (
                  <Tag key={p} color="blue">{p}</Tag>
                ))}
                {(!account.role.permissions || account.role.permissions.length === 0) && (
                  <Typography.Text type="secondary">Chưa có quyền nào</Typography.Text>
                )}
              </Space>
            </Card>
          )}

          {/* Lịch sử cập nhật */}
          {account.updatedBy && account.updatedBy.length > 0 && (
            <div>
              <Typography.Title level={5} style={{ marginBottom: 12 }}>
                Lịch sử cập nhật ({account.updatedBy.length})
              </Typography.Title>
              <Timeline
                items={[...account.updatedBy].reverse().slice(0, 10).map((u: any) => ({
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.title || 'Cập nhật thông tin'}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Bởi: {u.accountFullName || '—'} &nbsp;·&nbsp;
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
