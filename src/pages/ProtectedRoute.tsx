import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux-hooks';
import type { ReactElement } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps): ReactElement => {
  const { isAuthenticated, roles, tenantId } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if user has super_admin role or is a platform user
  // Handle both array and JSON string formats
  let rolesArray: string[] = [];
  if (Array.isArray(roles)) {
    rolesArray = roles;
  } else if (typeof roles === 'string') {
    try {
      rolesArray = JSON.parse(roles);
    } catch {
      rolesArray = [];
    }
  }
  const hasSuperAdminRole = rolesArray && rolesArray.length > 0 && rolesArray.includes('super_admin');
  const isPlatformUser = hasSuperAdminRole || tenantId === '00000000-0000-0000-0000-000000000001';
  
  if (!isPlatformUser) {
    // If not a platform user, redirect to tenant login
    return <Navigate to="/tenant/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
