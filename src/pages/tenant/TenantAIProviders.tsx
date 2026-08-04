import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  SearchBox,
  FilterDropdown,
  ActionDropdown,
  PrimaryButton,
  DeleteConfirmationModal,
  StatusBadge,
} from "@/components/shared";
import { Plus, Play, Loader2, Eye, Trash2 } from "lucide-react";
import { aiService } from "@/services/ai-service";
import type { TenantAIConfig } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { ViewAIProviderModal } from "@/components/tenant/ViewAIProviderModal";
import CodeBadge from "@/components/shared/CodeBadge";
import { TenantAIProviderCreate } from "./TenantAIProviderCreate";

interface TenantAIProvidersProps {
  customTenantId?: string;
  hideLayout?: boolean;
}

export const TenantAIProviders = ({
  customTenantId,
  hideLayout = false,
}: TenantAIProvidersProps = {}): ReactElement => {
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "create">("list");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<TenantAIConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [testingProviders, setTestingProviders] = useState<
    Record<string, boolean>
  >({});
  const [selectedConfig, setSelectedConfig] = useState<TenantAIConfig | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchConfigs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.listConfigs(customTenantId);
      setConfigs(data || []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to load configs";
      setError(msg);
      showToast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfigs();
  }, [customTenantId]);

  const handleTestConnection = async (provider: string) => {
    setTestingProviders((prev) => ({ ...prev, [provider]: true }));
    try {
      const resp = await aiService.testConfig(provider, customTenantId);
      if (resp && resp.healthy) {
        showToast.success(
          `Connection healthy for ${provider}! Latency: ${resp.latency_ms || "N/A"} ms`,
        );
      } else {
        showToast.error(`Connection test failed for ${provider}.`);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to test connection.";
      showToast.error(msg);
    } finally {
      setTestingProviders((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleViewConfig = async (provider: string) => {
    try {
      const cfg = await aiService.getConfig(provider, customTenantId);
      setSelectedConfig(cfg);
      setIsViewModalOpen(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to fetch AI Provider config details.";
      showToast.error(msg);
    }
  };

  const handleDeleteConfig = (provider: string) => {
    setProviderToDelete(provider);
    setIsDeleteModalOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!providerToDelete) return;
    setIsDeleting(true);
    try {
      await aiService.deleteConfig(providerToDelete, customTenantId);
      showToast.success(`${providerToDelete} config removed successfully`);
      void fetchConfigs();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to delete AI Provider configuration.";
      showToast.error(msg);
    } finally {
      setIsDeleting(false);
      setProviderToDelete(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
  };

  const filteredConfigs = useMemo(() => {
    return configs.filter((cfg) => {
      const searchMatches =
        !searchQuery.trim() ||
        (cfg.provider || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (cfg.display_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (cfg.default_model || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const statusMatches =
        !statusFilter ||
        (statusFilter === "active" ? cfg.is_active : !cfg.is_active);

      return searchMatches && statusMatches;
    });
  }, [configs, searchQuery, statusFilter]);

  const columns: Column<TenantAIConfig>[] = useMemo(
    () => [
      {
        key: "provider",
        label: "Provider",
        render: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#112868] select-none">
              {row.display_name || row.provider}
            </p>
            {row.endpoint && (
              <p className="text-xs text-[#64748b] mt-0.5 truncate max-w-[280px]">
                {row.endpoint}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "config_type",
        label: "Config Type",
        render: (row) => {
          const type = row.config_type || "direct";
          return <CodeBadge className="uppercase" label={type} />;
        },
      },
      {
        key: "default_model",
        label: "Default Model",
        render: (row) => (
          <span className="">
            {row.default_model || "—"}
          </span>
        ),
      },
      {
        key: "is_active",
        label: "Status",
        render: (row) => (
          <StatusBadge variant={row.is_active ? "success" : "failure"}>
            {row.is_active ? "Active" : "Disabled"}
          </StatusBadge>
        ),
      },
      {
        key: "last_verified_at",
        label: "Last Verified",
        render: (row) => (
          <span className="">
            {row.last_verified_at ? formatDate(row.last_verified_at) : "Never"}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (row) => {
          const isTesting = testingProviders[row.provider] || false;
          return (
            <div className="flex items-center justify-end gap-2 pr-2">
              <button
                onClick={() => handleTestConnection(row.provider)}
                disabled={isTesting}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#112868]/20 rounded-md text-xs font-medium bg-white text-[#112868] hover:bg-[#112868]/5 transition-colors cursor-pointer disabled:opacity-50 select-none h-8"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#112868]" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-[#112868] text-[#112868]" />
                )}
                {isTesting ? "Testing..." : "Test Connection"}
              </button>

              <ActionDropdown
                actions={[
                  {
                    icon: <Eye className="w-3.5 h-3.5 shrink-0" />,
                    label: "View Config",
                    onClick: () => handleViewConfig(row.provider),
                  },
                  {
                    icon: (
                      <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    ),
                    label: "Delete Config",
                    onClick: () => handleDeleteConfig(row.provider),
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [testingProviders],
  );

  if (view === "create") {
    return (
      <TenantAIProviderCreate
        customTenantId={customTenantId}
        hideLayout={true}
        onCancel={() => setView("list")}
        onSuccess={() => {
          setView("list");
          void fetchConfigs();
        }}
      />
    );
  }

  const listContent = (
    <div className="flex flex-col gap-2">
      {/* Subhead Toolbar matching Screenshot filter design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search Here"
            containerClassName="relative w-full sm:w-[280px]"
          />

          <FilterDropdown
            label="Status"
            value={statusFilter || null}
            onChange={(v) => setStatusFilter(typeof v === "string" ? v : "")}
            placeholder="All"
            options={[
              { value: "active", label: "Active" },
              { value: "disabled", label: "Disabled" },
            ]}
          />

          {(searchQuery || statusFilter) && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-red-500 font-medium transition-colors cursor-pointer select-none"
            >
              Clear filters
            </button>
          )}
        </div>

        {hideLayout && (
          <PrimaryButton
            onClick={() => setView("create")}
            className="h-10 px-4 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create AI Provider
          </PrimaryButton>
        )}
      </div>

      {/* Table list */}
      <DataTable
        data={filteredConfigs}
        columns={columns}
        keyExtractor={(item) => item.id || item.provider}
        isLoading={isLoading}
        error={error}
        emptyMessage="No tenant AI providers configured."
      />

      <ViewAIProviderModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        config={selectedConfig}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        title="Delete AI Provider"
        message="Are you sure you want to delete this AI provider configuration? This action cannot be undone."
        itemName={providerToDelete || ""}
        isLoading={isDeleting}
      />
    </div>
  );

  if (hideLayout) {
    return (
      <div className="space-y-4">
        {listContent}
      </div>
    );
  }

  return (
    <Layout
      currentPage="AI Gateway Services"
      pageHeader={{
        title: "Tenant AI Providers List",
        description: "Manage tenant API keys and models for AI integrations.",
        action: (
          <PrimaryButton
            onClick={() => navigate("/tenant/ai/providers/create")}
            className="h-10 px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create AI Provider
          </PrimaryButton>
        ),
      }}
    >
      {listContent}
    </Layout>
  );
};

export default TenantAIProviders;
