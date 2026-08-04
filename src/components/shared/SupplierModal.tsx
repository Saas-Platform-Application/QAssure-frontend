import { useState, useEffect, type ReactElement } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Modal,
  FormField,
  FormSelect,
  PrimaryButton,
  SecondaryButton,
  ActiveOnlyToggle,
} from "@/components/shared";
import { Plus, Trash2 } from "lucide-react";
import { supplierService } from "@/services/supplier-service";
import type { CreateSupplierData } from "@/types/supplier";
import { showToast } from "@/utils/toast";

const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  legal_name: z.string().optional(),
  supplier_code: z.string().optional(),
  supplier_type: z.string().min(1, "Supplier type is required"),
  category: z.string().min(1, "Category is required"),
  status: z.string().optional(),
  risk_level: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  products_services_input: z
    .string()
    .min(1, "At least one product/service is required"),

  // Primary Contact
  primary_contact_name: z.string().optional(),
  primary_contact_email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  // primary_contact_phone: z.string().optional(),
  primary_contact_phone: z
        .string()
        .optional()
        .nullable()
        .refine(
          (val) => {
            if (!val || val.trim() === "") return true; // Optional field, empty is valid
            return /^\d{10}$/.test(val);
          },
          {
            message: "Phone number must be exactly 10 digits",
          },
        ),

  // Address
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),

  // Business IDs
  tax_id: z.string().optional(),
  duns_number: z.string().optional(),

  // Quality Agreement
  quality_agreement_signed: z.boolean().optional(),
  quality_agreement_date: z
    .union([z.date(), z.string(), z.null()])
    .optional()
    .nullable(),

  // Certifications
  certifications: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        issuing_body: z.string().optional().or(z.literal("")),
        expiry_date: z
          .union([z.date(), z.string(), z.null()])
          .optional()
          .nullable(),
        document_url: z
          .string()
          .url("Invalid URL")
          .optional()
          .or(z.literal("")),
      }),
    )
    .default([]),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "view";
  supplierId?: string | null;
  tenantId?: string | null;
  onSuccess: () => void;
}

