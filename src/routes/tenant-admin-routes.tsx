import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

// Lazy load route components for code splitting
const Dashboard = lazy(() => import("@/pages/tenant/Dashboard"));
const Roles = lazy(() => import("@/pages/tenant/Roles"));
const Settings = lazy(() => import("@/pages/tenant/Settings"));
const Users = lazy(() => import("@/pages/tenant/Users"));
const AuditLogs = lazy(() => import("@/pages/tenant/AuditLogs"));
const Modules = lazy(() => import("@/pages/tenant/Modules"));
const LandingPage = lazy(() => import("@/pages/tenant/LandingPage"));
const Departments = lazy(() => import("@/pages/tenant/Departments"));
const Designations = lazy(() => import("@/pages/tenant/Designations"));
const WorkflowDefination = lazy(
  () => import("@/pages/tenant/WorkflowDefination"),
);
const Suppliers = lazy(() => import("@/pages/tenant/Suppliers"));
const Documents = lazy(() => import("@/pages/tenant/Documents"));
const CreateDocument = lazy(() => import("@/pages/tenant/CreateDocument"));
const EditDocument = lazy(() => import("@/pages/tenant/EditDocument"));
const ViewDocument = lazy(() => import("@/pages/tenant/ViewDocument"));
const DocumentCategories = lazy(
  () => import("@/pages/tenant/DocumentCategories"),
);
const DocumentsDueForReview = lazy(
  () => import("@/pages/tenant/DocumentsDueForReview"),
);
const Tasks = lazy(() => import("@/pages/tenant/Tasks"));
const NotificationSettings = lazy(
  () => import("@/pages/tenant/NotificationSettings"),
);
const Notifications = lazy(() => import("@/pages/tenant/Notifications"));
const NotificationTemplates = lazy(
  () => import("@/pages/tenant/NotificationTemplates"),
);
const FilesList = lazy(() => import("@/pages/tenant/FilesList"));
const FileView = lazy(() => import("@/pages/tenant/FileView"));
const StorageDashboard = lazy(() => import("@/pages/tenant/StorageDashboard"));
const SmtpSettings = lazy(() => import("@/pages/tenant/SmtpSettings"));
const FailedEmails = lazy(() => import("@/pages/tenant/FailedEmails"));
// const AIGateway = lazy(() => import("@/pages/tenant/AIGateway"));
const CompletionHistory = lazy(
  () => import("@/pages/tenant/CompletionHistory"),
);
const CompletionCreate = lazy(() => import("@/pages/tenant/CompletionCreate"));
const CompletionDetail = lazy(() => import("@/pages/tenant/CompletionDetail"));
const PromptManagement = lazy(() => import("@/pages/tenant/PromptManagement"));
const PromptCreate = lazy(() => import("@/pages/tenant/PromptCreate"));
const PromptEdit = lazy(() => import("@/pages/tenant/PromptEdit"));
const PromptExecute = lazy(() => import("@/pages/tenant/PromptExecute"));
const PromptExecutions = lazy(() => import("@/pages/tenant/PromptExecutions"));
const PromptTestCases = lazy(() => import("@/pages/tenant/PromptTestCases"));
const PromptTestCaseCreate = lazy(
  () => import("@/pages/tenant/PromptTestCaseCreate"),
);
const TenantAIProviders = lazy(
  () => import("@/pages/tenant/TenantAIProviders"),
);
const TenantAIProviderCreate = lazy(
  () => import("@/pages/tenant/TenantAIProviderCreate"),
);
const TenantAIDashboard = lazy(() => import("@/pages/tenant/TenantAIDashboard"));
const SecurityPolicy = lazy(() => import("@/pages/tenant/SecurityPolicy"));
const ElectronicSignatures = lazy(() => import("@/pages/tenant/ElectronicSignatures"));
const StorageConfig = lazy(() => import("@/pages/tenant/StorageConfig"));

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

