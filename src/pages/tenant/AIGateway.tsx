// import { useEffect, useMemo, useState, type ReactElement } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { Brain, Layers, PlayCircle, Settings2 } from "lucide-react";
// import { Layout } from "@/components/layout/Layout";
// import {
//   DataTable,
//   type Column,
//   FormField,
//   FormSelect,
//   FormTextArea,
//   PrimaryButton,
//   SecondaryButton,
//   StatusBadge,
// } from "@/components/shared";
// import { aiService } from "@/services/ai-service";
// import type {
//   AICompletion,
//   AICostSummary,
//   AIProviderInfo,
//   AIPrompt,
//   KnowledgeCollection,
//   TenantAIConfig,
// } from "@/types/ai";
// import { showToast } from "@/utils/toast";
// import { cn } from "@/lib/utils";

// type TabKey = "gateway" | "config" | "prompts" | "knowledge";

// const getTabFromPath = (pathname: string): TabKey => {
//   if (pathname.endsWith("/ai/config")) return "config";
//   if (pathname.endsWith("/ai/prompts")) return "prompts";
//   if (pathname.endsWith("/ai/knowledge")) return "knowledge";
//   return "gateway";
// };

// const tabPath: Record<TabKey, string> = {
//   gateway: "/tenant/ai",
//   config: "/tenant/ai/config",
//   prompts: "/tenant/ai/prompts",
//   knowledge: "/tenant/ai/knowledge",
// };

// const tabMeta: Record<TabKey, { label: string; icon: any; subtitle: string }> = {
//   gateway: {
//     label: "Completion Playground",
//     icon: PlayCircle,
//     subtitle: "Run completions, monitor health, and review costs.",
//   },
//   config: {
//     label: "Tenant AI Provider Management",
//     icon: Settings2,
//     subtitle: "Configure provider keys/endpoints and test connectivity.",
//   },
//   prompts: {
//     label: "Prompt Management & Testing",
//     icon: Layers,
//     subtitle: "Create prompts, activate them, and test outputs safely.",
//   },
//   knowledge: {
//     label: "RAG Knowledge Workspace",
//     icon: Brain,
//     subtitle: "Create collections, ingest documents, and run context search.",
//   },
// };

// const Card = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
//   <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-5">
//     <div className="mb-4">
//       <h3 className="text-sm md:text-base font-semibold text-[#0f1724]">{title}</h3>
//       {description && <p className="text-xs md:text-sm text-[#6b7280] mt-1">{description}</p>}
//     </div>
//     {children}
//   </section>
// );

// const StatTile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
//   <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-lg p-3">
//     <p className="text-[11px] uppercase tracking-wide text-[#6b7280]">{label}</p>
//     <p className="text-xl font-semibold text-[#0f1724] mt-1">{value}</p>
//     {hint && <p className="text-xs text-[#94a3b8] mt-0.5">{hint}</p>}
//   </div>
// );

// const AIGateway = (): ReactElement => {
//   const location = useLocation();
//   const activeTab = getTabFromPath(location.pathname);
//   const ActiveIcon = tabMeta[activeTab].icon;

//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [providers, setProviders] = useState<AIProviderInfo[]>([]);
//   const [models, setModels] = useState<Array<{ id: string; provider: string; isDefault?: boolean }>>([]);
//   const [completions, setCompletions] = useState<AICompletion[]>([]);
//   const [gatewayHealthy, setGatewayHealthy] = useState<boolean>(true);
//   const [configs, setConfigs] = useState<TenantAIConfig[]>([]);
//   const [prompts, setPrompts] = useState<AIPrompt[]>([]);
//   const [collections, setCollections] = useState<KnowledgeCollection[]>([]);
//   const [costSummary, setCostSummary] = useState<AICostSummary | null>(null);

//   const [completionForm, setCompletionForm] = useState({
//     provider: "",
//     model: "",
//     message: "Define FDA 21 CFR Part 11 in one paragraph.",
//     temperature: "0.3",
//     max_tokens: "250",
//   });
//   const [playgroundResult, setPlaygroundResult] = useState<string>("");
//   const [playgroundMeta, setPlaygroundMeta] = useState<{ provider?: string; model?: string; latency?: number }>({});
//   const [creatingCompletion, setCreatingCompletion] = useState<boolean>(false);
//   const [costFilter, setCostFilter] = useState<{ group_by: "day" | "week" | "month" }>({ group_by: "day" });

