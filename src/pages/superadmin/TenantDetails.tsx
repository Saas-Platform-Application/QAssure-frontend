import { useState, useEffect, useMemo, useRef, type ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Globe,
  Hash,
  Users,
  Package,
  FileText,
  History,
  CreditCard,
  Edit,
  Settings,
  Building2,
  BadgeCheck,
  GitBranch,
  Zap,
  Brain,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  StatusBadge,
  DataTable,
  WorkflowDefinitionsTable,
  SuppliersTable,
  type Column,
  PrimaryButton,
  GradientStatCard,
} from "@/components/shared";
import {
  UsersTable,
  RolesTable,
  DepartmentsTable,
  type DepartmentsTableRef,
} from "@/components/superadmin";
import { Plus } from "lucide-react";
import { tenantService } from "@/services/tenant-service";
import { moduleService } from "@/services/module-service";
import type { Tenant } from "@/types/tenant";
import type { MyModule } from "@/types/module";
import { formatDate } from "@/utils/format-date";
import AuditLogs from "@/pages/tenant/AuditLogs";
import TenantSettings from "@/pages/tenant/Settings";
import TenantAIProviders from "@/pages/tenant/TenantAIProviders";
import { TenantAIDashboard } from "@/pages/tenant/TenantAIDashboard";
// import DepartmentsTable from "@/components/superadmin/DepartmentsTable";
import DesignationsTable from "@/components/superadmin/DesignationsTable";

type TabType =
  | "overview"
  | "users"
  | "roles"
  | "departments"
  | "designations"
  // | "user-categories"
  | "workflow-definitions"
  | "suppliers"
  | "modules"
  | "settings"
  | "license"
  | "audit-logs"
  | "billing"
  | "ai-providers"
  | "ai-dashboard";

