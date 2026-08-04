import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Copy,
  History,
  Trash2,
  Edit3,
  ClipboardCheck,
  Play,
  Activity,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  Pagination,
  PrimaryButton,
  ActionDropdown,
  DeleteConfirmationModal,
  SearchBox,
  FilterDropdown,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import { moduleService } from "@/services/module-service";
import type { AIPrompt } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { PromptVersionsModal } from "@/components/tenant/PromptVersionsModal";
import { cn } from "@/lib/utils";

const PromptManagement = (): ReactElement => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Module filter states
  const [modules, setModules] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");

  // Modal states
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load modules list on mount
  useEffect(() => {
    const loadModules = async (): Promise<void> => {
      try {
        const res = await moduleService.getMyModules();
        setModules(
          (res.data || []).map((m: any) => ({
            value: m.id,
            label: m.name,
          }))
        );
      } catch (err: any) {
        console.error("Failed to load modules list", err);
      }
    };
    void loadModules();
  }, []);

  const loadPrompts = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await aiService.listPrompts({
        page,
        limit,
        search: debouncedSearch || undefined,
        module_id: selectedModuleId || undefined,
      });
      setPrompts(result.data || []);
      setPagination({
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 1,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Failed to load prompts";
      setError(message);
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPrompts();
  }, [page, limit, debouncedSearch, selectedModuleId]);

  const handleStatusToggle = async (prompt: AIPrompt) => {
    const newStatus = prompt.status === "active" ? "draft" : "active";
    try {
      await aiService.updatePromptStatus(prompt.id, newStatus);
      showToast.success(`Prompt marked as ${newStatus}`);
      void loadPrompts();
    } catch (err: any) {
      showToast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt) return;
    setIsActionLoading(true);
    try {
      await aiService.deletePrompt(selectedPrompt.id);
      showToast.success("Prompt deleted successfully");
      setIsDeleteOpen(false);
      void loadPrompts();
    } catch (err: any) {
      showToast.error("Failed to delete prompt");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClone = async (prompt: AIPrompt) => {
    try {
      await aiService.clonePrompt(prompt.id); // Assuming this exists or I'll add it
      showToast.success("Prompt cloned successfully");
      void loadPrompts();
    } catch (err: any) {
      showToast.error("Failed to clone prompt");
    }
  };

  const columns: Column<AIPrompt>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name & Description",
        render: (row) => (
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-[#112868] hover:underline cursor-pointer"
              onClick={() => navigate(`/tenant/ai/prompts/${row.id}/edit`)}
            >
              {row.name}
            </p>
            <p className="text-xs text-[#64748b] truncate max-w-[280px]">
              {row.description || "No description"}
            </p>
          </div>
        ),
      },
      {
        key: "useCase",
        label: "Use Case",
        render: (row) => {
          if (!row.useCase)
            return <span className="text-sm text-[#94a3b8]">—</span>;
          return (
            <span className="inline-flex items-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] font-medium text-[#1e293b]">
              {row.useCase}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-[18px] rounded-full relative transition-colors duration-200 cursor-pointer shadow-inner",
                row.status === "active" ? "bg-[#112868]" : "bg-gray-200",
              )}
              onClick={() => handleStatusToggle(row)}
            >
              <div
                className={cn(
                  "absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform duration-200 shadow-sm",
                  row.status === "active"
                    ? "translate-x-[18px] bg-[#00cfd5]"
                    : "bg-white",
                )}
              />
            </div>
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-wider",
                row.status === "active" ? "text-green-600" : "text-gray-400",
              )}
            >
              {row.status || "draft"}
            </span>
          </div>
        ),
      },
      {
        key: "version",
        label: "Version",
        render: (row) => (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
            v{row.version || 1}
          </span>
        ),
      },
      {
        key: "tags",
        label: "Tags",
        render: (row) => {
          const tags = ((row as any).tags || []) as string[];

          if (!tags.length) {
            return <span className="text-xs text-[#94a3b8]">—</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[10px] text-gray-400 font-medium">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "Updated",
        label: "Last Updated",
        render: (row) => (
          <span className="text-xs text-[#64748b]">
            {formatDate(row.updatedAt || row.createdAt || "")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (row) => (
          <div className="flex justify-end pr-2">
            <ActionDropdown
              actions={[
                {
                  icon: <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />,
                  label: "Prompt Test Cases",
                  onClick: () =>
                    navigate(`/tenant/ai/prompts/${row.id}/test-cases`),
                },
                {
                  icon: <Edit3 className="w-3.5 h-3.5 shrink-0" />,
                  label: "Edit Prompt",
                  onClick: () => navigate(`/tenant/ai/prompts/${row.id}/edit`),
                },
                {
                  icon: <History className="w-3.5 h-3.5 shrink-0" />,
                  label: "Version History",
                  onClick: () => {
                    setSelectedPrompt(row);
                    setIsVersionsOpen(true);
                  },
                },
                {
                  icon: <Play className="w-3.5 h-3.5 shrink-0 text-emerald-600" />,
                  label: "Run / Execute",
                  onClick: () => navigate(`/tenant/ai/prompts/${row.id}/execute`),
                },
                {
                  icon: <Activity className="w-3.5 h-3.5 shrink-0 text-blue-600" />,
                  label: "Execution Logs",
                  onClick: () => navigate(`/tenant/ai/prompts/${row.id}/executions`),
                },
                {
                  icon: <Copy className="w-3.5 h-3.5 shrink-0" />,
                  label: "Clone Prompt",
                  onClick: () => handleClone(row),
                },
                {
                  icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />,
                  label: "Delete Prompt",
                  variant: "danger",
                  onClick: () => {
                    setSelectedPrompt(row);
                    setIsDeleteOpen(true);
                  },
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [navigate, loadPrompts],
  );

  return (
    <Layout
      currentPage="Prompt Management"
      pageHeader={{
        title: "Prompt Management",
        description: "Manage reusable AI prompts and versioned templates.",
        action: (
          <PrimaryButton
            onClick={() => navigate("/tenant/ai/prompts/create")}
            className="flex items-center gap-2 h-10 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Prompt
          </PrimaryButton>
        ),
      }}
    >
      <div className="overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-3 pb-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name or description..."
            containerClassName="relative w-full md:w-80"
          />
          {/* <div className="w-full md:w-60"> */}
          <FilterDropdown
            label="Module"
            value={selectedModuleId || null}
            onChange={(val) => {
              setSelectedModuleId(val ? (Array.isArray(val) ? val[0] : val) : "");
              setPage(1);
            }}
            options={modules.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="All Modules"
          />
          {/* </div> */}
        </div>

        <DataTable
          data={prompts}
          columns={columns}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          error={error}
          emptyMessage="No prompts found. Click 'Create Prompt' to get started."
        />

        {pagination.total > 0 && (
          <div className="border-t border-[rgba(0,0,0,0.08)] px-5 py-4 bg-gray-50/30">
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
            />
          </div>
        )}
      </div>

      <PromptVersionsModal
        isOpen={isVersionsOpen}
        onClose={() => setIsVersionsOpen(false)}
        prompt={selectedPrompt}
        onRollbackSuccess={loadPrompts}
      />


      <DeleteConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isLoading={isActionLoading}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt"
        itemName={selectedPrompt?.name}
      />
    </Layout>
  );
};

export default PromptManagement;