//   const [configForm, setConfigForm] = useState({
//     provider: "",
//     config_type: "direct",
//     api_key: "",
//     endpoint: "",
//     default_model: "",
//     custom_models: "",
//   });
//   const [savingConfig, setSavingConfig] = useState<boolean>(false);

//   const [promptForm, setPromptForm] = useState({
//     name: "",
//     use_case: "quality_review",
//     user_template: "Analyze this topic: {{topic}}",
//     system_message: "You are a quality compliance assistant.",
//     provider: "",
//     model: "",
//     temperature: "0.2",
//     max_tokens: "800",
//   });
//   const [creatingPrompt, setCreatingPrompt] = useState<boolean>(false);
//   const [executePromptId, setExecutePromptId] = useState<string>("");
//   const [executeVariables, setExecuteVariables] = useState<string>('{"topic":"CAPA risk assessment"}');
//   const [executeResult, setExecuteResult] = useState<string>("");
//   const [executeMeta, setExecuteMeta] = useState<{ provider?: string; model?: string }>({});

//   const [collectionForm, setCollectionForm] = useState({ name: "", description: "" });
//   const [creatingCollection, setCreatingCollection] = useState<boolean>(false);
//   const [uploadCollectionId, setUploadCollectionId] = useState<string>("");
//   const [uploadFile, setUploadFile] = useState<File | null>(null);
//   const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
//   const [searchQuery, setSearchQuery] = useState<string>("Summarize the regulatory controls from uploaded SOP.");
//   const [searchCollectionId, setSearchCollectionId] = useState<string>("");
//   const [searchResult, setSearchResult] = useState<string>("");

//   const providerOptions = useMemo(
//     () => providers.map((p) => ({ value: p.name, label: p.displayName || p.name })),
//     [providers],
//   );
//   const modelOptions = useMemo(
//     () =>
//       models.map((m) => ({
//         value: m.id,
//         label: `${m.id} (${m.provider})${m.isDefault ? " • default" : ""}`,
//       })),
//     [models],
//   );
//   const collectionOptions = useMemo(
//     () => collections.map((c) => ({ value: c.id, label: c.name })),
//     [collections],
//   );

//   const loadGatewayData = async (): Promise<void> => {
//     setIsLoading(true);
//     try {
//       const [providerData, modelData, healthData, completionData, costs] = await Promise.all([
//         aiService.getProviders(),
//         aiService.getModels(),
//         aiService.getGatewayHealth(),
//         aiService.listCompletions({ page: 1, limit: 10 }),
//         aiService.getCostSummary(costFilter),
//       ]);
//       setProviders(providerData);
//       setModels(modelData);
//       setGatewayHealthy(Boolean(healthData?.healthy));
//       setCompletions(completionData.data || []);
//       setCostSummary(costs);
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to load AI gateway data");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loadConfigData = async (): Promise<void> => {
//     setIsLoading(true);
//     try {
//       const [providerData, configData] = await Promise.all([aiService.getProviders(), aiService.listConfigs()]);
//       setProviders(providerData);
//       setConfigs(configData);
//       setConfigForm((prev) => ({ ...prev, provider: prev.provider || providerData[0]?.name || "" }));
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to load config data");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loadPromptData = async (): Promise<void> => {
//     setIsLoading(true);
//     try {
//       const [providerData, modelData, promptData] = await Promise.all([
//         aiService.getProviders(),
//         aiService.getModels(),
//         aiService.listPrompts({ page: 1, limit: 20 }),
//       ]);
//       setProviders(providerData);
//       setModels(modelData);
//       setPrompts(promptData.data || []);
//       setPromptForm((prev) => ({ ...prev, provider: prev.provider || providerData[0]?.name || "" }));
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to load prompts");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const loadKnowledgeData = async (): Promise<void> => {
//     setIsLoading(true);
//     try {
//       const [providerData, collectionData] = await Promise.all([aiService.getProviders(), aiService.listCollections({ page: 1, limit: 20 })]);
//       setProviders(providerData);
//       setCollections(collectionData.data || []);
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to load knowledge data");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (activeTab === "gateway") void loadGatewayData();
//     if (activeTab === "config") void loadConfigData();
//     if (activeTab === "prompts") void loadPromptData();
//     if (activeTab === "knowledge") void loadKnowledgeData();
//   }, [activeTab, costFilter.group_by]);

