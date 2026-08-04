import {
  useState,
  useEffect,
  type ReactElement,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowUpDown, Loader2 } from "lucide-react";
import {
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  ActionDropdown,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  Modal,
  FormField,
  FormSelect,
  type Column,
} from "@/components/shared";
import { userService } from "@/services/user-service";
import { roleService } from "@/services/role-service";
import type { Role } from "@/types/role";
import type { User } from "@/types/user";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { usePermissions } from "@/hooks/usePermissions";

// Helper function to get user initials
const getUserInitials = (firstName: string | null | undefined, lastName: string | null | undefined): string => {
  const first = (firstName || "").trim().slice(0, 1);
  const last = (lastName || "").trim().slice(0, 1);
  return `${first}${last}`.toUpperCase() || "?";
};

// Helper function to get status badge variant
const getStatusVariant = (
  status: string,
): "success" | "failure" | "process" => {
  switch (status?.toLowerCase()) {
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

// Zod schemas for validation
const newPlatformUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(255, "Maximum 255 characters allowed"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Maximum 255 characters allowed"),
  status: z.enum(["active", "suspended", "deleted"], {
    message: "Status is required",
  }),
  role_id: z.string().min(1, "Role is required"),
});

type NewPlatformUserFormData = z.infer<typeof newPlatformUserSchema>;

const editPlatformUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(255, "Maximum 255 characters allowed"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Maximum 255 characters allowed"),
  status: z.enum(["active", "suspended", "deleted"], {
    message: "Status is required",
  }),
  role_id: z.string().min(1, "Role is required"),
});

type EditPlatformUserFormData = z.infer<typeof editPlatformUserSchema>;

// Dedicated Creation Modal
interface NewPlatformUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewPlatformUserFormData) => Promise<void>;
  isLoading: boolean;
  roles: Role[];
}

const NewPlatformUserModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  roles,
}: NewPlatformUserModalProps): ReactElement | null => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<NewPlatformUserFormData>({
    resolver: zodResolver(newPlatformUserSchema),
    defaultValues: {
      status: "active",
      role_id: "",
    },
  });

  const statusValue = watch("status");
  const roleIdValue = watch("role_id");

  useEffect(() => {
    if (!isOpen) {
      reset({
        email: "",
        first_name: "",
        last_name: "",
        status: "active",
        role_id: "",
      });
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: NewPlatformUserFormData) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const first = error.response.data.details[0];
        setError("root", {
          type: "server",
          message: first?.message || "Validation failed",
        });
        return;
      }
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create platform user. Please try again.";
      setError("root", { type: "server", message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Platform User"
      description="Register a new platform-scoped administrator"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isLoading}
            size="default"
            className="px-4 py-2.5 text-sm"
          >
            {isLoading ? "Creating..." : "Create User"}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}

        <FormField
          label="Email"
          type="email"
          required
          placeholder="Enter email address"
          error={errors.email?.message}
          {...register("email")}
        />
        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormField
            label="First Name"
            required
            placeholder="Enter first name"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <FormField
            label="Last Name"
            required
            placeholder="Enter last name"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>
        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormSelect
            label="Role"
            required
            placeholder="Select Role"
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
            value={roleIdValue || ""}
            onValueChange={(value) =>
              setValue("role_id", value, { shouldValidate: true })
            }
            error={errors.role_id?.message}
          />
          <FormSelect
            label="Status"
            required
            placeholder="Select Status"
            options={[
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "deleted", label: "Deleted" },
            ]}
            value={statusValue || "active"}
            onValueChange={(value) =>
              setValue("status", value as "active" | "suspended" | "deleted", {
                shouldValidate: true,
              })
            }
            error={errors.status?.message}
          />
        </div>
      </form>
    </Modal>
  );
};

// Dedicated Edit Modal
interface EditPlatformUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onSubmit: (id: string, data: EditPlatformUserFormData) => Promise<void>;
  isLoading: boolean;
  roles: Role[];
}

