import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { FormSelect, PrimaryButton, StatusBadge, FormSlider, MarkdownViewer } from "@/components/shared";
import { aiService } from "@/services/ai-service";
import type { AIProviderInfo } from "@/types/ai";
import { showToast } from "@/utils/toast";
import { Bot, Send, User } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const playgroundSchema = z.object({
  user: z.string().min(1, "Message is required"),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(1).max(128000),
});

type PlaygroundFormData = z.infer<typeof playgroundSchema>;

const CompletionCreate = (): ReactElement => {
  const [apiProviders, setApiProviders] = useState<AIProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isPlaygroundMode, setIsPlaygroundMode] = useState<boolean>(true);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PlaygroundFormData>({
    resolver: zodResolver(playgroundSchema),
    defaultValues: {
      user: "",
      provider: "gemini",
      model: "",
      temperature: 0.7,
      max_tokens: 1024,
    },
  });

  const [lastSentUserMessage, setLastSentUserMessage] = useState<string>("");
  const [displayedResponse, setDisplayedResponse] = useState<string>("");
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [responseData, setResponseData] = useState({
    content: "",
    provider: "",
    model: "",
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    cost: 0,
    latency_ms: 0,
    fallbackUsed: false,
  });

  const selectedProvider = watch("provider");

  const providerOptions = useMemo(
    () => apiProviders.map((p) => ({ value: p.name, label: p.displayName || p.name })),
    [apiProviders],
  );

  const providerDetail = apiProviders.find((p) => p.name === selectedProvider);
  const modelOptions = useMemo(
    () =>
      (providerDetail?.models || []).map((m) => ({
        value: m,
        label: `${m}${m === providerDetail?.defaultModel ? " • default" : ""}`,
      })),
    [providerDetail],
  );

  const loadOptions = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const providerData = await aiService.getProviders();
      setApiProviders(providerData);

      if (providerData.length > 0) {
        const initialProvider = "gemini";
        const matchedProvider = providerData.find((p) => p.name === initialProvider) || providerData[0];
        setValue("provider", matchedProvider.name);
        if (matchedProvider.defaultModel) {
          setValue("model", matchedProvider.defaultModel);
        } else if (matchedProvider.models && matchedProvider.models.length > 0) {
          setValue("model", matchedProvider.models[0]);
        }
      }
    } catch (err: any) {
      showToast.error(err?.response?.data?.error?.message || "Failed to load provider options");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  const onSend = async (data: PlaygroundFormData): Promise<void> => {
    const userMessage = data.user.trim();
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setLastSentUserMessage(userMessage);
    setDisplayedResponse("");
    setIsSending(true);
    try {
      const result = isPlaygroundMode
        ? await aiService.playground({
            messages: [{ role: "user", content: userMessage }],
            provider: data.provider || undefined,
            model: data.model || undefined,
            temperature: data.temperature,
            max_tokens: data.max_tokens,
          })
        : await aiService.createCompletion({
            messages: [{ role: "user", content: userMessage }],
            provider: data.provider || undefined,
            model: data.model || undefined,
            temperature: data.temperature,
            max_tokens: data.max_tokens,
          });

      setResponseData({
        content: result.content || "",
        provider: result.provider || "",
        model: result.model || "",
        prompt_tokens: result.usage?.prompt_tokens || 0,
        completion_tokens: result.usage?.completion_tokens || 0,
        total_tokens: result.usage?.total_tokens || 0,
        cost: result.cost || 0,
        latency_ms: result.latency_ms || 0,
        fallbackUsed: Boolean(result.fallbackUsed),
      });

      const fullText = result.content || "";
      if (!fullText) {
        setDisplayedResponse("");
      } else {
        let index = 0;
        typingIntervalRef.current = setInterval(() => {
          index += 1;
          setDisplayedResponse(fullText.slice(0, index));
          if (index >= fullText.length && typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
        }, 12);
      }

      showToast.success(
        isPlaygroundMode ? "Playground response received" : "Completion created and saved to history",
      );
      setValue("user", "");
    } catch (err: any) {
      showToast.error(
        err?.response?.data?.error?.message ||
          (isPlaygroundMode ? "Playground request failed" : "Failed to create completion"),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Layout
      currentPage="Create Completion"
      breadcrumbs={[
        { label: "Completions", path: "/tenant/ai/completions" },
        { label: "Create Completion" },
      ]}
      pageHeader={{
        title: "Completions Playground",
        description:
          "Switch between sandbox testing and persisted completion creation, matching the playground workflow.",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px] gap-3 md:gap-4">
        <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden min-h-[420px] md:min-h-[560px] lg:min-h-[640px] flex flex-col order-2 lg:order-1">
          <div className="flex-1 p-3 md:p-4 lg:p-5 bg-[#fcfdff]">
            <div className="max-w-[860px] mx-auto space-y-3 md:space-y-4">
              {!lastSentUserMessage && !isSending && !displayedResponse ? (
                <div className="h-full min-h-[260px] md:min-h-[320px] flex items-center justify-center">
                  <p className="text-xs md:text-sm text-[#94a3b8] text-center px-4">
                    Start by typing a message and click Send.
                  </p>
                </div>
              ) : (
                <>
                  {lastSentUserMessage && (
                    <>
                      <div className="flex items-center justify-end gap-2">
                        <p className="text-[10px] md:text-[11px] font-semibold text-[#6b7280] uppercase">You</p>
                        <User className="w-3.5 h-3.5 text-[#6b7280]" />
                      </div>
                      <div className="ml-auto max-w-[92%] sm:max-w-[86%] md:max-w-[80%] rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-sm text-[#0f1724] shadow-[0px_2px_10px_rgba(0,0,0,0.03)] break-words">
                        {lastSentUserMessage}
                      </div>
                    </>
                  )}

                  {isSending && (
                    <>
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-[#6b7280]" />
                        <p className="text-[10px] md:text-[11px] font-semibold text-[#6b7280] uppercase">Calling LLM</p>
                      </div>
                      <div className="max-w-[180px] md:max-w-[220px] rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-lg text-[#6b7280]">
                        ...
                      </div>
                    </>
                  )}

                  {(displayedResponse || responseData.content) && !isSending && (
                    <>
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-[#6b7280]" />
                        <p className="text-[10px] md:text-[11px] font-semibold text-[#6b7280] uppercase">Assistant</p>
                      </div>
                      <div className="w-full max-w-[96%] sm:max-w-[92%] md:max-w-[88%] rounded-xl border-2 border-[#3B82F6] bg-white px-3 md:px-4 py-3 min-h-[160px] md:min-h-[200px]">
                        <MarkdownViewer content={displayedResponse || responseData.content} />
                      </div>
                    </>
                  )}
                </>
              )}

              {(displayedResponse || responseData.content) && (
                <div className="pt-1 flex flex-wrap gap-1.5 md:gap-2">
                  <StatusBadge variant="process">{responseData.provider || "Provider -"}</StatusBadge>
                  <StatusBadge variant="process">{responseData.model || "Model -"}</StatusBadge>
                  <StatusBadge variant="success">{responseData.latency_ms ? `${responseData.latency_ms} ms` : "Latency -"}</StatusBadge>
                  <StatusBadge variant={responseData.fallbackUsed ? "failure" : "success"}>
                    {responseData.fallbackUsed ? "Fallback Used" : "No Fallback"}
                  </StatusBadge>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 md:p-3 border-t border-[rgba(0,0,0,0.08)] bg-white">
            <div className="flex gap-2 items-center">
              <Controller
                name="user"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    placeholder="Type your message here..."
                    className="flex-1 h-10 md:h-11 px-3 rounded-lg border border-[rgba(0,0,0,0.12)] text-sm text-[#0f1724] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#112868]/20"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSubmit(onSend)();
                      }
                    }}
                  />
                )}
              />
              <PrimaryButton
                onClick={handleSubmit(onSend)}
                disabled={isSending || isLoading}
                className="h-10 md:h-11 px-3 md:px-4 min-w-[84px] md:min-w-[96px] shrink-0"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">{isSending ? "Sending..." : "Send"}</span>
              </PrimaryButton>
            </div>
            {errors.user && <p className="text-[10px] text-red-500 mt-1">{errors.user.message}</p>}
          </div>
        </section>

        <aside className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-3 md:p-4 h-fit order-1 lg:order-2 lg:sticky lg:top-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#0f1724]">Playground Mode</h3>
            <button
              type="button"
              onClick={() => setIsPlaygroundMode((prev) => !prev)}
              className={`w-10 h-5 rounded-full relative transition-colors ${isPlaygroundMode ? "bg-[#3B82F6]" : "bg-[#e2e8f0]"}`}
              aria-label="Toggle playground mode"
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border border-[rgba(0,0,0,0.1)] transition-all ${
                  isPlaygroundMode ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-[#6b7280] mb-4">
            {isPlaygroundMode
              ? "Enabled: sends POST `/ai/playground` (non-persistent)."
              : "Disabled: sends POST `/ai/completions` (saved in history)."}
          </p>

          <h3 className="text-sm font-semibold text-[#0f1724] mb-3">Model Configuration</h3>

          <Controller
            name="provider"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                label="Provider"
                options={providerOptions}
                onValueChange={(value) => {
                  field.onChange(value);
                  const pDetail = apiProviders.find((p) => p.name === value);
                  if (pDetail && pDetail.defaultModel) {
                    setValue("model", pDetail.defaultModel);
                  } else if (pDetail && pDetail.models && pDetail.models.length > 0) {
                    setValue("model", pDetail.models[0]);
                  } else {
                    setValue("model", "");
                  }
                }}
              />
            )}
          />

          <Controller
            name="model"
            control={control}
            render={({ field }) => (
              <FormSelect
                {...field}
                label="Model"
                options={modelOptions}
                placeholder="Provider default"
                onValueChange={field.onChange}
              />
            )}
          />

          <Controller
            name="temperature"
            control={control}
            render={({ field }) => (
              <FormSlider
                {...field}
                label="Temperature"
                min={0}
                max={2}
                step={0.1}
                helperText="Lower values make output more deterministic"
                error={errors.temperature?.message}
              />
            )}
          />

          <Controller
            name="max_tokens"
            control={control}
            render={({ field }) => (
              <FormSlider
                {...field}
                label="Max Tokens"
                min={1}
                max={5000}
                step={1}
                helperText="Maximum response token budget for generated output."
                error={errors.max_tokens?.message}
              />
            )}
          />

          {/* <div className="mt-2 mb-4 flex gap-2">
            <SecondaryButton onClick={() => void loadOptions()}>Reload Options</SecondaryButton>
          </div> */}

          <div className="border border-[rgba(0,0,0,0.08)] rounded-lg p-3 bg-[#f8fafc]">
            <p className="text-xs font-semibold text-[#6b7280] uppercase mb-2">Last Request Stats</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded p-2">
                <p className="text-[11px] text-[#6b7280]">Prompt Tokens</p>
                <p className="font-semibold text-[#0f1724]">{responseData.prompt_tokens}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded p-2">
                <p className="text-[11px] text-[#6b7280]">Completion Tokens</p>
                <p className="font-semibold text-[#0f1724]">{responseData.completion_tokens}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded p-2">
                <p className="text-[11px] text-[#6b7280]">Total Tokens</p>
                <p className="font-semibold text-[#0f1724]">{responseData.total_tokens}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded p-2">
                <p className="text-[11px] text-[#6b7280]">Cost (USD)</p>
                <p className="font-semibold text-[#0f1724]">${responseData.cost.toFixed(4)}</p>
              </div>
              <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded p-2 col-span-2">
                <p className="text-[11px] text-[#6b7280]">Latency</p>
                <p className="font-semibold text-[#0f1724]">{responseData.latency_ms} ms</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default CompletionCreate;
