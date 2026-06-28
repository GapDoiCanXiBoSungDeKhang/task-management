import { Navigate, useLocation } from 'react-router-dom';
import { getAdminAccessToken } from '../store/auth';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getAdminAccessToken();
  const location = useLocation();
  if (!token) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
