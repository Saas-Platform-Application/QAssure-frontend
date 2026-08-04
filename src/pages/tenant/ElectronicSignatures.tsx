import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  Pagination,
  FilterDropdown,
  StatusBadge,
  SearchBox,
  type Column,
  PrimaryButton,
  Modal,
  FormField,
  GradientStatCard,
} from "@/components/shared";
import { ShieldCheck, History, Key, BarChart3, Info, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { electronicSignatureService } from "@/services/electronic-signature-service";
import { useAppTheme } from "@/hooks/useAppTheme";
import { showToast } from "@/utils/toast";
import { usePermissions } from "@/hooks/usePermissions";

export interface SignatureLog {
  id: string;
  signer: {
    id: string;
    email: string;
    name: string;
  };
  resource: {
    type: string;
    id: string;
    name: string | null;
  };
  action: string;
  meaning: string;
  auth_method: string;
  signed_at: string;
  is_valid: boolean;
  workflow?: {
    id: string;
    order: number;
    required: number;
  } | null;
  verification: {
    signature_hash: string;
    ip_address: string | null;
  };
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActionVariant = (action: string): "success" | "failure" | "info" | "process" => {
  const upper = action.toUpperCase();
  if (upper === "APPROVE" || upper === "RELEASE") return "success";
  if (upper === "REJECT" || upper === "WITHDRAW") return "failure";
  if (upper === "REVIEW" || upper === "ACKNOWLEDGE") return "process";
  return "info"; // AUTHOR, VERIFY
};

const pinUpdateSchema = z.object({
  password: z.string().min(1, "Password is required"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be between 4 and 6 digits"),
  confirmPin: z.string().min(1, "Confirm PIN is required"),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs do not match",
  path: ["confirmPin"],
});

type PinUpdateFormData = z.infer<typeof pinUpdateSchema>;

const ElectronicSignatures = (): ReactElement => {
  const { primaryColor } = useAppTheme();
  const { hasPermission } = usePermissions();
  const canViewStats = hasPermission("audit_logs", "read");
  const [activeTab, setActiveTab] = useState<"logs" | "pin" | "stats">("logs");

  // History / Logs State
  const [logs, setLogs] = useState<SignatureLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SignatureLog | null>(null);

  // Manage Credentials Form State
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  // Statistics State
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(new Date().getFullYear(), 11, 31).toISOString().split("T")[0]
  );

  // react-hook-form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PinUpdateFormData>({
    resolver: zodResolver(pinUpdateSchema),
    defaultValues: {
      password: "",
      pin: "",
      confirmPin: "",
    }
  });

  // Fetch signature history logs
  const fetchLogs = async (): Promise<void> => {
    try {
      setIsLoadingLogs(true);
      setLogsError(null);
      const res = await electronicSignatureService.getHistory({
        limit,
        offset: (currentPage - 1) * limit,
      });

      if (res.success) {
        // Handle pagination structure
        const signatureRecords = res.data?.signatures || res.data || [];
        setLogs(signatureRecords);
        const count = res.data?.total || signatureRecords.length;
        setTotalLogs(count);
        setTotalPages(Math.ceil(count / limit));
      } else {
        setLogsError("Failed to fetch signature logs");
      }
    } catch (err: any) {
      setLogsError(
        err?.response?.data?.error?.message || "Failed to load signature logs"
      );
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch statistics
  const fetchStats = async (): Promise<void> => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      const res = await electronicSignatureService.getStatistics({
        start_date: startDate,
        end_date: endDate,
      });
      if (res.success) {
        setStats(res.data);
      } else {
        setStatsError("Failed to load signature statistics");
      }
    } catch (err: any) {
      setStatsError(
        err?.response?.data?.error?.message || "Failed to load signature statistics"
      );
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") {
      void fetchLogs();
    } else if (activeTab === "stats" && canViewStats) {
      void fetchStats();
    }
  }, [activeTab, currentPage, limit, canViewStats]);

  // Handle PIN update
  const handleUpdatePin = async (data: PinUpdateFormData): Promise<void> => {
    try {
      setIsUpdatingCredentials(true);
      await electronicSignatureService.setPin({
        password: data.password,
        pin: data.pin,
      });
      showToast.success("Electronic signature PIN updated successfully");
      reset();
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message || "Failed to update PIN"
      );
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // Filter logs locally based on search & action
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.resource?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.meaning.toLowerCase().includes(search.toLowerCase()) ||
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.signer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      log.signer?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const columns: Column<SignatureLog>[] = [
    {
      key: "signed_at",
      label: "Timestamp",
      render: (log) => (
        <span className="text-sm font-normal text-[#0f1724] whitespace-nowrap">
          {formatDate(log.signed_at)}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (log) => (
        <StatusBadge variant={getActionVariant(log.action)}>
          {log.action}
        </StatusBadge>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (log) => (
        <span className="text-sm font-normal text-[#475569] block max-w-xs truncate" title={log?.signer?.name}>
          {log?.signer?.name}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (log) => (
        <span className="text-sm font-normal text-[#475569] block max-w-xs truncate" title={log?.signer?.email}>
          {log?.signer?.email}
        </span>
      ),
    },    
    {
      key: "meaning",
      label: "Meaning",
      render: (log) => (
        <span className="text-sm font-normal text-[#475569] block max-w-xs truncate" title={log.meaning}>
          {log.meaning}
        </span>
      ),
    },
    {
      key: "resource_name",
      label: "Resource Name",
      render: (log) => (
        <span className="text-sm font-normal text-[#0f1724] block max-w-xs truncate" title={log.resource?.name || ""}>
          {log.resource?.name || log.resource?.id}
        </span>
      ),
    },
    {
      key: "is_valid",
      label: "Status",
      render: (log) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.is_valid ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {log.is_valid ? "Active / Compliant" : "Invalidated"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (log) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
          className="text-xs font-medium hover:underline cursor-pointer"
          style={{ color: primaryColor }}
        >
          View Details
        </button>
      ),
    },
  ];

  // Calculate actual total signatures from action stats to avoid API group count overrides
  const totalSignatureCount: number = stats?.by_action
    ? Object.keys(stats.by_action).reduce((sum: number, key: string) => sum + (parseInt(stats.by_action[key], 10) || 0), 0)
    : 0;

  return (
    <Layout
      currentPage="E-Signatures"
      pageHeader={{
        title: "Electronic Signatures",
        description: canViewStats
          ? "FDA 21 CFR Part 11 compliant electronic signature management and compliance reporting."
          : "FDA 21 CFR Part 11 compliant view of your personal electronic signature records.",
      }}
    >
      <div className="flex flex-col gap-6 w-full h-full">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200/80 gap-6">
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 pb-3 text-xs md:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "logs"
                ? ""
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
            style={{
              borderColor: activeTab === "logs" ? primaryColor : "transparent",
              color: activeTab === "logs" ? primaryColor : undefined,
            }}
          >
            <History className="w-4 h-4" />
            {canViewStats ? "Signature Logs" : "My Signatures"}
          </button>
          <button
            onClick={() => setActiveTab("pin")}
            className={`flex items-center gap-2 pb-3 text-xs md:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "pin"
                ? ""
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
            style={{
              borderColor: activeTab === "pin" ? primaryColor : "transparent",
              color: activeTab === "pin" ? primaryColor : undefined,
            }}
          >
            <Key className="w-4 h-4" />
            Manage Credentials
          </button>
          {canViewStats && (
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 pb-3 text-xs md:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "stats"
                  ? ""
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
              style={{
                borderColor: activeTab === "stats" ? primaryColor : "transparent",
                color: activeTab === "stats" ? primaryColor : undefined,
              }}
            >
              <BarChart3 className="w-4 h-4" />
              Compliance Stats
            </button>
          )}
        </div>

        {/* Tab Content: Logs */}
        {activeTab === "logs" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder={canViewStats ? "Search logs..." : "Search my signatures..."}
                  containerClassName="relative w-full md:w-64"
                />
                <FilterDropdown
                  label="Action"
                  options={[
                    { value: "APPROVE", label: "APPROVE" },
                    { value: "REJECT", label: "REJECT" },
                    { value: "REVIEW", label: "REVIEW" },
                    { value: "AUTHOR", label: "AUTHOR" },
                    { value: "VERIFY", label: "VERIFY" },
                    { value: "RELEASE", label: "RELEASE" },
                    { value: "ACKNOWLEDGE", label: "ACKNOWLEDGE" },
                    { value: "WITHDRAW", label: "WITHDRAW" },
                  ]}
                  value={actionFilter}
                  onChange={(val) => setActionFilter(val as string | null)}
                  placeholder="All Actions"
                />
                {(search || actionFilter) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setActionFilter(null);
                    }}
                    className="text-xs hover:underline cursor-pointer font-semibold"
                    style={{ color: primaryColor }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <DataTable
              columns={columns}
              data={filteredLogs}
              keyExtractor={(log) => log.id}
              isLoading={isLoadingLogs}
              error={logsError}
              emptyMessage={canViewStats ? "No electronic signatures recorded yet." : "You have not recorded any electronic signatures yet."}
              onRowClick={(log) => setSelectedLog(log)}
            />

            {totalLogs > limit && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalLogs}
                limit={limit}
                onPageChange={setCurrentPage}
                onLimitChange={(lim) => {
                  setLimit(lim);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        )}

        {/* Tab Content: Manage PIN */}
        {activeTab === "pin" && (
          <div className="bg-white border border-gray-200/80 rounded-lg p-6 max-w-xl mx-auto w-full shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <Key className="w-5 h-5" style={{ color: primaryColor }} />
              <h3 className="text-base font-semibold text-gray-900">
                Configure Electronic Signature PIN
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-normal">
              Set or update your 4-6 digit compliance PIN. The PIN is combined with your account password during signature verification steps to ensure regulatory compliance with 21 CFR Part 11.
            </p>

            <form onSubmit={handleSubmit(handleUpdatePin)} className="space-y-4">
              <div>
                <FormField
                  label="Login Password"
                  required
                  type="password"
                  placeholder="Enter login password to confirm identity"
                  error={errors.password?.message}
                  {...register("password")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormField
                    label="New Signature PIN"
                    required
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4-6 digit PIN"
                    error={errors.pin?.message}
                    {...register("pin")}
                  />
                </div>

                <div>
                  <FormField
                    label="Confirm Signature PIN"
                    required
                    type="password"
                    maxLength={6}
                    placeholder="Re-enter PIN"
                    error={errors.confirmPin?.message}
                    {...register("confirmPin")}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <PrimaryButton
                  type="submit"
                  disabled={isUpdatingCredentials}
                  className="px-4 py-2 text-xs font-semibold"
                >
                  {isUpdatingCredentials ? "Updating PIN..." : "Update Signature PIN"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* Tab Content: Statistics */}
        {activeTab === "stats" && canViewStats && (
          <div className="flex flex-col gap-6">
            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-gray-200/80 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mr-2">
                <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
                Date Range:
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                />
              </div>
              <PrimaryButton
                onClick={() => void fetchStats()}
                disabled={isLoadingStats}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold"
              >
                {isLoadingStats ? "Analyzing..." : "Apply Range"}
              </PrimaryButton>
            </div>

            {statsError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{statsError}</span>
              </div>
            ) : isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <span className="text-sm text-gray-500">Generating compliance statistics...</span>
              </div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Statistics Cards using GradientStatCard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <GradientStatCard
                    icon={ShieldCheck}
                    value={totalSignatureCount || stats.total_signatures || 0}
                    label="Total Signatures"
                  />
                  <GradientStatCard
                    icon={Key}
                    value={stats.unique_signers || 0}
                    label="Unique Signers"
                  />
                  <GradientStatCard
                    icon={CheckCircle2}
                    value={stats.unique_resources || 0}
                    label="Unique Resources"
                  />
                </div>

                {/* Distribution Grid */}
                <div className="bg-white border border-gray-200/80 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-5 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" style={{ color: primaryColor }} />
                    Signature Action Distribution
                  </h3>
                  {stats.by_action && Object.keys(stats.by_action).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(stats.by_action).map(([action, count]: [string, any]) => {
                        const total = totalSignatureCount || 1;
                        const percentage = total > 0 ? Math.round((Number(count) / Number(total)) * 100) : 0;
                        return (
                          <div key={action} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-gray-700 flex items-center gap-1.5">
                                <StatusBadge variant={getActionVariant(action)}>{action}</StatusBadge>
                              </span>
                              <span className="text-gray-900">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%`, backgroundColor: primaryColor }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic block text-center py-6">
                      No distribution data found for this period.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic block text-center py-6">
                Please apply a date range to generate statistics.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Electronic Signature Audit Record"
          description="Detailed metadata for compliance audit verification."
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <span className="text-gray-400 block">Signature ID</span>
                <code className="text-gray-900 font-mono font-semibold select-all">
                  {selectedLog.id}
                </code>
              </div>
              <div>
                <span className="text-gray-400 block text-right">Verification Status</span>
                <span className={`inline-block font-semibold px-2 py-0.5 rounded-full ${selectedLog.is_valid ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {selectedLog.is_valid ? "Compliant & Verified" : "Invalidated"}
                </span>
              </div>
            </div>

            {/* Core details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 block mb-0.5">Signer</span>
                <span className="text-gray-900 font-semibold">
                  {selectedLog.signer
                    ? `${selectedLog.signer.name} (${selectedLog.signer.email})`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Signed At</span>
                <span className="text-gray-900 font-semibold">
                  {formatDate(selectedLog.signed_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Action Code</span>
                <span className="text-gray-900 font-semibold">
                  <StatusBadge variant={getActionVariant(selectedLog.action)}>{selectedLog.action}</StatusBadge>
                </span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Auth Method</span>
                <span className="text-gray-900 font-semibold font-mono uppercase">
                  {selectedLog.auth_method}
                </span>
              </div>
            </div>

            {/* Document/Resource details */}
            <div className="bg-gray-50 border border-gray-200/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 border-b border-gray-200 pb-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Target Resource Context
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400 block text-[10px]">Resource Type</span>
                  <span className="text-gray-900 font-semibold">{selectedLog.resource?.type}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-400 block text-[10px]">Resource Name</span>
                  <span className="text-gray-900 font-semibold truncate block" title={selectedLog.resource?.name || ""}>
                    {selectedLog.resource?.name || "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Resource ID</span>
                <code className="text-gray-700 font-mono text-[10px]">{selectedLog.resource?.id}</code>
              </div>
            </div>

            {/* Audit details */}
            <div className="space-y-2">
              <div>
                <span className="text-gray-400 block mb-0.5">Signature Meaning</span>
                <p className="text-gray-900 font-medium bg-amber-50/50 border border-amber-100 p-2.5 rounded-md leading-relaxed">
                  "{selectedLog.meaning}"
                </p>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">Audit Trail Context</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-md font-mono text-[10px]">
                  <div>
                    <span className="text-gray-400 block">IP Address</span>
                    <span className="text-gray-700">{selectedLog.verification?.ip_address || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">SHA-256 Digital Fingerprint</span>
                <code className="text-gray-700 font-mono break-all bg-gray-50 p-2 rounded block leading-normal">
                  {selectedLog.verification?.signature_hash}
                </code>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default ElectronicSignatures;
