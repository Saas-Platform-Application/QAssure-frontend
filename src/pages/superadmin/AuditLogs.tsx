import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  ViewAuditLogModal,
  DataTable,
  Pagination,
  FilterDropdown,
  StatusBadge,
  type Column,
  MoreFilters,
  FormSelect,
  FormField,
} from "@/components/shared";
import {
  Download,
  Search,
} from "lucide-react";
import { auditLogService } from "@/services/audit-log-service";
import { tenantService } from "@/services/tenant-service";
import type { AuditLog } from "@/types/audit-log";
import type { Tenant } from "@/types/tenant";
import { useAppTheme } from "@/hooks/useAppTheme";
import { showToast } from "@/utils/toast";

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper function to get action badge variant
const getActionVariant = (
  action: string,
): "success" | "failure" | "info" | "process" => {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("create") || lowerAction.includes("register"))
    return "success";
  if (
    lowerAction.includes("update") ||
    lowerAction.includes("version_update") ||
    lowerAction.includes("login")
  )
    return "info";
  if (lowerAction.includes("delete") || lowerAction.includes("deregister"))
    return "failure";
  if (
    lowerAction.includes("read") ||
    lowerAction.includes("get") ||
    lowerAction.includes("status_change")
  )
    return "process";
  return "info";
};

// Helper function to get method badge variant
const getMethodVariant = (
  method: string | null,
): "success" | "failure" | "info" | "process" => {
  if (!method) return "info";
  const upperMethod = method.toUpperCase();
  if (upperMethod === "GET") return "success";
  if (upperMethod === "POST") return "info";
  if (upperMethod === "PUT" || upperMethod === "PATCH") return "process";
  if (upperMethod === "DELETE") return "failure";
  return "info";
};

// Helper function to get status badge color based on response status
const getStatusColor = (status: number | null): string => {
  if (!status) return "text-[#6b7280]";
  if (status >= 200 && status < 300) return "text-[#10b981]";
  if (status >= 300 && status < 400) return "text-[#f59e0b]";
  if (status >= 400) return "text-[#ef4444]";
  return "text-[#6b7280]";
};