//   const handleRunPlayground = async (): Promise<void> => {
//     setCreatingCompletion(true);
//     try {
//       const result = await aiService.playground({
//         messages: [{ role: "user", content: completionForm.message }],
//         provider: completionForm.provider || undefined,
//         model: completionForm.model || undefined,
//         temperature: Number(completionForm.temperature),
//         max_tokens: Number(completionForm.max_tokens),
//       });
//       setPlaygroundResult(result.content || result.response || "");
//       setPlaygroundMeta({ provider: result.provider, model: result.model, latency: result.latency_ms });
//       showToast.success(`Response from ${result.provider || "provider"}`);
//       await loadGatewayData();
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to run completion");
//     } finally {
//       setCreatingCompletion(false);
//     }
//   };

//   const handleSaveConfig = async (): Promise<void> => {
//     setSavingConfig(true);
//     try {
//       await aiService.upsertConfig({
//         provider: configForm.provider,
//         config_type: configForm.config_type as "direct" | "azure",
//         api_key: configForm.api_key,
//         endpoint: configForm.endpoint || undefined,
//         default_model: configForm.default_model || undefined,
//         custom_models: configForm.custom_models
//           ? configForm.custom_models.split(",").map((m) => m.trim()).filter(Boolean)
//           : undefined,
//       });
//       showToast.success("Provider configuration saved");
//       setConfigForm((prev) => ({ ...prev, api_key: "" }));
//       await loadConfigData();
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to save config");
//     } finally {
//       setSavingConfig(false);
//     }
//   };

//   const handleCreatePrompt = async (): Promise<void> => {
//     setCreatingPrompt(true);
//     try {
//       await aiService.createPrompt({
//         name: promptForm.name,
//         use_case: promptForm.use_case,
//         user_template: promptForm.user_template,
//         system_message: promptForm.system_message || undefined,
//         provider: promptForm.provider || undefined,
//         model: promptForm.model || undefined,
//         temperature: Number(promptForm.temperature),
//         max_tokens: Number(promptForm.max_tokens),
//         variables: [{ name: "topic", type: "string", required: true }],
//       });
//       showToast.success("Prompt created");
//       setPromptForm((prev) => ({ ...prev, name: "" }));
//       await loadPromptData();
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to create prompt");
//     } finally {
//       setCreatingPrompt(false);
//     }
//   };

//   const handleExecutePrompt = async (): Promise<void> => {
//     if (!executePromptId) {
//       showToast.error("Select a prompt to test");
//       return;
//     }
//     try {
//       const variables = JSON.parse(executeVariables);
//       const result = await aiService.testPrompt(executePromptId, { variables });
//       setExecuteResult(result.content || result.response || "");
//       setExecuteMeta({ provider: result.provider, model: result.model });
//       showToast.success("Prompt tested successfully");
//     } catch (error: any) {
//       showToast.error(error?.message || error?.response?.data?.error?.message || "Failed to execute prompt");
//     }
//   };

//   const handleCreateCollection = async (): Promise<void> => {
//     setCreatingCollection(true);
//     try {
//       await aiService.createCollection({
//         name: collectionForm.name,
//         description: collectionForm.description || undefined,
//       });
//       setCollectionForm({ name: "", description: "" });
//       showToast.success("Collection created");
//       await loadKnowledgeData();
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to create collection");
//     } finally {
//       setCreatingCollection(false);
//     }
//   };

//   const handleUploadDoc = async (): Promise<void> => {
//     if (!uploadCollectionId || !uploadFile) {
//       showToast.error("Select collection and file");
//       return;
//     }
//     setUploadingDoc(true);
//     try {
//       await aiService.uploadKnowledgeDocument({ collectionId: uploadCollectionId, file: uploadFile });
//       showToast.success("Document uploaded and queued for ingestion");
//       setUploadFile(null);
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "Failed to upload document");
//     } finally {
//       setUploadingDoc(false);
//     }
//   };

