import type { ReactElement } from "react";
import { Modal } from "@/components/shared";
import type { TenantAIConfig } from "@/types/ai";
import CodeBadge from "../shared/CodeBadge";

interface ViewAIProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TenantAIConfig | null;
}

export const ViewAIProviderModal = ({
  isOpen,
  onClose,
  config,
}: ViewAIProviderModalProps): ReactElement => {
  if (!config) return <></>;

  const parseArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      return val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Provider Details"
      description="View detailed settings for this AI Provider configuration."
      maxWidth="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm select-none">
        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
            Provider
          </span>
          <span className="text-slate-800 font-medium">{config.provider}</span>
        </div>

        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
            Display Name
          </span>
          <span className="text-slate-800 font-medium">
            {config.display_name || "—"}
          </span>
        </div>

        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
            Config Type
          </span>
          <CodeBadge className="uppercase" label={config.config_type || "direct"} />
        </div>

        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
            Default Model
          </span>
          <span className="text-slate-800 font-medium">
            {config.default_model || "—"}
          </span>
        </div>

        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
            Default Embedding Model
          </span>
          <span className="text-slate-800 font-medium">
            {config.default_embedding_model || "—"}
          </span>
        </div>

        {config.endpoint && (
          <div className="md:col-span-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
              Endpoint URL
            </span>
            <span className="text-slate-800 font-mono break-all select-all">
              {config.endpoint}
            </span>
          </div>
        )}

        <div className="md:col-span-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Custom Models
          </span>
          {parseArray(config.custom_models).length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {parseArray(config.custom_models).map((m: any, idx: any) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded text-xs font-medium border border-slate-200"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-800 font-medium">—</span>
          )}
        </div>

        <div className="md:col-span-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Custom Embedding Models
          </span>
          {parseArray(config.custom_embedding_models).length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {parseArray(config.custom_embedding_models).map(
                (m: any, idx: any) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded text-xs font-medium border border-slate-200"
                  >
                    {m}
                  </span>
                ),
              )}
            </div>
          ) : (
            <span className="text-slate-800 font-medium">—</span>
          )}
        </div>
      </div>

      {/* <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
        <PrimaryButton onClick={onClose} className="h-10 px-5">
          Close
        </PrimaryButton>
      </div> */}
    </Modal>
  );
};
