import { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';

// Lazy load route components for code splitting
const Login = lazy(() => import('@/pages/Login'));
const TenantLogin = lazy(() => import('@/pages/tenant/TenantLogin'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

// Loading fallback component
const RouteLoader = (): ReactElement => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-sm text-[#6b7280]">Loading...</div>
  </div>
);

// Wrapper component with Suspense
const LazyRoute = ({ component: Component }: { component: React.ComponentType }): ReactElement => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
);

export interface RouteConfig {
  path: string;
  element: ReactElement;
}

// Public routes (no authentication required)
export const publicRoutes: RouteConfig[] = [
  {
    path: '/',
    element: <LazyRoute component={Login} />,
  },
  {
    path: '/forgot-password',
    element: <LazyRoute component={ForgotPassword} />,
  },
  {
    path: '/reset-password',
    element: <LazyRoute component={ResetPassword} />,
  },
  {
    path: '/tenant/login',
    element: <LazyRoute component={TenantLogin} />,
  },
  {
    path: '/tenant/forgot-password',
    element: <LazyRoute component={ForgotPassword} />,
  },
  {
    path: '/tenant/reset-password',
    element: <LazyRoute component={ResetPassword} />,
  },
];
