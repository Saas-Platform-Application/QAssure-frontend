import { useEffect, useState, type ReactElement } from "react";
import {
  Database,
  ShieldCheck,
  Building2,
  Package,
  Pencil,
  HardDrive,
  Files,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import fileAttachmentService, {
  type StorageStats,
  type StorageQuota,
} from "@/services/file-attachment-service";
import {
  Modal,
  FormField,
  PrimaryButton,
  GradientStatCard,
  // SecondaryButton,
} from "@/components/shared";
import { useAppTheme } from "@/hooks/useAppTheme";
import { showToast } from "@/utils/toast";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes: number | string): string {
  const b = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (!b || b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

interface QuotaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: StorageQuota;
  onUpdated: () => void;
}

const QuotaEditModal = ({
  isOpen,
  onClose,
  quota,
  onUpdated,
}: QuotaEditModalProps) => {
  const [maxStorageGB, setMaxStorageGB] = useState(
    Math.floor(
      (typeof quota.max_storage_bytes === "string"
        ? parseInt(quota.max_storage_bytes)
        : quota.max_storage_bytes) /
        1024 /
        1024 /
        1024,
    ),
  );
  const [maxFileMB, setMaxFileMB] = useState(
    Math.floor(quota.max_file_size_bytes / 1024 / 1024),
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    setIsUpdating(true);
    try {
      await fileAttachmentService.updateQuota({
        max_storage_bytes: maxStorageGB * 1024 * 1024 * 1024,
        max_file_size_bytes: maxFileMB * 1024 * 1024,
      });
      onUpdated();
      onClose();
      showToast.success("Quota updated successfully");
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to update quota",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Storage Quota"
      maxWidth="sm"
      footer={
        <>
          {/* <SecondaryButton onClick={onClose} disabled={isUpdating}>Cancel</SecondaryButton> */}
          <PrimaryButton
            onClick={handleSubmit}
            disabled={isUpdating}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </PrimaryButton>
        </>
      }
    >
      {/* <div > */}
      <FormField
        label="Max Total Storage (GB)"
        type="number"
        value={maxStorageGB}
        onChange={(e) => setMaxStorageGB(parseInt(e.target.value) || 1)}
        placeholder="e.g. 10 for 10GB"
      />
      <FormField
        label="Max Per-File Size (MB)"
        type="number"
        value={maxFileMB}
        onChange={(e) => setMaxFileMB(parseInt(e.target.value) || 1)}
        placeholder="e.g. 50 for 50MB"
      />
      {/* </div> */}
    </Modal>
  );
};

const StorageDashboard = (): ReactElement => {
  const { primaryColor } = useAppTheme();

  const [activeTab, setActiveTab] = useState<"stats" | "quota" | "cleanup">(
    "stats",
  );
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Storage Cleanup (purgeSoftDeletedBlobs) states
  const [olderThanHours, setOlderThanHours] = useState(24);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<number | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handlePurge = async () => {
    setIsConfirmModalOpen(false);
    setIsPurging(true);
    setPurgeResult(null);
    setPurgeError(null);
    try {
      const res =
        await fileAttachmentService.purgeSoftDeletedBlobs(olderThanHours);
      if (res.success) {
        setPurgeResult(res.data.purged);
        // Refresh usage stats and quota following successful purge
        await loadData();
      } else {
        setPurgeError("Failed to execute purge on the storage provider.");
      }
    } catch (err: any) {
      setPurgeError(
        err?.response?.data?.error?.message ||
          "Failed to purge unreferenced files.",
      );
      console.error("Purge error:", err);
    } finally {
      setIsPurging(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, quotaRes] = await Promise.all([
        fileAttachmentService.getStorageStats(),
        fileAttachmentService.getQuota(),
      ]);
      console.log(quotaRes.data);

      setStats(statsRes.data);
      setQuota(quotaRes.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || "Failed to load dashboard data",
      );
      console.log("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <Layout
        currentPage="Storage Dashboard"
        // breadcrumbs={[{ label: "File Attachments" }, { label: "Storage Dashboard" }]}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: primaryColor }}
          />
        </div>
      </Layout>
    );
  }

  if (error || !stats || !quota) {
    return (
      <Layout
        currentPage="Storage Dashboard"
        // breadcrumbs={[{ label: "File Attachments" }, { label: "Storage Dashboard" }]}
      >
        <div className="max-w-md mx-auto mt-20 text-center">
          {/* <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /> */}
          {/* <h2 className="text-lg font-bold">Error</h2> */}
          <p className="text-sm text-red-500 mt-1">{error}</p>
          {/* <PrimaryButton onClick={loadData} className="mt-4">Retry</PrimaryButton> */}
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Storage Dashboard"
      pageHeader={{
        title: "Storage Dashboard",
        description:
          "Overview of storage consumption, file counts, and quota limits.",
      }}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-[rgba(0,0,0,0.08)]">
          <button
            onClick={() => setActiveTab("stats")}
            className={cn(
              "px-6 py-3 text-sm font-bold transition-all border-b-2",
              activeTab === "stats"
                ? "text-[#0e1b2a]"
                : "border-transparent text-[#9aa6b2] hover:text-[#475569]",
            )}
            style={
              activeTab === "stats"
                ? { borderBottomColor: primaryColor, color: primaryColor }
                : {}
            }
          >
            Usage Statistics
          </button>
          <button
            onClick={() => setActiveTab("quota")}
            className={cn(
              "px-6 py-3 text-sm font-bold transition-all border-b-2",
              activeTab === "quota"
                ? "text-[#0e1b2a]"
                : "border-transparent text-[#9aa6b2] hover:text-[#475569]",
            )}
            style={
              activeTab === "quota"
                ? { borderBottomColor: primaryColor, color: primaryColor }
                : {}
            }
          >
            Quota Details
          </button>
          <button
            onClick={() => setActiveTab("cleanup")}
            className={cn(
              "px-6 py-3 text-sm font-bold transition-all border-b-2",
              activeTab === "cleanup"
                ? "text-[#0e1b2a]"
                : "border-transparent text-[#9aa6b2] hover:text-[#475569]",
            )}
            style={
              activeTab === "cleanup"
                ? { borderBottomColor: primaryColor, color: primaryColor }
                : {}
            }
          >
            Storage Cleanup
          </button>
        </div>

        {activeTab === "stats" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <GradientStatCard
                icon={HardDrive}
                value={`${stats.quota.usage_percent}%`}
                label="Storage Usage"
                badge={{ text: "Capacity", variant: "info" }}
              />
              <GradientStatCard
                icon={Files}
                value={stats.files.total}
                label="Total Files"
              />
              <GradientStatCard
                icon={ImageIcon}
                value={stats.files.images}
                label="Images"
              />
              <GradientStatCard
                icon={FileText}
                value={stats.files.pdfs + stats.files.documents}
                label="DOCs / PDFs"
              />
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entity Table */}
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-2">
                  <Building2
                    className="w-4 h-4"
                    style={{ color: primaryColor }}
                  />
                  <h3 className="text-sm font-bold text-[#0e1b2a]">
                    By Entity Type
                  </h3>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-bold text-[#9aa6b2] uppercase">
                      <th className="px-5 py-3">Entity</th>
                      <th className="px-5 py-3">File Count</th>
                      <th className="px-5 py-3">Total Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
                    {Object.entries(stats.by_entity).map(([name, data]) => (
                      <tr
                        key={name}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-bold text-[#0e1b2a] capitalize">
                          {name}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#475569]">
                          {data.count}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#0e1b2a] font-medium">
                          {formatBytes(data.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Module Table */}
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#10b981]" />
                  <h3 className="text-sm font-bold text-[#0e1b2a]">
                    By Source Module
                  </h3>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-bold text-[#9aa6b2] uppercase">
                      <th className="px-5 py-3">Module</th>
                      <th className="px-5 py-3">File Count</th>
                      <th className="px-5 py-3">Total Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
                    {Object.entries(stats.by_module).map(([name, data]) => (
                      <tr
                        key={name}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-bold text-[#0e1b2a] capitalize">
                          {name}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#475569]">
                          {data.count}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#0e1b2a] font-medium">
                          {formatBytes(data.size)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "quota" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database
                    className="w-5 h-5"
                    style={{ color: primaryColor }}
                  />
                  <h3 className="text-base font-black text-[#0e1b2a]">
                    Quota Profile
                  </h3>
                </div>
                <PrimaryButton
                  onClick={() => setIsEditModalOpen(true)}
                  size="default"
                  className="px-4 py-2.5 text-sm"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Quota
                </PrimaryButton>
              </div>
              <div className="p-0">
                <table className="w-full">
                  <tbody className="divide-y divide-[rgba(0,0,0,0.04)]">
                    {[
                      {
                        label: "Max Total Storage",
                        value:
                          quota.max_storage_formatted ||
                          formatBytes(quota.max_storage_bytes),
                        icon: HardDrive,
                      },
                      {
                        label: "Max Per-File Size",
                        value:
                          quota.max_file_size_formatted ||
                          formatBytes(quota.max_file_size_bytes),
                        icon: FileText,
                      },
                      {
                        label: "Currently Used",
                        value:
                          quota.used_storage_formatted ||
                          formatBytes(quota.used_storage_bytes),
                        icon: Save,
                      },
                      {
                        label: "File Count",
                        value: `${quota.file_count} items`,
                        icon: Files,
                      },
                      {
                        label: "Last Updated",
                        value: new Date(quota.updated_at).toLocaleString(),
                        icon: CheckCircle2,
                      },
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="px-6 py-4 flex items-center gap-3 w-1/3">
                          <row.icon className="w-4 h-4 text-[#9aa6b2]" />
                          <span className="text-sm font-medium text-[#475569]">
                            {row.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#0e1b2a]">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="p-6 border rounded-2xl flex items-start gap-4"
              style={{
                backgroundColor: `${primaryColor}05`,
                borderColor: `${primaryColor}10`,
              }}
            >
              <ShieldCheck
                className="w-6 h-6 shrink-0"
                style={{ color: primaryColor }}
              />
              <div>
                <h4 className="text-sm font-bold text-[#0e1b2a]">
                  System Security Policy
                </h4>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                  The following extensions are strictly blocked to prevent
                  malicious execution:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {quota.blocked_extensions?.map((ext) => (
                    <span
                      key={ext}
                      className="px-2 py-0.5 bg-red-100/50 text-red-700 text-[10px] font-black rounded border border-red-200 uppercase"
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cleanup" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[rgba(0,0,0,0.08)] flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-black text-[#0e1b2a]">
                  Storage Maintenance & Cleanup
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="max-w-2xl">
                  <p className="text-sm text-[#475569] leading-relaxed">
                    When files are deleted, the system decrements their
                    reference counts. Files marked as{" "}
                    <strong>soft-deleted with 0 active references</strong> are
                    preserved temporarily on the storage provider to allow
                    background services (like AI embeddings, audits, or indexes)
                    to finish processing them.
                  </p>
                  <p className="text-sm text-[#475569] mt-3 leading-relaxed">
                    Use this administrative tool to permanently purge these
                    unreferenced physical files from the storage provider and
                    reclaim space.
                  </p>
                </div>

                <div className="border border-red-100 rounded-xl p-5 bg-red-50/30 max-w-2xl flex gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">
                      Warning: Permanent Action
                    </h4>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      Purging files is irreversible. Once deleted from the
                      physical storage provider (local disk, Azure, or AWS), the
                      file binaries cannot be recovered.
                    </p>
                  </div>
                </div>

                <div className="max-w-md pt-2 space-y-4">
                  <FormField
                    label="Purge Files Older Than (Hours)"
                    type="number"
                    value={olderThanHours}
                    onChange={(e) =>
                      setOlderThanHours(
                        Math.max(0, parseInt(e.target.value) || 0),
                      )
                    }
                    placeholder="e.g. 24 (0 = purge all eligible immediately)"
                  />
                  <span className="text-[11px] text-[#9aa6b2] block -mt-2">
                    Set to 0 to instantly purge all unreferenced soft-deleted
                    blobs, or specify hours (e.g., 24) to keep files deleted
                    within that timeframe.
                  </span>

                  {purgeResult !== null && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-green-600 shrink-0" />
                      <span>
                        Successfully purged <strong>{purgeResult}</strong>{" "}
                        orphaned file binary/binaries, freeing up storage space!
                      </span>
                    </div>
                  )}

                  {purgeError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                      {purgeError}
                    </div>
                  )}

                  <div className="pt-2">
                    <PrimaryButton
                      onClick={() => setIsConfirmModalOpen(true)}
                      disabled={isPurging}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 border-red-600 shadow-sm"
                    >
                      {isPurging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Purge Unreferenced Files
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isConfirmModalOpen && (
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Storage Purge"
          maxWidth="sm"
          footer={
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isPurging}
                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={isPurging}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isPurging && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Purge Permanently
              </button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-gray-900">
                Are you absolutely sure?
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                This will permanently delete all unreferenced physical file
                binaries older than <strong>{olderThanHours} hours</strong> from
                your storage provider. This action is irreversible.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {isEditModalOpen && (
        <QuotaEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          quota={quota}
          onUpdated={loadData}
        />
      )}
    </Layout>
  );
};

export default StorageDashboard;
