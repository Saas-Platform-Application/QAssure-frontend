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
  NewUserModal,
  ViewUserModal,
  EditUserModal,
  // DeleteConfirmationModal,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  type Column,
} from "@/components/shared";
import { Plus, ArrowUpDown } from "lucide-react";
import { userService } from "@/services/user-service";
import { roleService } from "@/services/role-service";
import type { Role } from "@/types/role";
import type { User } from "@/types/user";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePermissions } from "@/hooks/usePermissions";

// Helper function to get user initials
const getUserInitials = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string => {
  const first = (firstName || "").trim().slice(0, 1);
  const last = (lastName || "").trim().slice(0, 1);
  return `${first}${last}`.toUpperCase() || "?";
};

// Helper function to get status badge variant
const getStatusVariant = (
  status: string,
): "success" | "failure" | "process" => {
  switch (status.toLowerCase()) {
    case "active":
      return "success";
    case "pending_verification":
      return "process";
    case "inactive":
      return "failure";
    case "deleted":
      return "failure";
    case "suspended":
      return "process";
    default:
      return "success";
  }
};

export interface UsersTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

interface UsersTableProps {
  tenantId?: string | null; // If provided, fetch users for this tenant only
  showHeader?: boolean; // Show header with title and actions (default: true)
  compact?: boolean; // Compact mode for tabs (default: false)
}

