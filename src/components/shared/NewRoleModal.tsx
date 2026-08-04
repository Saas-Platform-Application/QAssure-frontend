import { useEffect, useState, useMemo } from "react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";
import { useEnabledServices } from "@/hooks/useEnabledServices";
import {
  Modal,
  FormField,
  PrimaryButton,
  SecondaryButton,
  FormTextArea,
  FormSelect,
} from "@/components/shared";
import type { CreateRoleRequest } from "@/types/role";
import { useAppSelector } from "@/hooks/redux-hooks";

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
  // 'tenants',
  "roles",
  "permissions",
  // 'user_roles',
  // 'user_tenants',
  // 'sessions',
  // 'api_keys',
  // 'api_key_permissions',
  "projects",
  "document",
  "audit",
  "security",
  "workflow",
  "training",
  "capa",
  "supplier",
  "reports",
  "notifications",
  "files",
  "settings",
  // 'modules',
  "audit_logs",
  // 'event_logs',
  // 'health_history',
  "qms_connections",
  "qms_sync_jobs",
  "qms_sync_conflicts",
  "qms_entity_mappings",
  "ai",
  "qms",
];

// All available actions
const ALL_ACTIONS = ["create", "read", "update", "delete"];

// Resource to Platform Service mapping
const RESOURCE_SERVICE_MAPPING: Record<string, string> = {
  projects: "project",
  document: "document",
  security: "security",
  workflow: "workflow",
  training: "training",
  capa: "capa",
  supplier: "supplier",
  reports: "reporting",
  files: "file_attachment",
  qms_connections: "qms",
  qms_sync_jobs: "qms",
  qms_sync_conflicts: "qms",
  qms_entity_mappings: "qms",
  ai: "ai",
  qms: "qms",
};

// Validation schema
const newRoleSchema = z.object({
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

type NewRoleFormData = z.infer<typeof newRoleSchema>;

interface NewRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoleRequest) => Promise<void>;
  isLoading?: boolean;
  defaultTenantId?: string; // If provided, automatically include tenant_id in request body
}

