import { useEffect } from "react";
import type { ReactElement } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
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

const assignmentSchema = z.object({
  role_id: z.string().min(1, "Role is required"),
  module_ids: z.array(z.string().min(1)).min(1, "At least one module is required"),
});

const newUserSchema = z
  .object({
    email: z.email({ message: "Please enter a valid email address" }),
    first_name: z.string().min(1, "First name is required").max(255, "Maximum 255 characters allowed"),
    last_name: z.string().min(1, "Last name is required").max(255, "Maximum 255 characters allowed"),
    status: z.enum(["active", "suspended", "deleted"], { message: "Status is required" }),
    auth_provider: z.enum(["local"], { message: "Auth provider is required" }),
    role_module_assignments: z.array(assignmentSchema).min(1, "At least one role assignment is required")
      .superRefine((assignments, ctx) => {
        const used = new Set<string>();
        assignments.forEach((assignment, rowIndex) => {
          assignment.module_ids.forEach((moduleId) => {
            if (used.has(moduleId)) {
              ctx.addIssue({
                code: "custom",
                path: [rowIndex, "module_ids"],
                message: "A module can only be assigned to one role",
              });
            }
            used.add(moduleId);
          });
        });
      }),
    department_id: z.string().min(1, "Department is required"),
    designation_id: z.string().min(1, "Designation is required"),
    category: z.enum(["tenant_user", "supplier_user"]).default("tenant_user"),
    supplier_id: z.string().optional().nullable(),
  });

type NewUserFormData = z.infer<typeof newUserSchema>;
type CreateUserPayload = Omit<NewUserFormData, "role_module_assignments"> & {
  role_module_combinations: { role_id: string; module_id: string }[];
};

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => Promise<void>;
  isLoading?: boolean;
  defaultTenantId?: string;
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "deleted", label: "Deleted" },
];