export const UsersTable = forwardRef<UsersTableRef, UsersTableProps>(
  ({ tenantId, showHeader = true, compact = false }, ref): ReactElement => {
    const { canUpdate, canRead, canCreate } = usePermissions();
    const { primaryColor } = useAppTheme();
    // const { canCreate } = usePermissions();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsModalOpen(true),
      refresh: () =>
        fetchUsers(
          currentPage,
          limit,
          statusFilter,
          orderBy,
          debouncedSearch,
          roleFilter,
        ),
    }));

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(compact ? 10 : 5);
    const [pagination, setPagination] = useState<{
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    }>({
      page: 1,
      limit: compact ? 10 : 5,
      total: 0,
      totalPages: 1,
      hasMore: false,
    });

    // Filter state
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [orderBy, setOrderBy] = useState<string[] | null>(null);
    const [roleFilter, setRoleFilter] = useState<string | null>(null);

    // Search state
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Roles list for filter
    const [roles, setRoles] = useState<Role[]>([]);

    // View, Edit, Delete modals
    const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    // const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    // const [selectedUserName, setSelectedUserName] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    // const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const fetchUsers = async (
      page: number,
      itemsPerPage: number,
      status: string | null = null,
      sortBy: string[] | null = null,
      searchQuery: string | null = null,
      roleId: string | null = null,
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const response = tenantId
          ? await userService.getByTenant(
              tenantId,
              page,
              itemsPerPage,
              status,
              sortBy,
              searchQuery,
              roleId,
            )
          : await userService.getAll(
              page,
              itemsPerPage,
              status,
              sortBy,
              searchQuery,
              roleId,
            );
        if (response.success) {
          setUsers(response.data);
          setPagination(response.pagination);
        } else {
          setError("Failed to load users");
        }
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || "Failed to load users");
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch roles for filter
    useEffect(() => {
      const fetchRoles = async () => {
        try {
          const response = tenantId
            ? await roleService.getByTenant(tenantId, 1, 100)
            : await roleService.getAll(1, 100);
          if (response.success) {
            setRoles(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch roles:", err);
        }
      };
      fetchRoles();
    }, [tenantId]);

    // Handle search debouncing
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
        if (search) setCurrentPage(1);
      }, 500);
      return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
      fetchUsers(
        currentPage,
        limit,
        statusFilter,
        orderBy,
        debouncedSearch,
        roleFilter,
      );
    }, [
      currentPage,
      limit,
      statusFilter,
      orderBy,
      debouncedSearch,
      roleFilter,
      tenantId,
    ]);

    const handleCreateUser = async (data: {
      email: string;
      password?: string;
      first_name: string;
      last_name: string;
      status: "active" | "suspended" | "deleted";
      auth_provider: "local";
      role_module_combinations: {
        role_id: string;
        module_id?: string | null;
      }[];
      department_id?: string;
      designation_id?: string;
    }): Promise<void> => {
      try {
        setIsCreating(true);
        // Explicitly add tenant_id when tenantId is provided (for super admin creating users in tenant details)
        const createData = tenantId ? { ...data, tenant_id: tenantId } : data;
        const response = await userService.create(createData);
        const message = response.message || `User created successfully`;
        const description = response.message
          ? undefined
          : `${data.first_name} ${data.last_name} has been added`;
        showToast.success(message, description);
        setIsModalOpen(false);
        await fetchUsers(currentPage, limit, statusFilter, orderBy);
      } catch (err: any) {
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    // Clear all filters
    const handleClearFilters = (): void => {
      setSearch("");
      setDebouncedSearch("");
      setStatusFilter(null);
      setRoleFilter(null);
      setOrderBy(null);
      setCurrentPage(1);
    };

    // View user handler
    const handleViewUser = (userId: string): void => {
      setSelectedUserId(userId);
      setViewModalOpen(true);
    };

    // Edit user handler
    const handleEditUser = (
      userId: string,
      // , userName: string
    ): void => {
      setSelectedUserId(userId);
      // setSelectedUserName(userName);
      setEditModalOpen(true);
    };

    // Update user handler
    const handleUpdateUser = async (
      userId: string,
      data: {
        email: string;
        first_name: string;
        last_name: string;
        status: "active" | "suspended" | "deleted";
        auth_provider?: string;
        tenant_id: string;
        role_module_combinations?: {
          role_id: string;
          module_id?: string | null;
        }[];
        department_id?: string;
        designation_id?: string;
      },
    ): Promise<void> => {
      try {
        setIsUpdating(true);
        const response = await userService.update(userId, data);
        const message = response.message || `User updated successfully`;
        const description = response.message
          ? undefined
          : `${data.first_name} ${data.last_name} has been updated`;
        showToast.success(message, description);
        setEditModalOpen(false);
        setSelectedUserId(null);
        // setSelectedUserName("");
        await fetchUsers(currentPage, limit, statusFilter, orderBy);
      } catch (err: any) {
        throw err;
      } finally {
        setIsUpdating(false);
      }
    };

    // Delete user handler
    const handleDeleteUser = (
      userId: string,
      // , userName: string
    ): void => {
      setSelectedUserId(userId);
      // setSelectedUserName(userName);
      // setDeleteModalOpen(true);
    };

    // Confirm delete handler
    // const handleConfirmDelete = async (): Promise<void> => {
    //   if (!selectedUserId) return;

    //   try {
    //     setIsDeleting(true);
    //     await userService.delete(selectedUserId);
    //     setDeleteModalOpen(false);
    //     setSelectedUserId(null);
    //     setSelectedUserName("");
    //     await fetchUsers(currentPage, limit, statusFilter, orderBy);
    //   } catch (err: any) {
    //     throw err; // Let the modal handle the error display
    //   } finally {
    //     setIsDeleting(false);
    //   }
    // };

    // Load user for view/edit
    const loadUser = async (id: string): Promise<User> => {
      const response = await userService.getById(id);
      return response.data;
    };

    // Define table columns
    const columns: Column<User>[] = [
      {
        key: "name",
        label: "User Name",
        render: (user) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-normal text-[#9aa6b2]">
                {getUserInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <span className="">
              {user.first_name} {user.last_name}
            </span>
          </div>
        ),
        mobileLabel: "Name",
      },
      {
        key: "email",
        label: "Email",
        render: (user) => <span className="">{user.email}</span>,
      },
      {
        key: "role",
        label: "Role",
        render: (user) => (
          <div className="flex flex-wrap gap-1">
            {user.role_module_combinations &&
            user.role_module_combinations.length > 0 ? (
              user.role_module_combinations.map((combo, idx) => (
                <span
                  key={`${combo.role_id}-${combo.module_id || "global"}-${idx}`}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${primaryColor}1A`,
                    color: primaryColor,
                  }}
                  title={
                    combo.module_name
                      ? `Role for ${combo.module_name}`
                      : "Global Role"
                  }
                >
                  {combo.role_name}{" "}
                  {combo.module_name && `(${combo.module_name})`}
                </span>
              ))
            ) : user.roles && user.roles.length > 0 ? (
              user.roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    backgroundColor: `${primaryColor}1A`,
                    color: primaryColor,
                  }}
                >
                  {role.name}
                </span>
              ))
            ) : (
              <span className="">{user.role?.name || "-"}</span>
            )}
          </div>
        ),
      },
      {
        key: "department",
        label: "Department",
        render: (user) => (
          <span className="">{user.department?.name || "-"}</span>
        ),
      },
      {
        key: "designation",
        label: "Designation",
        render: (user) => (
          <span className="">{user.designation?.name || "-"}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (user) => (
          <StatusBadge variant={getStatusVariant(user.status)}>
            {user.status}
          </StatusBadge>
        ),
      },
      {
        key: "auth_provider",
        label: "Auth Provider",
        render: (user) => <span className="">{user.auth_provider}</span>,
      },
      {
        key: "created_at",
        label: "Joined Date",
        render: (user) => (
          <span className="">{formatDate(user.created_at)}</span>
        ),
        mobileLabel: "Joined",
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (user) => (
          <div className="flex justify-end">
            <ActionDropdown
              onView={() => handleViewUser(user.id)}
              onEdit={
                canUpdate("users")
                  ? () =>
                      handleEditUser(
                        user.id,
                        // , `${user.first_name} ${user.last_name}`
                      )
                  : undefined
              }
              // onDelete={() =>
              //   handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)
              // }
            />
          </div>
        ),
      },
    ];

    // Mobile card renderer
    const mobileCardRenderer = (user: User) => (
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-normal text-[#9aa6b2]">
                {getUserInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#0f1724] truncate">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ActionDropdown
            onView={() => handleViewUser(user.id)}
            onEdit={() =>
              handleEditUser(
                user.id,
                // , `${user.first_name} ${user.last_name}`
              )
            }
            onDelete={() =>
              handleDeleteUser(
                user.id,
                // `${user.first_name} ${user.last_name}`
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[#9aa6b2]">Status:</span>
            <div className="mt-1">
              <StatusBadge variant={getStatusVariant(user.status)}>
                {user.status}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Auth Provider:</span>
            <p className="text-[#0f1724] font-normal mt-1">
              {user.auth_provider}
            </p>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Department:</span>
            <p className="text-[#0f1724] font-normal mt-1">
              {user.department?.name || "-"}
            </p>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Designation:</span>
            <p className="text-[#0f1724] font-normal mt-1">
              {user.designation?.name || "-"}
            </p>
          </div>
          <div>
            <span className="text-[#9aa6b2]">Joined:</span>
            <p className="text-[#6b7280] font-normal mt-1">
              {formatDate(user.created_at)}
            </p>
          </div>
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
                    // { value: "", label: "All Status" },
                    { value: "active", label: "Active" },
                    { value: "suspended", label: "Suspended" },
                    { value: "deleted", label: "Deleted" },
                  ]}
                  value={statusFilter || ""}
                  onChange={(value) => {
                    setStatusFilter(
                      Array.isArray(value) ? null : value || null,
                    );
                    setCurrentPage(1);
                  }}
                  placeholder="All"
                />
                {canRead("roles") && (
                  <FilterDropdown
                    label="Role"
                    options={[
                      // { value: "", label: "All Roles" },
                      ...roles.map((role) => ({
                        value: role.id,
                        label: role.name,
                      })),
                    ]}
                    value={roleFilter || ""}
                    onChange={(value) => {
                      setRoleFilter(
                        Array.isArray(value) ? null : value || null,
                      );
                      setCurrentPage(1);
                    }}
                    placeholder="All"
                  />
                )}
                {canCreate("users") && (
                  <PrimaryButton
                    size="default"
                    className="flex items-center gap-2"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">New User</span>
                  </PrimaryButton>
                )}
              </div>
            </div>
            <DataTable
              data={users}
              columns={columns}
              keyExtractor={(user) => user.id}
              mobileCardRenderer={mobileCardRenderer}
              emptyMessage="No users found"
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
          <NewUserModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleCreateUser}
            isLoading={isCreating}
            defaultTenantId={tenantId || undefined}
          />

          <ViewUserModal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedUserId(null);
            }}
            userId={selectedUserId}
            onLoadUser={loadUser}
          />

          <EditUserModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedUserId(null);
              // setSelectedUserName("");
            }}
            userId={selectedUserId}
            onLoadUser={loadUser}
            onSubmit={handleUpdateUser}
            isLoading={isUpdating}
            defaultTenantId={tenantId || undefined}
          />

          {/* <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUserId(null);
            setSelectedUserName("");
          }}
          onConfirm={handleConfirmDelete}
          title="Delete User"
          message="Are you sure you want to delete this user"
          itemName={selectedUserName}
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
            <div className="pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Global Search */}
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or email..."
                />

                {/* Status Filter */}
                <FilterDropdown
                  label="Status"
                  options={[
                    { value: "active", label: "Active" },
                    {
                      value: "pending_verification",
                      label: "Pending Verification",
                    },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                    { value: "deleted", label: "Deleted" },
                  ]}
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as string | null);
                    setCurrentPage(1);
                  }}
                  placeholder="All"
                />

                {/* Role Filter */}
                <FilterDropdown
                  label="Role"
                  options={[
                    // { value: "", label: "All Roles" },
                    ...roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    })),
                  ]}
                  value={roleFilter || ""}
                  onChange={(value) => {
                    setRoleFilter(Array.isArray(value) ? null : value || null);
                    setCurrentPage(1);
                  }}
                  placeholder="All"
                />

                {/* Sort Filter */}
                <FilterDropdown
                  label="Sort by"
                  options={[
                    { value: ["first_name", "asc"], label: "First Name (A-Z)" },
                    {
                      value: ["first_name", "desc"],
                      label: "First Name (Z-A)",
                    },
                    { value: ["last_name", "asc"], label: "Last Name (A-Z)" },
                    { value: ["last_name", "desc"], label: "Last Name (Z-A)" },
                    { value: ["email", "asc"], label: "Email (A-Z)" },
                    { value: ["email", "desc"], label: "Email (Z-A)" },
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
                {/* Export Button */}
                {/* <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0f1724] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button> */}
                {/* Clear filters Button */}
                {(!!search ||
                  statusFilter !== null ||
                  roleFilter !== null ||
                  orderBy !== null) && (
                  <button
                    onClick={handleClearFilters}
                    className="text-sm font-medium text-[#6b7280] hover:text-[#0f1724] transition-colors cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            data={users}
            columns={columns}
            keyExtractor={(user) => user.id}
            mobileCardRenderer={mobileCardRenderer}
            emptyMessage="No users found"
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
        <NewUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateUser}
          isLoading={isCreating}
          defaultTenantId={tenantId || undefined}
        />

        <ViewUserModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          onLoadUser={loadUser}
        />

        <EditUserModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUserId(null);
            // setSelectedUserName("");
          }}
          userId={selectedUserId}
          onLoadUser={loadUser}
          onSubmit={handleUpdateUser}
          isLoading={isUpdating}
        />

        {/* <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedUserId(null);
          setSelectedUserName("");
        }}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user"
        itemName={selectedUserName}
        isLoading={isDeleting}
      /> */}
      </>
    );
  },
);