//   const handleSearchRag = async (): Promise<void> => {
//     try {
//       const result = await aiService.searchKnowledgeWithContext({
//         query: searchQuery,
//         collectionId: searchCollectionId || undefined,
//         topK: 5,
//         minScore: 0.7,
//       });
//       setSearchResult(result.context || JSON.stringify(result.matches || [], null, 2));
//     } catch (error: any) {
//       showToast.error(error?.response?.data?.error?.message || "RAG search failed");
//     }
//   };

//   const providerColumns: Column<AIProviderInfo>[] = [
//     { key: "name", label: "Provider", render: (row) => row.displayName || row.name },
//     {
//       key: "status",
//       label: "Status",
//       render: (row) => (
//         <StatusBadge variant={row.isEnabled ? "success" : "failure"}>
//           {row.isEnabled ? "Enabled" : "Disabled"}
//         </StatusBadge>
//       ),
//     },
//     { key: "defaultModel", label: "Default Model", render: (row) => row.defaultModel || "-" },
//   ];

//   const completionColumns: Column<AICompletion>[] = [
//     { key: "provider", label: "Provider", render: (row) => row.provider || "-" },
//     { key: "model", label: "Model", render: (row) => row.model || "-" },
//     { key: "tokens", label: "Tokens", align: "right", render: (row) => String(row.usage?.total_tokens ?? 0) },
//     {
//       key: "fallback",
//       label: "Fallback",
//       render: (row) => (
//         <StatusBadge variant={row.fallbackUsed ? "process" : "success"}>
//           {row.fallbackUsed ? "Used" : "No"}
//         </StatusBadge>
//       ),
//     },
//     { key: "latency", label: "Latency", align: "right", render: (row) => `${row.latency_ms ?? 0} ms` },
//   ];

//   const providerCostColumns: Column<{ provider: string; completions: number; tokens: number; cost: number }>[] = [
//     { key: "provider", label: "Provider" },
//     { key: "completions", label: "Completions", align: "right" },
//     { key: "tokens", label: "Tokens", align: "right" },
//     { key: "cost", label: "Cost (USD)", align: "right", render: (row) => `$${(row.cost || 0).toFixed(4)}` },
//   ];

//   const configColumns: Column<TenantAIConfig>[] = [
//     { key: "provider", label: "Provider" },
//     { key: "config_type", label: "Config Type" },
//     { key: "default_model", label: "Default Model", render: (row) => row.default_model || "-" },
//     {
//       key: "state",
//       label: "State",
//       render: (row) => (
//         <StatusBadge variant={row.is_active ? "success" : "failure"}>
//           {row.is_active ? "Active" : "Inactive"}
//         </StatusBadge>
//       ),
//     },
//     {
//       key: "actions",
//       label: "Actions",
//       align: "right",
//       render: (row) => (
//         <div className="flex justify-end gap-3">
//           <button
//             className="text-xs font-medium text-[#112868] cursor-pointer"
//             onClick={async () => {
//               const health = await aiService.testConfig(row.provider);
//               showToast[health.healthy ? "success" : "error"](
//                 health.healthy ? `${row.provider} healthy` : `${row.provider} unhealthy`,
//               );
//               await loadConfigData();
//             }}
//           >
//             Test
//           </button>
//           <button
//             className="text-xs font-medium text-[#ef4444] cursor-pointer"
//             onClick={async () => {
//               await aiService.deleteConfig(row.provider);
//               showToast.success("Config removed");
//               await loadConfigData();
//             }}
//           >
//             Delete
//           </button>
//         </div>
//       ),
//     },
//   ];

//   const promptColumns: Column<AIPrompt>[] = [
//     { key: "name", label: "Prompt Name" },
//     { key: "useCase", label: "Use Case" },
//     { key: "provider", label: "Provider", render: (row) => row.defaultParameters?.provider || "-" },
//     { key: "model", label: "Model", render: (row) => row.defaultParameters?.model || "-" },
//     {
//       key: "status",
//       label: "Status",
//       render: (row) => (
//         <StatusBadge variant={row.status === "active" ? "success" : "process"}>
//           {row.status || "draft"}
//         </StatusBadge>
//       ),
//     },
//     {
//       key: "activate",
//       label: "Action",
//       align: "right",
//       render: (row) => (
//         <button
//           className="text-xs font-medium text-[#112868] cursor-pointer"
//           onClick={async () => {
//             await aiService.updatePromptStatus(row.id, "active");
//             showToast.success("Prompt activated");
//             await loadPromptData();
//           }}
//         >
//           Activate
//         </button>
//       ),
//     },
//   ];