export const NewUserModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  defaultTenantId,
}: NewUserModalProps): ReactElement | null => {
  const { control, register, handleSubmit, setValue, watch, reset, setError, clearErrors, formState: { errors } } =
    useForm<NewUserFormData>({
      resolver: zodResolver(newUserSchema) as any,
      defaultValues: {
        role_module_assignments: [{ role_id: "", module_ids: [] }],
        department_id: "",
        designation_id: "",
        category: "tenant_user",
        supplier_id: null,
      },
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

  const roles = useAppSelector((state) => state.auth.roles);
  const isSuperAdmin = roles.includes("super_admin");

  useEffect(() => {
    if (!isOpen) {
      reset({
        email: "",
        first_name: "",
        last_name: "",
        status: "active",
        auth_provider: "local",
        role_module_assignments: [{ role_id: "", module_ids: [] }],
        department_id: "",
        designation_id: "",
        category: "tenant_user",
        supplier_id: null,
      });
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  const loadRoles = async (page: number, limit: number) => {
    const response = defaultTenantId
      ? await roleService.getByTenant(defaultTenantId, page, limit, undefined, undefined, true)
      : await roleService.getAll(page, limit, undefined, undefined, undefined, true);
    return {
      options: response.data.map((role) => ({ value: role.id, label: role.name })),
      pagination: response.pagination,
    };
  };

  const loadModules = async (page: number, limit: number) => {
    const tenantId = isSuperAdmin ? defaultTenantId : undefined;
    const response = await moduleService.getAvailable(page, limit, tenantId);
    return {
      options: response.data.map((module) => ({ value: module.id, label: module.name })),
      pagination: response.pagination,
    };
  };

  const loadDepartments = async () => {
    const response = await departmentService.list(defaultTenantId, { active_only: true });
    return {
      options: response.data.map((dept) => ({ value: dept.id, label: dept.name })),
      pagination: { page: 1, limit: response.data.length, total: response.data.length, totalPages: 1, hasMore: false },
    };
  };

  const loadDesignations = async () => {
    const response = await designationService.list(defaultTenantId, { active_only: true });
    return {
      options: response.data.map((desig) => ({ value: desig.id, label: desig.name })),
      pagination: { page: 1, limit: response.data.length, total: response.data.length, totalPages: 1, hasMore: false },
    };
  };

  const loadSuppliers = async (page: number, limit: number) => {
    const response = await supplierService.list({ tenantId: defaultTenantId, limit, offset: (page - 1) * limit });
    const total = response.pagination?.total ?? response.data?.length ?? 0;
    return {
      options: (response.data || []).map((supplier: any) => ({ value: supplier.id, label: supplier.name })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasMore: page * limit < total },
    };
  };

  const handleFormSubmit = async (data: NewUserFormData): Promise<void> => {
    clearErrors();
    try {
      const { role_module_assignments, ...submitData } = data;
      const role_module_combinations = role_module_assignments.flatMap((row) =>
        row.module_ids.map((module_id) => ({ role_id: row.role_id, module_id })),
      );

      if (submitData.category === "tenant_user") submitData.supplier_id = null;
      else if (!submitData.supplier_id) submitData.supplier_id = null;

      await onSubmit({ ...submitData, role_module_combinations });
    } catch (error: any) {
      if (error?.response?.data?.details && Array.isArray(error.response.data.details)) {
        const first = error.response.data.details[0];
        setError("root", { type: "server", message: first?.message || "Validation failed" });
        return;
      }
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create user. Please try again.";
      setError("root", { type: "server", message });
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
      title="Create New User"
      description="Invite a new user to this tenant"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2.5 text-sm">
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={handleSubmit(handleFormSubmit as any)}
            disabled={isLoading}
            size="default"
            className="px-4 py-2.5 text-sm"
          >
            {isLoading ? "Creating..." : "Create User"}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={handleSubmit(handleFormSubmit as any)}>
        {errors.root && (
          <div className="p-4 bg-[rgba(239,68,68,0.1)] border border-[#ef4444] rounded-md mb-4">
            <p className="text-sm text-[#ef4444]">{errors.root.message}</p>
          </div>
        )}

        <FormField label="Email" type="email" required placeholder="Enter email address" error={errors.email?.message} {...register("email")} />
        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormField label="First Name" required placeholder="Enter first name" error={errors.first_name?.message} {...register("first_name")} />
          <FormField label="Last Name" required placeholder="Enter last name" error={errors.last_name?.message} {...register("last_name")} />
        </div>
        <div className="grid grid-cols-2 gap-5 pb-4">
          <PaginatedSelect label="Department" required placeholder="Select Department" value={departmentIdValue || ""} onValueChange={(value) => setValue("department_id", value, { shouldValidate: true })} onLoadOptions={loadDepartments} error={errors.department_id?.message} />
          <PaginatedSelect label="Designation" required placeholder="Select Designation" value={designationIdValue || ""} onValueChange={(value) => setValue("designation_id", value, { shouldValidate: true })} onLoadOptions={loadDesignations} error={errors.designation_id?.message} />
        </div>
        <div className="grid grid-cols-2 gap-5 pb-4">
          <FormSelect
            label="User Category"
            required
            placeholder="Select Category"
            options={[{ value: "tenant_user", label: "Tenant User" }, { value: "supplier_user", label: "Supplier User" }]}
            value={categoryValue || "tenant_user"}
            onValueChange={(value) => {
              const category = value as "tenant_user" | "supplier_user";
              setValue("category", category, { shouldValidate: true });
              if (category === "tenant_user") setValue("supplier_id", null);
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
            onValueChange={(value) => setValue("status", value as "active" | "suspended" | "deleted")}
            error={errors.status?.message}
          />
        </div>

        <div className="mt-2 mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Role & Module Assignments</label>
            <button
              type="button"
              onClick={() => append({ role_id: "", module_ids: [] })}
              className="text-sm font-medium text-[#112868] hover:text-[#0b1c4a] flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Assignment
            </button>
          </div>
          {(errors.role_module_assignments as any)?.message && (
            <p className="text-sm text-red-500 mb-2">{(errors.role_module_assignments as any).message}</p>
          )}
          <div className="space-y-3">
            {fields.map((field, index) => {
              const roleIdValue = watch(`role_module_assignments.${index}.role_id`);
              const moduleIdsValue = watch(`role_module_assignments.${index}.module_ids`) || [];
              return (
                <div key={field.id} className="flex gap-2 items-start border p-3 rounded-md bg-gray-50 relative">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <PaginatedSelect
                      label="Select Role"
                      required
                      placeholder="Select Role"
                      value={roleIdValue || ""}
                      onValueChange={(value) => setValue(`role_module_assignments.${index}.role_id`, value, { shouldValidate: true })}
                      onLoadOptions={loadRoles}
                      error={errors.role_module_assignments?.[index]?.role_id?.message}
                    />
                    <MultiselectPaginatedSelect
                      label="Select Modules"
                      required
                      placeholder="Select Modules"
                      value={moduleIdsValue}
                      onValueChange={(value) => setValue(`role_module_assignments.${index}.module_ids`, value, { shouldValidate: true })}
                      onLoadOptions={loadModules}
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
      </form>
    </Modal>
  );
};
