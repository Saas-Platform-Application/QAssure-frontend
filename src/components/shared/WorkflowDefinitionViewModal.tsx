import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Modal, StatusBadge } from "@/components/shared";
import { workflowService } from "@/services/workflow-service";
import {
  ArrowRight,
  Clock,
  User,
  Users,
  Fingerprint,
  MessageSquare,
  Paperclip,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/utils/format-date";

interface WorkflowDefinitionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitionId: string | null;
  tenantId?: string;
}

const STEP_TYPE_COLORS: Record<string, string> = {
  initial: "bg-blue-100 text-blue-700 border-blue-200",
  task: "bg-purple-100 text-purple-700 border-purple-200",
  approval: "bg-amber-100 text-amber-700 border-amber-200",
  terminal: "bg-slate-100 text-slate-600 border-slate-200",
};

const STEP_CONNECTOR_COLORS: Record<string, string> = {
  initial: "bg-blue-400",
  task: "bg-purple-400",
  approval: "bg-amber-400",
  terminal: "bg-slate-300",
};

const AssigneeIcon = ({ type }: { type: string | null }) => {
  if (type === "role") return <Users className="w-3.5 h-3.5" />;
  if (type === "user") return <User className="w-3.5 h-3.5" />;
  if (type === "originator") return <Fingerprint className="w-3.5 h-3.5" />;
  return null;
};

