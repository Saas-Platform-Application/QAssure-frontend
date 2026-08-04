import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  Pagination,
  StatusBadge,
  ActionDropdown,
  PrimaryButton,
  DeleteConfirmationModal,
  Modal,
  FormField,
  FormSelect,
  FormTextArea,
  type Column,
} from "@/components/shared";
import {
  Plus,
  Database,
  Building2,
  AlertCircle,
  Users,
  Share2,
  CloudUpload,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import {
  storageBucketService,
  type StorageBucket,
} from "@/services/storage-bucket-service";
import { tenantService } from "@/services/tenant-service";
import { showToast } from "@/utils/toast";
import { StorageBucketDetail } from "./StorageBucketDetail";

// ─────────────────────────────────────────────
// Bucket Form Modal
// ─────────────────────────────────────────────
interface BucketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bucket?: StorageBucket | null;
}

const getBucketSchema = (isEdit: boolean) =>
  z
    .object({
      name: z
        .string()
        .min(1, "Bucket name is required")
        .max(255, "Maximum 255 characters allowed"),
      description: z.string().optional().or(z.literal("")),
      storage_type: z.enum(["azure", "local", "s3", "gcp"], {
        error: "Storage type is required",
      }),
      // Azure
      azure_account: z.string().optional().or(z.literal("")),
      azure_container: z.string().optional().or(z.literal("")),
      azure_sas_token: z.string().optional().or(z.literal("")),
      azure_url: z.string().optional().or(z.literal("")),
      // Amazon S3
      s3_bucket: z.string().optional().or(z.literal("")),
      s3_region: z.string().optional().or(z.literal("")),
      s3_access_key_id: z.string().optional().or(z.literal("")),
      s3_secret_access_key: z.string().optional().or(z.literal("")),
      // GCP
      gcs_bucket: z.string().optional().or(z.literal("")),
      gcs_project_id: z.string().optional().or(z.literal("")),
      gcs_service_account_key: z.string().optional().or(z.literal("")),
    })
    .superRefine((data, ctx) => {
      if (data.storage_type === "azure") {
        if (!data.azure_account || data.azure_account.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["azure_account"], message: "Storage account is required for Azure" });
        }
        if (!data.azure_container || data.azure_container.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["azure_container"], message: "Container name is required for Azure" });
        }
        if (!data.azure_url || data.azure_url.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["azure_url"], message: "Container URL is required for Azure" });
        } else {
          try { new URL(data.azure_url); } catch {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["azure_url"], message: "Please enter a valid URL" });
          }
        }
        if (!isEdit && (!data.azure_sas_token || data.azure_sas_token.trim() === "")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["azure_sas_token"], message: "SAS token is required for Azure" });
        }
      }
      if (data.storage_type === "s3") {
        if (!data.s3_bucket || data.s3_bucket.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["s3_bucket"], message: "Bucket name is required for Amazon S3" });
        }
        if (!data.s3_region || data.s3_region.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["s3_region"], message: "AWS region is required for Amazon S3" });
        }
        if (!data.s3_access_key_id || data.s3_access_key_id.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["s3_access_key_id"], message: "Access Key ID is required for Amazon S3" });
        }
        if (!isEdit && (!data.s3_secret_access_key || data.s3_secret_access_key.trim() === "")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["s3_secret_access_key"], message: "Secret Access Key is required for Amazon S3" });
        }
      }
      if (data.storage_type === "gcp") {
        if (!data.gcs_bucket || data.gcs_bucket.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gcs_bucket"], message: "Bucket name is required for GCP" });
        }
        if (!data.gcs_project_id || data.gcs_project_id.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gcs_project_id"], message: "Project ID is required for GCP" });
        }
        if (!isEdit && (!data.gcs_service_account_key || data.gcs_service_account_key.trim() === "")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gcs_service_account_key"], message: "Service Account Key JSON is required for GCP" });
        }
      }
    });

type BucketFormData = z.infer<ReturnType<typeof getBucketSchema>>;