const tabs: Array<{ id: TabType; label: string; icon: ReactElement }> = [
  { id: "overview", label: "Overview", icon: <FileText className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "roles", label: "Roles", icon: <FileText className="w-4 h-4" /> },
  {
    id: "departments",
    label: "Departments",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: "designations",
    label: "Designations",
    icon: <BadgeCheck className="w-4 h-4" />,
  },
  // {
  //   id: "user-categories",
  //   label: "User Categories",
  //   icon: <UserCog className="w-4 h-4" />,
  // },
  {
    id: "workflow-definitions",
    label: "Workflow Definitions",
    icon: <GitBranch className="w-4 h-4" />,
  },
  { id: "suppliers", label: "Suppliers", icon: <Users className="w-4 h-4" /> },
  { id: "modules", label: "Modules", icon: <Package className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  { id: "ai-providers", label: "AI Providers", icon: <Brain className="w-4 h-4" /> },
  { id: "ai-dashboard", label: "AI Dashboard", icon: <Brain className="w-4 h-4" /> },
  { id: "license", label: "License", icon: <FileText className="w-4 h-4" /> },
  {
    id: "audit-logs",
    label: "Audit Logs",
    icon: <History className="w-4 h-4" />,
  },
  { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
];

const getStatusVariant = (
  status: string,
): "success" | "failure" | "info" | "process" => {
  switch (status.toLowerCase()) {
    case "active":
      return "success";
    case "suspended":
      return "process";
    case "deleted":
      return "failure";
    default:
      return "success";
  }
};

const getTenantInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const TenantDetails = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for tables to trigger actions from header
  const departmentsRef = useRef<DepartmentsTableRef>(null);

  // Modules tab state - using assignedModules from tenant response

  // Fetch tenant details
  useEffect(() => {
    const fetchTenant = async (): Promise<void> => {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const response = await tenantService.getById(id);
        if (response.success) {
          setTenant(response.data);
        } else {
          setError("Failed to load tenant details");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ||
            "Failed to load tenant details",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [id]);

  // Calculate stats for overview
  const stats = useMemo(() => {
    if (!tenant) return null;
    return {
      totalUsers: tenant.users?.length || 0,
      totalModules: tenant.assignedModules?.length || 0,
      activeModules:
        tenant.assignedModules?.filter((m) => m.status === "running")?.length ||
        0,
      subscriptionTier: tenant.subscription_tier || "N/A",
    };
  }, [tenant]);

  if (isLoading) {
    return (
      <Layout
        currentPage="Tenant Details"
        breadcrumbs={[
          { label: "QAssure", path: "/dashboard" },
          { label: "Tenant Management", path: "/tenants" },
          { label: "Tenant Details" },
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-sm text-[#6b7280]">
            Loading tenant details...
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !tenant) {
    return (
      <Layout
        currentPage="Tenant Details"
        breadcrumbs={[
          { label: "QAssure", path: "/dashboard" },
          { label: "Tenant Management", path: "/tenants" },
          { label: "Tenant Details" },
        ]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-sm text-red-600">
            {error || "Tenant not found"}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Tenant Details"
      breadcrumbs={[
        { label: "QAssure", path: "/dashboard" },
        { label: "Tenant Management", path: "/tenants" },
        { label: "Tenant Details" },
      ]}
      pageHeader={{
        title: tenant.name,
        action:
          activeTab === "departments" ? (
            <PrimaryButton
              onClick={() => departmentsRef.current?.openNewModal()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Department</span>
            </PrimaryButton>
          ) : undefined,
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Tenant Header Card */}
        <div className="flex items-start justify-between self-stretch rounded-[4px] border border-[#D1D5DB] bg-white px-3 py-4">
          {/* Left Section */}
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] bg-[#F3F4F6]">
              <span className="text-[32px] font-semibold leading-none text-[#111827]">
                {getTenantInitials(tenant.name)}
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2">
              {/* Name + Status */}
              <div className="flex items-center gap-3">
                <h1 className="text-[30px] font-semibold leading-[36px] tracking-[-0.6px] text-[#111827]">
                  {tenant.name}
                </h1>

                <StatusBadge variant={getStatusVariant(tenant.status)}>
                  {tenant.status}
                </StatusBadge>
              </div>

              {/* Meta Information */}
              <div className="flex flex-col gap-2 text-sm text-[#6B7280]">
                {/* First Row */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <Hash className="h-4 w-4" />
                    <span>ID: {tenant.slug}</span>
                  </div>

                  {tenant.domain && (
                    <a
                      href={
                        tenant.domain.startsWith("http")
                          ? tenant.domain
                          : `https://${tenant.domain}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-[#112868] transition-colors"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{tenant.domain}</span>
                    </a>
                  )}
                </div>

                {/* Second Row */}
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(tenant.created_at)}</span>
                  </div>

                  {/* {tenant.primary_contact && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>Admin: {tenant.primary_contact}</span>
                    </div>
                  )} */}
                </div> 
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => navigate(`/tenants/${id}/edit`)}
            className="flex items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#112868] transition-colors hover:bg-[#F9FAFB]"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Tenant</span>
          </button>
        </div>

        {/* Tabs */}
        <div >
          <div className="border-b border-[rgba(0,0,0,0.08)] px-4 md:px-6">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[#112868] text-[#112868]"
                      : "border-transparent text-[#6b7280] hover:text-[#0f1724] hover:border-gray-300"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === "overview" && (
              <OverviewTab tenant={tenant} stats={stats} />
            )}
            {activeTab === "users" && id && (
              <UsersTable tenantId={id} compact={false} />
            )}
            {activeTab === "roles" && id && (
              <RolesTable tenantId={id} compact={false} />
            )}
            {activeTab === "departments" && id && (
              <DepartmentsTable
                ref={departmentsRef}
                tenantId={id}
                compact={true}
              />
            )}
            {activeTab === "designations" && id && (
              <DesignationsTable tenantId={id} compact={false} />
            )}
            {/* {activeTab === "user-categories" && id && (
              <UserCategoriesTable tenantId={id} compact={true} />
            )} */}
            {activeTab === "workflow-definitions" && id && (
              <WorkflowDefinitionsTable tenantId={id} compact={true} />
            )}
            {activeTab === "suppliers" && id && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#0f1724]">
                    List of Suppliers
                  </h2>
                </div>
                <SuppliersTable
                  tenantId={id}
                  showHeader={true}
                  compact={true}
                />
              </div>
            )}
            {activeTab === "modules" && id && <ModulesTab tenantId={id} />}
            {activeTab === "settings" && id && (
              <TenantSettings customTenantId={id} hideLayout={true} />
            )}
            {activeTab === "ai-providers" && id && (
              <TenantAIProviders customTenantId={id} hideLayout={true} />
            )}
            {activeTab === "ai-dashboard" && id && (
              <TenantAIDashboard customTenantId={id} hideLayout={true} />
            )}
            {activeTab === "license" && <LicenseTab tenant={tenant} />}
            {activeTab === "audit-logs" && id && (
              <AuditLogs customTenantId={id} hideLayout={true} />
            )}
            {activeTab === "billing" && <BillingTab tenant={tenant} />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Overview Tab Component
interface OverviewTabProps {
  tenant: Tenant;
  stats: {
    totalUsers: number;
    totalModules: number;
    activeModules: number;
    subscriptionTier: string;
  } | null;
}

const OverviewTab = ({ tenant, stats }: OverviewTabProps): ReactElement => {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientStatCard
          icon={Users}
          value={stats?.totalUsers || 0}
          label="Total Users"
        />
        <GradientStatCard
          icon={Package}
          value={stats?.totalModules || 0}
          label="Total Modules"
        />
        <GradientStatCard
          icon={Zap}
          value={stats?.activeModules || 0}
          label="Active Modules"
          badge={
            stats?.activeModules && stats.activeModules > 0
              ? { text: "Running", variant: "success" }
              : undefined
          }
        />
        <GradientStatCard
          icon={CreditCard}
          value={stats?.subscriptionTier || "N/A"}
          label="Subscription Tier"
          badge={{ text: "Plan", variant: "info" }}
        />
      </div>

      {/* General Information */}
      <div className="flex flex-col items-start gap-[10px] rounded-[8px] border border-[#D1D5DB] bg-white p-4">
        {/* Header Section */}
        <div className="flex w-full flex-col items-start border-b border-[#D1D5DB] pb-2">
          <h3 className="text-[20px] font-semibold leading-[28px] text-[#111827]">
            General Information
          </h3>
        </div>

        {/* Content Section */}
        <div className="flex w-full flex-col items-start gap-[10px]">
          <div className="grid w-full grid-cols-1 gap-y-4 md:grid-cols-[180px_1fr]">
            {/* Tenant Name */}
            <div className="text-sm font-medium text-[#6B7280]">
              Tenant Name
            </div>
            <div className="text-sm font-normal text-[#111827]">
              {tenant.name}
            </div>

            {/* Slug */}
            <div className="text-sm font-medium text-[#6B7280]">Slug</div>
            <div className="text-sm font-normal text-[#111827]">
              {tenant.slug}
            </div>

            {/* Status */}
            <div className="text-sm font-medium text-[#6B7280]">Status</div>
            <div>
              <StatusBadge variant={getStatusVariant(tenant.status)}>
                {tenant.status}
              </StatusBadge>
            </div>

            {/* Subscription Tier */}
            <div className="text-sm font-medium text-[#6B7280]">
              Subscription Tier
            </div>
            <div className="text-sm font-normal text-[#111827] capitalize">
              {tenant.subscription_tier || "N/A"}
            </div>

            {/* Created At */}
            <div className="text-sm font-medium text-[#6B7280]">Created At</div>
            <div className="text-sm font-normal text-[#111827]">
              {formatDate(tenant.created_at)}
            </div>

            {/* Updated At */}
            <div className="text-sm font-medium text-[#6B7280]">Updated At</div>
            <div className="text-sm font-normal text-[#111827]">
              {formatDate(tenant.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modules Tab Component
interface ModulesTabProps {
  tenantId: string;
}

const ModulesTab = ({ tenantId }: ModulesTabProps): ReactElement => {
  const [modules, setModules] = useState<MyModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch modules for this tenant
  const fetchModules = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await moduleService.getMyModules(tenantId);
      if (response.success && response.data) {
        setModules(response.data);
      } else {
        setError("Failed to load modules");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load modules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchModules();
    }
  }, [tenantId]);

  // Launch module handler
  const handleLaunchModule = async (moduleId: string): Promise<void> => {
    try {
      const response = await moduleService.launch(moduleId, tenantId);
      if (response.success && response.data.launch_url) {
        window.open(response.data.launch_url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to launch module",
      );
    }
  };

  const columns: Column<MyModule>[] = [
    {
      key: "name",
      label: "Module Name",
      render: (module) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-[#9aa6b2]" />
          </div>
          <span className="text-sm font-normal text-[#0f1724]">
            {module.name}
          </span>
        </div>
      ),
    },
    {
      key: "module_id",
      label: "Module ID",
      render: (module) => (
        <span className="text-sm font-normal text-[#6b7280] font-mono">
          {module.module_id}
        </span>
      ),
    },
    {
      key: "version",
      label: "Version",
      render: (module) => (
        <span className="text-sm font-normal text-[#6b7280]">
          {module.version}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (module) => (
        <StatusBadge
          variant={
            module.status === "running"
              ? "success"
              : module.status === "degraded"
                ? "process"
                : "info"
          }
        >
          {module.status}
        </StatusBadge>
      ),
    },
    {
      key: "frontend_base_url",
      label: "Frontend URL",
      render: (module) => (
        <span className="text-sm font-normal text-[#6b7280] font-mono truncate max-w-[200px]">
          {module.frontend_base_url || "N/A"}
        </span>
      ),
    },
    {
      key: "assigned_at",
      label: "Assigned At",
      render: (module) => (
        <span className="text-sm font-normal text-[#6b7280]">
          {formatDate(module.assigned_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (module) => (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => handleLaunchModule(module.id)}
            className="text-sm text-[#FFC107] hover:text-[#FFC107] font-medium transition-colors cursor-pointer"
          >
            Launch
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={modules}
        keyExtractor={(module) => module.id}
        isLoading={isLoading}
        error={error}
        emptyMessage="No modules assigned to this tenant"
      />
    </div>
  );
};

// License Tab Component
interface LicenseTabProps {
  tenant: Tenant;
}

const LicenseTab = ({ tenant: _tenant }: LicenseTabProps): ReactElement => {
  // Placeholder for license data
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[#0f1724]">
        License Information
      </h3>
      <div className="bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6">
        <div className="text-sm text-[#6b7280]">
          License information will be displayed here.
        </div>
      </div>
    </div>
  );
};

// Billing Tab Component
interface BillingTabProps {
  tenant: Tenant;
}

const BillingTab = ({ tenant: _tenant }: BillingTabProps): ReactElement => {
  // Placeholder for billing data
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[#0f1724]">
        Billing Information
      </h3>
      <div className="bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-6">
        <div className="text-sm text-[#6b7280]">
          Billing information will be displayed here.
        </div>
      </div>
    </div>
  );
};

export default TenantDetails;
