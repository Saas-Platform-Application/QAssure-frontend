import { useEffect, type ReactElement, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Modal,
  FormField,
  FormSelect,
  PrimaryButton,
  SecondaryButton,
  PaginatedSelect,
  FormTextArea,
} from "@/components/shared";
import type {
  Department,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "@/types/department";
import { departmentService } from "@/services/department-service";

// Validation schema
const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

interface NewDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDepartmentRequest) => Promise<void>;
  isLoading?: boolean;
  tenantId?: string | null;
}

export const NewDepartmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  tenantId,
}: NewDepartmentModalProps): ReactElement | null => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      is_active: true,
      parent_id: null,
      sort_order: 0,
    },
  });

  const parentIdValue = watch("parent_id");

  useEffect(() => {
    if (!isOpen) {
      reset();
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  const loadDepartments = async () => {
    const response = await departmentService.list(tenantId, {
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

  const handleFormSubmit: SubmitHandler<DepartmentFormData> = async (data) => {
    await onSubmit(data as CreateDepartmentRequest);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Department"
      description="Add a new department to the system"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={isLoading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Department"}
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-3"
      >
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> */}
        <FormField
          label="Department Name"
          required
          placeholder="e.g. Engineering"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          label="Code"
          required
          placeholder="e.g. ENG"
          error={errors.code?.message}
          {...register("code")}
        />
        {/* </div> */}

        {/* <FormField
          label="Description"
          placeholder="Enter department description"
          error={errors.description?.message}
          {...register("description")}
        /> */}
        <FormTextArea
          label="Description"
          placeholder="Enter department description"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
        <PaginatedSelect
          label="Parent Department"
          placeholder="Select parent (optional)"
          value={parentIdValue || ""}
          onValueChange={(value) => setValue("parent_id", value || null)}
          onLoadOptions={loadDepartments}
          error={errors.parent_id?.message}
        />
        <FormField
          label="Sort Order"
          type="number"
          placeholder="0"
          error={errors.sort_order?.message}
          {...register("sort_order", { valueAsNumber: true })}
        />
        {/* </div> */}

        {/* <FormSelect
          label="Status"
          required
          options={statusOptions}
          value={String(statusValue)}
          onValueChange={(value) => setValue("is_active", value === "true")}
          error={errors.is_active?.message}
        /> */}
      </form>
    </Modal>
  );
};

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateDepartmentRequest) => Promise<void>;
  department: Department | null;
  isLoading?: boolean;
  tenantId?: string | null;
}

export const EditDepartmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  department,
  isLoading = false,
  tenantId,
}: EditDepartmentModalProps): ReactElement | null => {
  const [initialParentOption, setInitialParentOption] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
  });

  const statusValue = watch("is_active");
  const parentIdValue = watch("parent_id");

  useEffect(() => {
    if (isOpen && department) {
      reset({
        name: department.name,
        code: department.code,
        description: department.description || "",
        is_active: department.is_active,
        parent_id: department.parent_id,
        sort_order: department.sort_order || 0,
      });

      if (department.parent_id && department.parent_name) {
        setInitialParentOption({
          value: department.parent_id,
          label: department.parent_name,
        });
      } else {
        setInitialParentOption(null);
      }
    } else if (!isOpen) {
      reset();
      clearErrors();
      setInitialParentOption(null);
    }
  }, [isOpen, department, reset, clearErrors]);

  const loadDepartments = async () => {
    const response = await departmentService.list(tenantId, {
      active_only: true,
    });
    // Filter out current department to prevent self-referencing
    let options = response.data
      .filter((d) => d.id !== department?.id)
      .map((dept) => ({
        value: dept.id,
        label: dept.name,
      }));

    // Ensure initial parent is in options if not already there
    if (initialParentOption) {
      if (!options.find((o) => o.value === initialParentOption.value)) {
        options = [initialParentOption, ...options];
      }
    }

    return {
      options,
      pagination: {
        page: 1,
        limit: options.length,
        total: options.length,
        totalPages: 1,
        hasMore: false,
      },
    };
  };

  const handleFormSubmit: SubmitHandler<DepartmentFormData> = async (data) => {
    if (department) {
      await onSubmit(department.id, data as UpdateDepartmentRequest);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Department"
      description="Update department details"
      maxWidth="md"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={isLoading}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Update Department"}
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4"
      >
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
        <FormField
          label="Department Name"
          required
          placeholder="e.g. Engineering"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          label="Department Code"
          required
          placeholder="e.g. ENG"
          error={errors.code?.message}
          {...register("code")}
        />
        {/* </div> */}

        {/* <FormField
          label="Description"
          placeholder="Enter department description"
          error={errors.description?.message}
          {...register("description")}
        /> */}
        <FormTextArea
          label="Description"
          placeholder="Enter department description"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
        <PaginatedSelect
          label="Parent Department"
          placeholder="Select parent (optional)"
          value={parentIdValue || ""}
          onValueChange={(value) => setValue("parent_id", value || null)}
          onLoadOptions={loadDepartments}
          error={errors.parent_id?.message}
        />
        <FormField
          label="Sort Order"
          type="number"
          placeholder="0"
          error={errors.sort_order?.message}
          {...register("sort_order", { valueAsNumber: true })}
        />
        {/* </div> */}

        <FormSelect
          label="Status"
          required
          options={statusOptions}
          value={String(statusValue)}
          onValueChange={(value) => setValue("is_active", value === "true")}
          error={errors.is_active?.message}
        />
      </form>
    </Modal>
  );
};

interface ViewDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
}

export const ViewDepartmentModal = ({
  isOpen,
  onClose,
  department,
}: ViewDepartmentModalProps): ReactElement | null => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Department Details"
      description="View full information about this department"
      maxWidth="md"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}
    >
      {department && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[#0f1724]">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Name
                </p>
                <p className="text-sm text-[#0f1724] mt-1">{department.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Code
                </p>
                <p className="text-sm text-[#0f1724] mt-1">{department.code}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Status
                </p>
                <p className="text-sm text-[#0f1724] mt-1 capitalize">
                  {department.is_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[#0f1724]">
              Hierarchy & Stats
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Parent Department
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {department.parent_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Level
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {department.level}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Sort Order
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {department.sort_order}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Sub-departments
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {department.child_count || 0}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Users
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {department.user_count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-xs font-medium text-[#9aa6b2] uppercase">
              Description
            </p>
            <p className="text-sm text-[#0f1724] mt-1 bg-[#f5f7fa] p-3 rounded-md border border-[rgba(0,0,0,0.05)]">
              {department.description || "No description provided."}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 text-xs text-[#9aa6b2]">
            <span>
              Created: {new Date(department.created_at).toLocaleString()}
            </span>
            <span className="mx-2">|</span>
            <span>
              Updated: {new Date(department.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};
