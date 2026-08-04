import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  StatusBadge,
  PrimaryButton,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  type Column,
  ActionDropdown,
  // SecondaryButton,
} from "@/components/shared";
import {
  ViewModuleModal,
  NewModuleModal,
  EditModuleModal,
  WebhookSyncModal,
  ApikeyReissueModal,
} from "@/components/superadmin";
import { Plus, ArrowUpDown, Eye, CloudSync, Edit, Key } from "lucide-react";
import { moduleService } from "@/services/module-service";
import type { Module } from "@/types/module";

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper function to get status badge variant
const getStatusVariant = (
  status: string | null,
): "success" | "failure" | "process" => {
  if (!status) return "process";
  switch (status.toLowerCase()) {
    case "running":
    case "active":
    case "healthy":
      return "success";
    case "stopped":
    case "failed":
    case "unhealthy":
      return "failure";
    default:
      return "process";
  }
};

const Modules = (): ReactElement => {
  const { canCreate, canUpdate } = usePermissions();
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<string[] | null>(null);

  // Search state
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // View modal
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<Module | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState<boolean>(false);
  const [reissueModalOpen, setReissueModalOpen] = useState<boolean>(false);

  const fetchModules = async (
    page: number,
    itemsPerPage: number,
    status: string | null = null,
    sortBy: string[] | null = null,
    searchQuery: string | null = null,
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await moduleService.getAll(
        page,
        itemsPerPage,
        status,
        sortBy,
        searchQuery,
      );
      if (response.success) {
        setModules(response.data);
        setPagination(response.pagination);
      } else {
        setError("Failed to load modules");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load modules");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // We only reset to first page if we are actively searching.
      if (search) setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch modules on mount and when pagination/filters change
  useEffect(() => {
    fetchModules(currentPage, limit, statusFilter, orderBy, debouncedSearch);
  }, [currentPage, limit, statusFilter, orderBy, debouncedSearch]);

  // View module handler
  const handleViewModule = (moduleId: string): void => {
    setSelectedModuleId(moduleId);
    setViewModalOpen(true);
  };

  // Webhook sync handler
  const handleOpenWebhookSync = (moduleId: string): void => {
    setSelectedModuleId(moduleId);
    setWebhookModalOpen(true);
  };

  // Reissue API key handler
  const handleOpenReissueApiKey = (moduleId: string): void => {
    setSelectedModuleId(moduleId);
    setReissueModalOpen(true);
  };

  // Create module handler
  const handleCreateModule = async (
    data: any,
  ): Promise<{ api_key: { key: string } }> => {
    try {
      setIsCreating(true);
      const response = await moduleService.create(data);
      await fetchModules(currentPage, limit, statusFilter, orderBy);
      return { api_key: response.data.api_key };
    } catch (err: any) {
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  // Edit module handler
  const handleEditModule = (module: Module): void => {
    setSelectedModuleForEdit(module);
    setEditModalOpen(true);
  };

  // Update module handler
  const handleUpdateModule = async (data: any): Promise<any> => {
    if (!selectedModuleForEdit) return;
    try {
      setIsUpdating(true);
      const response = await moduleService.update(selectedModuleForEdit.id, data);
      await fetchModules(currentPage, limit, statusFilter, orderBy);
      return response;
    } catch (err: any) {
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  // Load module for view
  const loadModule = async (id: string): Promise<Module> => {
    const response = await moduleService.getById(id);
    return response.data;
  };

  // Define table columns
  const columns: Column<Module>[] = [
    {
      key: "name",
      label: "Module Name & ID",
      render: (module) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-normal text-[#9aa6b2]">
              {module.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-normal text-[#0f1724]">
              {module.name}
            </span>
            <span className="text-xs text-[#6b7280] font-mono">
              {module.module_id}
            </span>
          </div>
        </div>
      ),
      mobileLabel: "Name",
    },
    {
      key: "description",
      label: "Description",
      render: (module) => (
        <span className="">
          {module.description}
        </span>
      ),
    },
    {
      key: "version",
      label: "Version",
      render: (module) => (
        <span className="">
          {module.version}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (module) => (
        <StatusBadge variant={getStatusVariant(module.status)}>
          {module.status || "Unknown"}
        </StatusBadge>
      ),
    },
    {
      key: "health_status",
      label: "Health Status",
      render: (module) => (
        <StatusBadge variant={getStatusVariant(module.health_status)}>
          {module.health_status || "N/A"}
        </StatusBadge>
      ),
    },
    {
      key: "runtime_language",
      label: "Runtime",
      render: (module) => (
        <span className="">
          {module.runtime_language || "N/A"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Registered Date",
      render: (module) => (
        <span className="">
          {formatDate(module.created_at)}
        </span>
      ),
      mobileLabel: "Registered",
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (module) => (
        <div className="flex justify-end">
          <ActionDropdown
            actions={[
              {
                icon: <Eye className="w-3.5 h-3.5 shrink-0" />,
                label: "View",
                onClick: () => handleViewModule(module.id),
              },
              ...(canUpdate("modules")
                ? [
                    {
                      icon: <Edit className="w-3.5 h-3.5 shrink-0" />,
                      label: "Edit",
                      onClick: () => handleEditModule(module),
                    },
                    {
                      icon: <Key className="w-3.5 h-3.5 shrink-0" />,
                      label: "Reissue API Key",
                      onClick: () => handleOpenReissueApiKey(module.id),
                    },
                    {
                      icon: <CloudSync className="w-3.5 h-3.5 shrink-0" />,
                      label: "Webhook Sync",
                      onClick: () => handleOpenWebhookSync(module.id),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
    // {
    //   key: "actions",
    //   label: "Actions",
    //   align: "right",
    //   render: (module) => (
    //     <div className="flex justify-end gap-3">
    //       <button
    //         type="button"
    //         onClick={() => handleViewModule(module.id)}
    //         className="text-sm text-[#112868] hover:text-[#0d1f4e] font-medium transition-colors"
    //       >
    //         View
    //       </button>
    //       <PrimaryButton
    //         size="default"
    //         type="button"
    //         onClick={() => handleOpenWebhookSync(module.id)}
    //       >
    //         WebhookSync
    //       </PrimaryButton>
    //     </div>
    //   ),
    // },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (module: Module) => (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-normal text-[#9aa6b2]">
              {module.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#0f1724] truncate">
              {module.name}
            </h3>
            <p className="text-xs text-[#6b7280] mt-0.5 truncate font-mono">
              {module.module_id}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleViewModule(module.id)}
          className="text-sm text-[#112868] hover:text-[#0d1f4e] font-medium transition-colors shrink-0"
        >
          View
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#9aa6b2]">Status:</span>
          <div className="mt-1">
            <StatusBadge variant={getStatusVariant(module.status)}>
              {module.status || "Unknown"}
            </StatusBadge>
          </div>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Health:</span>
          <div className="mt-1">
            <StatusBadge variant={getStatusVariant(module.health_status)}>
              {module.health_status || "N/A"}
            </StatusBadge>
          </div>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Version:</span>
          <p className="text-[#0f1724] font-normal mt-1">{module.version}</p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Runtime:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {module.runtime_language || "N/A"}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Registered:</span>
          <p className="text-[#6b7280] font-normal mt-1">
            {formatDate(module.created_at)}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Description:</span>
          <p className="text-[#0f1724] font-normal mt-1 line-clamp-2">
            {module.description}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      currentPage="Modules"
      pageHeader={{
        title: "Module List",
        description:
          "View and manage all system modules registered in the QAssure platform.",
      }}
    >
      {/* Table Container */}
      <div className="overflow-hidden">
        {/* Table Header with Filters */}
        <div className="pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Global Search */}
            <SearchBox 
              value={search}
              onChange={setSearch}
              placeholder="Search by name, ID or description..."
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              options={[
                { value: "running", label: "Running" },
                { value: "stopped", label: "Stopped" },
                { value: "failed", label: "Failed" },
              ]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as string | null);
                setCurrentPage(1);
              }}
              placeholder="All"
            />

            {/* Sort Filter */}
            <FilterDropdown
              label="Sort by"
              options={[
                { value: ["name", "asc"], label: "Name (A-Z)" },
                { value: ["name", "desc"], label: "Name (Z-A)" },
                { value: ["module_id", "asc"], label: "Module ID (A-Z)" },
                { value: ["module_id", "desc"], label: "Module ID (Z-A)" },
                { value: ["status", "asc"], label: "Status (A-Z)" },
                { value: ["status", "desc"], label: "Status (Z-A)" },
                { value: ["created_at", "asc"], label: "Created (Oldest)" },
                { value: ["created_at", "desc"], label: "Created (Newest)" },
                { value: ["updated_at", "asc"], label: "Updated (Oldest)" },
                { value: ["updated_at", "desc"], label: "Updated (Newest)" },
              ]}
              value={orderBy}
              onChange={(value) => {
                setOrderBy(value as string[] | null);
                setCurrentPage(1);
              }}
              placeholder="Default"
              showIcon
              icon={<ArrowUpDown className="w-3.5 h-3.5 text-[#475569]" />}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Export Button */}
            {/* <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button> */}

            {/* New Module Button */}
            {canCreate("modules") && (
              <PrimaryButton
                size="default"
                className="flex items-center gap-2"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">New Module</span>
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={modules}
          keyExtractor={(module) => module.id}
          isLoading={isLoading}
          error={error}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No modules found"
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

      {/* New Module Modal */}
      <NewModuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateModule}
        isLoading={isCreating}
      />

      {/* View Module Modal */}
      <ViewModuleModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedModuleId(null);
        }}
        moduleId={selectedModuleId}
        onLoadModule={loadModule}
      />

      {/* Edit Module Modal */}
      <EditModuleModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedModuleForEdit(null);
        }}
        module={selectedModuleForEdit}
        onSubmit={handleUpdateModule}
        isLoading={isUpdating}
      />

      {/* Webhook Sync Modal */}
      <WebhookSyncModal
        isOpen={webhookModalOpen}
        onClose={() => {
          setWebhookModalOpen(false);
          setSelectedModuleId(null);
        }}
        moduleId={selectedModuleId}
        onLoadModule={loadModule}
      />

      {/* Reissue API Key Modal */}
      <ApikeyReissueModal
        isOpen={reissueModalOpen}
        onClose={() => {
          setReissueModalOpen(false);
          setSelectedModuleId(null);
        }}
        moduleId={selectedModuleId}
        onLoadModule={loadModule}
      />
    </Layout>
  );
};

export default Modules;
