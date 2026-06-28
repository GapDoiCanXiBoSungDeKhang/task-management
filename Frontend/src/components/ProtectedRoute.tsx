import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../store/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getAccessToken();
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