export const WorkflowDefinitionViewModal = ({
  isOpen,
  onClose,
  definitionId,
  tenantId,
}: WorkflowDefinitionViewModalProps): ReactElement | null => {
  const [definition, setDefinition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && definitionId) {
      const load = async () => {
        try {
          setIsLoading(true);
          setError(null);
          setDefinition(null);
          const res = await workflowService.getDefinition(definitionId, tenantId);
          if (res.success) {
            setDefinition(res.data);
          } else {
            setError("Failed to load workflow definition");
          }
        } catch (err: any) {
          setError(
            err?.response?.data?.error?.message || "Failed to load workflow definition"
          );
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }
    if (!isOpen) {
      setDefinition(null);
      setError(null);
    }
  }, [isOpen, definitionId, tenantId]);

  const getStatusVariant = (status: string): "success" | "failure" | "info" | "process" => {
    if (status === "active") return "success";
    if (status === "deprecated") return "failure";
    if (status === "draft") return "process";
    return "info";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workflow Definition"
      maxWidth="xl"
    >
      <div className="">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 text-[#112868] animate-spin" />
            <p className="text-sm text-[#64748b]">Loading workflow details...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Content */}
        {definition && !isLoading && (
          <div className="space-y-4">
            {/* ── Header Info ─────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#f8fafc] rounded-xl border border-[rgba(0,0,0,0.06)]">
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Name</p>
                <p className="text-sm font-semibold text-[#0f1724]">{definition.name}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Code</p>
                <p className="text-sm font-mono text-[#475569]">{definition.code}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Version</p>
                <p className="text-sm text-[#475569]">v{definition.version}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Entity Type</p>
                <p className="text-sm text-[#475569] capitalize">{definition.entity_type}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Status</p>
                <StatusBadge variant={getStatusVariant(definition.status)}>
                  {definition.status}
                </StatusBadge>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Module(s)</p>
                <p className="text-sm text-[#475569]">
                  {definition.source_module?.length
                    ? definition.source_module.join(", ")
                    : "—"}
                </p>
              </div>
              {definition.description && (
                <div className="col-span-2 md:col-span-3">
                  <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-[#475569]">{definition.description}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Created By</p>
                <p className="text-sm text-[#475569]">{definition.created_by || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wide mb-1">Created At</p>
                <p className="text-sm text-[#475569]">{formatDate(definition.created_at)}</p>
              </div>
            </div>

            {/* ── Steps ───────────────────────────────────── */}
            {definition.steps?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0f1724] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#112868] text-white text-[10px] flex items-center justify-center font-bold">
                    {definition.steps.length}
                  </span>
                  Workflow Steps
                </h3>
                <div className="space-y-0">
                  {definition.steps
                    .slice()
                    .sort((a: any, b: any) => a.sequence - b.sequence)
                    .map((step: any, idx: number) => (
                      <div key={step.id} className="flex gap-3">
                        {/* Connector column */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                              step.step_type === "initial"
                                ? "bg-blue-500"
                                : step.step_type === "task"
                                ? "bg-purple-500"
                                : step.step_type === "approval"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          >
                            {step.sequence}
                          </div>
                          {idx < definition.steps.length - 1 && (
                            <div
                              className={`w-0.5 flex-1 min-h-[16px] ${
                                STEP_CONNECTOR_COLORS[step.step_type] ?? "bg-slate-200"
                              }`}
                            />
                          )}
                        </div>

                        {/* Step card */}
                        <div
                          className={`flex-1 mb-3 p-3 rounded-lg border ${
                            STEP_TYPE_COLORS[step.step_type] ?? "bg-gray-50 text-gray-700 border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-semibold">{step.name}</p>
                              <p className="text-[11px] font-mono opacity-70">{step.step_code}</p>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/60 border border-current/20">
                              {step.step_type}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-3">
                            {/* Assignee */}
                            {step.assignee?.type && (
                              <div className="flex items-center gap-1 text-[11px] opacity-80">
                                <AssigneeIcon type={step.assignee.type} />
                                <span className="capitalize">{step.assignee.type}</span>
                                {step.assignee.role && (
                                  <span className="font-medium">: {step.assignee.role}</span>
                                )}
                              </div>
                            )}

                            {/* SLA */}
                            {(step.sla?.hours != null ||
                              step.sla?.warning_hours != null ||
                              step.sla?.escalation_hours != null) && (
                              <div className="flex flex-wrap gap-2">
                                {step.sla?.hours != null && (
                                  <div className="flex items-center gap-1 text-[11px] opacity-80">
                                    <Clock className="w-3 h-3" />
                                    <span>SLA: {step.sla.hours}h</span>
                                  </div>
                                )}
                                {step.sla?.warning_hours != null && (
                                  <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Warn: {step.sla.warning_hours}h</span>
                                  </div>
                                )}
                                {step.sla?.escalation_hours != null && (
                                  <div className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                                    <ArrowRight className="w-3 h-3" />
                                    <span>Esc: {step.sla.escalation_hours}h</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Requirements */}
                            {step.requirements?.signature && (
                              <div className="flex items-center gap-1 text-[11px] opacity-80">
                                <Fingerprint className="w-3 h-3" />
                                <span>Signature</span>
                              </div>
                            )}
                            {step.requirements?.comment && (
                              <div className="flex items-center gap-1 text-[11px] opacity-80">
                                <MessageSquare className="w-3 h-3" />
                                <span>Comment</span>
                              </div>
                            )}
                            {step.requirements?.attachment && (
                              <div className="flex items-center gap-1 text-[11px] opacity-80">
                                <Paperclip className="w-3 h-3" />
                                <span>Attachment</span>
                              </div>
                            )}
                          </div>

                          {/* Available actions */}
                          {step.available_actions?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {step.available_actions.map((action: string) => (
                                <span
                                  key={action}
                                  className="px-2 py-0.5 text-[11px] font-medium rounded bg-white/50 border border-current/20"
                                >
                                  {action}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Transitions ─────────────────────────────── */}
            {definition.transitions?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0f1724] mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#112868] text-white text-[10px] flex items-center justify-center font-bold">
                    {definition.transitions.length}
                  </span>
                  Transitions
                </h3>
                <div className="space-y-2">
                  {definition.transitions.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-3 bg-[#f8fafc] rounded-lg border border-[rgba(0,0,0,0.06)] flex-wrap"
                    >
                      {/* From */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[#1e293b] truncate">
                          {t.from_step_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#94a3b8]">{t.from_step_code}</span>
                      </div>

                      {/* Arrow + action */}
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#112868]/10 rounded-full shrink-0">
                        <ChevronRight className="w-3 h-3 text-[#112868]" />
                        <span className="text-[11px] font-semibold text-[#112868]">{t.action}</span>
                        <ArrowRight className="w-3 h-3 text-[#112868]" />
                      </div>

                      {/* To */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-[#1e293b] truncate">
                          {t.to_step_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#94a3b8]">{t.to_step_code}</span>
                      </div>

                      {/* Name */}
                      <span className="ml-auto text-[11px] text-[#64748b] hidden sm:block truncate max-w-[140px]">
                        {t.name}
                      </span>

                      {/* Badges */}
                      <div className="flex gap-1 shrink-0">
                        {t.requires_comment && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full">
                            <MessageSquare className="w-2.5 h-2.5" />
                            Comment
                          </span>
                        )}
                        {t.requires_signature && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full">
                            <Fingerprint className="w-2.5 h-2.5" />
                            Signature
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