//   const collectionColumns: Column<KnowledgeCollection>[] = [
//     { key: "name", label: "Collection" },
//     { key: "description", label: "Description", render: (row) => row.description || "-" },
//     {
//       key: "status",
//       label: "Status",
//       render: (row) => (
//         <StatusBadge variant={row.status === "active" ? "success" : "process"}>
//           {row.status || "active"}
//         </StatusBadge>
//       ),
//     },
//   ];

//   return (
//     <Layout
//       currentPage="AI Services"
//       pageHeader={{
//         title: "AI Services Workspace",
//         description: "Completion playground, provider management, prompt lifecycle, cost dashboard, and RAG operations.",
//       }}
//     >
//       <div className="space-y-5">
//         <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//             <div className="flex items-center gap-2">
//               <div className="w-8 h-8 rounded-md bg-[#112868] text-white flex items-center justify-center">
//                 <ActiveIcon className="w-4 h-4" />
//               </div>
//               <div>
//                 <p className="text-sm font-semibold text-[#0f1724]">{tabMeta[activeTab].label}</p>
//                 <p className="text-xs text-[#6b7280]">{tabMeta[activeTab].subtitle}</p>
//               </div>
//             </div>
//             <div className="flex flex-wrap items-center gap-2">
//               {(Object.keys(tabPath) as TabKey[]).map((tab) => {
//                 const Icon = tabMeta[tab].icon;
//                 return (
//                   <Link
//                     key={tab}
//                     to={tabPath[tab]}
//                     className={cn(
//                       "px-3 py-2 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
//                       activeTab === tab ? "bg-[#112868] text-white" : "bg-[#f5f7fa] text-[#0f1724] hover:bg-gray-100",
//                     )}
//                   >
//                     <Icon className="w-3.5 h-3.5" />
//                     {tabMeta[tab].label}
//                   </Link>
//                 );
//               })}
//             </div>
//           </div>
//         </div>

//         {activeTab === "gateway" && (
//           <>
//             <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
//               <StatTile label="Gateway Health" value={gatewayHealthy ? "Healthy" : "Degraded"} />
//               <StatTile label="Providers" value={String(providers.length)} />
//               <StatTile label="Completions" value={String(costSummary?.summary.total_completions || 0)} />
//               <StatTile label="AI Cost" value={`$${(costSummary?.summary.total_cost || 0).toFixed(4)}`} hint="Current filtered period" />
//             </div>

//             <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
//               <Card
//                 title="Completion Playground"
//                 description="Send quick prompts against selected provider/model before binding to prompt templates."
//               >
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <FormSelect
//                     label="Provider"
//                     value={completionForm.provider}
//                     onValueChange={(value) => setCompletionForm((prev) => ({ ...prev, provider: value }))}
//                     options={providerOptions}
//                     placeholder="Auto"
//                   />
//                   <FormSelect
//                     label="Model"
//                     value={completionForm.model}
//                     onValueChange={(value) => setCompletionForm((prev) => ({ ...prev, model: value }))}
//                     options={modelOptions}
//                     placeholder="Provider default"
//                   />
//                 </div>
//                 <FormTextArea
//                   label="Prompt"
//                   value={completionForm.message}
//                   onChange={(e) => setCompletionForm((prev) => ({ ...prev, message: e.target.value }))}
//                 />
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <FormField
//                     label="Temperature"
//                     type="number"
//                     value={completionForm.temperature}
//                     onChange={(e) => setCompletionForm((prev) => ({ ...prev, temperature: e.target.value }))}
//                   />
//                   <FormField
//                     label="Max Tokens"
//                     type="number"
//                     value={completionForm.max_tokens}
//                     onChange={(e) => setCompletionForm((prev) => ({ ...prev, max_tokens: e.target.value }))}
//                   />
//                 </div>
//                 <div className="flex gap-2">
//                   <PrimaryButton onClick={handleRunPlayground} disabled={creatingCompletion}>
//                     {creatingCompletion ? "Running..." : "Run Playground"}
//                   </PrimaryButton>
//                   <SecondaryButton onClick={() => void loadGatewayData()}>Refresh Data</SecondaryButton>
//                 </div>
//               </Card>

