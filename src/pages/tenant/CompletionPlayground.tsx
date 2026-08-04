// import { useEffect, useMemo, useState, type ReactElement } from "react";
// import { Layout } from "@/components/layout/Layout";
// import {
//   FormField,
//   FormSelect,
//   FormTextArea,
//   PrimaryButton,
//   SecondaryButton,
//   StatusBadge,
// } from "@/components/shared";
// import { aiService } from "@/services/ai-service";
// import type { AIProviderInfo } from "@/types/ai";
// import { showToast } from "@/utils/toast";

// const CompletionPlayground = (): ReactElement => {
//   const [providers, setProviders] = useState<AIProviderInfo[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [isRunning, setIsRunning] = useState<boolean>(false);

//   const [form, setForm] = useState({
//     provider: "gemini",
//     model: "",
//     max_tokens: "10",
//     temperature: "0.7",
//     user: "ping",
//   });

//   const [result, setResult] = useState({
//     content: "",
//     provider: "",
//     model: "",
//     prompt_tokens: 0,
//     completion_tokens: 0,
//     total_tokens: 0,
//     cost: 0,
//     latency_ms: 0,
//     fallbackUsed: false,
//   });

//   const providerOptions = useMemo(
//     () => providers.map((p) => ({ value: p.name, label: p.displayName || p.name })),
//     [providers],
//   );

//   const loadProviders = async (): Promise<void> => {
//     setIsLoading(true);
//     try {
//       const data = await aiService.getProviders();
//       setProviders(data);
//     } catch (err: any) {
//       showToast.error(err?.response?.data?.error?.message || "Failed to load providers");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     void loadProviders();
//   }, []);

//   const handleRun = async (): Promise<void> => {
//     setIsRunning(true);
//     try {
//       const response = await aiService.playground({
//         messages: [{ role: "user", content: form.user }],
//         provider: form.provider || undefined,
//         model: form.model || undefined,
//         max_tokens: Number(form.max_tokens),
//         temperature: Number(form.temperature),
//       });

//       setResult({
//         content: response.content || "",
//         provider: response.provider || "",
//         model: response.model || "",
//         prompt_tokens: response.usage?.prompt_tokens || 0,
//         completion_tokens: response.usage?.completion_tokens || 0,
//         total_tokens: response.usage?.total_tokens || 0,
//         cost: response.cost || 0,
//         latency_ms: response.latency_ms || 0,
//         fallbackUsed: Boolean(response.fallbackUsed),
//       });
//       showToast.success("Playground response received");
//     } catch (err: any) {
//       showToast.error(err?.response?.data?.error?.message || "Playground request failed");
//     } finally {
//       setIsRunning(false);
//     }
//   };

//   return (
//     <Layout
//       currentPage="Completion Playground"
//       pageHeader={{
//         title: "Completion Playground",
//         description:
//           "Run quick non-persistent completion tests using /ai/playground (results are not stored in DB).",
//       }}
//     >
//       <div className="space-y-5">
//         <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-5">
//           <h3 className="text-sm md:text-base font-semibold text-[#0f1724] mb-1">
//             Playground Request
//           </h3>
//           <p className="text-xs md:text-sm text-[#6b7280] mb-4">
//             Uses <code>/ai/playground</code> for fast testing without history persistence.
//           </p>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//             <FormSelect
//               label="Provider"
//               value={form.provider}
//               options={providerOptions}
//               onValueChange={(value) => setForm((prev) => ({ ...prev, provider: value }))}
//             />
//             <FormField
//               label="Model (optional)"
//               value={form.model}
//               onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
//               placeholder="e.g. gemini-2.5-flash"
//             />
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//             <FormField
//               label="Max Tokens"
//               type="number"
//               value={form.max_tokens}
//               onChange={(e) => setForm((prev) => ({ ...prev, max_tokens: e.target.value }))}
//             />
//             <FormField
//               label="Temperature"
//               type="number"
//               value={form.temperature}
//               onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))}
//             />
//           </div>

//           <FormTextArea
//             label="User Message"
//             value={form.user}
//             onChange={(e) => setForm((prev) => ({ ...prev, user: e.target.value }))}
//           />

//           <div className="flex gap-2">
//             <PrimaryButton onClick={handleRun} disabled={isRunning || isLoading}>
//               {isRunning ? "Running..." : "Run Playground"}
//             </PrimaryButton>
//             <SecondaryButton onClick={() => void loadProviders()}>Reload Providers</SecondaryButton>
//           </div>
//         </section>

//         <section className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-4 md:p-5">
//           <h3 className="text-sm md:text-base font-semibold text-[#0f1724] mb-3">
//             Playground Response
//           </h3>
//           <div className="flex flex-wrap gap-2 mb-3">
//             <StatusBadge variant="process">Provider: {result.provider || "-"}</StatusBadge>
//             <StatusBadge variant="process">Model: {result.model || "-"}</StatusBadge>
//             <StatusBadge variant="process">Latency: {result.latency_ms || 0} ms</StatusBadge>
//             <StatusBadge variant="process">
//               Tokens: {result.prompt_tokens}/{result.completion_tokens}/{result.total_tokens}
//             </StatusBadge>
//             <StatusBadge variant={result.fallbackUsed ? "failure" : "success"}>
//               Fallback: {result.fallbackUsed ? "Used" : "No"}
//             </StatusBadge>
//           </div>

//           <div className="bg-[#f8fafc] border border-[rgba(0,0,0,0.08)] rounded-md p-3 min-h-[200px]">
//             <p className="text-sm text-[#0f1724] whitespace-pre-wrap">
//               {result.content || "No response yet."}
//             </p>
//           </div>
//         </section>
//       </div>
//     </Layout>
//   );
// };

// export default CompletionPlayground;
