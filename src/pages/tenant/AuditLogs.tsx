import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  ViewAuditLogModal,
  DataTable,
  Pagination,
  FilterDropdown,
  StatusBadge,
  SearchBox,
  type Column,
  MoreFilters,
  FormSelect,
  FormField,
} from "@/components/shared";
import { Download } from "lucide-react";
import { auditLogService } from "@/services/audit-log-service";
import { moduleService } from "@/services/module-service";
import type { AuditLog } from "@/types/audit-log";
import { useAppTheme } from "@/hooks/useAppTheme";
import { PrimaryButton } from "@/components/shared";
import { useAppSelector } from "@/hooks/redux-hooks";
import { showToast } from "@/utils/toast";

export interface AuditLogsProps {
  customTenantId?: string;
  hideLayout?: boolean;
}

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

const AuditLogs = ({
  customTenantId,
  hideLayout = false,
}: AuditLogsProps = {}): ReactElement => {
  const { primaryColor } = useAppTheme();
  const roles = useAppSelector((state) => state.auth.roles);
  const authTenantId = useAppSelector((state) => state.auth.tenantId);
  const tenantId = customTenantId || authTenantId;
  const isTenantAdmin = customTenantId ? true : roles?.includes("tenant_admin");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [resourceTypes, setResourceTypes] = useState<
    { value: string; label: string }[]
  >([]);
  const [modules, setModules] = useState<{ value: string; label: string }[]>(
    [],
  );
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
  // FE-2: methodFilter converted from a hardcoded null constant to real controllable state
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string | null>(
    null,
  );
  const [moduleIdFilter, setModuleIdFilter] = useState<string | null>(null); // New module_id filter
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string[] | null>(null);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  // More Filters popover state
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState<boolean>(false);
  const [tempResourceType, setTempResourceType] = useState<string | null>(null);
  const [tempOrderBy, setTempOrderBy] = useState<string[] | null>(null);
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(
    null,
  );

  const fetchResourceTypes = async (): Promise<void> => {
    try {
      const response = await auditLogService.getResourceTypesDropdown(
        tenantId as string | undefined,
      );
      if (response.success) {
        const options = response.data.map((rt: any) => ({
          value: rt.value,
          label: rt.label,
        }));
        setResourceTypes(options);
      }
    } catch (err) {
      console.error("Failed to load resource types", err);
    }
  };

  const fetchModules = async (): Promise<void> => {
    try {
      const response = await moduleService.getMyModules(
        tenantId as string | undefined,
      );
      if (response.success) {
        const options = response.data.map((m: any) => ({
          value: m.id,
          label: m.name,
        }));
        setModules(options);
      }
    } catch (err) {
      console.error("Failed to load modules", err);
    }
  };

  const fetchAuditLogs = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setExpandedId(null);

      let response;
      if (isTenantAdmin) {
        response = await auditLogService.getAll(
          currentPage,
          limit,
          {
            method: methodFilter,
            action: actionFilter,
            resource_type: resourceTypeFilter,
            module_id: moduleIdFilter, // Pass module_id filter
            startDate: startDate || null,
            endDate: endDate || null,
            tenant_id: tenantId as string | null,
            search: debouncedSearch || null,
          },
          orderBy,
        );
      } else {
        response = await auditLogService.getMyLogs(
          currentPage,
          limit,
          moduleIdFilter,
          debouncedSearch || null,
        );
      }

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

  // FE-1: Fetch resource types and modules in parallel (were sequential before)
  useEffect(() => {
    Promise.all([
      fetchResourceTypes(),
      fetchModules(),
    ]);
  }, [tenantId]);

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
    methodFilter,
    actionFilter,
    resourceTypeFilter,
    moduleIdFilter,
    startDate,
    endDate,
    orderBy,
    tenantId,
    debouncedSearch,
  ]);

  // View audit log handler
  const handleViewAuditLog = (auditLogId: string): void => {
    setSelectedAuditLogId(auditLogId);
    setViewModalOpen(true);
  };

  // Export handler
  const handleExport = async (): Promise<void> => {
    try {
      const response = await auditLogService.export({
        format: "json",
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tenantId: tenantId || undefined,
      });

      if (response.success) {
        // FE-3 (export truncation warning from BE-8): Inform the user if results were truncated
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
        link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
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
      key: "resource_type",
      label: "Resource Type",
      render: (log) => (
        <span className="text-sm font-normal text-[#0f1724] block max-w-[160px] truncate" title={log.resource_type}>
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
    ...(isTenantAdmin
      ? [
        {
          key: "user",
          label: "User",
          render: (log: AuditLog) => {
            const userName = log.user
              ? `${log.user.first_name} ${log.user.last_name}`
              : log.user_email || "N/A";
            return (
              <span className="text-sm font-normal text-[#0f1724] block max-w-[160px] truncate" title={userName}>
                {userName}
              </span>
            );
          },
        },
      ]
      : []),
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
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
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
          <div className="mt-1">
            <StatusBadge variant={getActionVariant(log.action)}>
              {log.action}
            </StatusBadge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleViewAuditLog(log.id)}
          className="text-sm font-medium transition-colors shrink-0 hover:opacity-80"
          style={{ color: primaryColor }}
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
          <span className="text-[#9aa6b2]">Method:</span>
          <div className="mt-1">
            <StatusBadge variant={getMethodVariant(log.request_method)}>
              {log.request_method ? log.request_method.toUpperCase() : "N/A"}
            </StatusBadge>
          </div>
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

  const content = (
    <>
      {/* Table Container */}
      <div className="overflow-hidden">
        {/* Table Header with Filters */}
        <div className="pb-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Global Search */}
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search logs & metadata..."
                containerClassName="relative w-full md:w-64"
              />

              {isTenantAdmin && (
                /* Action Filter */
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
              )}

              {/* FE-2: HTTP Method filter — methodFilter is now real state */}
              {isTenantAdmin && (
                <FilterDropdown
                  label="Method"
                  options={[
                    { value: "GET", label: "GET" },
                    { value: "POST", label: "POST" },
                    { value: "PUT", label: "PUT" },
                    { value: "PATCH", label: "PATCH" },
                    { value: "DELETE", label: "DELETE" },
                  ]}
                  value={methodFilter}
                  onChange={(value) => {
                    setMethodFilter(value as string | null);
                    setCurrentPage(1);
                  }}
                  placeholder="All Methods"
                />
              )}

              {/* Module Filter */}
              <FilterDropdown
                label="Module"
                options={modules}
                value={moduleIdFilter}
                onChange={(value) => {
                  setModuleIdFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Modules"
              />

              {/* More Filters Popover */}
              <MoreFilters
                title="Filter Logs"
                isOpen={isMoreFiltersOpen}
                onOpenToggle={(open) => {
                  if (open) {
                    setTempResourceType(resourceTypeFilter);
                    setTempOrderBy(orderBy);
                    setTempStartDate(startDate);
                    setTempEndDate(endDate);
                  }
                  setIsMoreFiltersOpen(open);
                }}
                onApply={() => {
                  setResourceTypeFilter(tempResourceType);
                  setOrderBy(tempOrderBy);
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setCurrentPage(1);
                  setIsMoreFiltersOpen(false);
                }}
                onCancel={() => setIsMoreFiltersOpen(false)}
                hasActiveFilters={Boolean(resourceTypeFilter || orderBy || startDate || endDate)}
              >
                {/* Dropdowns row */}
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

                  {/* Sort by */}
                  <div className="flex-1 w-full">
                    <FormSelect
                      label="Sort by"
                      placeholder="Newest"
                      options={[
                        { value: "created_at,desc", label: "Newest First" },
                        { value: "created_at,asc", label: "Oldest First" },
                        { value: "action,asc", label: "Action (A-Z)" },
                        { value: "resource_type,asc", label: "Resource Type (A-Z)" },
                      ]}
                      value={tempOrderBy ? tempOrderBy.join(",") : ""}
                      onValueChange={(val) => setTempOrderBy(val ? val.split(",") : null)}
                    />
                  </div>
                </div>

                {/* Date Filters Row */}
                <div className="flex flex-col sm:flex-row items-start justify-center gap-[20px] self-stretch">
                  {/* From Date */}
                  <div className="flex-1 w-full">
                    <FormField
                      label="From Date"
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                    />
                  </div>

                  {/* To Date */}
                  <div className="flex-1 w-full">
                    <FormField
                      label="To Date"
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
                actionFilter ||
                methodFilter ||
                resourceTypeFilter ||
                moduleIdFilter ||
                search ||
                orderBy) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                      setActionFilter(null);
                      setMethodFilter(null);
                      setResourceTypeFilter(null);
                      setModuleIdFilter(null);
                      setOrderBy(null);
                      setSearch("");
                      setCurrentPage(1);
                    }}
                    className="text-xs hover:underline decoration-offset-2 shrink-0 cursor-pointer"
                    style={{ color: primaryColor }}
                  >
                    Clear all filters
                  </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isTenantAdmin && (
                <PrimaryButton
                  onClick={handleExport}
                  size="small"
                  className="flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </PrimaryButton>
              )}
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
          emptyMessage={
            isTenantAdmin
              ? "No audit logs found matching your criteria"
              : "No activity recorded for your account yet"
          }
          expandableRows
          isRowExpanded={(row) => expandedId === row.id}
          onRowExpandToggle={(row) => toggleExpand(row.id)}
          renderExpandedRow={renderExpanded}
          onRowClick={(row) => toggleExpand(row.id)}
        />

        {/* Pagination */}
        {pagination.total > 0 && (
          // <div className="border-t border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-3">
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
          // </div>
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
    </>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <Layout
      currentPage="Audit Logs"
      pageHeader={{
        title: isTenantAdmin ? "System Audit Logs" : "My Activity",
        description: isTenantAdmin
          ? "Monitor all activities and changes across the quality platform."
          : "View a chronological history of your own actions on the platform.",
      }}
    >
      {content}
    </Layout>
  );
};

export default AuditLogs;
