import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  StatusBadge,
  Pagination,
  FilterDropdown,
  GradientStatCard,
  MarkdownViewer,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIPrompt, AICompletion } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  Terminal,
  MessageSquare,
  Sparkles,
  FileCode,
  BookOpen,
  Tag,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import CodeBadge from "@/components/shared/CodeBadge";

const PromptExecutions = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState<AIPrompt | null>(null);
  const [executions, setExecutions] = useState<AICompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    usage_count: 0,
    success_rate: 0,
    avg_cost: 0,
    avg_latency: 0,
    failed_runs: 0,
    success_runs: 0,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  });

  const loadData = async (): Promise<void> => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [promptData, executionsData] = await Promise.all([
        aiService.getPrompt(id),
        aiService.getPromptExecutions(id, {
          page,
          limit,
          status: statusFilter || undefined,
        }),
      ]);

      setPrompt(promptData);
      setExecutions(executionsData.data || []);
      setSummary(executionsData.summary);
      setPagination({
        page: executionsData.pagination?.page || page,
        limit: executionsData.pagination?.limit || limit,
        total: executionsData.pagination?.total || 0,
        totalPages: executionsData.pagination?.totalPages || 1,
      });
    } catch (err: any) {
      showToast.error("Failed to load prompt executions data");
      navigate("/tenant/ai/prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id, page, limit, statusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const toggleExpand = (itemId: string) => {
    setExpandedId((prev) => (prev === itemId ? null : itemId));
  };

  const renderExpanded = (row: AICompletion): React.ReactNode => {
    const metadata = (row.metadata || {}) as any;
    const inputVars = metadata.input_variables || {};
    const fileProcess = metadata.file_processing;
    const promptVersion = metadata.prompt_version || "—";

    return (
      <>
      
      {/* <div className="bg-[#f8fafc] border border-gray-150 rounded-lg p-5 text-xs text-[#334155] space-y-4 shadow-inner"> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Metadata & Input Variables */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#112868]" />
              Runtime Environment & Variables
            </h4>
            
            <div className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
              <p className="flex justify-between">
                <span className="font-semibold text-gray-500">Prompt Version:</span>
                <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                  v{promptVersion}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="font-semibold text-gray-500">Latency:</span>
                <span className="font-semibold text-gray-800">{row.latency_ms ?? "—"} ms</span>
              </p>
              <p className="flex justify-between">
                <span className="font-semibold text-gray-500">Cost:</span>
                <span className="font-semibold text-gray-800">USD {Number(row.cost ?? 0).toFixed(6)}</span>
              </p>
              <p className="flex justify-between">
                <span className="font-semibold text-gray-500">Tokens:</span>
                <span className="font-semibold text-gray-800">
                  {row.prompt_tokens ?? 0} prompt · {row.completion_tokens ?? 0} completion ({row.total_tokens ?? 0} total)
                </span>
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
              <span className="font-semibold text-gray-500 block mb-1">Input Variables:</span>
              {Object.keys(inputVars).length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {Object.entries(inputVars).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-gray-50 border border-gray-150 rounded px-2 py-1 flex flex-col min-w-[100px]"
                    >
                      <span className="font-mono text-[9px] font-bold text-gray-400 uppercase">{key}</span>
                      <span className="text-gray-800 font-medium whitespace-pre-line truncate max-w-[200px]" title={String(val)}>
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">No variables defined for this execution.</span>
              )}

              {fileProcess && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1">
                  <span className="font-semibold text-gray-500 block">Uploaded File Context:</span>
                  <div className="bg-amber-50/50 border border-amber-100 rounded p-2 flex flex-col font-mono text-[10px]">
                    <span className="text-gray-700 font-medium">Name: {fileProcess.fileName}</span>
                    <span className="text-gray-500">Type: {fileProcess.mimeType} ({fileProcess.mode} mode)</span>
                    <span className="text-gray-500">Size: {(fileProcess.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Prompts Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#112868]" />
              System Message & Config
            </h4>
            <div className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
              <div>
                <span className="font-semibold text-gray-500 block mb-1">System Message:</span>
                <p className="bg-slate-50 border border-slate-100 p-2 rounded text-[11px] font-mono whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed text-gray-600">
                  {row.system_message || <span className="text-gray-400 italic">None</span>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-[10px] text-gray-400 font-medium block">Temperature</span>
                  <span className="text-xs font-bold text-gray-700">{row.temperature ?? "Default"}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-[10px] text-gray-400 font-medium block">Max Tokens</span>
                  <span className="text-xs font-bold text-gray-700">{row.max_tokens ?? "Default"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Area: Full Prompt & Response or Error */}
        <div className="grid grid-cols-1 gap-4 pt-2">
          {/* Rendered Prompt */}
          <div className="space-y-1.5">
            <span className="font-semibold text-gray-500 flex items-center gap-1">
              <FileCode className="w-3.5 h-3.5 text-gray-400" />
              Rendered User Prompt
            </span>
            <div className="bg-slate-900 text-slate-100 font-mono p-3.5 rounded-md text-[11px] whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-800 leading-relaxed shadow-sm">
              {row.prompt}
            </div>
          </div>

          {/* Response Box / Error box */}
          {row.status === "completed" ? (
            <div className="space-y-1.5">
              <span className="font-semibold text-[#112868] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#00cfd5]" />
                Generated Response
              </span>
              <div className="bg-white border border-gray-250 p-4 rounded-md text-[12px] leading-relaxed max-h-60 overflow-y-auto text-gray-800 font-sans shadow-sm">
                <MarkdownViewer content={row.response || ""} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <span className="font-semibold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Execution Failure Trace
              </span>
              <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-md text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed shadow-sm">
                {row.error_message || "Unknown gateway error occurred during processing."}
              </div>
            </div>
          )}
        </div>
      {/* </div> */}
      </>
    );
  };

  const columns: Column<AICompletion>[] = [
    // {
    //   key: "expand",
    //   label: "",
    //   width: "40px",
    //   render: (row) => (
    //     <button
    //       type="button"
    //       onClick={(e) => {
    //         e.stopPropagation();
    //         toggleExpand(row.id);
    //       }}
    //       className="text-gray-400 hover:text-[#112868] transition-colors"
    //     >
    //       {expandedId === row.id ? (
    //         <ChevronDown className="w-4 h-4" />
    //       ) : (
    //         <ChevronRight className="w-4 h-4" />
    //       )}
    //     </button>
    //   ),
    // },
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.created_at || "")}
        </span>
      ),
    },
    {
      key: "provider",
      label: "Provider",
      render: (row) => (
        <CodeBadge label={row.provider} />
      ),
    },
    {
      key: "model",
      label: "Model",
      render: (row) => (
        <span className="font-mono line-clamp-1 max-w-[150px]" title={row.model}>
          {row.model}
        </span>
      ),
    },
    {
      key: "latency",
      label: "Latency",
      render: (row) => (
        <span>
          {row.latency_ms ? `${row.latency_ms}ms` : "—"}
        </span>
      ),
    },
    {
      key: "cost",
      label: "Cost",
      render: (row) => (
        <span>
          {row.cost ? `USD ${row.cost.toFixed(5)}` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge variant={row.status === "completed" ? "success" : "failure"}>
          {row.status || "failed"}
        </StatusBadge>
      ),
    },
  ];

  if (isLoading && !prompt) {
    return (
      <Layout currentPage="Execution History">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#112868] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading execution history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Execution History"
      breadcrumbs={[
        { label: "AI Prompts", path: "/tenant/ai/prompts" },
        { label: "Execution History" },
      ]}
      pageHeader={{
        title: (
          <div className="flex items-center gap-3">
            <span>Execution History</span>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border",
                prompt?.status === "active"
                  ? "bg-[#E6FFFB] text-[#096DD9] border-[#91D5FF]"
                  : "bg-[#FFF5E9] text-[#FA8C16] border-[#FFE7BA]",
              )}
            >
              {prompt?.status || "Draft"}
            </span>
          </div>
        ),
        description: `Track execution metrics, variables, and failure traces for prompt "${prompt?.name}".`,
        // action: (
        //   <div className="flex gap-2">
        //     <SecondaryButton onClick={() => navigate("/tenant/ai/prompts")}>
        //       Back to Prompts
        //     </SecondaryButton>
        //     <PrimaryButton onClick={() => navigate(`/tenant/ai/prompts/${id}/execute`)}>
        //       <Play className="w-4 h-4 mr-1.5 inline shrink-0 text-white" />
        //       Execute Prompt
        //     </PrimaryButton>
        //   </div>
        // ),
      }}
    >
      <div className="flex items-start gap-6">
        {/* LEFT COLUMN: Stat cards, filters, and logs data table */}
        <div className="flex flex-col gap-6 flex-[3] w-full min-w-0">
          
          {/* SUMMARY CARDS STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GradientStatCard
              icon={Activity}
              value={summary.usage_count}
              label="Total Executions"
            />
            <GradientStatCard
              icon={CheckCircle2}
              value={`${summary.success_rate}%`}
              label="Success Rate"
              badge={{ text: `${summary.success_runs} OK`, variant: "success" }}
            />
            <GradientStatCard
              icon={Clock}
              value={`${summary.avg_latency}ms`}
              label="Avg Latency"
            />
            <GradientStatCard
              icon={DollarSign}
              value={`USD ${summary.avg_cost.toFixed(5)}`}
              label="Avg Cost / Run"
            />
          </div>

          {/* FILTER AND DATA TABLE */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-2 space-y-4">
            
            {/* FILTERS BAR */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FilterDropdown
                  label="Status"
                  options={[
                    { value: "completed", label: "Completed Only" },
                    { value: "failed", label: "Failed Only" },
                  ]}
                  value={statusFilter}
                  placeholder="All executions"
                  onChange={(value) => setStatusFilter(value as string | null)}
                />
              </div>
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="text-xs font-semibold text-gray-400 hover:text-[#112868] transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* DATA TABLE */}
            <div className="overflow-hidden">
              <DataTable
                data={executions}
                columns={columns}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                emptyMessage="No execution records found matching current query filters."
                expandableRows
                isRowExpanded={(row) => expandedId === row.id}
                onRowExpandToggle={(row) => toggleExpand(row.id)}
                renderExpandedRow={renderExpanded}
                onRowClick={(row) => toggleExpand(row.id)}
              />

              {pagination.total > 0 && (
                // <div className="border-t border-gray-200 px-5 py-4 bg-gray-50/50">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      setPage(1);
                    }}
                    limitOptions={[
                      { value: "5", label: "5 per page" },
                      { value: "10", label: "10 per page" },
                      { value: "20", label: "20 per page" },
                    ]}
                  />
                // </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="flex flex-col gap-6 flex-1 max-w-[320px] w-full shrink-0">
          
          {/* Template Details Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
              <BookOpen className="w-4 h-4 text-gray-500" />
              Template Details
            </h3>
            
            <div className="space-y-3.5 pt-1 text-xs">
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Name</span>
                <span className="font-semibold text-gray-800 text-[13px]">{prompt?.name}</span>
              </div>
              
              {prompt?.description && (
                <div>
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Description</span>
                  <span className="text-gray-600 leading-relaxed block mt-0.5">{prompt.description}</span>
                </div>
              )}

              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Use Case</span>
                <span className="inline-flex items-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] font-medium text-[#1e293b] mt-1">
                  {prompt?.useCase}
                </span>
              </div>

              {prompt?.tags && prompt.tags.length > 0 && (
                <div>
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px] mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {prompt.tags.map((t, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-150">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PromptExecutions;
