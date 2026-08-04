import {
  useState,
  useEffect,
  type ReactElement,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  PrimaryButton,
  StatusBadge,
  ActionDropdown,
  NewRoleModal,
  ViewRoleModal,
  EditRoleModal,
  // DeleteConfirmationModal,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  type Column,
} from "@/components/shared";
import { Plus, ArrowUpDown } from "lucide-react";
import { roleService } from "@/services/role-service";
import type { Role, CreateRoleRequest, UpdateRoleRequest } from "@/types/role";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
// import { useAppTheme } from "@/hooks/useAppTheme";
import { usePermissions } from "@/hooks/usePermissions";
import CodeBadge from "@/components/shared/CodeBadge";

// Helper function to get scope badge variant
const getScopeVariant = (scope: string): "success" | "failure" | "process" => {
  switch (scope.toLowerCase()) {
    case "platform":
      return "success";
    case "tenant":
      return "process";
    case "module":
      return "failure";
    default:
      return "success";
  }
};

export interface RolesTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

interface RolesTableProps {
  tenantId?: string | null; // If provided, fetch roles for this tenant only
  showHeader?: boolean; // Show header with title and actions (default: true)
  compact?: boolean; // Compact mode for tabs (default: false)
}

export const RolesTable = forwardRef<RolesTableRef, RolesTableProps>(
  ({ tenantId, showHeader = true, compact = false }, ref): ReactElement => {
    // const { primaryColor } = useAppTheme();
    const { isTenantAdmin } = usePermissions();
    const [roles, setRoles] = useState<Role[]>([]);
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
    // const [scopeFilter, setScopeFilter] = useState<string | null>(null);
    const [orderBy, setOrderBy] = useState<string[] | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsModalOpen(true),
      refresh: () => fetchRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter),
    }));

    // Search state
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // View, Edit, Delete modals
    const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    // const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    // const [selectedRoleName, setSelectedRoleName] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    // const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const fetchRoles = async (
      page: number,
      itemsPerPage: number,
      sortBy: string[] | null = null,
      searchQuery: string | null = null,
      statusValStr: string | null = null,
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const statusVal = statusValStr === "true" ? true : statusValStr === "false" ? false : null;
        const response = tenantId
          ? await roleService.getByTenant(
              tenantId,
              page,
              itemsPerPage,
              sortBy,
              searchQuery,
              statusVal,
            )
          : await roleService.getAll(
              page,
              itemsPerPage,
              sortBy,
              searchQuery,
              null,
              statusVal,
            );
        if (response.success) {
          setRoles(response.data);
          setPagination(response.pagination);
        } else {
          setError("Failed to load roles");
        }
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || "Failed to load roles");
      } finally {
        setIsLoading(false);
      }
    };

    // Handle search debouncing
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
        if (search) setCurrentPage(1);
      }, 500);
      return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
      fetchRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
    }, [currentPage, limit, orderBy, debouncedSearch, statusFilter, tenantId]);

    const handleCreateRole = async (data: CreateRoleRequest): Promise<void> => {
      try {
        setIsCreating(true);
        const response = await roleService.create(data);
        const message = response.message || `Role created successfully`;
        const description = response.message
          ? undefined
          : `${data.name} has been added`;
        showToast.success(message, description);
        setIsModalOpen(false);
        await fetchRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
      } catch (err: any) {
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    // View role handler
    const handleViewRole = (roleId: string): void => {
      setSelectedRoleId(roleId);
      setViewModalOpen(true);
    };

    // Edit role handler
    const handleEditRole = (roleId: string
      // , roleName: string
    ): void => {
      setSelectedRoleId(roleId);
      // setSelectedRoleName(roleName);
      setEditModalOpen(true);
    };

    // Update role handler
    const handleUpdateRole = async (
      id: string,
      data: UpdateRoleRequest,
    ): Promise<void> => {
      try {
        setIsUpdating(true);
        const response = await roleService.update(id, data);
        const message = response.message || `Role updated successfully`;
        const description = response.message
          ? undefined
          : `${data.name} has been updated`;
        showToast.success(message, description);
        setEditModalOpen(false);
        setSelectedRoleId(null);
        // setSelectedRoleName("");
        await fetchRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
      } catch (err: any) {
        throw err;
      } finally {
        setIsUpdating(false);
      }
    };

    // Delete role handler
    // const handleDeleteRole = (roleId: string, roleName: string): void => {
    //   setSelectedRoleId(roleId);
    //   setSelectedRoleName(roleName);
    //   setDeleteModalOpen(true);
    // };

    // Confirm delete handler
    // const handleConfirmDelete = async (): Promise<void> => {
    //   if (!selectedRoleId) return;

    //   try {
    //     setIsDeleting(true);
    //     await roleService.delete(selectedRoleId);
    //     setDeleteModalOpen(false);
    //     setSelectedRoleId(null);
    //     setSelectedRoleName("");
    //     await fetchRoles(currentPage, limit, orderBy);
    //   } catch (err: any) {
    //     throw err; // Let the modal handle the error display
    //   } finally {
    //     setIsDeleting(false);
    //   }
    // };

    // Load role for view/edit
    const loadRole = async (id: string): Promise<Role> => {
      const response = await roleService.getById(id);
      return response.data;
    };

    // Table columns
    const columns: Column<Role>[] = [
      {
        key: "name",
        label: "Name",
        render: (role) => <span className="">{role.name}</span>,
      },
      {
        key: "code",
        label: "Code",
        render: (role) => <CodeBadge label={role.code} />,
      },
      {
        key: "description",
        label: "Description",
        render: (role) => (
          <span
            style={{
              display: "-webkit-box",
              width: "auto",
              maxWidth: "300px",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 1,
              overflow: "hidden",
              color: "var(--Global-Colors-Text-text-primary, #0F1724)",
              textOverflow: "ellipsis",
              fontFamily: "Figtree",
              fontSize: "14px",
              fontStyle: "normal",
              fontWeight: 400,
              lineHeight: "normal",
            }}
          >
            {role.description || "N/A"}
          </span>
        ),
      },
      {
        key: "scope",
        label: "Scope",
        render: (role) => (
          <StatusBadge variant={getScopeVariant(role.scope)}>
            {role.scope}
          </StatusBadge>
        ),
      },
      {
        key: "is_active",
        label: "Status",
        render: (role) => (
          <StatusBadge variant={role.is_active !== false ? "success" : "failure"}>
            {role.is_active !== false ? "Active" : "Inactive"}
          </StatusBadge>
        ),
      },
      {
        key: "user_count",
        label: "Users",
        render: (role) => <span className="">{role.user_count || 0}</span>,
      },
      {
        key: "created_at",
        label: "Created Date",
        render: (role) => (
          <span className="">{formatDate(role.created_at)}</span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (role) => (
          <div className="flex justify-end">
            <ActionDropdown
              onView={() => handleViewRole(role.id)}
              onEdit={
                isTenantAdmin
                  ? () => handleEditRole(role.id
                    // , role.name
                  )
                  : undefined
              }
              // onDelete={
              //   isTenantAdmin
              //     ? () => handleDeleteRole(role.id, role.name)
              //     : undefined
              // }
            />
          </div>
        ),
      },
    ];

    // Mobile card renderer
    const mobileCardRenderer = (role: Role) => (
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-[#0f1724] truncate">
              {role.name}
            </h3>
            <p className="text-xs text-[#6b7280] mt-0.5 font-mono">
              {role.code}
            </p>
          </div>
          <ActionDropdown
            onView={() => handleViewRole(role.id)}
            onEdit={
              isTenantAdmin
                ? () => handleEditRole(role.id
                  // , role.name
                )
                : undefined
            }
            // onDelete={
            //   isTenantAdmin
            //     ? () => handleDeleteRole(role.id, role.name)
            //     : undefined
            // }
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[#9aa6b2]">Scope:</span>
            <div className="mt-1">
              <StatusBadge variant={getScopeVariant(role.scope)}>
                {role.scope}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Status:</span>
            <div className="mt-1">
              <StatusBadge variant={role.is_active !== false ? "success" : "failure"}>
                {role.is_active !== false ? "Active" : "Inactive"}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Users:</span>
            <p className="text-[#0f1724] font-normal mt-1">
              {role.user_count || 0}
            </p>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Created:</span>
            <p className="text-[#0f1724] font-normal mt-1">
              {formatDate(role.created_at)}
            </p>
          </div>
          {role.description && (
            <div className="col-span-2">
              <span className="text-[#9aa6b2]">Description:</span>
              <p className="text-[#0f1724] font-normal mt-1">
                {role.description}
              </p>
            </div>
          )}
        </div>
      </div>
    );

    if (compact) {
      // Compact mode for tabs
      return (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-[#0f1724]"></h3>
              <div className="flex flex-wrap items-center gap-2">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Search..."
                />
                <FilterDropdown
                  label="Status"
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(Array.isArray(value) ? null : value || null);
                    setCurrentPage(1);
                  }}
                  placeholder="All Statuses"
                />
                {isTenantAdmin && (
                  <PrimaryButton
                    size="default"
                    className="flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">New Role</span>
                  </PrimaryButton>
                )}
              </div>
            </div>
            <DataTable
              data={roles}
              columns={columns}
              keyExtractor={(role) => role.id}
              mobileCardRenderer={mobileCardRenderer}
              emptyMessage="No roles found"
              isLoading={isLoading}
              error={error}
            />
            {pagination.totalPages > 0 && (
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
                  setCurrentPage(1);
                }}
              />
            )}
          </div>

          {/* Modals */}
          <NewRoleModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateRole}
            isLoading={isCreating}
            defaultTenantId={tenantId || undefined}
          />

          <ViewRoleModal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedRoleId(null);
            }}
            roleId={selectedRoleId}
            onLoadRole={loadRole}
          />

          <EditRoleModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedRoleId(null);
              // setSelectedRoleName("");
            }}
            roleId={selectedRoleId}
            onLoadRole={loadRole}
            onSubmit={handleUpdateRole}
            isLoading={isUpdating}
            defaultTenantId={tenantId || undefined}
          />

          {/* <DeleteConfirmationModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedRoleId(null);
              setSelectedRoleName("");
            }}
            onConfirm={handleConfirmDelete}
            title="Delete Role"
            message={`Are you sure you want to delete this role`}
            itemName={selectedRoleName}
            isLoading={isDeleting}
          /> */}
        </>
      );
    }

    // Full mode with header
    return (
      <>
        {/* Table Container */}
        <div className="overflow-hidden">
          {/* Table Header with Filters */}
          {showHeader && (
            <div className="pb-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Global Search */}
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or code..."
                />

                {/* Status Filter */}
                <FilterDropdown
                  label="Status"
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(Array.isArray(value) ? null : value || null);
                    setCurrentPage(1);
                  }}
                  placeholder="All Statuses"
                />

                {/* Sort Filter */}
                <FilterDropdown
                  label="Sort by"
                  options={[
                    { value: ["name", "asc"], label: "Name (A-Z)" },
                    { value: ["name", "desc"], label: "Name (Z-A)" },
                    { value: ["code", "asc"], label: "Code (A-Z)" },
                    { value: ["code", "desc"], label: "Code (Z-A)" },
                    { value: ["created_at", "asc"], label: "Created (Oldest)" },
                    {
                      value: ["created_at", "desc"],
                      label: "Created (Newest)",
                    },
                    { value: ["updated_at", "asc"], label: "Updated (Oldest)" },
                    {
                      value: ["updated_at", "desc"],
                      label: "Updated (Newest)",
                    },
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
                {/* New Role Button */}
                {isTenantAdmin && (
                  <PrimaryButton
                    size="default"
                    className="flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">New Role</span>
                  </PrimaryButton>
                )}
              </div>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            data={roles}
            columns={columns}
            keyExtractor={(role) => role.id}
            mobileCardRenderer={mobileCardRenderer}
            emptyMessage="No roles found"
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

        {/* Modals */}
        <NewRoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateRole}
          isLoading={isCreating}
          defaultTenantId={tenantId || undefined}
        />

        <ViewRoleModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedRoleId(null);
          }}
          roleId={selectedRoleId}
          onLoadRole={loadRole}
        />

        <EditRoleModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRoleId(null);
            // setSelectedRoleName("");
          }}
          roleId={selectedRoleId}
          onLoadRole={loadRole}
          onSubmit={handleUpdateRole}
          isLoading={isUpdating}
          defaultTenantId={tenantId || undefined}
        />

        {/* <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedRoleId(null);
            setSelectedRoleName("");
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Role"
          message={`Are you sure you want to delete this role`}
          itemName={selectedRoleName}
          isLoading={isDeleting}
        /> */}
      </>
    );
  },
);
