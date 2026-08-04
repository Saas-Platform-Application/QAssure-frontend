import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  StatusBadge,
  PrimaryButton,
  DeleteConfirmationModal,
} from "@/components/shared";
import {
  ArrowLeft,
  Database,
  Users,
} from "lucide-react";
import {
  storageBucketService,
  type StorageBucket,
} from "@/services/storage-bucket-service";
import {
  getStorageTypeBadgeClass,
  getStorageTypeLabel,
} from "@/constants/storage";
import { showToast } from "@/utils/toast";

interface StorageBucketDetailProps {
  bucketId: string;
  onBack: () => void;
  onRefreshList: () => void;
}

interface ConnectionParam {
  label: string;
  value: string;
  /** Masked secrets render greyed out and are not selectable. */
  masked?: boolean;
}

/**
 * Describe a bucket's provider-specific connection settings for display.
 * Secrets are already masked by the API — this never sees a plaintext value.
 */
const buildConnectionParams = (bucket: StorageBucket): ConnectionParam[] => {
  const params: ConnectionParam[] = [];
  const push = (label: string, value?: string | null, masked = false) => {
    if (value) params.push({ label, value, masked });
  };

  switch (bucket.storage_type) {
    case "azure":
      push("Storage Account", bucket.azure_account);
      push("Container Name", bucket.azure_container);
      push("Container URL", bucket.azure_url);
      push("SAS Token (Masked)", bucket.azure_sas_token_masked, true);
      break;
    case "s3":
      push("Bucket Name", bucket.s3_bucket);
      push("AWS Region", bucket.s3_region);
      push("Access Key ID", bucket.s3_access_key_id);
      push("Secret Access Key (Masked)", bucket.s3_secret_access_key_masked, true);
      break;
    case "gcp":
      push("GCS Bucket Name", bucket.gcs_bucket);
      push("GCP Project ID", bucket.gcs_project_id);
      push("Service Account Key (Masked)", bucket.gcs_service_account_key_masked, true);
      break;
    case "e2e":
      push("Bucket Name", bucket.e2e_bucket);
      push("S3 Endpoint", bucket.e2e_endpoint);
      push("Signing Region", bucket.e2e_region);
      push("Access Key", bucket.e2e_access_key);
      push("Secret Key (Masked)", bucket.e2e_secret_key_masked, true);
      push(
        "Addressing Style",
        bucket.e2e_force_path_style === false
          ? "DNS-style (bucket.endpoint/key)"
          : "Path-style (endpoint/bucket/key)",
      );
      break;
    default:
      break;
  }

  return params;
};