const AuditLogs = (): ReactElement => {
  useAppTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modules, setModules] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [resourceTypes, setResourceTypes] = useState<
    { value: string; label: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  // Filter state
  const [tenantFilter, setTenantFilter] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string | null>(
    null,
  );
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string[] | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState<boolean>(false);
  const [tempResourceType, setTempResourceType] = useState<string | null>(null);
  const [tempModule, setTempModule] = useState<string | null>(null);
  const [tempOrderBy, setTempOrderBy] = useState<string[] | null>(null);
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(
    null,
  );

  // FE-1: Run all three independent fetches in parallel instead of sequentially
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await tenantService.getAll(1, 100);
        if (response.success) {
          setTenants(response.data);
        }
      } catch (err) {
        console.error("Failed to load tenants:", err);
      }
    };

    const fetchResourceTypes = async () => {
      try {
        const response = await auditLogService.getResourceTypesDropdown();
        if (response.success) {
          const options = response.data.map((rt: any) => ({
            value: rt.value,
            label: rt.label,
          }));
          setResourceTypes(options);
        }
      } catch (err) {
        console.error("Failed to load resource types:", err);
      }
    };

    const fetchModules = async () => {
      try {
        const response = await auditLogService.getModulesDropdown();
        if (response.success) {
          setModules(response.data || []);
        }
      } catch (err) {
        console.error("Failed to load modules:", err);
      }
    };

    Promise.all([
      fetchTenants(),
      fetchResourceTypes(),
      fetchModules(),
    ]);
  }, []);



  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setExpandedId(null);
      const response = await auditLogService.getAll(
        currentPage,
        limit,
        {
          tenant_id: tenantFilter,
          method: methodFilter,
          action: actionFilter,
          resource_type: resourceTypeFilter,
          module_id: moduleFilter,
          startDate: startDate || null,
          endDate: endDate || null,
          search: debouncedSearch || null,
        },
        orderBy,
      );
      if (response.success) {
        setAuditLogs(response.data);
        setPagination(response.pagination);
      } else {
        setError("Failed to load audit logs");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load audit logs",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Debouncing for Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch audit logs on mount and when pagination/filters change
  useEffect(() => {
    fetchAuditLogs();
  }, [
    currentPage,
    limit,
    tenantFilter,
    methodFilter,
    actionFilter,
    resourceTypeFilter,
    moduleFilter,
    startDate,
    endDate,
    orderBy,
    debouncedSearch,
  ]);

  // Handle Export
  const handleExport = async (): Promise<void> => {
    try {
      const response = await auditLogService.export({
        format: "json",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tenantId: tenantFilter || undefined,
      });
      if (response.success) {
        // FE-3 (BE-8 truncation warning): Notify when results were silently limited
        if (response.data.truncated) {
          showToast.warning(
            "Export Truncated",
            response.data.warning ||
              `Only ${(response.data.exported ?? 10000).toLocaleString()} of ${response.data.total.toLocaleString()} records were exported. Use date filters to narrow the range.`
          );
        }

        const blob = new Blob(
          [JSON.stringify(response.data.records, null, 2)],
          { type: "application/json" },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `platform-audit-logs-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      // FE-3: Use app toast system instead of native alert()
      showToast.error(
        "Export Failed",
        err?.response?.data?.error?.message || err.message || "An unexpected error occurred"
      );
    }
  };

  // View audit log handler
  const handleViewAuditLog = (auditLogId: string): void => {
    setSelectedAuditLogId(auditLogId);
    setViewModalOpen(true);
  };

  // Load audit log for view
  const loadAuditLog = async (id: string): Promise<AuditLog> => {
    const response = await auditLogService.getById(id);
    return response.data;
  };

  const toggleExpand = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderExpanded = (row: AuditLog): ReactElement => {
    return (
      <div className="w-full text-xs text-gray-700 py-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Request Details */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Request Info</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#9aa6b2]">HTTP Method:</span>{" "}
              <StatusBadge variant={getMethodVariant(row.request_method)}>
                {row.request_method || "N/A"}
              </StatusBadge>
            </div>
            <div>
              <span className="text-[#9aa6b2]">Request Path:</span>{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded break-all font-mono text-[11px] text-[#0f1724]">
                {row.request_path || "N/A"}
              </code>
            </div>
            <div>
              <span className="text-[#9aa6b2]">IP Address:</span>{" "}
              <span className="font-mono text-[#0f1724]">{row.ip_address || "N/A"}</span>
            </div>
            <div className="text-[11px] text-gray-500">
              <span className="text-[#9aa6b2] text-xs">User Agent:</span>{" "}
              <span className="break-all">{row.user_agent || "N/A"}</span>
            </div>
          </div>

          {/* Column 2: Audit Identifiers */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Audit Details</h4>
            <div>
              <span className="text-[#9aa6b2]">Log ID:</span>{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-[#0f1724]">
                {row.id}
              </code>
            </div>
            <div>
              <span className="text-[#9aa6b2]">Resource ID:</span>{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-[#0f1724]">
                {row.resource_id || "N/A"}
              </code>
            </div>
            <div>
              <span className="text-[#9aa6b2]">Correlation ID:</span>{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-[#0f1724]">
                {row.correlation_id || "N/A"}
              </code>
            </div>
          </div>

          {/* Column 3: Metadata */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-1">Metadata</h4>
            {row.metadata && Object.keys(row.metadata).length > 0 ? (
              <pre className="bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-36 font-mono text-[11px] leading-4 text-gray-600">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            ) : (
              <span className="text-gray-400 italic">No additional metadata</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Define table columns
  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (log) => (
        <span className="text-sm font-normal text-[#0f1724] whitespace-nowrap">
          {formatDate(log.created_at)}
        </span>
      ),
      mobileLabel: "Time",
    },
    {
      key: "tenant",
      label: "Tenant",
      render: (log) => {
        const tenantName = log.tenant ? log.tenant.name : "N/A";
        return (
          <span className="text-sm font-normal text-[#0f1724] block max-w-[150px] truncate" title={tenantName}>
            {tenantName}
          </span>
        );
      },
    },
    {
      key: "resource_type",
      label: "Resource Type",
      render: (log) => (
        <span className="text-sm font-normal text-[#0f1724] block max-w-[150px] truncate" title={log.resource_type}>
          {log.resource_type}
        </span>
      ),
    },
    {
      key: "module",
      label: "Module",
      render: (log) => (
        <span className="text-sm font-normal text-[#475569]">
          {log.module?.name || "Platform"}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (log) => (
        <StatusBadge variant={getActionVariant(log.action)}>
          {log.action}
        </StatusBadge>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (log) => {
        const userName = log.user
          ? `${log.user.first_name} ${log.user.last_name}`
          : log.user_email || "N/A";
        return (
          <span className="text-sm font-normal text-[#0f1724] block max-w-[150px] truncate" title={userName}>
            {userName}
          </span>
        );
      },
    },
    {
      key: "response_status",
      label: "Status",
      render: (log) => (
        <span
          className={`text-sm font-normal ${getStatusColor(log.response_status)}`}
        >
          {log.response_status || "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (log) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleViewAuditLog(log.id)}
            className="text-sm text-[#112868] hover:text-[#0d1f4e] font-medium transition-colors"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (log: AuditLog) => (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[#0f1724] truncate">
            {log.resource_type}
          </h3>
          <p className="text-xs text-[#9aa6b2] mb-1">
            {log.tenant ? log.tenant.name : "System"}
          </p>
          <div className="mt-1">
            <StatusBadge variant={getActionVariant(log.action)}>
              {log.action}
            </StatusBadge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleViewAuditLog(log.id)}
          className="text-sm text-[#112868] hover:text-[#0d1f4e] font-medium transition-colors shrink-0"
        >
          View
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#9aa6b2]">Timestamp:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {formatDate(log.created_at)}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Module:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {log.module?.name || "Platform"}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">User:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {log.user
              ? `${log.user.first_name} ${log.user.last_name}`
              : log.user_email || "N/A"}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Status:</span>
          <p
            className={`font-normal mt-1 ${getStatusColor(log.response_status)}`}
          >
            {log.response_status || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      currentPage="Audit Logs"
      pageHeader={{
        title: "Platform Audit Logs",
        description:
          "Global monitoring of all actions, logins, and changes across all tenants in the platform.",
      }}
    >
      {/* Table Container */}
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Table Header with Filters */}
        <div className="border-b border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-3 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Global Search */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search logs & metadata..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#112868]/10 focus:border-[#112868] transition-all bg-gray-50/30"
                />
              </div>

              {/* Tenant Selector */}
              <FilterDropdown
                label="Tenant"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={tenantFilter}
                onChange={(value) => {
                  setTenantFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Tenants"
              />

              {/* Action Filter */}
              <FilterDropdown
                label="Action"
                options={[
                  { value: "LOGIN", label: "LOGIN" },
                  { value: "LOGOUT", label: "LOGOUT" },
                  { value: "CREATE", label: "CREATE" },
                  { value: "UPDATE", label: "UPDATE" },
                  { value: "DELETE", label: "DELETE" },
                  { value: "SUBMIT", label: "SUBMIT" },
                  { value: "APPROVE", label: "APPROVE" },
                  { value: "REJECT", label: "REJECT" },
                ]}
                value={actionFilter}
                onChange={(value) => {
                  setActionFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Actions"
              />

              {/* More Filters Popover */}
              <MoreFilters
                title="Filter Logs"
                isOpen={isMoreFiltersOpen}
                onOpenToggle={(open) => {
                  if (open) {
                    setTempResourceType(resourceTypeFilter);
                    setTempModule(moduleFilter);
                    setTempOrderBy(orderBy);
                    setTempStartDate(startDate);
                    setTempEndDate(endDate);
                  }
                  setIsMoreFiltersOpen(open);
                }}
                onApply={() => {
                  setResourceTypeFilter(tempResourceType);
                  setModuleFilter(tempModule);
                  setOrderBy(tempOrderBy);
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setCurrentPage(1);
                  setIsMoreFiltersOpen(false);
                }}
                onCancel={() => setIsMoreFiltersOpen(false)}
                hasActiveFilters={Boolean(resourceTypeFilter || moduleFilter || orderBy || startDate || endDate)}
              >
                {/* Dropdowns row 1 */}
                <div className="flex flex-col sm:flex-row items-start justify-center gap-[20px] self-stretch">
                  {/* Resource Type */}
                  <div className="flex-1 w-full">
                    <FormSelect
                      label="Resource Type"
                      placeholder="All Resources"
                      options={resourceTypes}
                      value={tempResourceType || ""}
                      onValueChange={(val) => setTempResourceType(val || null)}
                      isSearchable
                    />
                  </div>

                  {/* Module */}
                  <div className="flex-1 w-full">
                    <FormSelect
                      label="Module"
                      placeholder="All Modules"
                      options={modules.map((m) => ({ value: m.id, label: m.name }))}
                      value={tempModule || ""}
                      onValueChange={(val) => setTempModule(val || null)}
                      isSearchable
                    />
                  </div>
                </div>

                {/* Dropdowns row 2 */}
                <div className="flex flex-col sm:flex-row items-start justify-center gap-[20px] self-stretch">
                  {/* Sort by */}
                  <div className="flex-1 w-full">
                    <FormSelect
                      label="Sort by"
                      placeholder="Newest"
                      options={[
                        { value: "created_at,desc", label: "Newest First" },
                        { value: "created_at,asc", label: "Oldest First" },
                      ]}
                      value={tempOrderBy ? tempOrderBy.join(",") : ""}
                      onValueChange={(val) => setTempOrderBy(val ? val.split(",") : null)}
                    />
                  </div>

                  {/* Empty/Placeholder space for balance */}
                  <div className="flex-1 w-full hidden sm:block" />
                </div>

                {/* Date Filters Row */}
                <div className="flex flex-col sm:flex-row items-start justify-center gap-[20px] self-stretch">
                  {/* Start Date */}
                  <div className="flex-1 w-full">
                    <FormField
                      label="Start Date"
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                    />
                  </div>

                  {/* End Date */}
                  <div className="flex-1 w-full">
                    <FormField
                      label="End Date"
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </MoreFilters>

              {/* Clear Filters */}
              {(startDate ||
                endDate ||
                tenantFilter ||
                actionFilter ||
                resourceTypeFilter ||
                moduleFilter ||
                methodFilter ||
                search ||
                orderBy) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setTenantFilter(null);
                      setActionFilter(null);
                      setResourceTypeFilter(null);
                      setModuleFilter(null);
                      setMethodFilter(null);
                      setOrderBy(null);
                      setSearch("");
                      setIsMoreFiltersOpen(false);
                      setCurrentPage(1);
                    }}
                    className="text-xs text-[#ef4444] hover:underline shrink-0 cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Platform Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={auditLogs}
          keyExtractor={(log) => log.id}
          isLoading={isLoading}
          error={error}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No platform-wide audit logs found"
          expandableRows
          isRowExpanded={(row) => expandedId === row.id}
          onRowExpandToggle={(row) => toggleExpand(row.id)}
          renderExpandedRow={renderExpanded}
          onRowClick={(row) => toggleExpand(row.id)}
        />

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="border-t border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-3">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={limit}
              onPageChange={(page: number) => setCurrentPage(page)}
              onLimitChange={(newLimit: number) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* View Audit Log Modal */}
      <ViewAuditLogModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedAuditLogId(null);
        }}
        auditLogId={selectedAuditLogId}
        onLoadAuditLog={loadAuditLog}
      />
    </Layout>
  );
};

export default AuditLogs;
