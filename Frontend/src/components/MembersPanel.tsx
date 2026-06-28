import { Empty, List, Tag, Typography } from 'antd';
import { UserOutlined, CrownOutlined } from '@ant-design/icons';

interface Props {
  admin?: any[];
  user?: any[];
}

export default function MembersPanel({ admin = [], user = [] }: Props) {
  const total = admin.length + user.length;
  if (total === 0) return <Empty description="Chưa có thành viên" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div>
      {admin.length > 0 && (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            <CrownOutlined /> Admin ({admin.length})
          </Typography.Text>
          <List
            dataSource={admin}
            renderItem={(a: any) => (
              <List.Item style={{ padding: '6px 0' }}>
                <Tag icon={<CrownOutlined />} color="gold">{a.fullName}</Tag>
              </List.Item>
            )}
            style={{ marginBottom: 16 }}
          />
        </>
      )}
      {user.length > 0 && (
        <>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            <UserOutlined /> Thành viên ({user.length})
          </Typography.Text>
          <List
            dataSource={user}
            renderItem={(u: any) => (
              <List.Item style={{ padding: '6px 0' }}>
                <Tag icon={<UserOutlined />} color="blue">{u.fullName}</Tag>
              </List.Item>
            )}
          />
        </>
      )}
    </div>
  );
}