export const NewRoleModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  defaultTenantId,
}: NewRoleModalProps): ReactElement | null => {
  const permissions = useAppSelector((state) => state.auth.permissions);
  const roles = useAppSelector((state) => state.auth.roles);
  const isSuperAdmin = roles.includes("super_admin");
  const [selectedPermissions, setSelectedPermissions] = useState<
    Array<{ resource: string; action: string }>
  >([]);
  const { isServiceEnabled } = useEnabledServices();
  // const [expandedResources, setExpandedResources] = useState<Set<string>>(
  //   new Set(),
  // );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NewRoleFormData>({
    resolver: zodResolver(newRoleSchema),
    defaultValues: {
      code: undefined,
      is_active: true,
      permissions: [],
    },
  });

  const statusValue = watch("is_active");

  const nameValue = watch("name");

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

  const statusOptions = [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ];

  // Build available resources and actions based on user permissions
  const availableResourcesAndActions = useMemo(() => {
    const resourceMap = new Map<string, Set<string>>();

    permissions.forEach((perm) => {
      const { resource, action } = perm;

      if (resource === "*") {
        // If resource is *, show all resources
        ALL_RESOURCES.forEach((res) => {
          if (!resourceMap.has(res)) {
            resourceMap.set(res, new Set());
          }
          const actions = resourceMap.get(res)!;
          if (action === "*") {
            // If action is also *, add all actions
            ALL_ACTIONS.forEach((act) => actions.add(act));
          } else {
            actions.add(action);
          }
        });
      } else {
        // Specific resource
        if (!resourceMap.has(resource)) {
          resourceMap.set(resource, new Set());
        }
        const actions = resourceMap.get(resource)!;
        if (action === "*") {
          // If action is *, add all actions for this resource
          ALL_ACTIONS.forEach((act) => actions.add(act));
        } else {
          actions.add(action);
        }
      }
    });

    return resourceMap;
  }, [permissions]);

  // Check if a resource has any selected actions
  // const hasSelectedActions = (
  //   resource: string,
  //   actions: Set<string>,
  // ): boolean => {
  //   return Array.from(actions).some((action) => {
  //     return selectedPermissions.some((p) => {
  //       // Check for exact match
  //       if (p.resource === resource && p.action === action) return true;
  //       // Check for wildcard resource with exact action
  //       if (p.resource === "*" && p.action === action) return true;
  //       // Check for exact resource with wildcard action
  //       if (p.resource === resource && p.action === "*") return true;
  //       // Check for wildcard resource with wildcard action
  //       if (p.resource === "*" && p.action === "*") return true;
  //       return false;
  //     });
  //   });
  // };

  // // Toggle resource expansion
  // const toggleResource = (resource: string) => {
  //   setExpandedResources((prev) => {
  //     const newSet = new Set(prev);
  //     if (newSet.has(resource)) {
  //       newSet.delete(resource);
  //     } else {
  //       newSet.add(resource);
  //     }
  //     return newSet;
  //   });
  // };

  // Handle permission checkbox change
  const handlePermissionChange = (
    resource: string,
    action: string,
    checked: boolean,
  ) => {
    setSelectedPermissions((prev) => {
      const newPerms = [...prev];
      if (checked) {
        // Add permission if not already exists
        if (
          !newPerms.some((p) => p.resource === resource && p.action === action)
        ) {
          newPerms.push({ resource, action });
        }
      } else {
        // Remove permission
        return newPerms.filter(
          (p) => !(p.resource === resource && p.action === action),
        );
      }
      return newPerms;
    });
  };

  // Update form value when permissions change
  useEffect(() => {
    setValue(
      "permissions",
      selectedPermissions.length > 0 ? selectedPermissions : [],
    );
  }, [selectedPermissions, setValue]);

  const handleFormSubmit = async (data: NewRoleFormData): Promise<void> => {
    clearErrors();
    try {
      const submitData = {
        ...data,
        // For super_admin, always include tenant_id if defaultTenantId is provided
        tenant_id: isSuperAdmin
          ? defaultTenantId || undefined
          : defaultTenantId || undefined,
        permissions:
          selectedPermissions.length > 0 ? selectedPermissions : undefined,
      };
      await onSubmit(submitData as CreateRoleRequest);
    } catch (error: any) {
      // Handle validation errors from API
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
              setError(detail.path as keyof NewRoleFormData, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );
      } else {
        // Handle general errors
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
          "Failed to create role. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to create role. Please try again.",
        });
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Role"
      description="Define a new role by setting permissions and role type."
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
        className="flex-col gap-0"
      >
        {/* General Error Display */}
        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}

        {/* Role Name and Role Code Row */}
        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormField
            label="Role Name"
            required
            placeholder="Enter Text Here"
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

        {/* Description */}
        {/* <FormField
          label="Description"
          required
          placeholder="Enter Text Here"
          error={errors.description?.message}
          {...register("description")}
        /> */}
        <FormTextArea
          label="Description"
          required
          placeholder="Enter Text Here"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        <div className="pb-4">
          <FormSelect
            label="Status"
            required
            options={statusOptions}
            value={String(statusValue)}
            onValueChange={(value) => setValue("is_active", value === "true", { shouldValidate: true })}
            error={errors.is_active?.message}
          />
        </div>

        {/* Permissions Section */}
        <div className="pb-4">
          <div
            className="
      flex flex-col items-start gap-3 self-stretch
      p-4 rounded-[8px]
      border border-[#D1D5DB]
      bg-white
    "
          >
            {/* Header Section */}
            <div className="flex flex-col items-start self-stretch">
              <div className="flex flex-col items-start self-stretch">
                <h3 className="text-[13px] font-semibold text-[#111827]">
                  Permissions
                </h3>
                <p className="text-[11px] text-[#6B7280]">
                  Select allowed actions for this role by module.
                </p>
              </div>
            </div>

            {errors.permissions && (
              <p className="text-sm text-[#ef4444]">
                {errors.permissions.message}
              </p>
            )}

            {/* Table */}
            <div className="w-full overflow-x-auto border border-[#E5E7EB] rounded-[8px]">
              <table className="w-full border-collapse">
                {/* Table Header */}
                <thead>
                  <tr>
                    <th
                      className="
                w-[204px] h-[53px]
                px-3 py-[10px]
                text-left text-[11px]
                font-medium uppercase
                text-[#6B7280]
                border-b border-[#D1D5DB]
                bg-[#F9F9F9]
              "
                    >
                      Platform Services
                    </th>

                    {["View", "Create", "Edit", "Delete"].map((action) => (
                      <th
                        key={action}
                        className="w-[120px] px-3 py-[10px] text-center text-[11px] font-medium text-[#6B7280] border-b border-[#D1D5DB] bg-[#F9F9F9]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{action}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {Array.from(availableResourcesAndActions.entries()).map(
                    ([resource, actions]) => {
                      const serviceKey = RESOURCE_SERVICE_MAPPING[resource];
                      const isResourceLocked = serviceKey ? !isServiceEnabled(serviceKey) : false;

                      return (
                        <tr key={resource}>
                          {/* Resource Name */}
                          <td
                            className="
                      w-[204px]
                      h-[53px]
                      px-3 py-[19px]
                      border-b border-[#E5E7EB]
                      text-[14px]
                      bg-white
                    "
                          >
                            {isResourceLocked ? (
                              <div className="flex items-center gap-1.5 text-gray-400 opacity-60" title="Service disabled by Super Admin">
                                <span className="truncate">{resource.replace(/_/g, " ")}</span>
                                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              </div>
                            ) : (
                              <span className="text-[#111827]">{resource.replace(/_/g, " ")}</span>
                            )}
                          </td>

                          {/* Action Columns */}
                          {[
                            "read",
                            "create",
                            "update",
                            "delete",
                            // "approve",
                            // "admin",
                          ].map((action) => {
                            const isChecked = selectedPermissions.some((p) => {
                              if (p.resource === resource && p.action === action)
                                return true;

                              if (p.resource === "*" && p.action === action)
                                return true;

                              if (p.resource === resource && p.action === "*")
                                return true;

                              if (p.resource === "*" && p.action === "*")
                                return true;

                              return false;
                            });

                            const isAvailable = actions.has(action) && !isResourceLocked;

                            return (
                              <td
                                key={`${resource}-${action}`}
                                className="
                          w-[120px]
                          px-3 py-[10px]
                          text-center
                          border-b border-[#E5E7EB]
                          bg-white
                        "
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
                                  className="
                            w-4 h-4 rounded
                            border-[#D1D5DB]
                            text-[#0F3CC9]
                            focus:ring-[#0F3CC9]
                            disabled:opacity-30
                            disabled:cursor-not-allowed
                          "
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* <div className="pb-4">
          <label className="flex items-center gap-1.5 text-[13px] font-medium text-[#0e1b2a] mb-3">
            <span>Permissions</span>
          </label>
          {errors.permissions && (
            <p className="text-sm text-[#ef4444] mb-2">
              {errors.permissions.message}
            </p>
          )}
          <div className="border border-[rgba(0,0,0,0.08)] rounded-md p-4">
            {Array.from(availableResourcesAndActions.entries()).length === 0 ? (
              <p className="text-sm text-[#6b7280]">No permissions available</p>
            ) : (
              <div className="space-y-2">
                {Array.from(availableResourcesAndActions.entries()).map(
                  ([resource, actions]) => {
                    const isExpanded = expandedResources.has(resource);
                    const hasSelected = hasSelectedActions(resource, actions);
                    return (
                      <div
                        key={resource}
                        className={`border border-[rgba(0,0,0,0.08)] rounded-md overflow-hidden transition-colors ${
                          hasSelected ? "bg-[rgba(17,40,104,0.05)]" : "bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleResource(resource)}
                          className="w-full flex items-center justify-between p-3 hover:bg-[rgba(0,0,0,0.02)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#0e1b2a]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[#0e1b2a]" />
                            )}
                            <span
                              className={`font-medium text-sm capitalize ${
                                hasSelected
                                  ? "text-[#112868]"
                                  : "text-[#0e1b2a]"
                              }`}
                            >
                              {resource.replace(/_/g, " ")}
                            </span>
                            {hasSelected && (
                              <span className="text-xs text-[#112868] bg-[rgba(17,40,104,0.1)] px-2 py-0.5 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-2 border-t border-[rgba(0,0,0,0.05)]">
                            <div className="flex flex-wrap gap-4">
                              {Array.from(actions).map((action) => {
                                const isChecked = selectedPermissions.some(
                                  (p) => {
                                    // Check for exact match
                                    if (
                                      p.resource === resource &&
                                      p.action === action
                                    )
                                      return true;
                                    // Check for wildcard resource with exact action
                                    if (
                                      p.resource === "*" &&
                                      p.action === action
                                    )
                                      return true;
                                    // Check for exact resource with wildcard action
                                    if (
                                      p.resource === resource &&
                                      p.action === "*"
                                    )
                                      return true;
                                    // Check for wildcard resource with wildcard action
                                    if (p.resource === "*" && p.action === "*")
                                      return true;
                                    return false;
                                  },
                                );
                                return (
                                  <label
                                    key={`${resource}-${action}`}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) =>
                                        handlePermissionChange(
                                          resource,
                                          action,
                                          e.target.checked,
                                        )
                                      }
                                      className="w-4 h-4 text-[#112868] border-[rgba(0,0,0,0.2)] rounded focus:ring-[#112868]/20"
                                    />
                                    <span className="text-sm text-[#0e1b2a] capitalize">
                                      {action}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div> */}
      </form>
    </Modal>
  );
};
