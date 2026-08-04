import { useEffect, type ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Modal,
  FormField,
  FormSelect,
  PrimaryButton,
  SecondaryButton,
  FormTextArea,
} from "@/components/shared";
import type {
  Designation,
  CreateDesignationRequest,
  UpdateDesignationRequest,
} from "@/types/designation";

// Validation schema
const designationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  level: z.number().int().min(0).optional(),
  sort_order: z.number().int().min(0).optional(),
});

type DesignationFormData = z.infer<typeof designationSchema>;

const statusOptions = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

interface NewDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDesignationRequest) => Promise<void>;
  isLoading?: boolean;
}

export const NewDesignationModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: NewDesignationModalProps): ReactElement | null => {
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<DesignationFormData>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      is_active: true,
      level: 0,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      clearErrors();
    }
  }, [isOpen, reset, clearErrors]);

  const handleFormSubmit: SubmitHandler<DesignationFormData> = async (data) => {
    await onSubmit(data as CreateDesignationRequest);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Designation"
      description="Add a new designation to the system"
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
            {isLoading ? "Creating..." : "Create Designation"}
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Designation Name"
            required
            placeholder="e.g. Software Engineer"
            error={errors.name?.message}
            {...register("name")}
          />
          <FormField
            label="Designation Code"
            required
            placeholder="e.g. SWE"
            error={errors.code?.message}
            {...register("code")}
          />
        </div>

        {/* <FormField
          label="Description"
          placeholder="Enter designation description"
          error={errors.description?.message}
          {...register("description")}
        /> */}
        <FormTextArea
          label="Description"
          placeholder="Enter designation description"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Hierarchy Level"
            type="number"
            placeholder="0"
            error={errors.level?.message}
            {...register("level", { valueAsNumber: true })}
          />
          <FormField
            label="Sort Order"
            type="number"
            placeholder="0"
            error={errors.sort_order?.message}
            {...register("sort_order", { valueAsNumber: true })}
          />
        </div>

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

interface EditDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateDesignationRequest) => Promise<void>;
  designation: Designation | null;
  isLoading?: boolean;
}

export const EditDesignationModal = ({
  isOpen,
  onClose,
  onSubmit,
  designation,
  isLoading = false,
}: EditDesignationModalProps): ReactElement | null => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<DesignationFormData>({
    resolver: zodResolver(designationSchema),
  });

  const statusValue = watch("is_active");

  useEffect(() => {
    if (isOpen && designation) {
      reset({
        name: designation.name,
        code: designation.code,
        description: designation.description || "",
        is_active: designation.is_active,
        level: designation.level || 0,
        sort_order: designation.sort_order || 0,
      });
    } else if (!isOpen) {
      reset();
      clearErrors();
    }
  }, [isOpen, designation, reset, clearErrors]);

  const handleFormSubmit: SubmitHandler<DesignationFormData> = async (data) => {
    if (designation) {
      await onSubmit(designation.id, data as UpdateDesignationRequest);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Designation"
      description="Update designation details"
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
            {isLoading ? "Updating..." : "Update Designation"}
          </PrimaryButton>
        </>
      }
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Designation Name"
            required
            placeholder="e.g. Software Engineer"
            error={errors.name?.message}
            {...register("name")}
          />
          <FormField
            label="Designation Code"
            required
            placeholder="e.g. SWE"
            error={errors.code?.message}
            {...register("code")}
          />
        </div>

        {/* <FormField
          label="Description"
          placeholder="Enter designation description"
          error={errors.description?.message}
          {...register("description")}
        /> */}
        <FormTextArea
          label="Description"
          placeholder="Enter designation description"
          error={errors.description?.message}
          {...register("description")}
          rows={4}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Hierarchy Level"
            type="number"
            placeholder="0"
            error={errors.level?.message}
            {...register("level", { valueAsNumber: true })}
          />
          <FormField
            label="Sort Order"
            type="number"
            placeholder="0"
            error={errors.sort_order?.message}
            {...register("sort_order", { valueAsNumber: true })}
          />
        </div>

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

interface ViewDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  designation: Designation | null;
}

export const ViewDesignationModal = ({
  isOpen,
  onClose,
  designation,
}: ViewDesignationModalProps): ReactElement | null => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Designation Details"
      description="View full information about this designation"
      maxWidth="md"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}
    >
      {designation && (
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
                <p className="text-sm text-[#0f1724] mt-1">
                  {designation.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Code
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {designation.code}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Status
                </p>
                <p className="text-sm text-[#0f1724] mt-1 capitalize">
                  {designation.is_active ? "Active" : "Inactive"}
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
                  Hierarchy Level
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {designation.level}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Sort Order
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {designation.sort_order}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#9aa6b2] uppercase">
                  Assigned Users
                </p>
                <p className="text-sm text-[#0f1724] mt-1">
                  {designation.user_count || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-xs font-medium text-[#9aa6b2] uppercase">
              Description
            </p>
            <p className="text-sm text-[#0f1724] mt-1 bg-[#f5f7fa] p-3 rounded-md border border-[rgba(0,0,0,0.05)]">
              {designation.description || "No description provided."}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2 text-xs text-[#9aa6b2]">
            <span>
              Created: {new Date(designation.created_at).toLocaleString()}
            </span>
            <span className="mx-2">|</span>
            <span>
              Updated: {new Date(designation.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};
