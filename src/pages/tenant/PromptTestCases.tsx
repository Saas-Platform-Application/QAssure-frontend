import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Plus, Play, Eye, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  type Column,
  PrimaryButton,
  ActionDropdown,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIPrompt, AIPromptTestCase } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";
import { PromptTestCaseResultModal } from "@/components/tenant/PromptTestCaseResultModal";
import { PromptTestCaseResultsListModal } from "@/components/tenant/PromptTestCaseResultsListModal";
import CodeBadge from "@/components/shared/CodeBadge";

const PromptTestCases = (): ReactElement => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const promptId = id || searchParams.get("promptId") || "";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<AIPromptTestCase[]>([]);
  const [prompt, setPrompt] = useState<AIPrompt | null>(null);

  const [runningCases, setRunningCases] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);

  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>("");
  const [selectedTestCaseName, setSelectedTestCaseName] = useState<string>("");
  const [isResultsListModalOpen, setIsResultsListModalOpen] =
    useState<boolean>(false);

  const handleRunTestCase = async (testCaseId: string) => {
    setRunningCases((prev) => ({ ...prev, [testCaseId]: true }));
    try {
      const response = await aiService.runPromptTestCase(testCaseId);
      showToast.success("Test case executed successfully!");
      if (response) {
        setSelectedResult(response);
        setIsResultModalOpen(true);
      }
      void loadData();
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || "Failed to run test case";
      showToast.error(message);
    } finally {
      setRunningCases((prev) => ({ ...prev, [testCaseId]: false }));
    }
  };

  // Load Prompt Details and Test Cases
  const loadData = async (): Promise<void> => {
    if (!promptId) {
      setError("Prompt ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch prompt details
      try {
        const p = await aiService.getPrompt(promptId);
        setPrompt(p);
      } catch (err) {
        console.warn("Failed to load prompt details", err);
      }

      // 2. Fetch test cases
      const cases = await aiService.listPromptTestCases(promptId);
      setTestCases(cases || []);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        "Failed to load prompt test cases";
      setError(message);
      showToast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [promptId]);

  const columns: Column<AIPromptTestCase>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name & Description",
        render: (row) => (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#112868] hover:underline cursor-pointer select-none">
              {row.name}
            </p>
            <p className="text-xs text-[#64748b] mt-0.5 line-clamp-2 max-w-[320px]">
              {row.description || "No description"}
            </p>
          </div>
        ),
      },
      {
        key: "template",
        label: "Template",
        render: () => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">
              {prompt?.name || "AI Prompt"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              v{prompt?.version || 1}.0
            </p>
          </div>
        ),
      },
      {
        key: "tags",
        label: "Tags",
        render: (row) => {
          const tags = row.tags || [];
          if (!tags.length) {
            return <span className="text-xs text-[#94a3b8]">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <CodeBadge key={index} label={tag} />
              ))}
            </div>
          );
        },
      },
      {
        key: "updatedAt",
        label: "Last Updated",
        render: (row) => (
          <span className="">
            {formatDate(row.updated_at || row.created_at || "")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (row) => {
          const isRunning = runningCases[row.id] || false;
          return (
            <div className="flex items-center justify-end gap-2 pr-2">
              <button
                onClick={() => handleRunTestCase(row.id)}
                disabled={isRunning}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#112868]/20 rounded-md text-xs font-medium bg-white text-[#112868] hover:bg-[#112868]/5 transition-colors cursor-pointer disabled:opacity-50 select-none"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#112868]" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-[#112868] text-[#112868]" />
                )}
                {isRunning ? "Running..." : "Run Test"}
              </button>
              <ActionDropdown
                actions={[
                  {
                    icon: <Eye className="w-3.5 h-3.5 shrink-0" />,
                    label: "View Test Results",
                    onClick: () => {
                      setSelectedTestCaseId(row.id);
                      setSelectedTestCaseName(row.name);
                      setIsResultsListModalOpen(true);
                    },
                  },
                  // {
                  //   icon: <Eye className="w-3.5 h-3.5 shrink-0" />,
                  //   label: "View Test Case",
                  //   onClick: () => showToast.info("View Test Case details..."),
                  // },
                  // {
                  //   icon: <Edit className="w-3.5 h-3.5 shrink-0" />,
                  //   label: "Edit Test Case",
                  //   onClick: () => showToast.info("Edit Test Case..."),
                  // },
                  // {
                  //   icon: <Trash2 className="w-3.5 h-3.5 shrink-0" />,
                  //   label: "Delete Test Case",
                  //   variant: "danger",
                  //   onClick: () => showToast.info("Delete Test Case..."),
                  // },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [prompt, testCases, runningCases],
  );

  return (
    <Layout
      currentPage="Prompt Management"
      breadcrumbs={[
        { label: "AI Prompts", path: "/tenant/ai/prompts" },
        { label: "Prompt Test Cases" },
      ]}
      pageHeader={{
        title: "Prompt Test Cases",
        description: "Manage and execute test cases for your prompt templates.",
        action: (
          <PrimaryButton
            onClick={() =>
              navigate(`/tenant/ai/prompts/${promptId}/test-cases/create`)
            }
            className="flex items-center gap-2 h-10 shadow-sm bg-[#112868] text-white hover:bg-[#112868]/90"
          >
            <Plus className="w-4 h-4" />
            Create Test Cases
          </PrimaryButton>
        ),
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="overflow-hidden select-none">
          <DataTable
            data={testCases}
            columns={columns}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            error={error}
            emptyMessage="No test cases found."
            expandableRows={true}
            isRowExpanded={(item) => !!expandedRows[item.id]}
            onRowExpandToggle={(item) => toggleRowExpansion(item.id)}
            showExpandColumn={true}
            expandedColSpan={columns.length + 1}
            renderExpandedRow={(item: any) => (
              <div className="flex flex-col gap-4 w-full">
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block select-none">
                    Input Variables
                  </span>
                  {item.input_variables &&
                  Object.keys(item.input_variables).length > 0 ? (
                    <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex flex-col gap-2">
                      {Object.entries(item.input_variables).map(
                        ([key, value]) => (
                          <div key={key} className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-600">
                              {key}:
                            </span>
                            <span className="text-xs text-slate-700 font-mono bg-slate-50 p-1.5 rounded border border-slate-100/80 break-words whitespace-pre-wrap">
                              {String(value)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      No input variables defined.
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block select-none">
                    Expected Output
                  </span>
                  {item.expected_output ? (
                    <div className="bg-white border border-slate-200/60 p-3 rounded-lg text-slate-700 font-mono p-1.5 break-words whitespace-pre-wrap">
                      {item.expected_output}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      No expected output defined.
                    </span>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      <PromptTestCaseResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        result={selectedResult}
      />

      <PromptTestCaseResultsListModal
        isOpen={isResultsListModalOpen}
        onClose={() => setIsResultsListModalOpen(false)}
        testCaseId={selectedTestCaseId}
        testCaseName={selectedTestCaseName}
      />
    </Layout>
  );
};

export default PromptTestCases;
