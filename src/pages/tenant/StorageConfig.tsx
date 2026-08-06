import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAppSelector } from "@/hooks/redux-hooks";
import {
  storageBucketService,
  type StorageBucket,
} from "@/services/storage-bucket-service";
import {
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  Database,
  Server,
  Container,
  Globe,
  RefreshCw,
  KeyRound,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getStorageTypeBadgeClass,
  getStorageTypeLabel,
} from "@/constants/storage";
import { showToast } from "@/utils/toast";

interface BucketRow {
  label: string;
  value?: string;
  icon?: LucideIcon;
  /** Secrets render greyed out with a "stored securely" note. */
  secret?: boolean;
}

/**
 * Read-only summary of the tenant's assigned bucket. Values come from the API
 * already masked, so no secret is ever available to render here.
 */
const buildBucketRows = (bucket: StorageBucket): BucketRow[] => {
  const rows: BucketRow[] = [];
  const push = (row: BucketRow) => {
    if (row.value || row.secret) rows.push(row);
  };

  switch (bucket.storage_type) {
    case "azure":
      push({ label: "Storage Account", value: bucket.azure_account, icon: Server });
      push({ label: "Container", value: bucket.azure_container, icon: Container });
      push({ label: "Endpoint URL", value: bucket.azure_url, icon: Globe });
      push({ label: "SAS Token", value: bucket.azure_sas_token_masked, secret: true });
      break;
    case "s3":
      push({ label: "Bucket", value: bucket.s3_bucket, icon: Container });
      push({ label: "Region", value: bucket.s3_region, icon: MapPin });
      push({ label: "Access Key ID", value: bucket.s3_access_key_id, icon: KeyRound });
      push({ label: "Secret Access Key", value: bucket.s3_secret_access_key_masked, secret: true });
      break;
    case "gcp":
      push({ label: "Bucket", value: bucket.gcs_bucket, icon: Container });
      push({ label: "Project ID", value: bucket.gcs_project_id, icon: Server });
      push({ label: "Service Account Key", value: bucket.gcs_service_account_key_masked, secret: true });
      break;
    case "e2e":
      push({ label: "Bucket", value: bucket.e2e_bucket, icon: Container });
      push({ label: "S3 Endpoint", value: bucket.e2e_endpoint, icon: Globe });
      push({ label: "Signing Region", value: bucket.e2e_region, icon: MapPin });
      push({ label: "Access Key", value: bucket.e2e_access_key, icon: KeyRound });
      push({ label: "Secret Key", value: bucket.e2e_secret_key_masked, secret: true });
      break;
    default:
      break;
  }

  return rows;
};

const StorageConfigPage = () => {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [bucket, setBucket] = useState<StorageBucket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBucket = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const data = await storageBucketService.getActiveForTenant(tenantId);
      setBucket(data);
    } catch {
      showToast.error("Failed to load storage configuration");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBucket();
  }, [tenantId]);

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "Storage Configuration",
        description: "View your current file storage bucket configuration.",
      }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-3" />
          <span className="text-gray-500">
            Loading storage configuration...
          </span>
        </div>
      ) : bucket ? (
        <>
          {/* Status banner */}
          <div className="flex items-start gap-3 p-4 mb-6 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">
                Storage bucket is configured
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                Your files are being stored in the assigned bucket. You can
                upload files normally.
              </p>
            </div>
          </div>

          {/* Bucket details card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <CloudUpload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base">
                  {bucket.name}
                </h3>
                {bucket.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bucket.description}
                  </p>
                )}
              </div>
              <span
                className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStorageTypeBadgeClass(bucket.storage_type)}`}
              >
                <Database className="w-3 h-3" />
                {getStorageTypeLabel(bucket.storage_type)}
              </span>
            </div>

            {bucket.storage_type === "local" ? (
              <div className="px-6 py-5 text-sm text-gray-600">
                Files are stored on the local server filesystem. Contact your
                administrator for path details.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {buildBucketRows(bucket).map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.label}
                      className={`flex items-center gap-3 px-6 py-4 ${row.secret ? "bg-gray-50" : ""}`}
                    >
                      {Icon ? (
                        <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">{row.label}</p>
                        {row.secret ? (
                          <p className="font-mono text-sm text-gray-400">
                            {row.value || "••••••••••••••••"}
                            <span className="ml-2 text-xs text-gray-400 font-sans">
                              (stored securely — not visible)
                            </span>
                          </p>
                        ) : (
                          <p className="font-mono text-sm text-gray-900 break-all">
                            {row.value}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Last updated: {new Date(bucket.updated_at).toLocaleString()}
          </p>
        </>
      ) : (
        /* No bucket configured */
        <div className="">
          <div className="flex flex-col items-center text-center py-16 px-8 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              No Storage Bucket Configured
            </h3>
            <p className="text-sm text-amber-700 mb-6 leading-relaxed">
              Your account does not have a storage bucket assigned yet. You will
              not be able to upload files until an administrator configures one
              for your tenant.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded-lg text-left">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700">
                  Contact your <strong>QAssure platform administrator</strong>{" "}
                  and request a storage bucket assignment.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded-lg text-left">
                <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-700">
                  The admin can assign the{" "}
                  <strong>QAssure shared bucket</strong> or set up a dedicated
                  bucket for your organization.
                </p>
              </div>
            </div>
            <button
              id="refresh-storage-config-btn"
              onClick={fetchBucket}
              className="mt-6 flex items-center gap-2 px-4 py-2 text-sm text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StorageConfigPage;
