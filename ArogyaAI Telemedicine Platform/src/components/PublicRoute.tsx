import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user } = useAuth();

  // If user is logged in, redirect to their dashboard
  if (user && user.role) {
    switch (user.role) {
      case 'patient':
        return <Navigate to="/patient/dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/patient/dashboard" replace />;
    }
  }

  // If not logged in, show the public page
  return <>{children}</>;
}