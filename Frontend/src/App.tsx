import { Avatar, Dropdown, Layout, Menu, Space } from 'antd';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Client pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Otp from './pages/Otp';
import ResetPassword from './pages/ResetPassword';
import TasksList from './pages/TasksList';
import TaskDetail from './pages/TaskDetail';
import ProjectsList from './pages/ProjectsList';
import ProjectDetail from './pages/ProjectDetail';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { getAccessToken, clearAuth } from './store/auth';
import { getProfile } from './api/user';

// Admin
import AdminLogin from './admin/pages/Login';
import AdminLayout from './admin/layouts/AdminLayout';
import AdminProtectedRoute from './admin/components/AdminProtectedRoute';
import Dashboard from './admin/pages/Dashboard';
import Accounts from './admin/pages/Accounts';
import Roles from './admin/pages/Roles';
import AdminUsers from './admin/pages/Users';
import AdminTasks from './admin/pages/Tasks';
import AdminProjects from './admin/pages/Projects';
import AdminProfile from './admin/pages/Profile';

const { Header, Content } = Layout;

function ClientApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = getAccessToken();
  const [user, setUser] = useState<any>();

  const selectedKey = location.pathname.startsWith('/tasks')
    ? 'tasks'
    : location.pathname.startsWith('/projects')
    ? 'projects'
    : '';

  useEffect(() => {
    if (!token) { setUser(undefined); return; }
    getProfile().then(res => setUser(res.data)).catch(() => {});
  }, [token]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginRight: 32, whiteSpace: 'nowrap' }}>
          Task Management
        </div>
        <Menu theme="dark" mode="horizontal" selectedKeys={[selectedKey]} style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: 'tasks', label: <Link to="/tasks">Tasks</Link> },
            { key: 'projects', label: <Link to="/projects">Projects</Link> },
          ]}
        />
        {token ? (
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: <Link to="/profile">Hồ sơ cá nhân</Link> },
                { type: 'divider' },
                { key: 'logout', label: <a onClick={() => { clearAuth(); navigate('/login'); }}>Đăng xuất</a> },
              ],
            }}
            placement="bottomRight"
          >
            <Space style={{ color: '#fff', cursor: 'pointer', marginLeft: 16 }}>
              <Avatar size={32} src={user?.avatar}>{!user?.avatar && (user?.fullName?.[0] || 'U')}</Avatar>
              <span>{user?.fullName || 'User'}</span>
            </Space>
          </Dropdown>
        ) : (
          <Link to="/login" style={{ color: '#fff', marginLeft: 16 }}>Đăng nhập</Link>
        )}
      </Header>
      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/otp" element={<Otp />} />
          <Route path="/reset" element={<ProtectedRoute><ResetPassword /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksList /></ProtectedRoute>} />
          <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsList /></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="roles" element={<Roles />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="tasks" element={<AdminTasks />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    );
  }

  return <ClientApp />;
}