//               <div className="xl:col-span-2 space-y-4">
//                 <Card
//                   title="Playground Result"
//                   description="Latest raw model response with metadata for quick verification."
//                 >
//                   <div className="flex flex-wrap items-center gap-2 mb-3">
//                     <StatusBadge variant="process">{playgroundMeta.provider || "Provider: -"}</StatusBadge>
//                     <StatusBadge variant="process">{playgroundMeta.model || "Model: -"}</StatusBadge>
//                     <StatusBadge variant="process">
//                       Latency: {playgroundMeta.latency ? `${playgroundMeta.latency} ms` : "-"}
//                     </StatusBadge>
//                   </div>
//                   <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-md p-3 min-h-[180px]">
//                     <p className="text-sm text-[#0f1724] whitespace-pre-wrap">{playgroundResult || "No output yet."}</p>
//                   </div>
//                 </Card>

//                 <Card
//                   title="AI Usage Cost Dashboard"
//                   description="Monitor completion volumes, token usage, and provider-level spend."
//                 >
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
//                     <FormSelect
//                       label="Group By"
//                       value={costFilter.group_by}
//                       onValueChange={(value) => setCostFilter({ group_by: value as "day" | "week" | "month" })}
//                       options={[
//                         { value: "day", label: "Daily" },
//                         { value: "week", label: "Weekly" },
//                         { value: "month", label: "Monthly" },
//                       ]}
//                     />
//                     <StatTile label="Total Tokens" value={String(costSummary?.summary.total_tokens || 0)} />
//                     <StatTile label="Avg Latency" value={`${Math.round(costSummary?.summary.avg_latency_ms || 0)} ms`} />
//                     <StatTile label="Total Cost" value={`$${(costSummary?.summary.total_cost || 0).toFixed(4)}`} />
//                   </div>
//                   <DataTable
//                     data={costSummary?.by_provider || []}
//                     columns={providerCostColumns}
//                     keyExtractor={(item) => `${item.provider}-${item.completions}`}
//                     emptyMessage="No cost data available"
//                     isLoading={isLoading}
//                   />
//                 </Card>
//               </div>
//             </div>

//             <Card title="Providers & Recent Completions">
//               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
//                 <DataTable
//                   data={providers}
//                   columns={providerColumns}
//                   keyExtractor={(item) => item.name}
//                   emptyMessage="No providers available"
//                   isLoading={isLoading}
//                 />
//                 <DataTable
//                   data={completions}
//                   columns={completionColumns}
//                   keyExtractor={(item) => item.id}
//                   emptyMessage="No completions yet"
//                   isLoading={isLoading}
//                 />
//               </div>
//             </Card>
//           </>
//         )}

//         {activeTab === "config" && (
//           <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
//             <Card
//               title="Configure Tenant Provider"
//               description="Set provider-specific API key, endpoint, and model mapping for this tenant."
//             >
//               <FormSelect
//                 label="Provider"
//                 value={configForm.provider}
//                 onValueChange={(value) => setConfigForm((prev) => ({ ...prev, provider: value }))}
//                 options={providerOptions}
//               />
//               <FormSelect
//                 label="Config Type"
//                 value={configForm.config_type}
//                 onValueChange={(value) => setConfigForm((prev) => ({ ...prev, config_type: value }))}
//                 options={[
//                   { value: "direct", label: "Direct Endpoint" },
//                   { value: "azure", label: "Azure" },
//                 ]}
//               />
//               <FormField
//                 label="API Key"
//                 type="password"
//                 value={configForm.api_key}
//                 onChange={(e) => setConfigForm((prev) => ({ ...prev, api_key: e.target.value }))}
//                 required
//               />
//               <FormField
//                 label="Endpoint"
//                 value={configForm.endpoint}
//                 onChange={(e) => setConfigForm((prev) => ({ ...prev, endpoint: e.target.value }))}
//                 placeholder="http://host.docker.internal:11434/v1"
//               />
//               <FormField
//                 label="Default Model"
//                 value={configForm.default_model}
//                 onChange={(e) => setConfigForm((prev) => ({ ...prev, default_model: e.target.value }))}
//               />
//               <FormField
//                 label="Custom Models (comma separated)"
//                 value={configForm.custom_models}
//                 onChange={(e) => setConfigForm((prev) => ({ ...prev, custom_models: e.target.value }))}
//                 placeholder="mistral-small3.2:24b,llama3.2"
//               />
//               <div className="flex gap-2">
//                 <PrimaryButton onClick={handleSaveConfig} disabled={savingConfig}>
//                   {savingConfig ? "Saving..." : "Save Configuration"}
//                 </PrimaryButton>
//                 <SecondaryButton onClick={() => void loadConfigData()}>Reload</SecondaryButton>
//               </div>
//             </Card>