// Tenant Admin routes (requires authentication but NOT super_admin role)
export const tenantAdminRoutes: RouteConfig[] = [
  {
    path: "/tenant/landing",
    element: <LazyRoute component={LandingPage} />,
  },
  {
    path: "/tenant",
    element: <LazyRoute component={Dashboard} />,
  },
  {
    path: "/tenant/roles",
    element: <LazyRoute component={Roles} />,
  },
  {
    path: "/tenant/users",
    element: <LazyRoute component={Users} />,
  },
  {
    path: "/tenant/modules",
    element: <LazyRoute component={Modules} />,
  },
  {
    path: "/tenant/audit-logs",
    element: <LazyRoute component={AuditLogs} />,
  },
  {
    path: "/tenant/electronic-signatures",
    element: <LazyRoute component={ElectronicSignatures} />,
  },
  {
    path: "/tenant/settings",
    element: <LazyRoute component={Settings} />,
  },
  {
    path: "/tenant/departments",
    element: <LazyRoute component={Departments} />,
  },
  {
    path: "/tenant/designations",
    element: <LazyRoute component={Designations} />,
  },
  {
    path: "/tenant/workflows/definitions",
    element: <LazyRoute component={WorkflowDefination} />,
  },
  {
    path: "/tenant/suppliers",
    element: <LazyRoute component={Suppliers} />,
  },
  {
    path: "/tenant/documents",
    element: <LazyRoute component={Documents} />,
  },
  {
    path: "/tenant/documents/create",
    element: <LazyRoute component={CreateDocument} />,
  },
  {
    path: "/tenant/documents/edit/:id",
    element: <LazyRoute component={EditDocument} />,
  },
  {
    path: "/tenant/documents/:id",
    element: <LazyRoute component={ViewDocument} />,
  },
  {
    path: "/tenant/documents/categories",
    element: <LazyRoute component={DocumentCategories} />,
  },
  {
    path: "/tenant/documents/due-for-review",
    element: <LazyRoute component={DocumentsDueForReview} />,
  },
  {
    path: "/tenant/workflows/tasks",
    element: <LazyRoute component={Tasks} />,
  },
  {
    path: "/tenant/settings/notifications",
    element: <LazyRoute component={NotificationSettings} />,
  },
  {
    path: "/tenant/notifications",
    element: <LazyRoute component={Notifications} />,
  },
  {
    path: "/tenant/settings/notification-templates",
    element: <LazyRoute component={NotificationTemplates} />,
  },
  {
    path: "/tenant/files",
    element: <LazyRoute component={FilesList} />,
  },
  {
    path: "/tenant/files/:id",
    element: <LazyRoute component={FileView} />,
  },
  {
    path: "/tenant/files/storage-dashboard",
    element: <LazyRoute component={StorageDashboard} />,
  },
  {
    path: "/tenant/settings/smtp",
    element: <LazyRoute component={SmtpSettings} />,
  },
  {
    path: "/tenant/settings/failed-emails",
    element: <LazyRoute component={FailedEmails} />,
  },
  {
    path: "/tenant/ai",
    element: <LazyRoute component={CompletionHistory} />,
  },
  {
    path: "/tenant/ai/completions",
    element: <LazyRoute component={CompletionHistory} />,
  },
  {
    path: "/tenant/ai/completions/create",
    element: <LazyRoute component={CompletionCreate} />,
  },
  {
    path: "/tenant/ai/completions/:completionId",
    element: <LazyRoute component={CompletionDetail} />,
  },
  // {
  //   path: "/tenant/ai/config",
  //   element: <LazyRoute component={AIGateway} />,
  // },
  {
    path: "/tenant/ai/providers",
    element: <LazyRoute component={TenantAIProviders} />,
  },
  {
    path: "/tenant/ai/providers/create",
    element: <LazyRoute component={TenantAIProviderCreate} />,
  },
  {
    path: "/tenant/ai/prompts",
    element: <LazyRoute component={PromptManagement} />,
  },
  {
    path: "/tenant/ai/prompts/create",
    element: <LazyRoute component={PromptCreate} />,
  },
  {
    path: "/tenant/ai/prompts/:id/edit",
    element: <LazyRoute component={PromptEdit} />,
  },
  {
    path: "/tenant/ai/prompts/:id/execute",
    element: <LazyRoute component={PromptExecute} />,
  },
  {
    path: "/tenant/ai/prompts/:id/executions",
    element: <LazyRoute component={PromptExecutions} />,
  },
  {
    path: "/tenant/ai/prompts/:id/test-cases",
    element: <LazyRoute component={PromptTestCases} />,
  },
  {
    path: "/tenant/ai/prompts/:id/test-cases/create",
    element: <LazyRoute component={PromptTestCaseCreate} />,
  },
  {
    path: "/tenant/ai/prompt-test-cases",
    element: <LazyRoute component={PromptTestCases} />,
  },
  {
    path: "/tenant/ai/dashboard",
    element: <LazyRoute component={TenantAIDashboard} />,
  },
  {
    path: "/tenant/settings/security-policy",
    element: <LazyRoute component={SecurityPolicy} />,
  },
  {
    path: "/tenant/settings/storage",
    element: <LazyRoute component={StorageConfig} />,
  },
  // {
  //   path: "/tenant/ai/knowledge",
  //   element: <LazyRoute component={AIGateway} />,
  // },
];
