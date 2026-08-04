import {
  useState,
  useEffect,
  type ReactElement,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector } from "react-redux";
import {
  StatusBadge,
  DataTable,
  Pagination,
  FilterDropdown,
  DeleteConfirmationModal,
  WorkflowDefinitionModal,
  WorkflowDefinitionViewModal,
  SearchBox,
  type Column,
  ActionDropdown,
} from "@/components/shared";
import { Play, Power, Trash2, Copy, Edit, Eye } from "lucide-react";
import { workflowService } from "@/services/workflow-service";
import type { WorkflowDefinition } from "@/types/workflow";
import { showToast } from "@/utils/toast";
import type { RootState } from "@/store/store";
import { formatDate } from "@/utils/format-date";
import CodeBadge from "./CodeBadge";
import { usePermissions } from "@/hooks/usePermissions";

export interface WorkflowDefinitionsTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

interface WorkflowDefinitionsTableProps {
  tenantId?: string | null; // If provided, use this tenantId (Super Admin mode)
  compact?: boolean; // Compact mode for tabs
  showHeader?: boolean;
  entityType?: string; // Filter by entity type
}

const WorkflowDefinitionsTable = forwardRef<
  WorkflowDefinitionsTableRef,
  WorkflowDefinitionsTableProps
>(
  (
    { tenantId: tenantId, compact = false, showHeader = true, entityType },
    ref,
  ): ReactElement => {
    const reduxTenantId = useSelector(
      (state: RootState) => state.auth.tenantId,
    );
    const { canCreate, canRead, hasPermission } = usePermissions();
    const effectiveTenantId = tenantId || reduxTenantId || undefined;

    const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(compact ? 10 : 10);
    const [totalItems, setTotalItems] = useState<number>(0);

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] =
      useState<string>("");

    // Modal states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDefinition, setSelectedDefinition] =
      useState<WorkflowDefinition | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewDefinitionId, setViewDefinitionId] = useState<string | null>(
      null,
    );
    const [isActionLoading, setIsActionLoading] = useState(false);
    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      openNewModal: () => {
        setSelectedDefinition(null);
        setIsModalOpen(true);
      },
      refresh: () => {
        fetchDefinitions();
      },
    }));

    const fetchDefinitions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await workflowService.listDefinitions({
          tenantId: effectiveTenantId,
          entity_type: entityType,
          status: statusFilter || undefined,
          limit,
          offset: (currentPage - 1) * limit,
          search: debouncedSearchQuery || undefined,
        });

        if (response.success) {
          setDefinitions(response.data);
          setTotalItems(response.pagination?.total || response.data.length);
        } else {
          setError("Failed to load workflow definitions");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ||
            "Failed to load workflow definitions",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Debouncing search query
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 500);

      return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
      setCurrentPage(1);
    }, [debouncedSearchQuery, statusFilter]);

    useEffect(() => {
      fetchDefinitions();
    }, [
      effectiveTenantId,
      statusFilter,
      currentPage,
      limit,
      debouncedSearchQuery,
    ]);

    const handleDelete = async () => {
      if (!selectedDefinition) return;
      try {
        setIsActionLoading(true);
        const response = await workflowService.deleteDefinition(
          selectedDefinition.id,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Workflow definition deleted successfully");
          setIsDeleteModalOpen(false);
          fetchDefinitions();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message ||
            "Failed to delete workflow definition",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const handleActivate = async (id: string) => {
      try {
        setIsActionLoading(true);
        const response = await workflowService.activateDefinition(
          id,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Workflow definition activated");
          fetchDefinitions();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to activate",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const handleDeprecate = async (id: string) => {
      try {
        setIsActionLoading(true);
        const response = await workflowService.deprecateDefinition(
          id,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Workflow definition deprecated");
          fetchDefinitions();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to deprecate",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const handleClone = async (id: string, name: string) => {
      try {
        setIsActionLoading(true);
        const response = await workflowService.cloneDefinition(
          id,
          `${name} (Clone)`,
          effectiveTenantId,
        );
        if (response.success) {
          showToast.success("Workflow definition cloned");
          fetchDefinitions();
        }
      } catch (err: any) {
        showToast.error(
          err?.response?.data?.error?.message || "Failed to clone",
        );
      } finally {
        setIsActionLoading(false);
      }
    };

    const columns: Column<WorkflowDefinition>[] = [
      {
        key: "name",
        label: "Workflow Component",
        render: (wf) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#0f1724]">
              {wf.name}
            </span>
            <span className="text-xs text-[#6b7280] font-mono">{wf.code}</span>
          </div>
        ),
      },
      {
        key: "entity_type",
        label: "Entity Type",
        render: (wf) => <CodeBadge label={wf.entity_type} />,
      },
      {
        key: "version",
        label: "Version",
        render: (wf) => (
          <span className="text-sm text-[#6b7280]">v{wf.version}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (wf) => {
          let variant: "success" | "failure" | "info" | "process" = "info";
          if (wf.status === "active") variant = "success";
          if (wf.status === "deprecated") variant = "failure";
          if (wf.status === "draft") variant = "process";

          return <StatusBadge variant={variant}>{wf.status}</StatusBadge>;
        },
      },
      {
        key: "source_module",
        label: "Module",
        render: (wf) => (
          <span className="text-sm text-[#6b7280]">
            {wf.source_module?.join(", ")}
          </span>
        ),
      },
      {
        key: "created_at",
        label: "Created Date",
        render: (wf) => (
          <span className="text-sm text-[#6b7280]">
            {formatDate(wf.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (wf) => (
          <div className="flex justify-end">
            <ActionDropdown
              actions={[
                canCreate("workflow")
                  ? {
                      icon: <Copy className="w-4 h-4" />,
                      label: "Clone",
                      onClick: () => handleClone(wf.id, wf.name),
                    }
                  : null,
                canRead("workflow")
                  ? {
                      icon: <Eye className="w-4 h-4" />,
                      label: "View",
                      onClick: () => {
                        setViewDefinitionId(wf.id);
                        setIsViewModalOpen(true);
                      },
                    }
                  : null,
                canCreate("workflow")
                  ? {
                      icon: <Edit className="w-4 h-4" />,
                      label: "Edit",
                      onClick: () => {
                        setSelectedDefinition(wf);
                        setIsModalOpen(true);
                      },
                    }
                  : null,
                (wf.status === "draft" || wf.status === "deprecated") &&
                canCreate("workflow")
                  ? {
                      icon: <Play className="w-4 h-4" />,
                      label: "Activate",
                      onClick: () => handleActivate(wf.id),
                    }
                  : null,
                wf.status === "active" && canCreate("workflow")
                  ? {
                      icon: <Power className="w-4 h-4" />,
                      label: "Deprecate",
                      onClick: () => handleDeprecate(wf.id),
                    }
                  : null,
                hasPermission("workflow", "admin")
                  ? {
                      icon: <Trash2 className="w-4 h-4" />,
                      label: "Delete",
                      variant: "danger",
                      onClick: () => {
                        setSelectedDefinition(wf);
                        setIsDeleteModalOpen(true);
                      },
                    }
                  : null,
              ].filter((a): a is any => a !== null)}
            />
          </div>
        ),
      },
    ];

    return (
      <div className={`flex flex-col gap-2`}>
        {showHeader && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search name, code or description"
              />
              <FilterDropdown
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "draft", label: "Draft" },
                  { value: "deprecated", label: "Deprecated" },
                ]}
                value={statusFilter || ""}
                onChange={(value) =>
                  setStatusFilter(
                    value ? (Array.isArray(value) ? value[0] : value) : null,
                  )
                }
              />
            </div>
          </div>
        )}

        <DataTable
          data={definitions}
          columns={columns}
          keyExtractor={(wf) => wf.id}
          isLoading={isLoading}
          error={error}
          emptyMessage="No workflow definitions found"
        />

        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / limit)}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        )}

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedDefinition(null);
          }}
          onConfirm={handleDelete}
          title="Delete Workflow Definition"
          message="Are you sure you want to delete this workflow definition? This action cannot be undone."
          itemName={selectedDefinition?.name || ""}
          isLoading={isActionLoading}
        />

        <WorkflowDefinitionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDefinition(null);
          }}
          definition={selectedDefinition}
          tenantId={effectiveTenantId}
          onSuccess={fetchDefinitions}
          initialEntityType={entityType}
        />

        <WorkflowDefinitionViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewDefinitionId(null);
          }}
          definitionId={viewDefinitionId}
          tenantId={effectiveTenantId}
        />
      </div>
    );
  },
);

export default WorkflowDefinitionsTable;