//             <div className="xl:col-span-2 space-y-4">
//               <Card
//                 title="Configured Tenant Providers"
//                 description="Use Test before go-live. Delete removes tenant override and reverts to gateway defaults."
//               >
//                 <DataTable
//                   data={configs}
//                   columns={configColumns}
//                   keyExtractor={(item) => item.id}
//                   emptyMessage="No tenant provider configs found"
//                   isLoading={isLoading}
//                 />
//               </Card>
//               <Card
//                 title="Docker Endpoint Tip"
//                 description="For containerized model servers use `host.docker.internal` from backend container to host machine."
//               >
//                 <div className="text-sm text-[#334155]">
//                   Example endpoint:
//                   <code className="ml-2 bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded px-2 py-1 text-xs">
//                     http://host.docker.internal:11434/v1
//                   </code>
//                 </div>
//               </Card>
//             </div>
//           </div>
//         )}

//         {activeTab === "prompts" && (
//           <div className="space-y-4">
//             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
//               <Card
//                 title="Prompt Management"
//                 description="Create reusable prompts with provider/model defaults and variable placeholders."
//               >
//                 <FormField
//                   label="Prompt Name"
//                   value={promptForm.name}
//                   onChange={(e) => setPromptForm((prev) => ({ ...prev, name: e.target.value }))}
//                   required
//                 />
//                 <FormField
//                   label="Use Case"
//                   value={promptForm.use_case}
//                   onChange={(e) => setPromptForm((prev) => ({ ...prev, use_case: e.target.value }))}
//                   required
//                 />
//                 <FormTextArea
//                   label="System Message"
//                   value={promptForm.system_message}
//                   onChange={(e) => setPromptForm((prev) => ({ ...prev, system_message: e.target.value }))}
//                 />
//                 <FormTextArea
//                   label="User Template"
//                   value={promptForm.user_template}
//                   onChange={(e) => setPromptForm((prev) => ({ ...prev, user_template: e.target.value }))}
//                 />
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <FormSelect
//                     label="Provider"
//                     value={promptForm.provider}
//                     onValueChange={(value) => setPromptForm((prev) => ({ ...prev, provider: value }))}
//                     options={providerOptions}
//                     placeholder="Auto"
//                   />
//                   <FormSelect
//                     label="Model"
//                     value={promptForm.model}
//                     onValueChange={(value) => setPromptForm((prev) => ({ ...prev, model: value }))}
//                     options={modelOptions}
//                     placeholder="Provider default"
//                   />
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                   <FormField
//                     label="Temperature"
//                     type="number"
//                     value={promptForm.temperature}
//                     onChange={(e) => setPromptForm((prev) => ({ ...prev, temperature: e.target.value }))}
//                   />
//                   <FormField
//                     label="Max Tokens"
//                     type="number"
//                     value={promptForm.max_tokens}
//                     onChange={(e) => setPromptForm((prev) => ({ ...prev, max_tokens: e.target.value }))}
//                   />
//                 </div>
//                 <div className="flex gap-2">
//                   <PrimaryButton onClick={handleCreatePrompt} disabled={creatingPrompt}>
//                     {creatingPrompt ? "Creating..." : "Create Prompt"}
//                   </PrimaryButton>
//                   <SecondaryButton onClick={() => void loadPromptData()}>Refresh</SecondaryButton>
//                 </div>
//               </Card>

