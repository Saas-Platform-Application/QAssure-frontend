import type { ReactElement } from "react";
import { Modal, MarkdownViewer } from "@/components/shared";
import { Cpu, DollarSign, Clock, CheckCircle } from "lucide-react";

interface PromptTestCaseResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
}

export const PromptTestCaseResultModal = ({
  isOpen,
  onClose,
  result,
}: PromptTestCaseResultModalProps): ReactElement | null => {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Test Case Run Results"
      description="Review LLM testing details, latency, and token consumption."
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-6 bg-slate-50/40 select-none">
        {/* Performance & Usage Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Provider Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] p-3.5 rounded-xl shadow-sm flex flex-col gap-1 justify-between min-h-[72px]">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-500" /> Provider & Model
            </span>
            <span className="text-xs font-semibold text-slate-800 break-words mt-1">
              {result.provider || "N/A"}
            </span>
            <span className="text-[10px] font-medium text-slate-500 break-words">
              {result.model || "N/A"}
            </span>
          </div>

          {/* Latency Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] p-3.5 rounded-xl shadow-sm flex flex-col gap-1 justify-between min-h-[72px]">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Latency
            </span>
            <span className="text-sm md:text-base font-bold text-slate-800 mt-1">
              {result.latency_ms ? `${(result.latency_ms / 1000).toFixed(2)}s` : "N/A"}
            </span>
            <span className="text-[10px] text-slate-400">Response time</span>
          </div>

          {/* Tokens Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] p-3.5 rounded-xl shadow-sm flex flex-col gap-1 justify-between min-h-[72px]">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              Token Usage
            </span>
            <span className="text-sm md:text-base font-bold text-slate-800 mt-1">
              {result.usage?.total_tokens || result.usage?.totalTokens || 0}
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              In: {result.usage?.prompt_tokens || result.usage?.promptTokens || 0} • Out:{" "}
              {result.usage?.completion_tokens || result.usage?.completionTokens || 0}
            </span>
          </div>

          {/* Cost Card */}
          <div className="bg-white border border-[rgba(0,0,0,0.06)] p-3.5 rounded-xl shadow-sm flex flex-col gap-1 justify-between min-h-[72px]">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-green-500" /> Cost
            </span>
            <span className="text-sm md:text-base font-bold text-slate-800 mt-1">
              {result.cost !== undefined ? `$${result.cost}` : "$0.00"}
            </span>
            <span className="text-[10px] text-slate-400">Total API cost</span>
          </div>
        </div>

        {/* Prompt Input / Rendered Prompt */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 tracking-wide uppercase select-none">
            Rendered Prompt
          </span>
          <div className="bg-slate-100/80 border border-slate-200/60 p-4 rounded-xl max-h-40 overflow-y-auto font-mono text-xs text-slate-700 select-all leading-relaxed break-words whitespace-pre-wrap">
            {result.renderedPrompt || result.prompt || "No rendered prompt available."}
          </div>
        </div>

        {/* Expected Output */}
        {result.expectedOutput && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase flex items-center gap-1 select-none">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> Expected Output
            </span>
            <div className="bg-emerald-50/50 border border-emerald-200/40 p-4 rounded-xl max-h-40 overflow-y-auto text-xs text-slate-700 select-all">
              <MarkdownViewer content={result.expectedOutput} />
            </div>
          </div>
        )}

        {/* Response Content */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 tracking-wide uppercase select-none">
            LLM Response Content
          </span>
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl min-h-[140px] max-h-[300px] overflow-y-auto text-xs text-slate-800 select-all">
            {result.content || result.response ? (
              <MarkdownViewer content={result.content || result.response} />
            ) : (
              "No output response content."
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
