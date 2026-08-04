import { useEffect, useState, useRef } from "react";
import type { ReactElement } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Modal,
  FormField,
  FormSelect,
  PaginatedSelect,
  MultiselectPaginatedSelect,
  PrimaryButton,
  SecondaryButton,
} from "@/components/shared";
import { roleService } from "@/services/role-service";
import { departmentService } from "@/services/department-service";
import { designationService } from "@/services/designation-service";
import { moduleService } from "@/services/module-service";
import { supplierService } from "@/services/supplier-service";
import { useAppSelector } from "@/hooks/redux-hooks";
import type { User } from "@/types/user";

const assignmentSchema = z.object({
  role_id: z.string().min(1, "Role is required"),
  module_ids: z
    .array(z.string().min(1))
    .min(1, "At least one module is required"),
});

// Validation schema
const editUserSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
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
  tenant_id: z.string().min(1, "Tenant is required"),
  role_module_assignments: z
    .array(assignmentSchema)
    .min(1, "At least one role assignment is required")
    .superRefine((assignments, ctx) => {
      const seenModules = new Set<string>();
      assignments.forEach((assignment, rowIndex) => {
        assignment.module_ids.forEach((moduleId) => {
          if (seenModules.has(moduleId)) {
            ctx.addIssue({
              code: "custom",
              path: [rowIndex, "module_ids"],
              message: "A module can only be assigned to one role",
            });
          }
          seenModules.add(moduleId);
        });
      });
    }),
  department_id: z.string().min(1, "Department is required"),
  designation_id: z.string().min(1, "Designation is required"),
  category: z.enum(["tenant_user", "supplier_user"]).default("tenant_user"),
  supplier_id: z.string().optional().nullable(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;
type UpdateUserPayload = Omit<EditUserFormData, "role_module_assignments"> & {
  role_module_combinations?: { role_id: string; module_id?: string | null }[];
};

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onLoadUser: (id: string) => Promise<User>;
  onSubmit: (id: string, data: UpdateUserPayload) => Promise<void>;
  isLoading?: boolean;
  defaultTenantId?: string; // If provided, automatically set tenant_id and hide tenant field
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

export const EditUserModal = ({
  isOpen,
  onClose,
  userId,
  onLoadUser,
  onSubmit,
  isLoading = false,
  defaultTenantId,
}: EditUserModalProps): ReactElement | null => {
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const [isTenantAdmin, setIsTenantAdmin] = useState<boolean>(false);
  const [selectedUserTenantId, setSelectedUserTenantId] = useState<string>("");

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EditUserFormData>({
    // @ts-ignore
    resolver: zodResolver(
      isTenantAdmin
        ? editUserSchema.extend({
            role_module_assignments: z
              .array(
                z.object({
                  role_id: z.string().optional(),
                  module_ids: z.array(z.string()).optional(),
                })
              )
              .optional(),
          })
        : editUserSchema
    ),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "role_module_assignments",
  });

  const statusValue = watch("status");
  const departmentIdValue = watch("department_id");
  const designationIdValue = watch("designation_id");
  const categoryValue = watch("category");
  const supplierIdValue = watch("supplier_id");

  const tenantIdFromAuth = useAppSelector((state) => state.auth.tenantId);

  const [initialRoleOptions, setInitialRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [initialDepartmentOption, setInitialDepartmentOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [initialDesignationOption, setInitialDesignationOption] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [initialModuleOptions, setInitialModuleOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [initialSupplierOption, setInitialSupplierOption] = useState<{
    value: string;
    label: string;
  } | null>(null);

  // Load roles for dropdown - ensure selected role is included
  const loadRoles = async (page: number, limit: number) => {
    const effectiveTenantId = selectedUserTenantId || defaultTenantId || tenantIdFromAuth;
    const response = effectiveTenantId
      ? await roleService.getByTenant(effectiveTenantId, page, limit, undefined, undefined, true)
      : await roleService.getAll(page, limit, undefined, undefined, undefined, true);
    return {
      options: response.data.map((role) => ({
        value: role.id,
        label: role.name,
      })),
      pagination: response.pagination,
    };
  };

  const loadDepartments = async () => {
    const effectiveTenantId = selectedUserTenantId || defaultTenantId || tenantIdFromAuth;
    const response = await departmentService.list(effectiveTenantId, {
      active_only: true,
    });
    return {
      options: response.data.map((dept) => ({
        value: dept.id,
        label: dept.name,
      })),
      pagination: {
        page: 1,
        limit: response.data.length,
        total: response.data.length,
        totalPages: 1,
        hasMore: false,
      },
    };
  };

  const loadDesignations = async () => {
    const effectiveTenantId = selectedUserTenantId || defaultTenantId || tenantIdFromAuth;
    const response = await designationService.list(effectiveTenantId, {
      active_only: true,
    });
    return {
      options: response.data.map((desig) => ({
        value: desig.id,
        label: desig.name,
      })),
      pagination: {
        page: 1,
        limit: response.data.length,
        total: response.data.length,
        totalPages: 1,
        hasMore: false,
      },
    };
  };

  const loadModules = async (page: number, limit: number) => {
    const effectiveTenantId = selectedUserTenantId || defaultTenantId || tenantIdFromAuth;
    const response = await moduleService.getAvailable(page, limit, effectiveTenantId);
    return {
      options: response.data.map((module) => ({
        value: module.id,
        label: module.name,
      })),
      pagination: response.pagination,
    };
  };

  const loadSuppliers = async (page: number, limit: number) => {
    const effectiveTenantId = selectedUserTenantId || defaultTenantId || tenantIdFromAuth;
    const response = await supplierService.list({
      tenantId: effectiveTenantId,
      limit,
      offset: (page - 1) * limit,
    });
    const total = response.pagination?.total ?? response.data?.length ?? 0;
    return {
      options: (response.data || []).map((supplier: any) => ({
        value: supplier.id,
        label: supplier.name,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    };
  };

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      if (loadedUserIdRef.current !== userId) {
        const loadUser = async (): Promise<void> => {
          try {
            setIsLoadingUser(true);
            setLoadError(null);
            clearErrors();
            const user = await onLoadUser(userId);
            loadedUserIdRef.current = userId;

            const tenantId = user.tenant?.id || user.tenant_id || "";

            const roleOptions: { value: string; label: string }[] = [];
            const moduleOptions: { value: string; label: string }[] = [];

            let initialAssignments = [
              { role_id: "", module_ids: [] as string[] },
            ];

            if (
              user.role_module_combinations &&
              user.role_module_combinations.length > 0
            ) {
              const grouped = new Map<string, string[]>();
              user.role_module_combinations.forEach((c) => {
                if (
                  c.role_id &&
                  c.role_name &&
                  !roleOptions.some((o) => o.value === c.role_id)
                ) {
                  roleOptions.push({ value: c.role_id, label: c.role_name });
                }
                if (
                  c.module_id &&
                  c.module_name &&
                  !moduleOptions.some((o) => o.value === c.module_id)
                ) {
                  moduleOptions.push({
                    value: c.module_id,
                    label: c.module_name,
                  });
                }
                if (c.module_id) {
                  const existing = grouped.get(c.role_id) || [];
                  existing.push(c.module_id);
                  grouped.set(c.role_id, existing);
                }
              });
              initialAssignments = Array.from(grouped.entries()).map(
                ([role_id, module_ids]) => ({
                  role_id,
                  module_ids,
                }),
              );
            } else {
              // Fallback for older format
              const r_ids =
                user.roles?.map((r) => r.id) ||
                (user.role_id ? [user.role_id] : []);
              if (r_ids.length > 0) {
                initialAssignments = r_ids.map((id) => ({
                  role_id: id,
                  module_ids: [],
                }));
              }
              if (user.roles?.length) {
                user.roles.forEach((r) =>
                  roleOptions.push({ value: r.id, label: r.name }),
                );
              } else if (user.role?.id) {
                roleOptions.push({
                  value: user.role.id,
                  label: user.role.name,
                });
              }
              if (user.modules?.length) {
                user.modules.forEach((m) =>
                  moduleOptions.push({ value: m.id, label: m.name }),
                );
              }
            }

            const departmentId =
              user.department?.id || user.department_id || "";
            const designationId =
              user.designation?.id || user.designation_id || "";

            const departmentName = user.department?.name || "";
            const designationName = user.designation?.name || "";

            if (roleOptions.length > 0) {
              setInitialRoleOptions(roleOptions);
            }
            if (departmentId && departmentName) {
              setInitialDepartmentOption({
                value: departmentId,
                label: departmentName,
              });
            }
            if (designationId && designationName) {
              setInitialDesignationOption({
                value: designationId,
                label: designationName,
              });
            }

            const isUserTenantAdmin = 
              user.roles?.some((r) => r.code === "tenant_admin") ||
              user.role_module_combinations?.some((c) => c.role_code === "tenant_admin") ||
              user.role?.code === "tenant_admin" ||
              user.role_id === "tenant_admin";
            setIsTenantAdmin(!!isUserTenantAdmin);
            setSelectedUserTenantId(tenantId);

            reset({
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              status: user.status,
              tenant_id: defaultTenantId || tenantId,
              role_module_assignments: initialAssignments,
              department_id: departmentId,
              designation_id: designationId,
              category:
                (user.category as "tenant_user" | "supplier_user") ||
                "tenant_user",
              supplier_id: user.supplier_id || null,
            });

            // Set initial supplier option if user is a supplier_user
            if (user.supplier_id && user.category === "supplier_user") {
              // Fetch supplier name to display in the dropdown
              try {
                const supplierResp = await supplierService.getById(
                  user.supplier_id,
                  defaultTenantId,
                );
                if (supplierResp.data) {
                  setInitialSupplierOption({
                    value: supplierResp.data.id,
                    label: supplierResp.data.name,
                  });
                }
              } catch {
                // If fetch fails, still set a minimal option so the value shows
                setInitialSupplierOption({
                  value: user.supplier_id,
                  label: user.supplier_id,
                });
              }
            }

            if (moduleOptions.length > 0) {
              setInitialModuleOptions(moduleOptions);
            }

            if (defaultTenantId) {
              setValue("tenant_id", defaultTenantId, { shouldValidate: true });
            }
          } catch (err: any) {
            setLoadError(
              err?.response?.data?.error?.message ||
                "Failed to load user details",
            );
          } finally {
            setIsLoadingUser(false);
          }
        };
        loadUser();
      }
    } else if (!isOpen) {
      loadedUserIdRef.current = null;
      setInitialRoleOptions([]);
      setInitialDepartmentOption(null);
      setInitialDesignationOption(null);
      setInitialSupplierOption(null);
      setIsTenantAdmin(false);
      setSelectedUserTenantId("");
      reset({
        email: "",
        first_name: "",
        last_name: "",
        status: "active",
        tenant_id: defaultTenantId || "",
        role_module_assignments: [{ role_id: "", module_ids: [] }],
        department_id: "",
        designation_id: "",
        category: "tenant_user",
        supplier_id: null,
      });
      setInitialModuleOptions([]);
      setLoadError(null);
      clearErrors();
    }
  }, [
    isOpen,
    userId,
    onLoadUser,
    reset,
    clearErrors,
    defaultTenantId,
    setValue,
  ]);

  const handleFormSubmit = async (data: EditUserFormData): Promise<void> => {
    if (!userId) return;
    clearErrors();
    try {
      if (defaultTenantId) {
        data.tenant_id = defaultTenantId;
      }
      // Normalize empty strings to null for optional UUID fields
      // If category is tenant_user, supplier_id should always be null
      if (data.category === "tenant_user") {
        data.supplier_id = null;
      } else if (!data.supplier_id) {
        data.supplier_id = null;
      }

      const { role_module_assignments, ...submitData } = data;
      const role_module_combinations = isTenantAdmin
        ? undefined
        : (role_module_assignments || []).flatMap((row) =>
            (row.module_ids || []).map((module_id) => ({
              role_id: row.role_id,
              module_id,
            })),
          );
      await onSubmit(userId, { ...submitData, role_module_combinations });
    } catch (error: any) {
      if (
        error?.response?.data?.details &&
        Array.isArray(error.response.data.details)
      ) {
        const validationErrors = error.response.data.details;
        setError("root", {
          type: "server",
          message: validationErrors[0]?.message || "Validation failed",
        });
        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            if (
              detail.path === "email" ||
              detail.path === "first_name" ||
              detail.path === "last_name" ||
              detail.path === "status" ||
              detail.path === "tenant_id" ||
              detail.path === "role_module_assignments" ||
              detail.path === "role_module_combinations"
            ) {
              setError(detail.path as keyof EditUserFormData, {
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
          "Failed to update user. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to update user. Please try again.",
        });
      }
    }
  };

  const getModuleError = (index: number): string | undefined => {
    const fieldError: any = errors.role_module_assignments?.[index]?.module_ids;
    if (!fieldError) return undefined;
    if (typeof fieldError.message === "string") return fieldError.message;
    if (Array.isArray(fieldError)) {
      const firstChild = fieldError.find((e: any) => e?.message);
      return firstChild?.message;
    }
    return undefined;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      description="Update user information"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isLoading || isLoadingUser}
            className="px-4 py-2.5 text-sm"
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSubmit(handleFormSubmit as any)}
            disabled={isLoading || isLoadingUser}
            size="default"
            className="px-4 py-2.5 text-sm"
          >
            {isLoading ? "Updating..." : "Update User"}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit as any)}>
        {isLoadingUser && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[#112868] animate-spin" />
          </div>
        )}

        {loadError && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{loadError}</p>
          </div>
        )}

        {!isLoadingUser && (
          <div className="flex flex-col gap-0">
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
              <PaginatedSelect
                label="Department"
                required
                placeholder="Select Department"
                value={departmentIdValue || ""}
                onValueChange={(value) =>
                  setValue("department_id", value, { shouldValidate: true })
                }
                onLoadOptions={loadDepartments}
                initialOption={initialDepartmentOption || undefined}
                error={errors.department_id?.message}
              />
              <PaginatedSelect
                label="Designation"
                required
                placeholder="Select Designation"
                value={designationIdValue || ""}
                onValueChange={(value) =>
                  setValue("designation_id", value, { shouldValidate: true })
                }
                onLoadOptions={loadDesignations}
                initialOption={initialDesignationOption || undefined}
                error={errors.designation_id?.message}
              />
            </div>

            {/* User Category */}
            <div className="grid grid-cols-2 gap-5 pb-4">
              <FormSelect
                label="User Category"
                required
                placeholder="Select Category"
                options={[
                  { value: "tenant_user", label: "Tenant User" },
                  { value: "supplier_user", label: "Supplier User" },
                ]}
                value={categoryValue || "tenant_user"}
                onValueChange={(value) => {
                  const category = value as "tenant_user" | "supplier_user";
                  setValue("category", category, { shouldValidate: true });
                  if (category === "tenant_user") {
                    setValue("supplier_id", null);
                  }
                }}
                error={errors.category?.message}
              />

              {categoryValue === "supplier_user" && (
                <PaginatedSelect
                  label="Linked Supplier"
                  required
                  placeholder="Select Supplier"
                  value={supplierIdValue || ""}
                  onValueChange={(value) => setValue("supplier_id", value)}
                  onLoadOptions={loadSuppliers}
                  initialOption={initialSupplierOption || undefined}
                  error={errors.supplier_id?.message}
                />
              )}
            </div>

            <div className="pb-4">
              <FormSelect
                label="Status"
                required
                placeholder="Select Status"
                options={statusOptions}
                value={statusValue}
                onValueChange={(value) =>
                  setValue(
                    "status",
                    value as "active" | "suspended" | "deleted",
                  )
                }
                error={errors.status?.message}
              />
            </div>

            {!isTenantAdmin && (
              <div className="mt-2 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Role & Module Assignments
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ role_id: "", module_ids: [] })}
                    className="text-sm font-medium text-[#112868] hover:text-[#0b1c4a] flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add Assignment
                  </button>
                </div>

                {(errors.role_module_assignments as any)?.message && (
                  <p className="text-sm text-red-500 mb-2">
                    {(errors.role_module_assignments as any).message}
                  </p>
                )}

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const roleIdValue = watch(
                      `role_module_assignments.${index}.role_id`,
                    );
                    const moduleIdsValue =
                      watch(`role_module_assignments.${index}.module_ids`) || [];

                    // Extract specific label if available from initial options
                    const getRoleLabel = (val: string) => {
                      const opt = initialRoleOptions.find((o) => o.value === val);
                      return opt ? opt.label : undefined;
                    };

                    const initialSelectedModules = moduleIdsValue
                      .map((val) => {
                        const opt = initialModuleOptions.find(
                          (o) => o.value === val,
                        );
                        return opt
                          ? { value: opt.value, label: opt.label }
                          : null;
                      })
                      .filter((opt): opt is { value: string; label: string } =>
                        Boolean(opt),
                      );

                    return (
                      <div
                        key={field.id}
                        className="flex gap-2 items-start border p-3 rounded-md bg-gray-50 relative"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <PaginatedSelect
                            label="Select Role"
                            required
                            placeholder="Select Role"
                            value={roleIdValue || ""}
                            onValueChange={(value) =>
                              setValue(
                                `role_module_assignments.${index}.role_id`,
                                value,
                                { shouldValidate: true },
                              )
                            }
                            onLoadOptions={loadRoles}
                            initialOption={
                              roleIdValue
                                ? {
                                    value: roleIdValue,
                                    label:
                                      getRoleLabel(roleIdValue) || roleIdValue,
                                  }
                                : undefined
                            }
                            error={
                              errors.role_module_assignments?.[index]?.role_id
                                ?.message
                            }
                          />
                          <MultiselectPaginatedSelect
                            label="Select Modules"
                            required
                            placeholder="Select Modules"
                            value={moduleIdsValue}
                            onValueChange={(value) =>
                              setValue(
                                `role_module_assignments.${index}.module_ids`,
                                value,
                                { shouldValidate: true },
                              )
                            }
                            onLoadOptions={loadModules}
                            initialOptions={initialSelectedModules}
                            error={getModuleError(index)}
                          />
                        </div>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="mt-8 p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
