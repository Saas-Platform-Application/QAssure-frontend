import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { PrimaryButton, StatusBadge } from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AICompletion } from "@/types/ai";
import { showToast } from "@/utils/toast";
const formatWhen = (value?: string | null): string => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const DetailRow = ({ label, value }: { label: string; value: ReactNode }): ReactElement => (
  <div className="grid grid-cols-1 sm:grid-cols-[minmax(140px,200px)_1fr] gap-1 sm:gap-3 py-2 border-b border-[rgba(0,0,0,0.06)] last:border-0">
    <dt className="text-xs font-medium text-[#64748b]">{label}</dt>
    <dd className="text-sm text-[#0f1724] break-words">{value}</dd>
  </div>
);

const CompletionDetail = (): ReactElement => {
  const { completionId } = useParams<{ completionId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<AICompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!completionId) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await aiService.getCompletion(completionId);
        if (!cancelled) setRow(data);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
            ?.message || "Failed to load completion";
        if (!cancelled) {
          setError(msg);
          showToast.error(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [completionId]);

  return (
    <Layout
      currentPage="Completion Details"
      breadcrumbs={[
        { label: "Completions", path: "/tenant/ai/completions" },
        { label: "Completion details" },
      ]}
      pageHeader={{
        title: "Completion details",
        description: "Full request, response, and usage for this completion.",
      }}
    >
      <div className="space-y-5">
        {isLoading && (
          <p className="text-sm text-[#64748b] px-1">Loading completion…</p>
        )}
        {error && !isLoading && (
          <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-5">
            <p className="text-sm text-red-600">{error}</p>
            <PrimaryButton className="mt-4" onClick={() => navigate("/tenant/ai/completions")}>
              Return to list
            </PrimaryButton>
          </div>
        )}
        {row && !isLoading && (
          <>
            <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-[rgba(0,0,0,0.08)] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0f1724]">Summary</h2>
                  {/* <p className="text-xs text-[#64748b] mt-0.5">ID: {row.id}</p> */}
                </div>
                <StatusBadge variant={row.status === "completed" ? "success" : "failure"}>
                  {row.status || "unknown"}
                </StatusBadge>
              </div>
              <div className="px-4 md:px-5 py-3">
                <dl>
                  <DetailRow label="Created" value={formatWhen(row.created_at)} />
                  {/* <DetailRow label="Completed" value={formatWhen(row.completed_at)} /> */}
                  <DetailRow label="Module" value={row.module_name || "Platform"} />
                  {/* <DetailRow label="Module ID" value={row.module_id || "—"} /> */}
                  <DetailRow label="User" value={row.user_name || "—"} />
                  {/* <DetailRow label="User ID" value={row.user_id || "—"} /> */}
                  <DetailRow label="Provider / model" value={`${row.provider} / ${row.model}`} />
                  <DetailRow label="Use case" value={row.use_case || "—"} />
                  {/* <DetailRow label="Correlation" value={row.correlation_id || "—"} /> */}
                  <DetailRow
                    label="Tokens"
                    value={`${row.usage?.total_tokens ?? row.total_tokens ?? 0} (prompt ${row.usage?.prompt_tokens ?? row.prompt_tokens ?? 0}, completion ${row.usage?.completion_tokens ?? row.completion_tokens ?? 0})`}
                  />
                  <DetailRow label="Cost (USD)" value={String(row.cost ?? 0)} />
                  <DetailRow label="Latency" value={`${row.latency_ms ?? 0} ms`} />
                  <DetailRow label="Temperature" value={row.temperature != null ? String(row.temperature) : "—"} />
                  <DetailRow label="Max tokens" value={row.max_tokens != null ? String(row.max_tokens) : "—"} />
                  {/* <DetailRow label="Top p" value={row.top_p != null ? String(row.top_p) : "—"} />
                  <DetailRow label="Cached" value={row.cached != null ? (row.cached ? "Yes" : "No") : "—"} />
                  <DetailRow label="Streaming" value={row.streaming != null ? (row.streaming ? "Yes" : "No") : "—"} /> */}
                  <DetailRow label="Fallback provider" value={row.fallback_provider || "Not used"} />
                  {row.error_message && (
                    <DetailRow label="Error" value={<span className="text-red-600">{row.error_message}</span>} />
                  )}
                  {row.error_code && <DetailRow label="Error code" value={row.error_code} />}
                </dl>
              </div>
            </section>

            {row.system_message && (
              <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
                <div className="px-4 md:px-5 py-3 border-b border-[rgba(0,0,0,0.08)]">
                  <h3 className="text-sm font-semibold text-[#0f1724]">System message</h3>
                </div>
                <pre className="px-4 md:px-5 py-4 text-xs text-[#334155] whitespace-pre-wrap break-words max-h-[320px] overflow-y-auto bg-[#f8fafc]">
                  {row.system_message}
                </pre>
              </section>
            )}

            <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
              <div className="px-4 md:px-5 py-3 border-b border-[rgba(0,0,0,0.08)]">
                <h3 className="text-sm font-semibold text-[#0f1724]">Prompt</h3>
              </div>
              <pre className="px-4 md:px-5 py-4 text-xs text-[#334155] whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto bg-[#f8fafc]">
                {row.prompt || "—"}
              </pre>
            </section>

            <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
              <div className="px-4 md:px-5 py-3 border-b border-[rgba(0,0,0,0.08)]">
                <h3 className="text-sm font-semibold text-[#0f1724]">Response</h3>
              </div>
              <pre className="px-4 md:px-5 py-4 text-xs text-[#334155] whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto bg-[#f8fafc]">
                {row.response || row.content || "—"}
              </pre>
            </section>

            {/* {row.metadata != null && (
              <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden">
                <div className="px-4 md:px-5 py-3 border-b border-[rgba(0,0,0,0.08)]">
                  <h3 className="text-sm font-semibold text-[#0f1724]">Metadata</h3>
                </div>
                <pre className="px-4 md:px-5 py-4 text-xs text-[#334155] whitespace-pre-wrap break-words max-h-[320px] overflow-y-auto bg-[#f8fafc]">
                  {typeof row.metadata === "string"
                    ? row.metadata
                    : JSON.stringify(row.metadata, null, 2)}
                </pre>
              </section>
            )} */}
          </>
        )}
      </div>
    </Layout>
  );
};

export default CompletionDetail;
