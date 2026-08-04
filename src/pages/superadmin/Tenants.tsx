import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  PrimaryButton,
  StatusBadge,
  ActionDropdown,
  // DeleteConfirmationModal,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  type Column,
} from "@/components/shared";
// Note: NewTenantModal, ViewTenantModal, EditTenantModal are now in @/components/superadmin (commented out - using wizard/details/edit pages instead)
import { Plus, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tenantService } from "@/services/tenant-service";
import type { Tenant } from "@/types/tenant";
import { usePermissions } from "@/hooks/usePermissions";
// Helper function to get tenant initials
const getTenantInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

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
  status: string,
): "success" | "failure" | "process" => {
  switch (status.toLowerCase()) {
    case "active":
      return "success";
    case "deleted":
      return "failure";
    case "suspended":
      return "process";
    default:
      return "success";
  }
};

// Helper function to format subscription tier
const formatSubscriptionTier = (tier: string | null): string => {
  if (!tier) return "N/A";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

const Tenants = (): ReactElement => {
  const navigate = useNavigate();
  const { canCreate, canUpdate } = usePermissions();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Commented out - using wizard instead
  // const [isCreating, setIsCreating] = useState<boolean>(false); // Commented out - using wizard instead

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

  // View, Edit, Delete modals
  // const [viewModalOpen, setViewModalOpen] = useState<boolean>(false); // Commented out - using details page instead
  // const [editModalOpen, setEditModalOpen] = useState<boolean>(false); // Commented out - using edit page instead
  // const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  // const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  // const [selectedTenantName, setSelectedTenantName] = useState<string>("");
  // const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchTenants = async (
    page: number,
    itemsPerPage: number,
    status: string | null = null,
    sortBy: string[] | null = null,
    searchQuery: string | null = null,
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await tenantService.getAll(
        page,
        itemsPerPage,
        status,
        sortBy,
        searchQuery,
      );
      if (response.success) {
        setTenants(response.data);
        setPagination(response.pagination);
      } else {
        setError("Failed to load tenants");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to load tenants");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // We only reset to first page if we are actively searching.
      if (search) setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTenants(currentPage, limit, statusFilter, orderBy, debouncedSearch);
  }, [currentPage, limit, statusFilter, orderBy, debouncedSearch]);

  // Commented out - using wizard instead
  // const handleCreateTenant = async (data: {
  //   name: string;
  //   slug: string;
  //   status: 'active' | 'suspended' | 'deleted';
  //   settings?: Record<string, unknown> | null;
  //   subscription_tier?: string | null;
  //   max_users?: number | null;
  //   max_modules?: number | null;
  // }): Promise<void> => {
  //   try {
  //     setIsCreating(true);
  //     const response = await tenantService.create(data);
  //     const message = response.message || `Tenant created successfully`;
  //     const description = response.message ? undefined : `${data.name} has been added`;
  //     showToast.success(message, description);
  //     // Close modal and refresh tenant list
  //     setIsModalOpen(false);
  //     await fetchTenants(currentPage, limit, statusFilter, orderBy);
  //   } catch (err: any) {
  //     throw err; // Let the modal handle the error display
  //   } finally {
  //     setIsCreating(false);
  //   }
  // };

  // View tenant handler
  const handleViewTenant = (tenantId: string): void => {
    navigate(`/tenants/${tenantId}`);
  };

  // Edit tenant handler
  const handleEditTenant = (tenantId: string): void => {
    navigate(`/tenants/${tenantId}/edit`);
  };

  // Update tenant handler - removed, now handled in EditTenant page

  // Delete tenant handler
  // const handleDeleteTenant = (tenantId: string, tenantName: string): void => {
  //   setSelectedTenantId(tenantId);
  //   setSelectedTenantName(tenantName);
  //   setDeleteModalOpen(true);
  // };

  // Confirm delete handler
  // const handleConfirmDelete = async (): Promise<void> => {
  //   if (!selectedTenantId) return;

  //   try {
  //     setIsDeleting(true);
  //     await tenantService.delete(selectedTenantId);
  //     setDeleteModalOpen(false);
  //     setSelectedTenantId(null);
  //     setSelectedTenantName("");
  //     await fetchTenants(currentPage, limit, statusFilter, orderBy);
  //   } catch (err: any) {
  //     throw err; // Let the modal handle the error display
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };

  // Define table columns
  const columns: Column<Tenant>[] = [
    {
      key: "name",
      label: "Tenant Name",
      render: (tenant) => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/tenants/${tenant.id}`)}
        >
          <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-normal text-[#9aa6b2]">
              {tenant.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#112868]">
              {tenant.name}
            </span>
            <span className="text-[10px] text-[#6b7280] font-mono leading-none mt-0.5">
              {tenant?.slug}
            </span>
          </div>
        </div>
        // <div className="flex items-center gap-3">
        //   <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
        //     <span className="text-xs font-normal text-[#9aa6b2]">
        //       {getTenantInitials(tenant.name)}
        //     </span>
        //   </div>
        //   <span className="">
        //     {tenant.name}
        //   </span>
        // </div>
      ),
      mobileLabel: "Name",
    },
    {
      key: "status",
      label: "Status",
      render: (tenant) => (
        <StatusBadge variant={getStatusVariant(tenant.status)}>
          {tenant.status}
        </StatusBadge>
      ),
    },
    {
      key: "user_count",
      label: "Users",
      render: (tenant) => <span className="">{tenant.user_count ?? 0}</span>,
    },
    {
      key: "subscription_tier",
      label: "Subscription Tier",
      render: (tenant) => (
        <span className="">
          {formatSubscriptionTier(tenant.subscription_tier)}
        </span>
      ),
    },
    {
      key: "module_count",
      label: "Modules",
      render: (tenant) => <span className="">{tenant.module_count ?? 0}</span>,
    },
    {
      key: "created_at",
      label: "Joined Date",
      render: (tenant) => (
        <span className="">{formatDate(tenant.created_at)}</span>
      ),
      mobileLabel: "Joined",
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (tenant) => (
        <div className="flex justify-end">
          <ActionDropdown
            onView={() => handleViewTenant(tenant.id)}
            onEdit={
              canUpdate("users") ? () => handleEditTenant(tenant.id) : undefined
            }
            // onDelete={() => handleDeleteTenant(tenant.id, tenant.name)}
          />
        </div>
      ),
    },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (tenant: Tenant) => (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/tenants/${tenant.id}`)}
        >
          <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-normal text-[#9aa6b2]">
              {getTenantInitials(tenant.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#112868] truncate">
              {tenant.name}
            </h3>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {formatDate(tenant.created_at)}
            </p>
          </div>
        </div>
        <ActionDropdown
          onView={() => handleViewTenant(tenant.id)}
          onEdit={() => handleEditTenant(tenant.id)}
          // onDelete={() => handleDeleteTenant(tenant.id, tenant.name)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#9aa6b2]">Status:</span>
          <div className="mt-1">
            <StatusBadge variant={getStatusVariant(tenant.status)}>
              {tenant.status}
            </StatusBadge>
          </div>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Plan:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {formatSubscriptionTier(tenant.subscription_tier)}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Users:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {tenant.max_users ?? "N/A"}
          </p>
        </div>
        <div>
          <span className="text-[#9aa6b2]">Modules:</span>
          <p className="text-[#0f1724] font-normal mt-1">
            {tenant.max_modules ?? "N/A"}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      currentPage="Tenants"
      pageHeader={{
        title: "Tenant List",
        description:
          "View and manage all tenants in your QAssure platform from a single place.",
      }}
    >
      {/* Table Container */}
      <div className="overflow-hidden">
        {/* Table Header with Filters */}
        <div className="pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Global Search */}
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search by name or slug..."
            />

            {/* Status Filter */}
            <FilterDropdown
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "deleted", label: "Deleted" },
              ]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as string | null);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              placeholder="All"
            />

            {/* Sort Filter */}
            <FilterDropdown
              label="Sort by"
              options={[
                { value: ["name", "asc"], label: "Name (A-Z)" },
                { value: ["name", "desc"], label: "Name (Z-A)" },
                { value: ["created_at", "asc"], label: "Created (Oldest)" },
                { value: ["created_at", "desc"], label: "Created (Newest)" },
                { value: ["updated_at", "asc"], label: "Updated (Oldest)" },
                { value: ["updated_at", "desc"], label: "Updated (Newest)" },
              ]}
              value={orderBy}
              onChange={(value) => {
                setOrderBy(value as string[] | null);
                setCurrentPage(1); // Reset to first page when sort changes
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

            {/* New Tenant Button (Old) - Commented out, using wizard instead */}
            {/* <PrimaryButton
              size="default"
              className="flex items-center gap-2"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">New Tenant</span>
            </PrimaryButton> */}

            {/* Add Tenant Button (New Wizard) */}
            {canCreate("tenants") && (
              <PrimaryButton
                size="default"
                className="flex items-center gap-2"
                onClick={() => navigate("/tenants/create-wizard")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">Add Tenant</span>
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={tenants}
          columns={columns}
          keyExtractor={(tenant) => tenant.id}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No tenants found"
          isLoading={isLoading}
          error={error}
        />

        {/* Table Footer with Pagination */}
        {pagination.total > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            limit={limit}
            onPageChange={(page: number) => {
              setCurrentPage(page);
            }}
            onLimitChange={(newLimit: number) => {
              setLimit(newLimit);
              setCurrentPage(1); // Reset to first page when limit changes
            }}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {/* <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTenantId(null);
          setSelectedTenantName("");
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Tenant"
        message="Are you sure you want to delete this tenant"
        itemName={selectedTenantName}
        isLoading={isDeleting}
      /> */}
    </Layout>
  );
};

export default Tenants;
