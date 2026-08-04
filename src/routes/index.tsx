import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import ProtectedRoute from '@/pages/ProtectedRoute';
import TenantProtectedRoute from '@/pages/tenant/TenantProtectedRoute';
import { NavigationInitializer } from '@/components/NavigationInitializer';
import { publicRoutes } from './public-routes';
import { superAdminRoutes } from './super-admin-routes';
import { tenantAdminRoutes } from './tenant-admin-routes';

// Lazy load NotFound page
const NotFound = lazy(() => import('@/pages/NotFound'));

// Loading fallback component
const RouteLoader = (): ReactElement => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-sm text-[#6b7280]">Loading...</div>
  </div>
);

// App Routes Component
export const AppRoutes = (): ReactElement => {
  return (
    <>
      <NavigationInitializer />
      <Routes>
      {/* Public Routes */}
      {publicRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}

      {/* Super Admin Routes */}
      {superAdminRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<ProtectedRoute>{route.element}</ProtectedRoute>}
        />
      ))}

      {/* Tenant Admin Routes */}
      {tenantAdminRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<TenantProtectedRoute>{route.element}</TenantProtectedRoute>}
        />
      ))}

      {/* 404 - Catch all route */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoader />}>
              <NotFound />
            </Suspense>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
};