export const StorageBucketDetail = ({
  bucketId,
  onBack,
  onRefreshList,
}: StorageBucketDetailProps) => {
  const [bucket, setBucket] = useState<StorageBucket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [tenantToUnassign, setTenantToUnassign] = useState<{ id: string; name: string } | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const fetchBucketDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const full = await storageBucketService.getById(bucketId);
      setBucket(full);
    } catch {
      showToast.error("Failed to load bucket details");
      onBack();
    } finally {
      setIsLoading(false);
    }
  }, [bucketId, onBack]);

  useEffect(() => {
    fetchBucketDetail();
  }, [fetchBucketDetail]);

  const handleUnassignClick = (tenantId: string, tenantName: string) => {
    setTenantToUnassign({ id: tenantId, name: tenantName });
    setUnassignConfirmOpen(true);
  };

  const confirmUnassign = async () => {
    if (!tenantToUnassign) return;
    setIsUnassigning(true);
    try {
      await storageBucketService.unassignFromTenant(tenantToUnassign.id);
      showToast.success(`Successfully unassigned from tenant ${tenantToUnassign.name}`);
      setUnassignConfirmOpen(false);
      setTenantToUnassign(null);
      fetchBucketDetail();
      onRefreshList();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || "Failed to unassign tenant");
    } finally {
      setIsUnassigning(false);
    }
  };

  if (isLoading) {
    return (
      <Layout
        currentPage="Settings"
        breadcrumbs={[
          { label: "Settings" },
          { label: "Storage Buckets", path: "/settings/storage-buckets" },
          { label: "Bucket Details" },
        ]}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">Loading bucket details...</span>
        </div>
      </Layout>
    );
  }

  if (!bucket) {
    return (
      <Layout
        currentPage="Settings"
        breadcrumbs={[
          { label: "Settings" },
          { label: "Storage Buckets", path: "/settings/storage-buckets" },
          { label: "Bucket Details" },
        ]}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 bg-white rounded-lg border border-gray-200 p-6">
          <span className="text-sm text-red-500 font-medium">Bucket not found</span>
          <PrimaryButton onClick={onBack}>Back to List</PrimaryButton>
        </div>
      </Layout>
    );
  }

  const connectionParams = buildConnectionParams(bucket);

  return (
    <Layout
      currentPage="Settings"
      breadcrumbs={[
        { label: "Settings" },
        { label: "Storage Buckets", path: "/settings/storage-buckets" },
        { label: "Bucket Details" },
      ]}
      pageHeader={{
        title: bucket.name,
        description: bucket.description || "Detailed configuration and tenant assignments for this storage bucket.",
        action: (
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#112868] transition-colors hover:bg-[#F9FAFB]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to List</span>
          </button>
        ),
      }}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config Card */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-150 pb-3 mb-4">
                General Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Bucket Name</span>
                  <span className="font-semibold text-gray-900 text-base">{bucket.name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Storage Type</span>
                  <span
                    className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStorageTypeBadgeClass(bucket.storage_type)}`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    {getStorageTypeLabel(bucket.storage_type)}
                  </span>
                </div>
                {bucket.description && (
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Description</span>
                    <span className="text-gray-700 block mt-1 leading-relaxed">{bucket.description}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Status</span>
                  <span className="inline-block mt-1">
                    <StatusBadge variant={bucket.is_active ? "success" : "failure"}>
                      {bucket.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase tracking-wider font-semibold">Created At</span>
                  <span className="text-gray-700 block mt-1 font-medium">
                    {new Date(bucket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Provider connection parameters */}
            {connectionParams.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-900 border-b border-gray-150 pb-3 mb-4">
                  {getStorageTypeLabel(bucket.storage_type)} Connection Parameters
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4 font-mono text-xs text-gray-800">
                  {connectionParams.map((param) => (
                    <div key={param.label}>
                      <span className="text-gray-500 block font-sans text-xs uppercase tracking-wider font-semibold mb-1">
                        {param.label}
                      </span>
                      <span
                        className={
                          param.masked
                            ? "bg-white border border-gray-200 px-3 py-1.5 rounded block font-mono text-gray-400 select-none"
                            : "bg-white border border-gray-200 px-3 py-1.5 rounded block truncate select-all font-semibold"
                        }
                        title={param.masked ? undefined : param.value}
                      >
                        {param.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignments Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col min-h-[300px]">
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-150 pb-3 mb-4 flex items-center justify-between">
              <span>Assigned Tenants</span>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {bucket.assigned_tenants?.length ?? 0}
              </span>
            </h3>

            {!bucket.assigned_tenants || bucket.assigned_tenants.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Users className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 font-medium">No tenants assigned to this bucket</p>
                <p className="text-xs text-gray-400 mt-1">Assign this bucket to a tenant from the main list page actions.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
                <div className="overflow-y-auto max-h-[400px]">
                  <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-4 py-3">Tenant Name</th>
                        <th className="px-4 py-3">Assigned At</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {bucket.assigned_tenants.map((t) => (
                        <tr key={t.tenant_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{t.tenant_name}</div>
                            {t.notes && (
                              <div className="text-xs text-gray-400 italic mt-0.5 max-w-[180px] truncate" title={t.notes}>
                                {t.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(t.assigned_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleUnassignClick(t.tenant_id, t.tenant_name)}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold transition-colors cursor-pointer"
                            >
                              Unassign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete/Unassign Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={unassignConfirmOpen}
        onClose={() => {
          setUnassignConfirmOpen(false);
          setTenantToUnassign(null);
        }}
        onConfirm={confirmUnassign}
        title="Unassign Storage Bucket"
        message="Are you sure you want to unassign this bucket from tenant"
        itemName={tenantToUnassign?.name || ""}
        isLoading={isUnassigning}
      />
    </Layout>
  );
};
