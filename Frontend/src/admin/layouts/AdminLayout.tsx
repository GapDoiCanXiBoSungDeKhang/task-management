import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Layout, Menu, Space, Typography, message } from 'antd';
import {
  DashboardOutlined, UserOutlined, ProjectOutlined,
  CheckSquareOutlined, SafetyOutlined, LogoutOutlined, SettingOutlined,
} from '@ant-design/icons';
import { clearAdminAuth } from '../store/auth';
import { getAdminProfile } from '../api/profile';
import SafeAvatar from '../../components/SafeAvatar';

const { Sider, Header, Content } = Layout;

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    getAdminProfile().then(res => setAccount(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    clearAdminAuth();
    message.success('Đã đăng xuất');
    navigate('/admin/login');
  };

  const selectedKey = (() => {
    const p = location.pathname;
    if (p.startsWith('/admin/dashboard') || p === '/admin' || p === '/admin/') return 'dashboard';
    if (p.startsWith('/admin/accounts')) return 'accounts';
    if (p.startsWith('/admin/users')) return 'users';
    if (p.startsWith('/admin/projects')) return 'projects';
    if (p.startsWith('/admin/tasks')) return 'tasks';
    if (p.startsWith('/admin/roles')) return 'roles';
    if (p.startsWith('/admin/profile')) return 'profile';
    return 'dashboard';
  })();

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/admin/dashboard">Dashboard</Link> },
    { key: 'accounts', icon: <SafetyOutlined />, label: <Link to="/admin/accounts">Tài khoản Admin</Link> },
    { key: 'roles', icon: <SettingOutlined />, label: <Link to="/admin/roles">Nhóm quyền</Link> },
    { key: 'users', icon: <UserOutlined />, label: <Link to="/admin/users">Người dùng</Link> },
    { key: 'projects', icon: <ProjectOutlined />, label: <Link to="/admin/projects">Dự án</Link> },
    { key: 'tasks', icon: <CheckSquareOutlined />, label: <Link to="/admin/tasks">Tasks</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={220}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!collapsed && (
            <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
              ⚙ Admin Panel
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px', display: 'flex',
          alignItems: 'center', justifyContent: 'flex-end',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: <Link to="/admin/profile">Hồ sơ</Link> },
                { type: 'divider' },
                {
                  key: 'logout', icon: <LogoutOutlined />,
                  label: <a onClick={handleLogout}>Đăng xuất</a>,
                  danger: true,
                },
              ],
            }}
            placement="bottomRight"
          >
            <Space style={{ cursor: 'pointer' }}>
              <SafeAvatar src={account?.avatar} name={account?.fullName} size={32} />
              <span style={{ fontWeight: 500 }}>{account?.fullName || 'Admin'}</span>
              {account?.role && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  ({account.role})
                </Typography.Text>
              )}
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
