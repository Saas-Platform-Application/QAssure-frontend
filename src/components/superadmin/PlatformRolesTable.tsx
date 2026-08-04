import {
  useState,
  useEffect,
  type ReactElement,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ArrowUpDown, Loader2 } from "lucide-react";
import {
  PrimaryButton,
  SecondaryButton,
  ActionDropdown,
  DataTable,
  Pagination,
  FilterDropdown,
  SearchBox,
  Modal,
  FormField,
  FormTextArea,
  FormSelect,
  StatusBadge,
  // DeleteConfirmationModal,
  type Column,
} from "@/components/shared";
import { roleService } from "@/services/role-service";
import type { Role, CreateRoleRequest, UpdateRoleRequest } from "@/types/role";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { useAppSelector } from "@/hooks/redux-hooks";
import CodeBadge from "@/components/shared/CodeBadge";
import { usePermissions } from "@/hooks/usePermissions";

// Utility function to generate code from name
const generateCodeFromName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "") // Remove special characters except spaces
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
};

// All available resources
const ALL_RESOURCES = [
  "users",
  "roles",
  "tenants",
  "modules",
  // "permissions",
  // "projects",
  "document",
  // "audit",
  "security",
  "workflow",
  // "training",
  // "capa",
  "supplier",
  // "reports",
  "notifications",
  "files",
  "settings",
  "audit_logs",
  "audit_resources",
  // "qms_connections",
  // "qms_sync_jobs",
  // "qms_sync_conflicts",
  // "qms_entity_mappings",
  "ai",
  // "qms",
];

// All available actions
const ALL_ACTIONS = ["create", "read", "update", "delete"];

// Resources that should not be visible or managed on the platform roles UI
const EXCLUDED_RESOURCES = new Set([
  "usage",
  "licenses",
  "pricing_plans",
  "pricing-plans",
  "pricing plans",
  "invoices",
  "billing",
  "payments",
]);

// Validation schema for creation
const newPlatformRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .regex(
      /^[a-z]+(_[a-z]+)*$/,
      "Code must be lowercase and use '_' for separation (e.g. abc_def)",
    ),
  description: z.string().min(1, "Description is required"),
  is_active: z.boolean(),
  permissions: z
    .array(
      z.object({
        resource: z.string(),
        action: z.string(),
      }),
    )
    .optional()
    .nullable(),
});

type NewPlatformRoleFormData = z.infer<typeof newPlatformRoleSchema>;

// Validation schema for update
const editPlatformRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .regex(
      /^[a-z]+(_[a-z]+)*$/,
      "Code must be lowercase and use '_' for separation (e.g. abc_def)",
    ),
  description: z.string().min(1, "Description is required"),
  is_active: z.boolean(),
  permissions: z
    .array(
      z.object({
        resource: z.string(),
        action: z.string(),
      }),
    )
    .optional()
    .nullable(),
});

type EditPlatformRoleFormData = z.infer<typeof editPlatformRoleSchema>;

// Dedicated Creation Modal
interface NewPlatformRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleRequest) => Promise<void>;
  isLoading: boolean;
}

const NewPlatformRoleModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: NewPlatformRoleModalProps): ReactElement | null => {
  const permissions = useAppSelector((state) => state.auth.permissions);
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<{ resource: string; action: string }>
  >([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NewPlatformRoleFormData>({
    resolver: zodResolver(newPlatformRoleSchema),
    defaultValues: {
      code: undefined,
      is_active: true,
      permissions: [],
    },
  });

  const nameValue = watch("name");
  const statusValue = watch("is_active");

  // Auto-generate code from name
  useEffect(() => {
    if (nameValue) {
      const generatedCode = generateCodeFromName(nameValue);
      setValue("code", generatedCode, { shouldValidate: true });
    }
  }, [nameValue, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset({
        name: "",
        code: undefined,
        description: "",
        is_active: true,
        permissions: [],
      });
      setSelectedPermissions([]);
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  // Build available resources and actions based on user permissions
  const availableResourcesAndActions = useMemo(() => {
    const resourceMap = new Map<string, Set<string>>();

    permissions.forEach((perm) => {
      const { resource, action } = perm;
      if (EXCLUDED_RESOURCES.has(resource)) return;

      if (resource === "*") {
        ALL_RESOURCES.forEach((res) => {
          if (EXCLUDED_RESOURCES.has(res)) return;
          if (!resourceMap.has(res)) {
            resourceMap.set(res, new Set());
          }
          const actions = resourceMap.get(res)!;
          if (action === "*") {
            ALL_ACTIONS.forEach((act) => actions.add(act));
          } else {
            actions.add(action);
          }
        });
      } else {
        if (!resourceMap.has(resource)) {
          resourceMap.set(resource, new Set());
        }
        const actions = resourceMap.get(resource)!;
        if (action === "*") {
          ALL_ACTIONS.forEach((act) => actions.add(act));
        } else {
          actions.add(action);
        }
      }
    });

    return resourceMap;
  }, [permissions]);

  // Handle permission checkbox change
  const handlePermissionChange = (
    resource: string,
    action: string,
    checked: boolean,
  ) => {
    setSelectedPermissions((prev) => {
      const newPerms = [...prev];
      if (checked) {
        if (
          !newPerms.some((p) => p.resource === resource && p.action === action)
        ) {
          newPerms.push({ resource, action });
        }
      } else {
        return newPerms.filter(
          (p) => !(p.resource === resource && p.action === action),
        );
      }
      return newPerms;
    });
  };

  useEffect(() => {
    setValue(
      "permissions",
      selectedPermissions.length > 0 ? selectedPermissions : [],
    );
  }, [selectedPermissions, setValue]);

  const handleFormSubmit = async (
    data: NewPlatformRoleFormData,
  ): Promise<void> => {
    clearErrors();
    try {
      await onSubmit(data as CreateRoleRequest);
    } catch (error: any) {
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const validationErrors = error.response.data.details;
        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            if (
              detail.path === "name" ||
              detail.path === "code" ||
              detail.path === "description" ||
              detail.path === "permissions"
            ) {
              setError(detail.path as keyof NewPlatformRoleFormData, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );
      } else {
        const errorObj = error?.response?.data?.error;
        const errorMessage =
          (typeof errorObj === "object" &&
          errorObj !== null &&
          "message" in errorObj
            ? errorObj.message
            : null) ||
          (typeof errorObj === "string" ? errorObj : null) ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create platform role. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to create platform role. Please try again.",
        });
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Platform Role"
      description="Define a new platform-level role and its allowed permissions."
      maxWidth="lg"
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
            {isLoading ? "Creating..." : "Create Role"}
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-0"
      >
        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormField
            label="Role Name"
            required
            placeholder="Enter Role Name"
            error={errors.name?.message}
            {...register("name")}
          />

          <FormField
            label="Role Code"
            required
            placeholder="Auto-generated from name"
            error={errors.code?.message}
            {...register("code")}
            disabled
            className="bg-[#f3f4f6] cursor-not-allowed"
          />
        </div>

        <FormTextArea
          label="Description"
          required
          placeholder="Enter Role Description"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        <div className="pb-4">
          <FormSelect
            label="Status"
            required
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
            value={String(statusValue)}
            onValueChange={(value) => setValue("is_active", value === "true", { shouldValidate: true })}
            error={errors.is_active?.message}
          />
        </div>

        <div className="pb-4">
          <div className="flex flex-col items-start gap-3 self-stretch p-4 rounded-[8px] border border-[#D1D5DB] bg-white">
            <div className="flex flex-col items-start self-stretch">
              <h3 className="text-[13px] font-semibold text-[#111827]">
                Permissions
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Select allowed actions for this role by platform service.
              </p>
            </div>

            {errors.permissions && (
              <p className="text-sm text-[#ef4444]">
                {errors.permissions.message}
              </p>
            )}

            <div className="w-full overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-[204px] h-[53px] px-3 py-[10px] text-left text-[11px] font-medium uppercase text-[#6B7280] border-b border-[#D1D5DB] bg-[#F9F9F9]">
                      Platform Services
                    </th>
                    {["View", "Create", "Edit", "Delete"].map((action) => (
                      <th
                        key={action}
                        className="w-[120px] px-3 py-[10px] text-center text-[11px] font-medium text-[#6B7280] border-b border-[#D1D5DB] bg-[#F9F9F9]"
                      >
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Array.from(availableResourcesAndActions.entries()).map(
                    ([resource, actions]) => (
                      <tr key={resource}>
                        <td className="w-[204px] h-[53px] px-3 py-[19px] border-b border-[#E5E7EB] text-[14px] text-[#111827] bg-white capitalize">
                          {resource.replace(/_/g, " ")}
                        </td>

                        {["read", "create", "update", "delete"].map(
                          (action) => {
                            const isChecked = selectedPermissions.some((p) => {
                              if (
                                p.resource === resource &&
                                p.action === action
                              )
                                return true;
                              if (p.resource === "*" && p.action === action)
                                return true;
                              if (p.resource === resource && p.action === "*")
                                return true;
                              if (p.resource === "*" && p.action === "*")
                                return true;
                              return false;
                            });

                            const isAvailable = actions.has(action);

                            return (
                              <td
                                key={`${resource}-${action}`}
                                className="w-[120px] px-3 py-[10px] text-center border-b border-[#E5E7EB] bg-white"
                              >
                                <div className="flex justify-center items-center">
                                  <input
                                    type="checkbox"
                                    disabled={!isAvailable}
                                    checked={isAvailable ? isChecked : false}
                                    onChange={(e) =>
                                      handlePermissionChange(
                                        resource,
                                        action,
                                        e.target.checked,
                                      )
                                    }
                                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#0F3CC9] focus:ring-[#0F3CC9] disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                </div>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// Dedicated Edit Modal
interface EditPlatformRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
  onLoadRole: (id: string) => Promise<Role>;
  onSubmit: (id: string, data: UpdateRoleRequest) => Promise<void>;
  isLoading: boolean;
}

const EditPlatformRoleModal = ({
  isOpen,
  onClose,
  roleId,
  onLoadRole,
  onSubmit,
  isLoading = false,
}: EditPlatformRoleModalProps): ReactElement | null => {
  const [isLoadingRole, setIsLoadingRole] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRoleIdRef = useRef<string | null>(null);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<{ resource: string; action: string }>
  >([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EditPlatformRoleFormData>({
    resolver: zodResolver(editPlatformRoleSchema),
    defaultValues: {
      is_active: true,
      permissions: [],
    },
  });

  const statusValue = watch("is_active");

  // Build available resources and actions based on user permissions
  const availableResourcesAndActions = useMemo(() => {
    const resourceMap = new Map<string, Set<string>>();

    permissions.forEach((perm) => {
      const { resource, action } = perm;
      if (EXCLUDED_RESOURCES.has(resource)) return;

      if (resource === "*") {
        ALL_RESOURCES.forEach((res) => {
          if (EXCLUDED_RESOURCES.has(res)) return;
          if (!resourceMap.has(res)) {
            resourceMap.set(res, new Set());
          }
          const actions = resourceMap.get(res)!;
          if (action === "*") {
            ALL_ACTIONS.forEach((act) => actions.add(act));
          } else {
            actions.add(action);
          }
        });
      } else {
        if (!resourceMap.has(resource)) {
          resourceMap.set(resource, new Set());
        }
        const actions = resourceMap.get(resource)!;
        if (action === "*") {
          ALL_ACTIONS.forEach((act) => actions.add(act));
        } else {
          actions.add(action);
        }
      }
    });

    return resourceMap;
  }, [permissions]);

  // Handle permission checkbox change
  const handlePermissionChange = (
    resource: string,
    action: string,
    checked: boolean,
  ) => {
    setSelectedPermissions((prev) => {
      const newPerms = [...prev];
      if (checked) {
        if (
          !newPerms.some((p) => p.resource === resource && p.action === action)
        ) {
          newPerms.push({ resource, action });
        }
      } else {
        return newPerms.filter(
          (p) => !(p.resource === resource && p.action === action),
        );
      }
      return newPerms;
    });
  };

  useEffect(() => {
    setValue(
      "permissions",
      selectedPermissions.length > 0 ? selectedPermissions : [],
    );
  }, [selectedPermissions, setValue]);

  // Load role details
  useEffect(() => {
    if (isOpen && roleId) {
      if (loadedRoleIdRef.current !== roleId) {
        const loadRoleData = async () => {
          try {
            setIsLoadingRole(true);
            setLoadError(null);
            clearErrors();
            const role = await onLoadRole(roleId);
            loadedRoleIdRef.current = roleId;

            const rolePermissions = role.permissions || [];
            setSelectedPermissions(rolePermissions);
            setValue("permissions", rolePermissions);

            reset({
              name: role.name,
              code: role.code,
              description: role.description || "",
              is_active: role.is_active ?? true,
              permissions: rolePermissions,
            });
          } catch (err: any) {
            setLoadError(
              err?.response?.data?.error?.message ||
                "Failed to load role details",
            );
          } finally {
            setIsLoadingRole(false);
          }
        };
        loadRoleData();
      }
    } else if (!isOpen) {
      loadedRoleIdRef.current = null;
      setSelectedPermissions([]);
      reset({
        name: "",
        code: "",
        description: "",
        is_active: true,
        permissions: [],
      });
      setLoadError(null);
      clearErrors();
    }
  }, [isOpen, roleId, onLoadRole, reset, clearErrors, setValue]);

  const handleFormSubmit = async (
    data: EditPlatformRoleFormData,
  ): Promise<void> => {
    if (!roleId) return;
    clearErrors();
    try {
      const { code, ...rest } = data;
      await onSubmit(roleId, rest as UpdateRoleRequest);
    } catch (error: any) {
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const validationErrors = error.response.data.details;
        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            if (
              detail.path === "name" ||
              detail.path === "code" ||
              detail.path === "description" ||
              detail.path === "permissions"
            ) {
              setError(detail.path as keyof EditPlatformRoleFormData, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );
      } else {
        const errorObj = error?.response?.data?.error;
        const errorMessage =
          (typeof errorObj === "object" &&
          errorObj !== null &&
          "message" in errorObj
            ? errorObj.message
            : null) ||
          (typeof errorObj === "string" ? errorObj : null) ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update role. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to update role. Please try again.",
        });
      }
      throw error;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Platform Role"
      description="Update platform role name, description, and permissions."
      maxWidth="lg"
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isLoading || isLoadingRole}
            className="px-4 py-2.5 text-sm"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isLoading || isLoadingRole}
            size="default"
            className="px-4 py-2.5 text-sm"
          >
            {isLoading ? "Updating..." : "Update Role"}
          </PrimaryButton>
        </>
      }
    >
      {isLoadingRole && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
        </div>
      )}

      {errors.root && (
        <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4 mx-5 mt-5">
          <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4 mx-5">
          <p className="text-sm text-[#ef4444]">{loadError}</p>
        </div>
      )}

      {!isLoadingRole && (
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-0"
        >
          <div className="grid grid-cols-2 gap-5 pb-4">
            <FormField
              label="Role Name"
              required
              placeholder="Enter Role Name"
              error={errors.name?.message}
              {...register("name")}
            />

            <FormField
              label="Role Code"
              required
              placeholder="Auto-generated from name"
              error={errors.code?.message}
              {...register("code")}
              disabled
              className="bg-[#f3f4f6] cursor-not-allowed"
            />
          </div>

          <FormTextArea
            label="Description"
            required
            placeholder="Enter Role Description"
            error={errors.description?.message}
            {...register("description")}
            rows={4}
          />

          <div className="pb-4">
            <FormSelect
              label="Status"
              required
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={String(statusValue)}
              onValueChange={(value) => setValue("is_active", value === "true", { shouldValidate: true })}
              error={errors.is_active?.message}
            />
          </div>

          <div className="pb-4">
            <div className="flex flex-col items-start gap-3 self-stretch p-4 rounded-[8px] border border-[#D1D5DB] bg-white">
              <div className="flex flex-col items-start self-stretch">
                <h3 className="text-[13px] font-semibold text-[#111827]">
                  Permissions
                </h3>
                <p className="text-[11px] text-[#6B7280]">
                  Select allowed actions for this role by platform service.
                </p>
              </div>

              {errors.permissions && (
                <p className="text-sm text-[#ef4444]">
                  {errors.permissions.message}
                </p>
              )}

              <div className="w-full overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[204px] h-[53px] px-3 py-[19px] text-left text-[11px] font-medium uppercase text-[#6B7280] border-b border-[#D1D5DB] bg-[#F9F9F9]">
                        Platform Services
                      </th>
                      {["View", "Create", "Edit", "Delete"].map((action) => (
                        <th
                          key={action}
                          className="w-[120px] px-3 py-[10px] text-center text-[11px] font-medium text-[#6B7280] border-b border-[#D1D5DB] bg-[#F9F9F9]"
                        >
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {Array.from(availableResourcesAndActions.entries()).map(
                      ([resource, actions]) => (
                        <tr key={resource}>
                          <td className="w-[204px] h-[53px] px-3 py-[19px] border-b border-[#E5E7EB] text-[14px] text-[#111827] bg-white capitalize">
                            {resource.replace(/_/g, " ")}
                          </td>

                          {["read", "create", "update", "delete"].map(
                            (action) => {
                              const isChecked = selectedPermissions.some(
                                (p) => {
                                  if (
                                    p.resource === resource &&
                                    p.action === action
                                  )
                                    return true;
                                  if (p.resource === "*" && p.action === action)
                                    return true;
                                  if (
                                    p.resource === resource &&
                                    p.action === "*"
                                  )
                                    return true;
                                  if (p.resource === "*" && p.action === "*")
                                    return true;
                                  return false;
                                },
                              );

                              const isAvailable = actions.has(action);

                              return (
                                <td
                                  key={`${resource}-${action}`}
                                  className="w-[120px] px-3 py-[10px] text-center border-b border-[#E5E7EB] bg-white"
                                >
                                  <div className="flex justify-center items-center">
                                    <input
                                      type="checkbox"
                                      disabled={!isAvailable}
                                      checked={isAvailable ? isChecked : false}
                                      onChange={(e) =>
                                        handlePermissionChange(
                                          resource,
                                          action,
                                          e.target.checked,
                                        )
                                      }
                                      className="w-4 h-4 rounded border-[#D1D5DB] text-[#0F3CC9] focus:ring-[#0F3CC9] disabled:opacity-30 disabled:cursor-not-allowed"
                                    />
                                  </div>
                                </td>
                              );
                            },
                          )}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export interface PlatformRolesTableRef {
  openNewModal: () => void;
  refresh: () => void;
}

export const PlatformRolesTable = forwardRef<PlatformRolesTableRef, {}>(
  (_, ref): ReactElement => {
    const tenantIdFromAuth = useAppSelector((state) => state.auth.tenantId);
    const { canCreate, canUpdate } = usePermissions();

    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [isCreating, setIsCreating] = useState<boolean>(false);

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

    // Filter and Search state
    const [orderBy, setOrderBy] = useState<string[] | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");

    // Modal state
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    // const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    // const [selectedRoleName, setSelectedRoleName] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    // const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      openNewModal: () => setIsCreateOpen(true),
      refresh: () =>
        fetchPlatformRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter),
    }));

    const fetchPlatformRoles = async (
      page: number,
      itemsPerPage: number,
      sortBy: string[] | null = null,
      searchQuery: string | null = null,
      statusValStr: string | null = null,
    ) => {
      try {
        setIsLoading(true);
        setError(null);
        const statusVal = statusValStr === "true" ? true : statusValStr === "false" ? false : null;
        // Load roles filtered by scope=platform
        const response = await roleService.getAll(
          page,
          itemsPerPage,
          sortBy,
          searchQuery,
          "platform",
          statusVal,
        );
        if (response.success) {
          setRoles(response.data);
          setPagination(response.pagination);
        } else {
          setError("Failed to load platform roles");
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message ||
            "Failed to load platform roles",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce search
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(search);
        if (search) setCurrentPage(1);
      }, 500);
      return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
      fetchPlatformRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
    }, [currentPage, limit, orderBy, debouncedSearch, statusFilter]);

    const handleCreateRole = async (data: CreateRoleRequest) => {
      try {
        setIsCreating(true);
        const payload = {
          ...data,
          scope: "platform",
          tenant_id: tenantIdFromAuth || "00000000-0000-0000-0000-000000000001",
        };
        const response = await roleService.create(payload);
        showToast.success(
          response.message || "Platform role created successfully",
        );
        setIsCreateOpen(false);
        fetchPlatformRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
      } catch (err: any) {
        throw err;
      } finally {
        setIsCreating(false);
      }
    };

    const handleUpdateRole = async (id: string, data: UpdateRoleRequest) => {
      try {
        setIsUpdating(true);
        const payload = {
          ...data,
          scope: "platform",
          tenant_id: tenantIdFromAuth || "00000000-0000-0000-0000-000000000001",
        };
        const response = await roleService.update(id, payload);
        showToast.success(
          response.message || "Platform role updated successfully",
        );
        setEditModalOpen(false);
        setSelectedRoleId(null);
        fetchPlatformRoles(currentPage, limit, orderBy, debouncedSearch, statusFilter);
      } catch (err: any) {
        throw err;
      } finally {
        setIsUpdating(false);
      }
    };

    // const handleConfirmDelete = async () => {
    //   if (!selectedRoleId) return;
    //   try {
    //     setIsDeleting(true);
    //     await roleService.delete(selectedRoleId);
    //     showToast.success("Platform role deleted successfully");
    //     // setDeleteModalOpen(false);
    //     setSelectedRoleId(null);
    //     setSelectedRoleName("");
    //     fetchPlatformRoles(currentPage, limit, orderBy, debouncedSearch);
    //   } catch (err: any) {
    //     showToast.error(
    //       err?.response?.data?.error?.message ||
    //         "Failed to delete platform role",
    //     );
    //   } finally {
    //     setIsDeleting(false);
    //   }
    // };

    const loadRole = async (id: string): Promise<Role> => {
      const response = await roleService.getById(id);
      return response.data;
    };

    // Columns config
    const columns: Column<Role>[] = [
      {
        key: "name",
        label: "Role Name",
        render: (role) => (
          <span className="font-medium text-[#0f1724]">{role.name}</span>
        ),
      },
      {
        key: "code",
        label: "Role Code",
        render: (role) => <CodeBadge label={role.code} />,
      },
      {
        key: "description",
        label: "Description",
        render: (role) => (
          <span className="text-sm text-[#4b5563] line-clamp-1 max-w-[400px]">
            {role.description || "N/A"}
          </span>
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
        label: "Assigned Users",
        render: (role) => (
          <span className="text-sm text-[#0f1724]">{role.user_count || 0}</span>
        ),
      },
      {
        key: "created_at",
        label: "Created Date",
        render: (role) => (
          <span className="text-sm text-[#6b7280]">
            {formatDate(role.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (role) => (
          <div className="flex justify-end">
            <ActionDropdown
              onEdit={
                canUpdate("roles")
                  ? () => {
                      setSelectedRoleId(role.id);
                      setEditModalOpen(true);
                    }
                  : undefined
              }
              // onDelete={
              //   canDelete("roles")
              //     ? () => {
              //         setSelectedRoleId(role.id);
              //         setSelectedRoleName(role.name);
              //         setDeleteModalOpen(true);
              //       }
              //     : undefined
              // }
            />
          </div>
        ),
      },
    ];

    return (
      <>
        <div className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search platform roles..."
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

            <FilterDropdown
              label="Sort by"
              options={[
                { value: ["name", "asc"], label: "Name (A-Z)" },
                { value: ["name", "desc"], label: "Name (Z-A)" },
                { value: ["code", "asc"], label: "Code (A-Z)" },
                { value: ["code", "desc"], label: "Code (Z-A)" },
                { value: ["created_at", "asc"], label: "Created (Oldest)" },
                { value: ["created_at", "desc"], label: "Created (Newest)" },
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

          <div className="flex items-center gap-2">
            {canCreate("roles") && (
              <PrimaryButton
                size="default"
                className="flex items-center gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">New Platform Role</span>
              </PrimaryButton>
            )}
          </div>
        </div>

        <DataTable
          data={roles}
          columns={columns}
          keyExtractor={(role) => role.id}
          emptyMessage="No platform roles found"
          isLoading={isLoading}
          error={error}
        />

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
              setCurrentPage(1);
            }}
          />
        )}

        <NewPlatformRoleModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateRole}
          isLoading={isCreating}
        />

        <EditPlatformRoleModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedRoleId(null);
          }}
          roleId={selectedRoleId}
          onLoadRole={loadRole}
          onSubmit={handleUpdateRole}
          isLoading={isUpdating}
        />

        {/* <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedRoleId(null);
            setSelectedRoleName("");
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Platform Role"
          message="Are you sure you want to delete this platform role? This action cannot be undone."
          itemName={selectedRoleName}
          isLoading={isDeleting}
        /> */}
      </>
    );
  },
);

PlatformRolesTable.displayName = "PlatformRolesTable";