const EditPlatformUserModal = ({
  isOpen,
  onClose,
  userId,
  onSubmit,
  isLoading,
  roles,
}: EditPlatformUserModalProps): ReactElement | null => {
  const [loadingData, setLoadingData] = useState(false);
  const [loadedUser, setLoadedUser] = useState<any>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<EditPlatformUserFormData>({
    resolver: zodResolver(editPlatformUserSchema),
  });

  const statusValue = watch("status");
  const roleIdValue = watch("role_id");

  const selectedRole = roles.find((r) => r.id === roleIdValue);
  const primaryRoleName = loadedUser?.role_module_combinations?.[0]?.role_name || "";
  const primaryRoleCode = loadedUser?.role_module_combinations?.[0]?.role_code || "";
  const isSuperAdminUser =
    primaryRoleName === "Super Admin" ||
    primaryRoleName === "super_admin" ||
    primaryRoleCode === "super_admin" ||
    selectedRole?.name === "Super Admin" ||
    selectedRole?.code === "super_admin";

  useEffect(() => {
    if (isOpen && userId) {
      setLoadingData(true);
      userService
        .getById(userId)
        .then((response) => {
          if (response.success && response.data) {
            const user = response.data;
            setLoadedUser(user);
            const primaryRole =
              user.role_module_combinations?.[0]?.role_id || "";
            reset({
              email: user.email || "",
              first_name: user.first_name || "",
              last_name: user.last_name || "",
              status: user.status || "active",
              role_id: primaryRole,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load platform user details", err);
          showToast.error("Failed to load user details");
          onClose();
        })
        .finally(() => {
          setLoadingData(false);
        });
    } else if (!isOpen) {
      setLoadedUser(null);
    }
  }, [isOpen, userId, reset, onClose]);

  const handleFormSubmit = async (data: EditPlatformUserFormData) => {
    if (!userId) return;
    try {
      await onSubmit(userId, data);
    } catch (error: any) {
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const first = error.response.data.details[0];
        setError("root", {
          type: "server",
          message: first?.message || "Validation failed",
        });
        return;
      }
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update platform user. Please try again.";
      setError("root", { type: "server", message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Platform User"
      description="Update platform user settings and role"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isLoading || loadingData}
            className="px-4 py-2.5 text-sm"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isLoading || loadingData}
            size="default"
            className="px-4 py-2.5 text-sm"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </PrimaryButton>
        </>
      }
    >
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
          <p className="text-sm text-[#4b5563] mt-2">Loading user details...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {errors.root && (
            <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
              <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
            </div>
          )}

          <FormField
            label="Email"
            type="email"
            required
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register("email")}
          />
          <div className="grid grid-cols-2 gap-5 pb-4">
            <FormField
              label="First Name"
              required
              placeholder="Enter first name"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <FormField
              label="Last Name"
              required
              placeholder="Enter last name"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>
          <div className="grid grid-cols-2 gap-5 pb-4">
            {!isSuperAdminUser && (
              <>
                <FormSelect
                  label="Role"
                  required
                  placeholder="Select Role"
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                  value={roleIdValue || ""}
                  onValueChange={(value) =>
                    setValue("role_id", value, { shouldValidate: true })
                  }
                  error={errors.role_id?.message}
                />
                <FormSelect
                  label="Status"
                  required
                  placeholder="Select Status"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "suspended", label: "Suspended" },
                    { value: "deleted", label: "Deleted" },
                  ]}
                  value={statusValue || "active"}
                  onValueChange={(value) =>
                    setValue(
                      "status",
                      value as "active" | "suspended" | "deleted",
                      { shouldValidate: true },
                    )
                  }
                  error={errors.status?.message}
                />
              </>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
};

// Dedicated View Modal
interface ViewPlatformUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const ViewPlatformUserModal = ({
  isOpen,
  onClose,
  userId,
}: ViewPlatformUserModalProps): ReactElement | null => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      userService
        .getById(userId)
        .then((response) => {
          if (response.success && response.data) {
            setUser(response.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user details", err);
          showToast.error("Failed to load user details");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, userId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Platform User Details"
      description="View full configuration details"
      maxWidth="md"
      footer={
        <PrimaryButton type="button" onClick={onClose} className="px-4 py-2">
          Close
        </PrimaryButton>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin" />
          <p className="text-sm text-[#4b5563] mt-2">Loading details...</p>
        </div>
      ) : user ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-[#f8fafc] border border-[rgba(0,0,0,0.05)] rounded-xl">
            <div className="w-12 h-12 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-lg font-semibold text-[#1e293b]">
                {getUserInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#0f172a]">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-sm text-[#475569]">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                Status
              </span>
              <StatusBadge variant={getStatusVariant(user.status)}>
                {user.status}
              </StatusBadge>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                Role
              </span>
              <p className="text-[#0f172a] font-medium">
                {user.role_module_combinations?.[0]?.role_name ||
                  "Platform User"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                Joined Date
              </span>
              <p className="text-[#334155]">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                Last Updated
              </span>
              <p className="text-[#334155]">{formatDate(user.updated_at)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-[#64748b]">
          No user data available.
        </div>
      )}
    </Modal>
  );
};

export interface PlatformUsersTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

export const PlatformUsersTable = forwardRef<PlatformUsersTableRef>(
  (_, ref): ReactElement => {
    const { canCreate, canUpdate } = usePermissions();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [isViewOpen, setIsViewOpen] = useState<boolean>(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Filter states
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [orderBy, setOrderBy] = useState<string[] | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(10);
    const [pagination, setPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasMore: false,
    });

    const [roles, setRoles] = useState<Role[]>([]);

    // Expose methods
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsCreateOpen(true),
      refresh: () => fetchPlatformUsers(),
    }));

    // Debounce search
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
        setCurrentPage(1);
      }, 300);
      return () => clearTimeout(timer);
    }, [search]);

    const fetchPlatformUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Call backend with scope="platform"
        const response = await userService.getAll(
          currentPage,
          limit,
          statusFilter,
          orderBy,
          debouncedSearch,
          roleFilter,
          "platform",
        );
        if (response.success) {
          setUsers(response.data);
          setPagination(response.pagination);
        } else {
          setError("Failed to fetch platform users");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ||
            "Failed to load platform users",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch users when parameters change
    useEffect(() => {
      fetchPlatformUsers();
    }, [
      currentPage,
      limit,
      statusFilter,
      roleFilter,
      orderBy,
      debouncedSearch,
    ]);

    // Fetch platform roles
    useEffect(() => {
      const fetchPlatformRoles = async () => {
        try {
          const response = await roleService.getAll(
            1,
            100,
            null,
            null,
            "platform",
            true,
          );
          if (response.success) {
            setRoles(response.data);
          }
        } catch (err: any) {
          console.error("Failed to load platform roles", err);
        }
      };
      fetchPlatformRoles();
    }, []);

    const handleCreateUser = async (data: NewPlatformUserFormData) => {
      try {
        setIsCreating(true);
        const payload = {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          status: data.status,
          auth_provider: "local" as const,
          tenant_id: "00000000-0000-0000-0000-000000000001",
          role_module_combinations: [
            { role_id: data.role_id, module_id: null },
          ],
          department_id: null,
          designation_id: null,
          category: "tenant_user" as const,
        };
        const response = await userService.create(payload);
        showToast.success(
          response.message || "Platform user created successfully",
        );
        setIsCreateOpen(false);
        fetchPlatformUsers();
      } catch (err: any) {
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    const handleUpdateUser = async (
      id: string,
      data: EditPlatformUserFormData,
    ) => {
      try {
        setIsUpdating(true);
        const payload = {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          status: data.status,
          tenant_id: "00000000-0000-0000-0000-000000000001",
          role_module_combinations: [
            { role_id: data.role_id, module_id: null },
          ],
          department_id: null,
          designation_id: null,
        };
        const response = await userService.update(id, payload);
        showToast.success(
          response.message || "Platform user updated successfully",
        );
        setIsEditOpen(false);
        fetchPlatformUsers();
      } catch (err: any) {
        throw err;
      } finally {
        setIsUpdating(false);
      }
    };

    const columns: Column<User>[] = [
      {
        key: "name",
        label: "Name",
        render: (user) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f1f5f9] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-[#475569]">
                {getUserInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <span className="font-medium text-[#0f172a]">
              {user.first_name} {user.last_name}
            </span>
          </div>
        ),
      },
      {
        key: "email",
        label: "Email",
        render: (user) => <span className="text-[#334155]">{user.email}</span>,
      },
      {
        key: "role",
        label: "Role",
        render: (user) => (
          <span className="text-[#334155] font-medium">
            {user.role_module_combinations?.[0]?.role_name || "Platform User"}
          </span>
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
        key: "created_at",
        label: "Joined Date",
        render: (user) => (
          <span className="text-[#64748b]">{formatDate(user.created_at)}</span>
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
              onView={() => {
                setSelectedUserId(user.id);
                setIsViewOpen(true);
              }}
              onEdit={
                canUpdate("users")
                  ? () => {
                      setSelectedUserId(user.id);
                      setIsEditOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ),
      },
    ];

    const mobileCardRenderer = (user: User) => (
      <div className="p-4 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 bg-[#f1f5f9] border border-[rgba(0,0,0,0.08)] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-[#475569]">
                {getUserInitials(user.first_name, user.last_name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#0f1724] truncate">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-xs text-[#64748b] mt-0.5 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <ActionDropdown
            onView={() => {
              setSelectedUserId(user.id);
              setIsViewOpen(true);
            }}
            onEdit={
              canUpdate("users")
                ? () => {
                    setSelectedUserId(user.id);
                    setIsEditOpen(true);
                  }
                : undefined
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[#94a3b8] block">Role</span>
            <span className="text-[#0f172a] font-medium mt-0.5 block">
              {user.role_module_combinations?.[0]?.role_name || "Platform User"}
            </span>
          </div>
          <div>
            <span className="text-[#94a3b8] block">Status</span>
            <div className="mt-1">
              <StatusBadge variant={getStatusVariant(user.status)}>
                {user.status}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[#94a3b8] block">Joined</span>
            <span className="text-[#64748b] mt-0.5 block">
              {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </div>
    );

    const handleClearFilters = () => {
      setSearch("");
      setStatusFilter(null);
      setRoleFilter(null);
      setOrderBy(null);
      setCurrentPage(1);
    };

    return (
      <>
        <div className="overflow-hidden">
          <div className="pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search platform users..."
              />
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
                  setCurrentPage(1);
                }}
                placeholder="All Status"
              />
              <FilterDropdown
                label="Role"
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value as string | null);
                  setCurrentPage(1);
                }}
                placeholder="All Roles"
              />
              <FilterDropdown
                label="Sort by"
                options={[
                  { value: ["first_name", "asc"], label: "First Name (A-Z)" },
                  { value: ["first_name", "desc"], label: "First Name (Z-A)" },
                  { value: ["email", "asc"], label: "Email (A-Z)" },
                  { value: ["email", "desc"], label: "Email (Z-A)" },
                  { value: ["created_at", "asc"], label: "Joined (Oldest)" },
                  { value: ["created_at", "desc"], label: "Joined (Newest)" },
                ]}
                value={orderBy}
                onChange={(value) => {
                  setOrderBy(value as string[] | null);
                  setCurrentPage(1);
                }}
                placeholder="Default Sort"
                showIcon
                icon={<ArrowUpDown className="w-3.5 h-3.5 text-[#475569]" />}
              />
            </div>
            <div className="flex items-center gap-2">
              {canCreate("users") && (
                <PrimaryButton
                  size="default"
                  className="flex items-center gap-2"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs">New Platform User</span>
                </PrimaryButton>
              )}
              {(!!search ||
                statusFilter !== null ||
                roleFilter !== null ||
                orderBy !== null) && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm font-medium text-[#64748b] hover:text-[#0f172a] transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <DataTable
            data={users}
            columns={columns}
            keyExtractor={(user) => user.id}
            mobileCardRenderer={mobileCardRenderer}
            emptyMessage="No platform users found"
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

        {/* Modal Declarations */}
        <NewPlatformUserModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateUser}
          isLoading={isCreating}
          roles={roles}
        />

        <EditPlatformUserModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          onSubmit={handleUpdateUser}
          isLoading={isUpdating}
          roles={roles}
        />

        <ViewPlatformUserModal
          isOpen={isViewOpen}
          onClose={() => {
            setIsViewOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />
      </>
    );
  },
);

PlatformUsersTable.displayName = "PlatformUsersTable";
