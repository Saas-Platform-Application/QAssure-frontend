import { useEffect, useState, type ReactElement } from "react";
import { Modal, DataTable, type Column, MarkdownViewer } from "@/components/shared";
import { aiService } from "@/services/ai-service";
import { formatDate } from "@/utils/format-date";
import { showToast } from "@/utils/toast";

interface PromptTestCaseResultsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  testCaseId: string;
  testCaseName: string;
}

export const PromptTestCaseResultsListModal = ({
  isOpen,
  onClose,
  testCaseId,
  testCaseName,
}: PromptTestCaseResultsListModalProps): ReactElement | null => {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const loadResults = async () => {
    if (!testCaseId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await aiService.listPromptTestCaseResults(testCaseId, 10);
      setResults(data || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || "Failed to load test case results";
      setError(message);
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && testCaseId) {
      void loadResults();
      setExpandedRows({});
    }
  }, [isOpen, testCaseId]);

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const columns: Column<any>[] = [
    {
      key: "created_at",
      label: "Timestamp",
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium select-none">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "provider_model",
      label: "Provider / Model",
      render: (row) => (
        <div className="flex flex-col select-none">
          <span className="text-xs font-semibold text-slate-800">
            {row.provider || "N/A"}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {row.model || "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "usage",
      label: "Usage & Cost",
      render: (row) => (
        <div className="flex flex-col select-none">
          <span className="text-xs font-medium text-slate-700">
            {row.tokens_used ? `${row.tokens_used} tokens` : "0 tokens"}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {row.cost_usd && Number(row.cost_usd) > 0 ? `$${row.cost_usd}` : "$0.00"}
          </span>
        </div>
      ),
    },
    {
      key: "latency",
      label: "Latency",
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium select-none">
          {row.latency_ms ? `${(row.latency_ms / 1000).toFixed(2)}s` : "N/A"}
        </span>
      ),
    },
    {
      key: "run_by",
      label: "Run By",
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium break-all select-none">
          {row.run_by_email || row.run_by || "System"}
        </span>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Test Results - ${testCaseName || "Test Case"}`}
      description="View the recent run history and response outputs."
      maxWidth="2xl"
    >
      <div className="border-t border-slate-100 flex-1 min-h-0 select-none">
        <DataTable
          data={results}
          columns={columns}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          error={error}
          emptyMessage="No test results recorded yet."
          expandableRows={true}
          isRowExpanded={(item) => !!expandedRows[item.id]}
          onRowExpandToggle={(item) => toggleRowExpansion(item.id)}
          showExpandColumn={true}
          expandedColSpan={columns.length + 1}
          renderExpandedRow={(item) => (
            <>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block select-none">
                Output
              </span>
              {item.output ? (
                <MarkdownViewer content={item.output} />
              ) : (
                "No output generated."
              )}
            </>
          )}
        />
      </div>
    </Modal>
  );
};
