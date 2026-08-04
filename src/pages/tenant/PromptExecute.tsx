import { useEffect, useMemo, useState, useRef, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  FormSelect,
  PrimaryButton,
  SecondaryButton,
  FormSlider,
  FormTextArea,
  StatusBadge,
  MarkdownViewer,
} from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIPrompt, AICompletion, AIProviderInfo } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { 
  Sparkles, 
  Terminal, 
  Sliders, 
  AlertCircle, 
  Cpu, 
  Clock, 
  DollarSign, 
  Activity, 
  BookOpen,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

const PromptExecute = (): ReactElement => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [apiProviders, setApiProviders] = useState<AIProviderInfo[]>([]);
  const [prompt, setPrompt] = useState<AIPrompt | null>(null);

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
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  // State & Refs for smooth typing effect
  const [displayedContent, setDisplayedContent] = useState("");
  const typingTimerRef = useRef<any>(null);
  const targetContentRef = useRef("");
  const displayedContentRef = useRef("");
  const finalResultRef = useRef<AICompletion | null>(null);
  const isStreamDoneRef = useRef(false);
  const isCancelledRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const loadData = async (): Promise<void> => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [providerData, promptData] = await Promise.all([
        aiService.getProviders(),
        aiService.getPrompt(id),
      ]);

      setApiProviders(providerData);
      setPrompt(promptData);

      // Initialize dynamic variables form inputs
      const initialVars: Record<string, string> = {};
      (promptData.variables || []).forEach((v) => {
        initialVars[v.name] = String(v.default || "");
      });
      setVariables(initialVars);

      // Initialize parameters overrides
      setProvider(promptData.defaultParameters?.provider || "");
      setModel(promptData.defaultParameters?.model || "");
      setTemperature(promptData.defaultParameters?.temperature ?? 0.7);
      setMaxTokens(promptData.defaultParameters?.max_tokens ?? 2048);
    } catch (err: unknown) {
      showToast.error(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || "Failed to load prompt configuration data",
      );
      navigate("/tenant/ai/prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

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

  // Clean up typing timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  // Auto scroll as text is typed in real-time
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayedContent]);

  const startTypingEffect = () => {
    if (typingTimerRef.current) return;

    const tick = () => {
      const currentLen = displayedContentRef.current.length;
      const target = targetContentRef.current;
      const targetLen = target.length;

      if (currentLen >= targetLen) {
        if (isStreamDoneRef.current) {
          // Stream completed and we have caught up typing all text!
          if (finalResultRef.current) {
            setResult(finalResultRef.current);
          }
          setIsExecuting(false);
          showToast.success("Prompt template executed successfully!");

          if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
          }
        }
        return;
      }

      // Smart speed: adjust speed based on how far back we are
      const lag = targetLen - currentLen;
      let charsToType = 1;
      if (lag > 100) charsToType = 5;
      else if (lag > 50) charsToType = 3;
      else if (lag > 20) charsToType = 2;

      const nextText = target.slice(0, currentLen + charsToType);
      displayedContentRef.current = nextText;
      setDisplayedContent(nextText);
    };

    typingTimerRef.current = setInterval(tick, 15);
  };

  const handleCancel = async (): Promise<void> => {
    if (!id || !activeRequestId) {
      showToast.error("No active request found to cancel.");
      return;
    }
    
    // If the stream is already finished and we are just catching up on typing,
    // don't hit the backend cancel endpoint since it will return NOT_FOUND.
    if (isStreamDoneRef.current) {
      showToast.info("Execution has already completed.");
      setIsExecuting(false);
      return;
    }

    try {
      isCancelledRef.current = true;
      await aiService.cancelPromptExecution(id, activeRequestId);
      showToast.info("Cancellation requested successfully.");

      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      setIsExecuting(false);
      const abortedText = displayedContentRef.current + "\n\n[Execution Cancelled by User]";
      setDisplayedContent(abortedText);
      displayedContentRef.current = abortedText;

      setResult((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          id: "cancelled",
          content: abortedText,
        };
      });
    } catch (err: any) {
      // If the error indicates not found, it means the request already finished or was cancelled.
      const errStr = err.message || String(err);
      if (
        errStr.includes("No active execution") ||
        err.code === "NOT_FOUND" ||
        err.response?.status === 404 ||
        errStr.includes("404")
      ) {
        showToast.info("Execution has already completed.");
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsExecuting(false);
      } else {
        showToast.error("Failed to cancel execution: " + errStr);
      }
    }
  };

  const handleExecute = async (): Promise<void> => {
    if (!prompt || !id) return;

    // Validate required fields
    const missingFields = (prompt.variables || [])
      .filter((v) => v.required && !variables[v.name]?.trim())
      .map((v) => v.name);

    if (missingFields.length > 0) {
      showToast.error(`Please provide values for required variables: ${missingFields.join(", ")}`);
      return;
    }

    // Reset typing loop variables & refs
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setDisplayedContent("");
    displayedContentRef.current = "";
    targetContentRef.current = "";
    finalResultRef.current = null;
    isStreamDoneRef.current = false;
    isCancelledRef.current = false;
    setActiveRequestId(null);

    setIsExecuting(true);
    setResult({
      id: "streaming",
      provider: provider || prompt.defaultParameters?.provider || "AI",
      model: model || prompt.defaultParameters?.model || "Model",
      content: "",
      created_at: new Date().toISOString(),
    });
    setError(null);

    const payload = {
      variables: variables,
      provider: provider || undefined,
      model: model || undefined,
      temperature: temperature,
      max_tokens: maxTokens,
    };

    await aiService.executePromptStream(
      id,
      payload,
      (chunk) => {
        targetContentRef.current += chunk;
        startTypingEffect();
      },
      (finalData) => {
        finalResultRef.current = finalData;
        isStreamDoneRef.current = true;
        // Trigger catching up immediately
        startTypingEffect();
      },
      (errMessage) => {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        // If the user cancelled the execution, we ignore the subsequent network abort/error.
        if (isCancelledRef.current) {
          return;
        }
        setError(errMessage);
        setResult(null);
        setIsExecuting(false);
        showToast.error(errMessage);
      },
      (requestId) => {
        setActiveRequestId(requestId);
      }
    );
  };

  if (isLoading) {
    return (
      <Layout currentPage="Execute Prompt">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#112868] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading prompt details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Execute Prompt"
      breadcrumbs={[
        { label: "AI Prompts", path: "/tenant/ai/prompts" },
        { label: "Execute Prompt" },
      ]}
      pageHeader={{
        title: (
          <div className="flex items-center gap-3">
            <span>Execute Prompt</span>
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
        description: "Compile template variables and execute the prompt.",
        action: (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => navigate("/tenant/ai/prompts")} disabled={isExecuting}>
              Back to Prompts
            </SecondaryButton>
            {isExecuting ? (
              <PrimaryButton onClick={handleCancel} className="bg-red-600 hover:bg-red-700 border-red-600 text-white">
                Cancel
              </PrimaryButton>
            ) : (
              <PrimaryButton onClick={handleExecute}>
                Execute Prompt
              </PrimaryButton>
            )}
          </div>
        ),
      }}
    >
      <div className="flex items-start gap-6">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6 flex-[2]">
          {/* Variables form */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-3">
              <Terminal className="w-4 h-4 text-[#112868]" />
              Injected Variables Configuration
            </h3>

            {prompt?.variables && prompt.variables.length > 0 ? (
              <div className="space-y-4">
                {prompt.variables.map((variable) => {
                  const isRequired = !!variable.required;
                  const value = variables[variable.name] || "";

                  return (
                    <div key={variable.name} className="flex flex-col gap-1.5">
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
                        rows={variable.name.toLowerCase().includes("text") || variable.name.toLowerCase().includes("doc") ? 4 : 1}
                        className="pb-0"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700">
                This prompt template does not require any dynamic input variables. It will execute with its static contents.
              </div>
            )}
          </div>

          {/* Results box */}
          {(result || error) && (
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 border-b border-gray-100 pb-3">
                <Sparkles className="w-4 h-4 text-[#00cfd5]" />
                Execution Results Output
              </h3>

              {/* Success Result */}
              {result && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge variant="process">
                      <Cpu className="w-3.5 h-3.5 mr-1.5 inline" />
                      {result.provider} • {result.model}
                    </StatusBadge>
                    {result.id === "streaming" ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E6FFFB] text-[#08979C] border border-[#B5F5EC] animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-[#13C2C2] mr-1.5 animate-ping inline-block" />
                          Streaming response...
                        </span>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <StatusBadge variant="success">
                          <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
                          {result.latency_ms} ms
                        </StatusBadge>
                        <StatusBadge variant="success">
                          <DollarSign className="w-3.5 h-3.5 mr-1.5 inline" />
                          USD {Number(result.cost ?? 0).toFixed(6)}
                        </StatusBadge>
                        <StatusBadge variant="process">
                          <Activity className="w-3.5 h-3.5 mr-1.5 inline" />
                          {result.usage?.total_tokens ?? 0} tokens
                        </StatusBadge>
                        {(result.requestId || result.request_id) && (
                          <StatusBadge variant="process">
                            <Tag className="w-3.5 h-3.5 mr-1.5 inline" />
                            ID: {result.requestId || result.request_id}
                          </StatusBadge>
                        )}
                      </>
                    )}
                  </div>

                  <div 
                    ref={scrollContainerRef}
                    className="bg-[#f8fafc] border border-gray-200 rounded-lg p-5 max-h-[480px] overflow-y-auto leading-relaxed shadow-inner font-sans text-gray-800"
                  >
                    <MarkdownViewer content={result.id === "streaming" ? displayedContent : (result.content || "")} />
                  </div>
                </div>
              )}

              {/* Error Result */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg p-4 text-red-800 text-xs shadow-sm leading-relaxed">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Prompt Execution Failed</p>
                    <p className="font-mono text-[11px] bg-red-100/30 p-2.5 rounded border border-red-200/50 mt-1.5">
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-6 flex-1 max-w-[320px] w-full">
          {/* Metadata Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-gray-500" />
              Template Details
            </h3>
            
            <div className="space-y-3 pt-1 text-xs">
              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Name</span>
                <span className="font-semibold text-gray-800 text-[13px]">{prompt?.name}</span>
              </div>
              
              {prompt?.description && (
                <div>
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Description</span>
                  <span className="text-gray-600">{prompt.description}</span>
                </div>
              )}

              <div>
                <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px]">Use Case</span>
                <span className="inline-flex items-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 text-[11px] font-medium text-[#1e293b] mt-0.5">
                  {prompt?.useCase}
                </span>
              </div>

              {prompt?.tags && prompt.tags.length > 0 && (
                <div>
                  <span className="text-gray-400 font-bold uppercase tracking-wider block text-[10px] mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
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

          {/* Configuration Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-gray-500" />
              Parameter Overrides
            </h3>

            <div className="space-y-3 pt-1">
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
        </div>
      </div>
    </Layout>
  );
};

export default PromptExecute;