const BucketFormModal = ({ isOpen, onClose, onSuccess, bucket }: BucketFormProps) => {
  const isEdit = !!bucket;
  const [saving, setSaving] = useState(false);

  const bucketSchema = getBucketSchema(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<BucketFormData>({
    resolver: zodResolver(bucketSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      storage_type: "azure",
      azure_account: "",
      azure_container: "",
      azure_sas_token: "",
      azure_url: "",
      s3_bucket: "",
      s3_region: "",
      s3_access_key_id: "",
      s3_secret_access_key: "",
      gcs_bucket: "",
      gcs_project_id: "",
      gcs_service_account_key: "",
    },
  });

  const storageTypeValue = watch("storage_type");

  useEffect(() => {
    if (isOpen) {
      if (bucket) {
        reset({
          name: bucket.name,
          description: bucket.description || "",
          storage_type: bucket.storage_type,
          azure_account: bucket.azure_account || "",
          azure_container: bucket.azure_container || "",
          azure_sas_token: "",
          azure_url: bucket.azure_url || "",
          s3_bucket: bucket.s3_bucket || "",
          s3_region: bucket.s3_region || "",
          s3_access_key_id: bucket.s3_access_key_id || "",
          s3_secret_access_key: "",
          gcs_bucket: bucket.gcs_bucket || "",
          gcs_project_id: bucket.gcs_project_id || "",
          gcs_service_account_key: "",
        });
      } else {
        reset({
          name: "",
          description: "",
          storage_type: "azure",
          azure_account: "",
          azure_container: "",
          azure_sas_token: "",
          azure_url: "",
          s3_bucket: "",
          s3_region: "",
          s3_access_key_id: "",
          s3_secret_access_key: "",
          gcs_bucket: "",
          gcs_project_id: "",
          gcs_service_account_key: "",
        });
      }
      clearErrors();
    }
  }, [bucket, isOpen, reset, clearErrors]);

  const handleSubmitForm = async (data: BucketFormData) => {
    setSaving(true);
    try {
      if (isEdit && bucket) {
        const payload = { ...data };
        // Don't send blank secrets on edit (means "don't change")
        if (!payload.azure_sas_token) delete payload.azure_sas_token;
        if (!payload.s3_secret_access_key) delete payload.s3_secret_access_key;
        if (!payload.gcs_service_account_key) delete payload.gcs_service_account_key;
        await storageBucketService.update(bucket.id, payload as any);
        showToast.success("Bucket updated successfully");
      } else {
        await storageBucketService.create(data as any);
        showToast.success("Bucket created successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || "Failed to save bucket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Storage Bucket" : "Create Storage Bucket"}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        {/* Name */}
        <FormField
          label="Bucket Name"
          required
          placeholder="e.g. QAssure Primary Storage"
          error={errors.name?.message}
          {...register("name")}
        />

        {/* Description */}
        <FormTextArea
          label="Description"
          rows={2}
          placeholder="Optional description"
          error={errors.description?.message}
          {...register("description")}
        />

        {/* Storage Type */}
        <FormSelect
          label="Storage Type"
          required
          placeholder="Select Storage Type"
          options={[
            { value: "azure", label: "Azure Blob Storage" },
            { value: "s3",    label: "Amazon S3" },
            { value: "gcp",   label: "Google Cloud Storage (GCS)" },
            { value: "local", label: "Local Filesystem" },
          ]}
          value={storageTypeValue}
          onValueChange={(val) => setValue("storage_type", val as "azure" | "local" | "s3" | "gcp", { shouldValidate: true })}
          error={errors.storage_type?.message}
        />

        {/* Azure Fields */}
        {storageTypeValue === "azure" && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Azure Blob Storage Configuration
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Storage Account"
                required
                placeholder="e.g. mystoraccount"
                error={errors.azure_account?.message}
                {...register("azure_account")}
              />
              <FormField
                label="Container Name"
                required
                placeholder="e.g. qassure-files"
                error={errors.azure_container?.message}
                {...register("azure_container")}
              />
            </div>

            <FormField
              label="Container URL"
              required
              type="url"
              placeholder="https://myaccount.blob.core.windows.net/mycontainer"
              error={errors.azure_url?.message}
              {...register("azure_url")}
            />

            <FormField
              label={`SAS Token${isEdit ? " (leave blank to keep existing)" : ""}`}
              type="password"
              required={!isEdit}
              placeholder={isEdit ? "••••••••••••••••" : "sp=racwdli&st=..."}
              error={errors.azure_sas_token?.message}
              helperText="Stored encrypted (AES-256-GCM). Never shown again in plaintext."
              {...register("azure_sas_token")}
            />
          </div>
        )}

        {/* Amazon S3 Fields */}
        {storageTypeValue === "s3" && (
          <div className="space-y-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
              Amazon S3 Configuration
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Bucket Name"
                required
                placeholder="e.g. qassure-prod-files"
                error={errors.s3_bucket?.message}
                {...register("s3_bucket")}
              />
              <FormField
                label="AWS Region"
                required
                placeholder="e.g. us-east-1"
                error={errors.s3_region?.message}
                {...register("s3_region")}
              />
            </div>

            <FormField
              label="Access Key ID"
              required
              placeholder="e.g. AKIAIOSFODNN7EXAMPLE"
              error={errors.s3_access_key_id?.message}
              {...register("s3_access_key_id")}
            />

            <FormField
              label={`Secret Access Key${isEdit ? " (leave blank to keep existing)" : ""}`}
              type="password"
              required={!isEdit}
              placeholder={isEdit ? "••••••••••••••••" : "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}
              error={errors.s3_secret_access_key?.message}
              helperText="Stored encrypted (AES-256-GCM). Never shown again in plaintext."
              {...register("s3_secret_access_key")}
            />
          </div>
        )}

        {/* GCP Cloud Storage Fields */}
        {storageTypeValue === "gcp" && (
          <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">
              Google Cloud Storage Configuration
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="GCS Bucket Name"
                required
                placeholder="e.g. qassure-gcs-files"
                error={errors.gcs_bucket?.message}
                {...register("gcs_bucket")}
              />
              <FormField
                label="GCP Project ID"
                required
                placeholder="e.g. my-gcp-project-123"
                error={errors.gcs_project_id?.message}
                {...register("gcs_project_id")}
              />
            </div>

            <FormField
              label={`Service Account Key JSON${isEdit ? " (leave blank to keep existing)" : ""}`}
              type="password"
              required={!isEdit}
              placeholder={isEdit ? "••••••••••••••••" : "{\"type\": \"service_account\", ...}"}
              error={errors.gcs_service_account_key?.message}
              helperText="Paste the full service account JSON key. Stored encrypted (AES-256-GCM)."
              {...register("gcs_service_account_key")}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Bucket" : "Create Bucket"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Assign Bucket Modal
// ─────────────────────────────────────────────
interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bucket: StorageBucket | null;
  mode: "assign" | "assign-self";
}

const AssignBucketModal = ({ isOpen, onClose, onSuccess, bucket, mode }: AssignModalProps) => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      tenantService.getAll(1, 200).then((res: any) => {
        setTenants(res.tenants || res.data || []);
      }).catch(() => {});
      setSelectedTenantId("");
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!bucket || !selectedTenantId) return;
    setSaving(true);
    try {
      if (mode === "assign-self") {
        await storageBucketService.assignSelfBucket(bucket.id, selectedTenantId);
        showToast.success("Your bucket has been shared with the selected tenant");
      } else {
        await storageBucketService.assignToTenant(bucket.id, selectedTenantId);
        showToast.success("Bucket assigned to tenant successfully");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || "Failed to assign bucket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "assign-self" ? "Share My Bucket with Tenant" : "Assign Bucket to Tenant"}
      maxWidth="md"
    >
      <div className="space-y-4">
        {mode === "assign-self" && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Share2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              You are sharing <strong>{bucket?.name}</strong> (your QAssure bucket) with a tenant.
              Tenant files will be uploaded to YOUR storage account. You can reassign anytime.
            </p>
          </div>
        )}

        <FormSelect
          label="Select Tenant"
          required
          placeholder="Select a tenant"
          options={tenants.map((t) => ({
            value: t.id,
            label: `${t.name} ${t.slug ? `(${t.slug})` : ""}`,
          }))}
          value={selectedTenantId}
          onValueChange={(val) => setSelectedTenantId(val)}
        />

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <PrimaryButton onClick={handleAssign} disabled={!selectedTenantId || saving}>
            {saving ? "Assigning..." : mode === "assign-self" ? "Share My Bucket" : "Assign Bucket"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
};



// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
const StorageBucketsPage = () => {
  const [buckets, setBuckets] = useState<StorageBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<StorageBucket | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"assign" | "assign-self">("assign");

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);

  const handleViewDetails = (bucket: StorageBucket) => {
    setSelectedBucketId(bucket.id);
    setViewMode("detail");
  };

  const fetchBuckets = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await storageBucketService.list();
      setBuckets(data);
    } catch {
      showToast.error("Failed to load storage buckets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  const handleEdit = (bucket: StorageBucket) => {
    setSelectedBucket(bucket);
    setFormOpen(true);
  };

  const handleDelete = (bucket: StorageBucket) => {
    setSelectedBucket(bucket);
    setDeleteOpen(true);
  };

  const handleAssign = (bucket: StorageBucket, mode: "assign" | "assign-self") => {
    setSelectedBucket(bucket);
    setAssignMode(mode);
    setAssignOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBucket) return;
    setIsDeleting(true);
    try {
      await storageBucketService.delete(selectedBucket.id);
      showToast.success("Bucket deactivated");
      setDeleteOpen(false);
      fetchBuckets();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || "Failed to delete bucket");
    } finally {
      setIsDeleting(false);
    }
  };

  const paged = buckets.slice((currentPage - 1) * limit, currentPage * limit);

  const columns: Column<StorageBucket>[] = [
    {
      key: "name",
      label: "Bucket Name",
      render: (b) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CloudUpload className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900">{b.name}</p>
            {b.description && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{b.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "storage_type",
      label: "Type",
      render: (b) => {
        const typeMap: Record<string, { label: string; color: string }> = {
          azure: { label: "Azure Blob",  color: "bg-blue-50 text-blue-700 border-blue-200" },
          s3:    { label: "Amazon S3",   color: "bg-orange-50 text-orange-700 border-orange-200" },
          gcp:   { label: "GCS",         color: "bg-green-50 text-green-700 border-green-200" },
          local: { label: "Local FS",    color: "bg-gray-100 text-gray-700 border-gray-200" },
        };
        const t = typeMap[b.storage_type] ?? { label: b.storage_type, color: "bg-gray-100 text-gray-700 border-gray-200" };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${t.color}`}>
            <Database className="w-3 h-3" />
            {t.label}
          </span>
        );
      },
    },
    {
      key: "azure_account",
      label: "Account / Container",
      render: (b) => {
        if (b.storage_type === "azure") {
          return (
            <div className="text-sm">
              <p className="font-mono text-gray-800">{b.azure_account}</p>
              <p className="text-xs text-gray-500 font-mono">{b.azure_container}</p>
            </div>
          );
        }
        if (b.storage_type === "s3") {
          return (
            <div className="text-sm">
              <p className="font-mono text-gray-800">{b.s3_bucket}</p>
              <p className="text-xs text-gray-500 font-mono">{b.s3_region}</p>
            </div>
          );
        }
        if (b.storage_type === "gcp") {
          return (
            <div className="text-sm">
              <p className="font-mono text-gray-800">{b.gcs_bucket}</p>
              <p className="text-xs text-gray-500 font-mono">{b.gcs_project_id}</p>
            </div>
          );
        }
        return <span className="text-gray-400 text-sm italic">Local filesystem</span>;
      },
    },
    {
      key: "assigned_tenants_count",
      label: "Assigned To",
      render: (b) => (
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <span>{b.assigned_tenants_count ?? 0} tenant{(b.assigned_tenants_count ?? 0) !== 1 ? "s" : ""}</span>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (b) => (
        <StatusBadge variant={b.is_active ? "success" : "failure"}>
          {b.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (b) => {
        const dropdownActions = [
          {
            label: "View Details",
            icon: <Eye className="w-3.5 h-3.5" />,
            onClick: () => handleViewDetails(b),
          },
          {
            label: "Edit",
            icon: <Edit className="w-3.5 h-3.5" />,
            onClick: () => handleEdit(b),
          },
          {
            label: "Delete",
            icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
            onClick: () => handleDelete(b),
            variant: "danger" as const,
          },
          {
            label: "Assign to Tenant",
            icon: <Building2 className="w-3.5 h-3.5" />,
            onClick: () => handleAssign(b, "assign"),
          },
        ];
        return <ActionDropdown actions={dropdownActions} />;
      },
    },
  ];

  if (viewMode === "detail" && selectedBucketId) {
    return (
      <StorageBucketDetail
        bucketId={selectedBucketId}
        onBack={() => {
          setViewMode("list");
          setSelectedBucketId(null);
        }}
        onRefreshList={fetchBuckets}
      />
    );
  }

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "Storage Buckets",
        description:
          "Manage cloud storage bucket configurations for the platform. Assign buckets to tenants to enable file uploads.",
        action: (
          <PrimaryButton
            id="create-bucket-btn"
            onClick={() => {
              setSelectedBucket(null);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bucket
          </PrimaryButton>
        ),
      }}
    >
      {/* Info banner */}
      <div className="mb-4 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Tenant File Uploads</p>
          <p>
            Each tenant must have an active bucket assigned before they can upload files.
            You can assign your own QAssure bucket to a tenant using <strong>"Share My Bucket"</strong>,
            or assign any bucket via <strong>"Assign to Tenant"</strong>.
            Changing a bucket does <em>not</em> affect previously uploaded files.
          </p>
        </div>
      </div>

      <div className="overflow-hidden">
        <DataTable
          columns={columns}
          data={paged}
          isLoading={isLoading}
          keyExtractor={(item) => item.id}
          emptyMessage="No storage buckets configured yet"
        />

        {buckets.length > limit && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(buckets.length / limit)}
            totalItems={buckets.length}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={setLimit}
          />
        )}
      </div>

      {/* Bucket Create/Edit */}
      <BucketFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchBuckets}
        bucket={selectedBucket}
      />

      {/* Assign Modal */}
      <AssignBucketModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSuccess={fetchBuckets}
        bucket={selectedBucket}
        mode={assignMode}
      />

      {/* Delete Confirm */}
      <DeleteConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Deactivate Storage Bucket"
        message="Are you sure you want to deactivate this bucket? It cannot be deleted while assigned to active tenants."
        itemName={selectedBucket?.name || ""}
        isLoading={isDeleting}
      />

    </Layout>
  );
};

export default StorageBucketsPage;
