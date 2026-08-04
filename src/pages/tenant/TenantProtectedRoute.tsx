import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/redux-hooks';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import type { ReactElement } from 'react';

interface TenantProtectedRouteProps {
  children: React.ReactNode;
}

const TenantProtectedRoute = ({ children }: TenantProtectedRouteProps): ReactElement => {
  const { isAuthenticated, roles, tenantId } = useAppSelector((state) => state.auth);
  
  // Fetch and apply tenant theme
  useTenantTheme();

  if (!isAuthenticated) {
    return <Navigate to="/tenant/login" replace />;
  }

  // Check if user has super_admin role or is a platform user - if yes, redirect to super admin dashboard
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
  const hasSuperAdminRole = rolesArray.includes('super_admin');
  const isPlatformUser = hasSuperAdminRole || tenantId === '00000000-0000-0000-0000-000000000001';
  
  if (isPlatformUser) {
    // If platform user or super_admin, redirect to super admin dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default TenantProtectedRoute;
