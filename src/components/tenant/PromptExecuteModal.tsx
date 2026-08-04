import { useEffect, useState, useMemo } from "react";
import {
  Modal,
  PrimaryButton,
  SecondaryButton,
  FormSelect,
  FormSlider,
  FormTextArea,
  StatusBadge,
  MarkdownViewer,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIPrompt, AICompletion, AIProviderInfo } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { Play, Sparkles, Terminal, Sliders, AlertCircle, Cpu, Clock, DollarSign, Activity } from "lucide-react";

interface PromptExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: AIPrompt | null;
}

export const PromptExecuteModal = ({
  isOpen,
  onClose,
  prompt,
}: PromptExecuteModalProps) => {
  const [apiProviders, setApiProviders] = useState<AIProviderInfo[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Form values for variables
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  // Form values for overrides
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Execution result
  const [result, setResult] = useState<AICompletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load providers for override dropdowns
  const loadProviders = async () => {
    try {
      const data = await aiService.getProviders();
      setApiProviders(data);
    } catch (err) {
      console.error("Failed to load providers list", err);
    }
  };

  useEffect(() => {
    if (isOpen && prompt) {
      void loadProviders();
      
      // Initialize dynamic variables form inputs
      const initialVars: Record<string, string> = {};
      (prompt.variables || []).forEach((v) => {
        initialVars[v.name] = String(v.default || "");
      });
      setVariables(initialVars);

      // Initialize parameters overrides
      setProvider(prompt.defaultParameters?.provider || "");
      setModel(prompt.defaultParameters?.model || "");
      setTemperature(prompt.defaultParameters?.temperature ?? 0.7);
      setMaxTokens(prompt.defaultParameters?.max_tokens ?? 2048);

      // Reset prior result states
      setResult(null);
      setError(null);
    }
  }, [isOpen, prompt]);

  // Handle provider changes
  const providersOptions = useMemo(
    () => apiProviders.map((p) => ({ value: p.name, label: p.displayName || p.name })),
    [apiProviders],
  );

  const providerDetail = apiProviders.find((p) => p.name === provider);
  const modelsOptions = useMemo(
    () =>
      (providerDetail?.models || []).map((m) => ({
        value: m,
        label: m,
      })),
    [providerDetail],
  );

  const handleVariableChange = (name: string, value: string) => {
    setVariables((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecute = async () => {
    if (!prompt) return;

    // Validate required fields
    const missingFields = (prompt.variables || [])
      .filter((v) => v.required && !variables[v.name]?.trim())
      .map((v) => v.name);

    if (missingFields.length > 0) {
      showToast.error(`Please provide values for required variables: ${missingFields.join(", ")}`);
      return;
    }

    setIsExecuting(true);
    setResult(null);
    setError(null);

    try {
      const payload = {
        variables: variables,
        provider: provider || undefined,
        model: model || undefined,
        temperature: temperature,
        max_tokens: maxTokens,
      };

      const response = await aiService.executePrompt(prompt.id, payload);
      setResult(response);
      showToast.success("Prompt executed successfully!");
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err.message || "Failed to execute prompt";
      setError(errMsg);
      showToast.error(errMsg);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Run Template - ${prompt?.name}`}
      description="Inbound key variables to compile, render, and execute this prompt template."
      maxWidth="lg"
    >
      <div className="mx-2 space-y-6">
        {/* DYNAMIC VARIABLE INPUTS */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <Terminal className="w-4 h-4 text-[#112868]" />
            Template Variables Input
          </h3>

          {prompt?.variables && prompt.variables.length > 0 ? (
            <div className="space-y-3.5">
              {prompt.variables.map((variable) => {
                const isRequired = !!variable.required;
                const value = variables[variable.name] || "";

                return (
                  <div key={variable.name} className="flex flex-col gap-1">
                    <label className="text-[13px] font-semibold text-gray-700 flex items-center gap-1">
                      {variable.name}
                      {isRequired && <span className="text-red-500 font-bold">*</span>}
                      <span className="text-[10px] text-gray-400 font-normal capitalize">
                        ({variable.type || "string"})
                      </span>
                    </label>
                    
                    <FormTextArea
                      label=""
                      value={value}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={`Enter value for {{${variable.name}}}...`}
                      rows={variable.name.toLowerCase().includes("text") || variable.name.toLowerCase().includes("doc") ? 3 : 1}
                      className="pb-0"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              This prompt template does not require any dynamic input variables. It will execute with its static contents.
            </div>
          )}
        </div>

        {/* PARAMETERS OVERRIDES */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowConfig((open) => !open)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-xs font-bold text-gray-700 hover:bg-gray-100/75 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-gray-500" />
              Runtime Config & Parameter Overrides
            </span>
            <span className="text-gray-400 font-medium text-[11px]">
              {showConfig ? "Hide Parameters" : "Customize Parameters"}
            </span>
          </button>

          {showConfig && (
            <div className="p-4 bg-white border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormSelect
                  label="Override Provider"
                  value={provider}
                  onValueChange={(val) => {
                    setProvider(val);
                    const pDetail = apiProviders.find((p) => p.name === val);
                    if (pDetail && pDetail.defaultModel) {
                      setModel(pDetail.defaultModel);
                    } else if (pDetail && pDetail.models && pDetail.models.length > 0) {
                      setModel(pDetail.models[0]);
                    } else {
                      setModel("");
                    }
                  }}
                  options={providersOptions}
                  className="pb-0"
                />

                <FormSelect
                  label="Override Model"
                  value={model}
                  onValueChange={setModel}
                  options={modelsOptions}
                  className="pb-0"
                  disabled={!provider}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <FormSlider
                  label="Temperature"
                  value={temperature}
                  onChange={setTemperature}
                  min={0}
                  max={2}
                  step={0.1}
                  helperText="Lower values make output deterministic"
                />

                <FormSlider
                  label="Max Tokens"
                  value={maxTokens}
                  onChange={setMaxTokens}
                  min={1}
                  max={5000}
                  step={1}
                  helperText="Maximum completion token budget"
                />
              </div>
            </div>
          )}
        </div>

        {/* EXECUTE ACTION ROW */}
        <div className="flex justify-end gap-3 pt-2">
          <SecondaryButton onClick={onClose} disabled={isExecuting}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center gap-1.5 bg-[#112868] hover:bg-[#0a1b4a]"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            {isExecuting ? "Executing Prompt..." : "Execute Template"}
          </PrimaryButton>
        </div>

        {/* EXECUTION RESULTS CONTAINER */}
        {(result || error) && (
          <div className="border-t border-gray-200 pt-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00cfd5]" />
              Execution Results Output
            </h3>

            {/* Success Results */}
            {result && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant="process">
                    <Cpu className="w-3 h-3 mr-1 inline" />
                    {result.provider} • {result.model}
                  </StatusBadge>
                  <StatusBadge variant="success">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {result.latency_ms} ms
                  </StatusBadge>
                  <StatusBadge variant="success">
                    <DollarSign className="w-3 h-3 mr-1 inline" />
                    USD {Number(result.cost ?? 0).toFixed(5)}
                  </StatusBadge>
                  <StatusBadge variant="process">
                    <Activity className="w-3 h-3 mr-1 inline" />
                    {result.usage?.total_tokens ?? 0} tokens
                  </StatusBadge>
                </div>

                <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-4 max-h-[300px] overflow-y-auto leading-relaxed shadow-inner">
                  <MarkdownViewer content={result.content || ""} />
                </div>
              </div>
            )}

            {/* Error Results */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg p-4 text-red-800 text-xs shadow-sm leading-relaxed">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Prompt Execution Failed</p>
                  <p className="font-mono text-[11px] bg-red-100/30 p-2 rounded border border-red-200/50 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