export const SupplierModal = ({
  isOpen,
  onClose,
  mode,
  supplierId,
  tenantId,
  onSuccess,
}: SupplierModalProps): ReactElement => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<{
    types: { code: string; name: string }[];
    categories: { code: string; name: string }[];
    statuses: { code: string; name: string }[];
  }>({
    types: [],
    categories: [],
    statuses: [],
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: "",
      legal_name: "",
      supplier_code: "",
      supplier_type: "",
      category: "",
      status: "pending",
      risk_level: "low",
      website: "",
      products_services_input: "",
      primary_contact_name: "",
      primary_contact_email: "",
      primary_contact_phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      tax_id: "",
      duns_number: "",
      quality_agreement_signed: false,
      quality_agreement_date: null,
      certifications: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "certifications",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [typesRes, catsRes, statsRes] = await Promise.all([
          supplierService.getTypes(),
          supplierService.getCategories(),
          supplierService.getStatuses(),
        ]);
        setMetadata({
          types: typesRes.data,
          categories: catsRes.data,
          statuses: statsRes.data,
        });
      } catch (error) {
        console.error("Failed to fetch metadata", error);
      }
    };

    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen]);

  const formatDateForInput = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      if (mode !== "create" && supplierId && isOpen) {
        try {
          setIsLoading(true);
          const response = await supplierService.getById(supplierId, tenantId);
          if (response.success && response.data) {
            const s = response.data as any;
            // Map nested backend structure to flat form structure
            reset({
              name: s.name || "",
              legal_name: s.legal_name || "",
              supplier_code: s.supplier_code || "",
              supplier_type: s.supplier_type || "",
              category: s.category || "",
              status: s.status || "pending",
              risk_level: s.risk_level || "low",
              website: s.website || "",
              products_services_input: Array.isArray(s.products_services)
                ? s.products_services.join(", ")
                : "",

              primary_contact_name: s.contact?.name || "",
              primary_contact_email: s.contact?.email || "",
              primary_contact_phone: s.contact?.phone || "",

              address_line1: s.address?.line1 || "",
              address_line2: s.address?.line2 || "",
              city: s.address?.city || "",
              state: s.address?.state || "",
              country: s.address?.country || "",
              postal_code: s.address?.postal_code || "",

              tax_id: s.tax_id || "",
              duns_number: s.duns_number || "",
              quality_agreement_signed: s.quality_agreement?.signed || false,
              quality_agreement_date: s.quality_agreement?.date
                ? new Date(s.quality_agreement.date)
                : null,
              certifications: Array.isArray(s.certifications)
                ? s.certifications
                : [],
            });
          }
        } catch (error: any) {
          showToast.error("Failed to load supplier", error?.message);
          onClose();
        } finally {
          setIsLoading(false);
        }
      } else if (mode === "create" && isOpen) {
        reset({
          name: "",
          legal_name: "",
          supplier_code: "",
          supplier_type: "",
          category: "",
          status: "pending",
          risk_level: "low",
          website: "",
          products_services_input: "",
          primary_contact_name: "",
          primary_contact_email: "",
          primary_contact_phone: "",
          address_line1: "",
          address_line2: "",
          city: "",
          state: "",
          country: "",
          postal_code: "",
          tax_id: "",
          duns_number: "",
          quality_agreement_date: null,
          certifications: [],
        });
      }
    };

    fetchSupplier();
  }, [mode, supplierId, isOpen, reset, tenantId]);

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      // Map form fields to backend structure
      const payload: any = {
        ...data,
        products_services: data.products_services_input
          ? data.products_services_input
              .split(",")
              .map((item: string) => item.trim())
              .filter(Boolean)
          : [],
      };

      // Remove the UI-specific field before sending
      delete payload.products_services_input;

      if (mode === "create") {
        await supplierService.create(payload as CreateSupplierData, tenantId);
        showToast.success("Supplier created successfully");
      } else if (mode === "edit" && supplierId) {
        await supplierService.update(supplierId, payload, tenantId);
        showToast.success("Supplier updated successfully");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast.error(
        mode === "create"
          ? error?.response?.data?.error?.message || "Failed to create supplier"
          : error?.response?.data?.error?.message ||
              "Failed to update supplier",
        error?.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "create"
          ? "Add New Supplier"
          : mode === "view"
            ? "View Supplier"
            : "Edit Supplier"
      }
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-3">
          <SecondaryButton
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            {mode === "view" ? "Close" : "Cancel"}
          </SecondaryButton>
          {mode !== "view" && (
            <PrimaryButton
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || isLoading}
            >
              {mode === "create" ? "Create Supplier" : "Save Changes"}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <div>
        {isLoading ? (
          <div className="py-10 text-center text-[#6b7280]">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#112868] border-b pb-2">
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Supplier Name"
                  placeholder="Enter supplier name"
                  required
                  disabled={mode === "view" || isSubmitting}
                  {...register("name")}
                  error={errors.name?.message}
                />
                <FormField
                  label="Legal Name"
                  placeholder="Official registered name"
                  disabled={mode === "view" || isSubmitting}
                  {...register("legal_name")}
                  error={errors.legal_name?.message}
                />
                <FormField
                  label="Supplier Code"
                  placeholder="e.g. SUP-001 (Optional)"
                  disabled={mode === "view" || isSubmitting}
                  {...register("supplier_code")}
                  error={errors.supplier_code?.message}
                />
                <Controller
                  name="supplier_type"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Supplier Type"
                      required
                      options={metadata.types.map((t) => ({
                        value: t.code,
                        label: t.name,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mode === "view" || isSubmitting}
                      error={errors.supplier_type?.message}
                    />
                  )}
                />
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Category (Criticaility)"
                      required
                      options={metadata.categories.map((c) => ({
                        value: c.code,
                        label: c.name,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mode === "view" || isSubmitting}
                      error={errors.category?.message}
                    />
                  )}
                />
                <Controller
                  name="risk_level"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Risk Level"
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mode === "view" || isSubmitting}
                      error={errors.risk_level?.message}
                    />
                  )}
                />
                {/* <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Status"
                      options={metadata.statuses.map((s) => ({
                        value: s.code,
                        label: s.name,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mode === "view" || isSubmitting}
                      error={errors.status?.message}
                    />
                  )}
                /> */}
                <FormField
                  label="Tax ID"
                  placeholder="GST/VAT/Tax Number"
                  disabled={mode === "view" || isSubmitting}
                  {...register("tax_id")}
                  error={errors.tax_id?.message}
                />
                <FormField
                  label="DUNS Number"
                  placeholder="9-digit DUNS number"
                  disabled={mode === "view" || isSubmitting}
                  {...register("duns_number")}
                  error={errors.duns_number?.message}
                />
                <FormField
                  label="Website"
                  placeholder="https://example.com"
                  disabled={mode === "view" || isSubmitting}
                  {...register("website")}
                  error={errors.website?.message}
                />
              </div>
            </div>

            {/* Products & Services */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#112868] border-b pb-2">
                Products & Services
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  label="Deliverables"
                  placeholder="e.g. Raw Material, Testing, Logistics (Comma separated)"
                  required
                  disabled={mode === "view" || isSubmitting}
                  {...register("products_services_input")}
                  error={errors.products_services_input?.message}
                />
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#112868] border-b pb-2">
                Primary Contact Person
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="Contact Name"
                  placeholder="Full name"
                  disabled={mode === "view" || isSubmitting}
                  {...register("primary_contact_name")}
                  error={errors.primary_contact_name?.message}
                />
                <FormField
                  label="Contact Email"
                  placeholder="email@example.com"
                  disabled={mode === "view" || isSubmitting}
                  {...register("primary_contact_email")}
                  error={errors.primary_contact_email?.message}
                />
                {/* <FormField
                  label="Contact Phone"
                  placeholder="+1 (555) 000-0000"
                  disabled={mode === "view" || isSubmitting}
                  {...register("primary_contact_phone")}
                  error={errors.primary_contact_phone?.message}
                /> */}
                <FormField
                  label="Contact Phone"
                  type="tel"
                  placeholder="Enter 10-digit phone number"
                  maxLength={10}
                  error={
                    errors.primary_contact_phone?.message
                  }
                  {...register("primary_contact_phone", {
                    onChange: (e) => {
                      // Only allow digits and limit to 10 characters
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      setValue("primary_contact_phone", value, {
                        shouldValidate: true,
                      });
                    },
                  })}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#112868] border-b pb-2">
                Company Address
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Address Line 1"
                  placeholder="Street address, P.O. box"
                  disabled={mode === "view" || isSubmitting}
                  {...register("address_line1")}
                  error={errors.address_line1?.message}
                />
                <FormField
                  label="Address Line 2"
                  placeholder="Apartment, suite, unit, building, floor, etc."
                  disabled={mode === "view" || isSubmitting}
                  {...register("address_line2")}
                  error={errors.address_line2?.message}
                />
                <FormField
                  label="City"
                  placeholder="City"
                  disabled={mode === "view" || isSubmitting}
                  {...register("city")}
                  error={errors.city?.message}
                />
                <FormField
                  label="State/Province"
                  placeholder="State/Province"
                  disabled={mode === "view" || isSubmitting}
                  {...register("state")}
                  error={errors.state?.message}
                />
                <FormField
                  label="Country"
                  placeholder="Country"
                  disabled={mode === "view" || isSubmitting}
                  {...register("country")}
                  error={errors.country?.message}
                />
                <FormField
                  label="Postal Code"
                  placeholder="ZIP/Postal Code"
                  disabled={mode === "view" || isSubmitting}
                  {...register("postal_code")}
                  error={errors.postal_code?.message}
                />
              </div>
            </div>

            {/* Quality Agreement */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-[#112868] border-b pb-2">
                Quality Agreement
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="flex items-center gap-3 mb-2">
                  <Controller
                    name="quality_agreement_signed"
                    control={control}
                    render={({ field }) => (
                      <ActiveOnlyToggle
                        activeOnly={field.value || false}
                        onChange={field.onChange}
                        label="Quality Agreement Signed"
                      />
                    )}
                  />
                </div>
                <Controller
                  name="quality_agreement_date"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Agreement Date"
                      type="date"
                      disabled={mode === "view" || isSubmitting}
                      {...field}
                      value={formatDateForInput(field.value)}
                      error={errors.quality_agreement_date?.message}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  )}
                />
              </div>
            </div>

            {/* Certifications Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-semibold text-[#112868]">
                  Certifications
                </h4>
                {mode !== "view" && (
                  <button
                    type="button"
                    onClick={() =>
                      append({
                        name: "",
                        issuing_body: "",
                        expiry_date: null,
                        document_url: "",
                      })
                    }
                    className="flex items-center gap-1 text-[12px] font-medium text-[#112868] hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Certification
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {fields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-2">
                    No certifications added.
                  </p>
                ) : (
                  fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group"
                    >
                      {mode !== "view" && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-red-100 rounded-full text-red-500 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label="Certification Name"
                          placeholder="e.g. ISO 9001:2015"
                          required
                          disabled={mode === "view" || isSubmitting}
                          {...register(`certifications.${index}.name`)}
                          error={
                            (errors.certifications?.[index] as any)?.name
                              ?.message
                          }
                        />
                        <FormField
                          label="Issuing Body"
                          placeholder="e.g. TÜV SÜD"
                          disabled={mode === "view" || isSubmitting}
                          {...register(`certifications.${index}.issuing_body`)}
                        />
                        <Controller
                          name={`certifications.${index}.expiry_date`}
                          control={control}
                          render={({ field: dateField }) => (
                            <FormField
                              label="Expiry Date"
                              type="date"
                              disabled={mode === "view" || isSubmitting}
                              {...dateField}
                              value={formatDateForInput(dateField.value)}
                              onChange={(e) =>
                                dateField.onChange(e.target.value || null)
                              }
                            />
                          )}
                        />
                        <FormField
                          label="Document URL"
                          placeholder="Link to certificate"
                          disabled={mode === "view" || isSubmitting}
                          {...register(`certifications.${index}.document_url`)}
                          error={
                            (errors.certifications?.[index] as any)
                              ?.document_url?.message
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
