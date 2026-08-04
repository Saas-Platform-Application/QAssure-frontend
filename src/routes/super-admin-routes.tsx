import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

// Lazy load route components for code splitting
const Dashboard = lazy(() => import("@/pages/superadmin/Dashboard"));
const Tenants = lazy(() => import("@/pages/superadmin/Tenants"));
const CreateTenantWizard = lazy(
  () => import("@/pages/superadmin/CreateTenantWizard"),
);
const EditTenant = lazy(() => import("@/pages/superadmin/EditTenant"));
const TenantDetails = lazy(() => import("@/pages/superadmin/TenantDetails"));
const Modules = lazy(() => import("@/pages/superadmin/Modules"));
const AuditLogs = lazy(() => import("@/pages/superadmin/AuditLogs"));
const Suppliers = lazy(() => import("@/pages/superadmin/Suppliers"));
const NotificationSettings = lazy(() => import("@/pages/tenant/NotificationSettings"));
const Notifications = lazy(() => import("@/pages/tenant/Notifications"));
const AuditLogResourceTypes = lazy(() => import("@/pages/superadmin/AuditLogResourceTypes"));
const NotificationMaster = lazy(() => import("@/pages/superadmin/NotificationMaster"));
const NotificationTemplateMaster = lazy(() => import("@/pages/superadmin/NotificationTemplateMaster"));
const SmtpConfig = lazy(() => import("@/pages/superadmin/SmtpConfig"));
const FailedEmails = lazy(() => import("@/pages/superadmin/FailedEmails"));
const AIFallbackHistory = lazy(() => import("@/pages/superadmin/AIFallbackHistory"));
const PlatformUsers = lazy(() => import("@/pages/superadmin/Users"));
const PlatformRoles = lazy(() => import("@/pages/superadmin/Roles"));
const TenantAdminRole = lazy(() => import("@/pages/superadmin/TenantAdminRole"));
const StorageBuckets = lazy(() => import("@/pages/superadmin/StorageBuckets"));

// Loading fallback component
const RouteLoader = (): ReactElement => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-sm text-[#6b7280]">Loading...</div>
  </div>
);

// Wrapper component with Suspense
const LazyRoute = ({
  component: Component,
}: {
  component: React.ComponentType;
}): ReactElement => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
);

export interface RouteConfig {
  path: string;
  element: ReactElement;
}

// Super Admin routes (requires super_admin role)
export const superAdminRoutes: RouteConfig[] = [
  {
    path: "/dashboard",
    element: <LazyRoute component={Dashboard} />,
  },
  {
    path: "/platform-users",
    element: <LazyRoute component={PlatformUsers} />,
  },
  {
    path: "/platform-roles",
    element: <LazyRoute component={PlatformRoles} />,
  },
  {
    path: "/tenant-admin-role",
    element: <LazyRoute component={TenantAdminRole} />,
  },
  {
    path: "/tenants",
    element: <LazyRoute component={Tenants} />,
  },
  {
    path: "/tenants/create-wizard",
    element: <LazyRoute component={CreateTenantWizard} />,
  },
  {
    path: "/tenants/:id/edit",
    element: <LazyRoute component={EditTenant} />,
  },
  {
    path: "/tenants/:id",
    element: <LazyRoute component={TenantDetails} />,
  },
  {
    path: "/modules",
    element: <LazyRoute component={Modules} />,
  },
  {
    path: "/audit-logs",
    element: <LazyRoute component={AuditLogs} />,
  },
  {
    path: "/suppliers",
    element: <LazyRoute component={Suppliers} />,
  },
  {
    path: "/settings/notifications",
    element: <LazyRoute component={NotificationSettings} />,
  },
  {
    path: "/notifications",
    element: <LazyRoute component={Notifications} />,
  },
  {
    path: "/audit-resource-types",
    element: <LazyRoute component={AuditLogResourceTypes} />,
  },
  {
    path: "/notification-master",
    element: <LazyRoute component={NotificationMaster} />,
  },
  {
    path: "/notification-templates",
    element: <LazyRoute component={NotificationTemplateMaster} />,
  },
  {
    path: "/settings/smtp",
    element: <LazyRoute component={SmtpConfig} />,
  },
  {
    path: "/settings/failed-emails",
    element: <LazyRoute component={FailedEmails} />,
  },
  {
    path: "/settings/ai-fallbacks",
    element: <LazyRoute component={AIFallbackHistory} />,
  },
  {
    path: "/settings/storage-buckets",
    element: <LazyRoute component={StorageBuckets} />,
  },
];