//               <Card
//                 title="Prompt Testing"
//                 description="Test prompt output with input variables before activating in business flow."
//               >
//                 <FormSelect
//                   label="Prompt"
//                   value={executePromptId}
//                   onValueChange={setExecutePromptId}
//                   options={prompts.map((p) => ({
//                     value: p.id,
//                     label: `${p.name} (${p.status || "draft"})`,
//                   }))}
//                 />
//                 <FormTextArea
//                   label="Variables (JSON)"
//                   helperText='Example: {"topic":"deviation handling"}'
//                   value={executeVariables}
//                   onChange={(e) => setExecuteVariables(e.target.value)}
//                 />
//                 <div className="flex gap-2">
//                   <PrimaryButton onClick={handleExecutePrompt}>Run Prompt Test</PrimaryButton>
//                 </div>
//                 <div className="mt-3 flex flex-wrap items-center gap-2">
//                   <StatusBadge variant="process">{executeMeta.provider || "Provider: -"}</StatusBadge>
//                   <StatusBadge variant="process">{executeMeta.model || "Model: -"}</StatusBadge>
//                 </div>
//                 <div className="mt-3 bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-md p-3 min-h-[180px]">
//                   <p className="text-sm text-[#0f1724] whitespace-pre-wrap">{executeResult || "No test output yet."}</p>
//                 </div>
//               </Card>
//             </div>

//             <Card
//               title="Prompt Library"
//               description="Activate prompt versions for production execution."
//             >
//               <DataTable
//                 data={prompts}
//                 columns={promptColumns}
//                 keyExtractor={(item) => item.id}
//                 emptyMessage="No prompts found"
//                 isLoading={isLoading}
//               />
//             </Card>
//           </div>
//         )}

//         {activeTab === "knowledge" && (
//           <div className="space-y-4">
//             <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
//               <Card
//                 title="Create Collection"
//                 description="Collections help isolate domain documents for relevant retrieval."
//               >
//                 <FormField
//                   label="Collection Name"
//                   value={collectionForm.name}
//                   onChange={(e) => setCollectionForm((prev) => ({ ...prev, name: e.target.value }))}
//                   required
//                 />
//                 <FormField
//                   label="Description"
//                   value={collectionForm.description}
//                   onChange={(e) => setCollectionForm((prev) => ({ ...prev, description: e.target.value }))}
//                 />
//                 <PrimaryButton onClick={handleCreateCollection} disabled={creatingCollection}>
//                   {creatingCollection ? "Creating..." : "Create Collection"}
//                 </PrimaryButton>
//               </Card>

//               <Card
//                 title="Ingest Document"
//                 description="Upload supported file types and process them into vectors."
//               >
//                 <FormSelect
//                   label="Collection"
//                   value={uploadCollectionId}
//                   onValueChange={setUploadCollectionId}
//                   options={collectionOptions}
//                 />
//                 <div className="flex flex-col gap-2 pb-4">
//                   <label className="text-[13px] font-medium text-[#0e1b2a]">Document File</label>
//                   <input
//                     type="file"
//                     onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
//                     className="h-10 w-full px-3.5 py-1 bg-white border border-[rgba(0,0,0,0.08)] rounded-md text-sm"
//                   />
//                 </div>
//                 <PrimaryButton onClick={handleUploadDoc} disabled={uploadingDoc}>
//                   {uploadingDoc ? "Uploading..." : "Upload & Ingest"}
//                 </PrimaryButton>
//               </Card>

//               <Card
//                 title="RAG Context Search"
//                 description="Retrieve context passages before running grounded completion."
//               >
//                 <FormSelect
//                   label="Collection"
//                   value={searchCollectionId}
//                   onValueChange={setSearchCollectionId}
//                   options={collectionOptions}
//                   placeholder="All collections"
//                 />
//                 <FormTextArea
//                   label="Search Query"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                 />
//                 <div className="flex gap-2">
//                   <PrimaryButton onClick={handleSearchRag}>Search Context</PrimaryButton>
//                   <SecondaryButton onClick={() => void loadKnowledgeData()}>Refresh</SecondaryButton>
//                 </div>
//               </Card>
//             </div>

//             <Card title="RAG Output">
//               <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-md p-3 min-h-[180px]">
//                 <p className="text-sm text-[#0f1724] whitespace-pre-wrap">{searchResult || "No context result yet."}</p>
//               </div>
//             </Card>

//             <Card title="Knowledge Collections">
//               <DataTable
//                 data={collections}
//                 columns={collectionColumns}
//                 keyExtractor={(item) => item.id}
//                 emptyMessage="No collections available"
//                 isLoading={isLoading}
//               />
//             </Card>
//           </div>
//         )}
//       </div>
//     </Layout>
//   );
// };

// export default AIGateway;
