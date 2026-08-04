import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  FilterDropdown,
  Pagination,
  PrimaryButton,
  StatusBadge,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import { moduleService } from "@/services/module-service";
import {
  tenantService,
  type TenantUserDropdownItem,
} from "@/services/tenant-service";
import type { AICompletion, AIProviderInfo } from "@/types/ai";
import type { MyModule } from "@/types/module";
import { showToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";

const formatListDate = (value?: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CompletionHistory = (): ReactElement => {
  const navigate = useNavigate();
  const { primaryColor } = useAppTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMetaLoading, setIsMetaLoading] = useState<boolean>(true);

  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [models, setModels] = useState<
    Array<{ id: string; provider: string; isDefault?: boolean }>
  >([]);
  const [modules, setModules] = useState<MyModule[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserDropdownItem[]>([]);

  const [completions, setCompletions] = useState<AICompletion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);

  const [filters, setFilters] = useState({
    provider: null as string | null,
    model: null as string | null,
    status: null as string | null,
    moduleId: null as string | null,
    userId: null as string | null,
    startDate: "",
    endDate: "",
  });

  const providerOptions = useMemo(
    () =>
      providers.map((p) => ({ value: p.name, label: p.displayName || p.name })),
    [providers],
  );

  const modelOptions = useMemo(
    () =>
      models.map((m) => ({
        value: m.id,
        label: `${m.provider} · ${m.id}`,
      })),
    [models],
  );

  const moduleOptions = useMemo(
    () => modules.map((m) => ({ value: m.id, label: m.name })),
    [modules],
  );

  const userOptions = useMemo(
    () =>
      tenantUsers.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.role ?? "—"})`,
      })),
    [tenantUsers],
  );

  const hasExtraFilters = Boolean(
    filters.moduleId || filters.userId || filters.startDate || filters.endDate,
  );

  useEffect(() => {
    if (hasExtraFilters) {
      setShowMoreFilters(true);
    }
  }, [hasExtraFilters]);

  const loadMeta = useCallback(async (): Promise<void> => {
    setIsMetaLoading(true);
    try {
      const [providerData, modelData, modulesRes, usersData] =
        await Promise.all([
          aiService.getProviders(),
          aiService.getModels(),
          moduleService.getMyModules(),
          tenantService.getCurrentTenantUsersDropdown(),
        ]);
      setProviders(providerData);
      setModels(modelData);
      setModules(modulesRes.data || []);
      setTenantUsers(usersData);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Failed to load filter options";
      showToast.error(msg);
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  const loadCompletions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const listData = await aiService.listCompletions({
        page,
        limit,
        provider: filters.provider || undefined,
        model: filters.model || undefined,
        status: filters.status || undefined,
        user_id: filters.userId || undefined,
        module_id: filters.moduleId || undefined,
        start_date: filters.startDate.trim() || undefined,
        end_date: filters.endDate.trim() || undefined,
      });
      setCompletions(listData.data || []);
      setExpandedId(null);
      setPagination({
        page: listData.pagination?.page || page,
        limit: listData.pagination?.limit || limit,
        total: listData.pagination?.total || 0,
        totalPages: listData.pagination?.totalPages || 1,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        "Failed to load completion history";
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    limit,
    filters.provider,
    filters.model,
    filters.status,
    filters.userId,
    filters.moduleId,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadCompletions();
  }, [loadCompletions]);

  const clearFilters = (): void => {
    setPage(1);
    setFilters({
      provider: null,
      model: null,
      status: null,
      moduleId: null,
      userId: null,
      startDate: "",
      endDate: "",
    });
    setShowMoreFilters(false);
  };

  const toggleExpand = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderExpanded = (row: AICompletion): ReactElement => {
    const total =
      row.usage?.total_tokens ??
      row.total_tokens ??
      (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
    const preview = (row.response || row.content || "").slice(0, 800);
    return (
      // <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.06)] rounded-md p-3 md:p-4 text-xs text-[#334155] space-y-2">
      <>
        {/* <p>
          <span className="font-semibold text-[#475569]">IDs — </span>
          Module: <code className="text-[11px]">{row.module_id || "—"}</code>
          {" · "}
          User: <code className="text-[11px]">{row.user_id || "—"}</code>
        </p> 
        <p>
          <span className="font-semibold text-[#475569]">Correlation — </span>
          {row.correlation_id || "—"}
        </p> */}
        <p>
          <span className="font-semibold text-[#475569]">
            Tokens / cost / latency —{" "}
          </span>
          {`${total} tokens · USD ${Number(row.cost ?? 0).toFixed(6)} · ${row.latency_ms ?? 0} ms`}
        </p>
        {row.use_case && (
          <p>
            <span className="font-semibold text-[#475569]">Use case — </span>
            {row.use_case}
          </p>
        )}
        {(row.error_message || row.error_code) && (
          <p className="text-red-600">
            <span className="font-semibold">Error — </span>
            {[row.error_code, row.error_message].filter(Boolean).join(" · ")}
          </p>
        )}
        <div>
          <span className="font-semibold text-[#475569] block mb-1">
            Response preview
          </span>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {preview || "—"}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold hover:underline"
          style={{ color: primaryColor }}
          onClick={() => navigate(`/tenant/ai/completions/${row.id}`)}
        >
          Open full detail view →
        </button>
      </>
      // </div>
    );
  };

  const columns: Column<AICompletion>[] = [
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatListDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "module_name",
      label: "Module",
      render: (row) => (
        <span className="line-clamp-2">{row.module_name || "Platform"}</span>
      ),
    },
    {
      key: "user_name",
      label: "User",
      render: (row) => (
        <span className="line-clamp-2">{row.user_name || "—"}</span>
      ),
    },
    {
      key: "provider",
      label: "Provider",
      render: (row) => row.provider || "—",
    },
    {
      key: "model",
      label: "Model",
      render: (row) => <span className="line-clamp-2">{row.model || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge
          variant={row.status === "completed" ? "success" : "failure"}
        >
          {row.status || "unknown"}
        </StatusBadge>
      ),
    },
    {
      key: "view",
      label: "View",
      align: "right",
      render: (row) => (
        <button
          type="button"
          className="text-xs font-semibold hover:underline"
          style={{ color: primaryColor }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/tenant/ai/completions/${row.id}`);
          }}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <Layout
      currentPage="Completion History"
      pageHeader={{
        title: "Completion History",
        description:
          "Track provider/model/token usage for persisted completions.",
        action: (
          <PrimaryButton
            onClick={() => navigate("/tenant/ai/completions/create")}
          >
            Create Completion
          </PrimaryButton>
        ),
      }}
    >
      <div className="space-y-5">
        <section className="overflow-hidden">
          <div className="pb-2 border-b border-[#D1D5DB]">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDropdown
                    label="Provider"
                    options={providerOptions}
                    value={filters.provider}
                    placeholder="All providers"
                    onChange={(value) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        provider: value as string | null,
                      }));
                    }}
                  />
                  <FilterDropdown
                    label="Model"
                    options={modelOptions}
                    value={filters.model}
                    placeholder="All models"
                    onChange={(value) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        model: value as string | null,
                      }));
                    }}
                  />
                  <FilterDropdown
                    label="Status"
                    options={[
                      { value: "completed", label: "Completed" },
                      { value: "failed", label: "Failed" },
                      { value: "pending", label: "Pending" },
                    ]}
                    value={filters.status}
                    placeholder="All statuses"
                    onChange={(value) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        status: value as string | null,
                      }));
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowMoreFilters((open) => !open)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium border bg-white transition-colors",
                      showMoreFilters || hasExtraFilters
                        ? "border-[rgba(8,76,200,0.35)] text-[#0f1724]"
                        : "border-[rgba(0,0,0,0.08)] text-[#475569] hover:border-[#084cc8]/30",
                    )}
                    style={
                      showMoreFilters || hasExtraFilters
                        ? {
                            borderColor: `${primaryColor}55`,
                            color: primaryColor,
                          }
                        : undefined
                    }
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    More filters
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 shrink-0 opacity-70 transition-transform",
                        showMoreFilters && "rotate-180",
                      )}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[13px] font-medium text-[#6b7280] hover:text-[#94A3B8] transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              </div>

              {showMoreFilters && (
                <div className="flex flex-col gap-3 pt-3 border-t border-[rgba(0,0,0,0.08)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <FilterDropdown
                      label="Module"
                      options={moduleOptions}
                      value={filters.moduleId}
                      placeholder="All modules"
                      onChange={(value) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          moduleId: value as string | null,
                        }));
                      }}
                    />
                    <FilterDropdown
                      label="User"
                      options={userOptions}
                      value={filters.userId}
                      placeholder="All users"
                      isSearchable
                      onChange={(value) => {
                        setPage(1);
                        setFilters((prev) => ({
                          ...prev,
                          userId: value as string | null,
                        }));
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#475569]">
                        From:
                      </span>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            startDate: e.target.value,
                          }));
                        }}
                        className="text-xs px-2 py-1.5 border border-[rgba(0,0,0,0.08)] rounded focus:outline-none focus:ring-1 focus:ring-[#112868]/20"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#475569]">
                        To:
                      </span>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }));
                        }}
                        className="text-xs px-2 py-1.5 border border-[rgba(0,0,0,0.08)] rounded focus:outline-none focus:ring-1 focus:ring-[#112868]/20"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isMetaLoading && (
              <p className="text-xs text-[#64748b] mt-2">
                Loading filter options…
              </p>
            )}
          </div>

          <DataTable
            data={completions}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            error={error}
            emptyMessage="No completion records found"
            expandableRows
            isRowExpanded={(row) => expandedId === row.id}
            onRowExpandToggle={(row) => toggleExpand(row.id)}
            renderExpandedRow={renderExpanded}
            onRowClick={(row) => toggleExpand(row.id)}
          />

          {pagination.total > 0 && (
            <div className="border-t border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-3">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                limitOptions={[
                  { value: "5", label: "5 per page" },
                  { value: "10", label: "10 per page" },
                  { value: "20", label: "20 per page" },
                ]}
              />
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default CompletionHistory;
