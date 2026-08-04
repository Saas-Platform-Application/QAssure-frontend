import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { usePermissions } from "@/hooks/usePermissions";
import {
  DataTable,
  Pagination,
  PrimaryButton,
  type Column,
  Modal,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import { showToast } from "@/utils/toast";
import {
  ShieldAlert,
  Settings2,
  History,
  Eye,
  RefreshCw,
  Info,
  ArrowRight,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/utils/format-date";
import { TenantAIProviders } from "../tenant/TenantAIProviders";
import type { AIProviderInfo } from "@/types/ai";

interface FallbackEvent {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  failed_provider: string;
  failed_model: string | null;
  fallback_provider: string;
  fallback_model: string | null;
  error_message: string | null;
  config_details: any;
  created_at: string;
}

// Known built-in providers that always exist in the system
const BUILT_IN_PROVIDERS = [
  { name: "openai", displayName: "OpenAI" },
  { name: "anthropic", displayName: "Anthropic Claude" },
  { name: "gemini", displayName: "Google Gemini" },
  { name: "open-source", displayName: "Open Source" },
];

const NONE_OPTION = { value: "__none__", label: "— No fallback —" };

export const AIFallbackHistory = () => {
  const { canUpdate } = usePermissions();
  const [fallbacks, setFallbacks] = useState<FallbackEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<FallbackEvent | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "mapping" | "configs">("history");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Per-provider fallback mapping state
  const [availableProviders, setAvailableProviders] = useState<{ name: string; displayName: string }[]>([]);
  const [fallbackMapping, setFallbackMapping] = useState<Record<string, string>>({});
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  const fetchFallbackHistory = async () => {
    setIsLoading(true);
    try {
      const res = await aiService.listFallbacks({
        page: currentPage,
        limit: limit,
      });
      setFallbacks(res.data || []);
      setTotalItems(res.pagination?.total || (res.data || []).length);
    } catch (err) {
      showToast.error("Failed to load fallback history logs");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMappingData = useCallback(async () => {
    setIsMappingLoading(true);
    try {
      // Load system providers + global dynamic providers
      const [systemProviders, mapping] = await Promise.all([
        aiService.getProviders().catch(() => [] as AIProviderInfo[]),
        aiService.getFallbackMapping().catch(() => ({})),
      ]);

      // Build unified list: built-ins + any extra dynamic providers from the API
      const allProviders = [...BUILT_IN_PROVIDERS];
      for (const sp of systemProviders) {
        const exists = allProviders.some((p) => p.name === sp.name);
        if (!exists) {
          allProviders.push({ name: sp.name, displayName: sp.displayName || sp.name });
        }
      }

      setAvailableProviders(allProviders);
      setFallbackMapping(mapping || {});
    } catch (err) {
      console.error("Failed to load mapping data:", err);
    } finally {
      setIsMappingLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFallbackHistory();
  }, [currentPage, limit]);

  useEffect(() => {
    if (activeTab === "mapping") {
      void fetchMappingData();
    }
  }, [activeTab, fetchMappingData]);

  const handleMappingChange = (providerName: string, fallbackName: string) => {
    setFallbackMapping((prev) => ({
      ...prev,
      [providerName]: fallbackName === "__none__" ? "" : fallbackName,
    }));
  };

  const handleSaveMapping = async () => {
    setIsSavingMapping(true);
    try {
      // Strip empty entries before saving
      const cleanMapping = Object.fromEntries(
        Object.entries(fallbackMapping).filter(([, v]) => v && v !== "__none__")
      );
      await aiService.updateFallbackMapping(cleanMapping);
      showToast.success("Per-provider fallback mapping saved successfully");
    } catch (err) {
      showToast.error("Failed to save fallback mapping");
    } finally {
      setIsSavingMapping(false);
    }
  };

  const columns: Column<FallbackEvent>[] = [
    {
      key: "scope",
      label: "Tenant Scope",
      render: (event) => (
        <span className="font-semibold text-slate-800">
          {event.tenant_name || "Global / System"}
        </span>
      ),
    },
    {
      key: "failed_provider",
      label: "Failed Provider",
      render: (event) => (
        <div className="flex flex-col">
          <span className="uppercase text-xs font-bold text-red-600 tracking-wider">
            {event.failed_provider}
          </span>
          <span className="text-xs text-slate-500 font-mono select-all">
            {event.failed_model || "unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "fallback_provider",
      label: "Fallback Utilized",
      render: (event) => (
        <div className="flex flex-col">
          <span className="uppercase text-xs font-bold text-emerald-600 tracking-wider">
            {event.fallback_provider}
          </span>
          <span className="text-xs text-slate-500 font-mono select-all">
            {event.fallback_model || "unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "error_message",
      label: "Error Details",
      render: (event) => {
        const errorText = event.error_message || "Unknown rate-limit/network error";
        return (
          <span
            className="text-xs text-slate-600 block max-w-xs truncate"
            title={errorText}
          >
            {errorText}
          </span>
        );
      },
    },
    {
      key: "created_at",
      label: "Timestamp",
      render: (event) => (
        <span className="text-xs text-slate-500">
          {formatDate(event.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (event) => (
        <button
          onClick={() => {
            let parsedConfig = event.config_details;
            if (typeof parsedConfig === "string") {
              try {
                parsedConfig = JSON.parse(parsedConfig);
              } catch (e) {
                parsedConfig = {};
              }
            }
            setSelectedEvent({
              ...event,
              config_details: parsedConfig,
            });
          }}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer bg-slate-50 hover:bg-blue-50 px-2 py-1.5 rounded transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          Inspect Config
        </button>
      ),
    },
  ];

  // Build select options for a given provider (exclude itself)
  const getFallbackOptions = (currentProviderName: string) => {
    const options = [
      NONE_OPTION,
      ...availableProviders
        .filter((p) => p.name !== currentProviderName)
        .map((p) => ({ value: p.name, label: p.displayName })),
    ];
    return options;
  };

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "AI Gateway Fallback Settings & Monitoring",
        description:
          "Configure automatic gateway fallback routing logic, review errors, and inspect failed provider configs.",
      }}
    >
      <div className="space-y-6">
        {/* Quick info panel & incident summary */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                How Fallbacks Protect Client Operations
              </h3>
            </div>
            <div className="flex gap-3 bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs text-amber-800 leading-relaxed flex-1">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Automatic Redundancy:</span> If a configured endpoint fails (e.g., Azure OpenAI rate-limits or encounters network timeouts), the gateway silently forwards requests to the configured fallback provider. Use the{" "}
                <span className="font-semibold">Provider Fallback Mapping</span> tab to define exactly which provider acts as the fallback for each primary provider.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Fallbacks Logged
              </span>
              <span className="text-xl font-bold text-slate-800 block mt-1">
                {totalItems}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Gateway Status
              </span>
              <span className="text-xl font-bold text-emerald-600 block mt-1">
                Healthy
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Last Incident
              </span>
              <span className="text-xs font-semibold text-slate-700 block mt-2">
                {fallbacks.length > 0
                  ? formatDate(fallbacks[0].created_at)
                  : "No incidents logged"}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1.5 text-sm font-bold pb-2 transition-all cursor-pointer ${
                  activeTab === "history"
                    ? "text-[#112868] border-b-2 border-[#112868]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <History className="w-4 h-4" />
                Fallback History Logs
              </button>
              <button
                onClick={() => setActiveTab("mapping")}
                className={`flex items-center gap-1.5 text-sm font-bold pb-2 transition-all cursor-pointer ${
                  activeTab === "mapping"
                    ? "text-[#112868] border-b-2 border-[#112868]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Provider Fallback Mapping
              </button>
              <button
                onClick={() => setActiveTab("configs")}
                className={`flex items-center gap-1.5 text-sm font-bold pb-2 transition-all cursor-pointer ${
                  activeTab === "configs"
                    ? "text-[#112868] border-b-2 border-[#112868]"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Dynamic Fallback Models & API Keys
              </button>
            </div>

            {activeTab === "history" && (
              <button
                onClick={fetchFallbackHistory}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
          </div>

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <>
              <div className="border border-slate-50 rounded-xl overflow-hidden">
                <DataTable
                  columns={columns}
                  data={fallbacks}
                  isLoading={isLoading}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No fallback incidents have been recorded."
                />
              </div>

              {totalItems > limit && (
                <div className="pt-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalItems / limit)}
                    totalItems={totalItems}
                    limit={limit}
                    onPageChange={setCurrentPage}
                    onLimitChange={setLimit}
                  />
                </div>
              )}
            </>
          )}

          {/* PROVIDER FALLBACK MAPPING TAB */}
          {activeTab === "mapping" && (
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">Global Fallback Mapping</span>
                  Configure which provider the gateway should automatically switch to when each primary provider fails.
                  These mappings apply globally to all tenants. Tenant-level custom fallback settings (set per provider config) take higher priority over these mappings.
                  Custom open-source models (e.g. Mistral-7B, Mistral-24B) added via the{" "}
                  <span className="font-semibold">Dynamic Fallback Models & API Keys</span> tab will automatically appear here.
                </div>
              </div>

              {isMappingLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-[#112868]" />
                  <span className="ml-2 text-sm text-slate-500">Loading provider mappings...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {availableProviders.map((provider) => {
                      const currentFallback = fallbackMapping[provider.name] || "__none__";
                      const options = getFallbackOptions(provider.name);

                      return (
                        <div
                          key={provider.name}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-all"
                        >
                          {/* Primary provider label */}
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <div className="w-2 h-2 rounded-full bg-[#112868] shrink-0" />
                            <span className="text-sm font-semibold text-slate-800">
                              {provider.displayName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              {provider.name}
                            </span>
                          </div>

                          {/* Arrow */}
                          <div className="flex items-center gap-2 shrink-0">
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                            <span className="text-xs text-slate-400 font-medium">fallback to</span>
                            <ArrowRight className="w-4 h-4 text-slate-300" />
                          </div>

                          {/* Fallback dropdown */}
                          <div className="flex-1">
                            <select
                              value={currentFallback}
                              onChange={(e) => handleMappingChange(provider.name, e.target.value)}
                              disabled={!canUpdate("settings")}
                              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#112868]/20 focus:border-[#112868] transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                              {options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Current mapping status badge */}
                          <div className="shrink-0">
                            {currentFallback && currentFallback !== "__none__" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-wider">
                                ✓ Mapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-full uppercase tracking-wider">
                                Not set
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      {availableProviders.length} provider{availableProviders.length !== 1 ? "s" : ""} configured.
                      Add more via the <span className="font-semibold text-slate-500">Dynamic Fallback Models & API Keys</span> tab.
                    </p>
                    {canUpdate("settings") && (
                      <PrimaryButton
                        onClick={handleSaveMapping}
                        disabled={isSavingMapping}
                        className="h-9 px-5 text-xs flex items-center gap-1.5 rounded-lg"
                      >
                        {isSavingMapping ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Save Fallback Mapping
                          </>
                        )}
                      </PrimaryButton>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* DYNAMIC FALLBACK MODELS TAB */}
          {activeTab === "configs" && (
            <div className="pt-2">
              <TenantAIProviders
                customTenantId="00000000-0000-0000-0000-000000000001"
                hideLayout={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Failed Endpoint Diagnostics"
        description={`Tenant Scope: ${selectedEvent?.tenant_name || "Global / System"}`}
        maxWidth="md"
        footer={
          <PrimaryButton
            onClick={() => setSelectedEvent(null)}
            className="h-9 px-4 text-xs rounded-lg"
          >
            Close Diagnostics
          </PrimaryButton>
        }
      >
        {selectedEvent && (
          <div className="space-y-4 pt-1">
            {/* Incident Header Details */}
            <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-100 pb-3">
              <div>
                <span className="text-slate-400 block font-medium">Failed Provider</span>
                <span className="uppercase font-bold text-red-600 block mt-0.5">
                  {selectedEvent.failed_provider}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Fallback Provider</span>
                <span className="uppercase font-bold text-emerald-600 block mt-0.5">
                  {selectedEvent.fallback_provider}
                </span>
              </div>
            </div>

            {/* Exact Error Log */}
            <div className="space-y-1 bg-red-50/50 border border-red-100 p-3 rounded-lg text-xs">
              <span className="font-bold text-red-800 block">Failed Provider Error Message:</span>
              <p className="font-mono text-red-700 select-all leading-relaxed whitespace-pre-wrap">
                {selectedEvent.error_message || "No specific API error details captured."}
              </p>
            </div>

            {/* Configuration parameters details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-1">
                Failed Provider Endpoint & Security Config
              </h4>

              <table className="w-full text-xs text-slate-700">
                <tbody>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-400 font-medium">Config Type</td>
                    <td className="py-2 font-semibold capitalize">
                      {selectedEvent.config_details?.config_type || "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-400 font-medium">Endpoint URL</td>
                    <td className="py-2 font-mono select-all">
                      {selectedEvent.config_details?.endpoint || "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-400 font-medium">Deployment / Alias</td>
                    <td className="py-2 font-semibold">
                      {selectedEvent.config_details?.deployment || "N/A"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-2 text-slate-400 font-medium">API Version</td>
                    <td className="py-2">
                      {selectedEvent.config_details?.api_version || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-400 font-medium">API Key (Masked)</td>
                    <td className="py-2 font-mono">
                      {selectedEvent.config_details?.apiKeyMasked || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default AIFallbackHistory;
