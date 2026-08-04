import apiClient from "@/services/api-client";
import type {
  AICompletion,
  AICompletionListResponse,
  AICostSummary,
  AIHealthResponse,
  AIProviderInfo,
  AIPrompt,
  KnowledgeCollection,
  KnowledgeSearchItem,
  TenantAIConfig,
  AIPromptTestCase,
} from "@/types/ai";

const unwrap = <T>(response: any): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return response as T;
};

class AIService {
  async getProviders(): Promise<AIProviderInfo[]> {
    const response = await apiClient.get("/ai/providers");
    return unwrap<AIProviderInfo[]>(response);
  }

  async getProviderHealth(provider: string): Promise<AIHealthResponse> {
    const response = await apiClient.get(`/ai/providers/${encodeURIComponent(provider)}/health`);
    return unwrap<AIHealthResponse>(response);
  }

  async getGatewayHealth(): Promise<AIHealthResponse> {
    const response = await apiClient.get("/ai/health");
    return unwrap<AIHealthResponse>(response);
  }

  async getModels(): Promise<Array<{ id: string; provider: string; isDefault?: boolean }>> {
    const response = await apiClient.get("/ai/models");
    return unwrap<Array<{ id: string; provider: string; isDefault?: boolean }>>(response);
  }

  async createCompletion(payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<AICompletion> {
    const response = await apiClient.post("/ai/completions", payload);
    return unwrap<AICompletion>(response);
  }

  async getCompletion(id: string): Promise<AICompletion> {
    const response = await apiClient.get(`/ai/completions/${encodeURIComponent(id)}`);
    return unwrap<AICompletion>(response);
  }

  async listCompletions(params: {
    page?: number;
    limit?: number;
    provider?: string;
    model?: string;
    status?: string;
    user_id?: string;
    module_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AICompletionListResponse> {
    const response = await apiClient.get("/ai/completions", { params });
    if (response?.data?.data && response?.data?.pagination) {
      return { data: response.data.data, pagination: response.data.pagination };
    }
    return unwrap<AICompletionListResponse>(response);
  }

  async playground(payload: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<AICompletion> {
    const response = await apiClient.post("/ai/playground", payload);
    return unwrap<AICompletion>(response);
  }

  async getCostSummary(
    params: {
      group_by?: "day" | "week" | "month";
      start_date?: string;
      end_date?: string;
    } = {},
    tenantId?: string
  ): Promise<AICostSummary> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.get("/ai/costs", { params, headers });
    return unwrap<AICostSummary>(response);
  }

  async upsertConfig(
    payload: {
      provider: string;
      config_type: "azure" | "direct";
      api_key: string;
      display_name?: string;
      endpoint?: string;
      deployment?: string;
      api_version?: string;
      custom_models?: string[];
      default_model?: string;
      is_active?: boolean;
    },
    tenantId?: string
  ): Promise<TenantAIConfig> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.post("/ai/config", payload, { headers });
    return unwrap<TenantAIConfig>(response);
  }

  async listConfigs(tenantId?: string): Promise<TenantAIConfig[]> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.get("/ai/config", { headers });
    return unwrap<TenantAIConfig[]>(response);
  }

  async getConfig(provider: string, tenantId?: string): Promise<TenantAIConfig> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.get(`/ai/config/${encodeURIComponent(provider)}`, { headers });
    return unwrap<TenantAIConfig>(response);
  }

  async testConfig(provider: string, tenantId?: string): Promise<AIHealthResponse> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.post(`/ai/config/${encodeURIComponent(provider)}/test`, {}, { headers });
    return unwrap<AIHealthResponse>(response);
  }

  async deleteConfig(provider: string, tenantId?: string): Promise<void> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    await apiClient.delete(`/ai/config/${encodeURIComponent(provider)}`, { headers });
  }

  async createPrompt(payload: {
    name: string;
    description?: string;
    use_case: string;
    system_message?: string;
    user_template: string;
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    variables?: Array<{ name: string; type?: "string" | "number" | "boolean" | "array"; required?: boolean }>;
    tags?: string[];
    is_default?: boolean;
    module_ids?: string[];
  }): Promise<AIPrompt> {
    const response = await apiClient.post("/ai/prompts", payload);
    return unwrap<AIPrompt>(response);
  }

  async getPrompt(id: string): Promise<AIPrompt> {
    const response = await apiClient.get(`/ai/prompts/${id}`);
    return unwrap<AIPrompt>(response);
  }

  async updatePrompt(id: string, payload: {
    name: string;
    description?: string;
    use_case: string;
    system_message?: string;
    user_template: string;
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    variables?: Array<{ name: string; type?: "string" | "number" | "boolean" | "array"; required?: boolean }>;
    tags?: string[];
    is_default?: boolean;
    change_notes?: string;
    module_ids?: string[];
  }): Promise<AIPrompt> {
    const response = await apiClient.put(`/ai/prompts/${id}`, payload);
    return unwrap<AIPrompt>(response);
  }

  async clonePrompt(id: string): Promise<AIPrompt> {
    const response = await apiClient.post(`/ai/prompts/${id}/clone`);
    return unwrap<AIPrompt>(response);
  }

  async listPrompts(params: { page?: number; limit?: number; status?: string; search?: string; module_id?: string } = {}): Promise<{
    data: AIPrompt[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get("/ai/prompts", { params });
    if (response?.data?.data && response?.data?.pagination) {
      return { data: response.data.data, pagination: response.data.pagination };
    }
    return unwrap(response);
  }

  async updatePromptStatus(id: string, status: "draft" | "active" | "archived" | "deprecated"): Promise<AIPrompt> {
    const response = await apiClient.patch(`/ai/prompts/${id}/status`, { status });
    return unwrap<AIPrompt>(response);
  }

  async deletePrompt(id: string): Promise<void> {
    await apiClient.delete(`/ai/prompts/${id}`);
  }

  async getVersions(id: string): Promise<AIPrompt[]> {
    const response = await apiClient.get(`/ai/prompts/${id}/versions`);
    return unwrap<AIPrompt[]>(response);
  }

  async getVersion(id: string, version: number): Promise<AIPrompt> {
    const response = await apiClient.get(`/ai/prompts/${id}/versions/${version}`);
    return unwrap<AIPrompt>(response);
  }

  async rollback(id: string, version: number): Promise<AIPrompt> {
    const response = await apiClient.post(`/ai/prompts/${id}/rollback`, { version });
    return unwrap<AIPrompt>(response);
  }

  async getPromptExecutions(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ): Promise<{
    summary: {
      usage_count: number;
      success_rate: number;
      avg_cost: number;
      avg_latency: number;
      failed_runs: number;
      success_runs: number;
    };
    data: AICompletion[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get(`/ai/prompts/${id}/executions`, { params });
    return unwrap(response);
  }

  async executePrompt(
    id: string,
    payload: { variables?: Record<string, unknown>; provider?: string; model?: string; temperature?: number; max_tokens?: number },
  ): Promise<AICompletion> {
    const response = await apiClient.post(`/ai/prompts/${id}/execute`, payload);
    return unwrap<AICompletion>(response);
  }

  async executePromptStream(
    id: string,
    payload: { variables?: Record<string, unknown>; provider?: string; model?: string; temperature?: number; max_tokens?: number; clientRequestId?: string },
    onChunk: (chunk: string) => void,
    onDone: (result: AICompletion) => void,
    onError: (error: string) => void,
    onRequestId?: (requestId: string) => void
  ): Promise<void> {
    try {
      const store = (window as any).__REDUX_STORE__;
      const token = store ? store.getState()?.auth?.accessToken : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const baseURL = apiClient.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseURL}/ai/prompts/${id}/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, stream: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Execution failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in buffer

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith("data:")) continue;

          const jsonStr = cleanLine.replace(/^data:\s*/, "");
          try {
            const data = JSON.parse(jsonStr);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.clientRequestId && onRequestId) {
              console.log("[aiService] Parsed clientRequestId from stream:", data.clientRequestId);
              onRequestId(data.clientRequestId);
            }
            if (data.content) {
              onChunk(data.content);
            }
            if (data.done) {
              onDone(data.metadata);
            }
          } catch (e: any) {
            console.error("Error parsing stream chunk:", e);
            if (e.message) throw e;
          }
        }
      }
    } catch (err: any) {
      onError(err.message || "Failed to execute prompt stream");
    }
  }

  async cancelPromptExecution(id: string, requestId: string): Promise<{ success: boolean; message?: string }> {
    console.log("[aiService] cancelPromptExecution called for request ID:", requestId);
    const response = await apiClient.post(`/ai/prompts/${id}/cancel`, { request_id: requestId });
    return unwrap(response);
  }

  async testPrompt(
    id: string,
    payload: { variables?: Record<string, unknown>; provider?: string; model?: string; temperature?: number; max_tokens?: number },
  ): Promise<AICompletion> {
    const response = await apiClient.post(`/ai/prompts/${id}/test`, payload);
    return unwrap<AICompletion>(response);
  }

  async listCollections(params: { page?: number; limit?: number; status?: string } = {}): Promise<{
    data: KnowledgeCollection[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get("/ai/knowledge/collections", { params });
    if (response?.data?.data && response?.data?.pagination) {
      return { data: response.data.data, pagination: response.data.pagination };
    }
    return unwrap(response);
  }

  async createCollection(payload: { name: string; description?: string; metadata?: Record<string, unknown> }): Promise<KnowledgeCollection> {
    const response = await apiClient.post("/ai/knowledge/collections", payload);
    return unwrap<KnowledgeCollection>(response);
  }

  async uploadKnowledgeDocument(payload: { collectionId: string; file: File; provider?: string }): Promise<unknown> {
    const formData = new FormData();
    formData.append("collectionId", payload.collectionId);
    formData.append("file", payload.file);
    if (payload.provider) {
      formData.append("provider", payload.provider);
    }
    const response = await apiClient.post("/ai/knowledge/documents", formData);
    return unwrap(response);
  }

  async searchKnowledge(payload: {
    query: string;
    collectionId?: string;
    provider?: string;
    topK?: number;
    minScore?: number;
  }): Promise<KnowledgeSearchItem[]> {
    const response = await apiClient.post("/ai/knowledge/search", payload);
    return unwrap<KnowledgeSearchItem[]>(response);
  }

  async searchKnowledgeWithContext(payload: {
    query: string;
    collectionId?: string;
    provider?: string;
    topK?: number;
    minScore?: number;
  }): Promise<{ context?: string; matches?: KnowledgeSearchItem[] }> {
    const response = await apiClient.post("/ai/knowledge/search/context", payload);
    return unwrap<{ context?: string; matches?: KnowledgeSearchItem[] }>(response);
  }

  async createPromptTestCase(promptId: string, payload: {
    name: string;
    description?: string;
    variables?: Record<string, any>;
    expected_output?: string;
    expected_contains?: string;
    max_tokens?: number;
    tags?: string[];
  }): Promise<any> {
    const response = await apiClient.post(`/ai/prompts/${promptId}/test-cases`, payload);
    return unwrap<any>(response);
  }

  async listPromptTestCases(promptId: string): Promise<AIPromptTestCase[]> {
    const response = await apiClient.get(`/ai/prompts/${promptId}/test-cases`);
    return unwrap<AIPromptTestCase[]>(response);
  }

  async runPromptTestCase(testCaseId: string): Promise<any> {
    const response = await apiClient.post(`/ai/prompts/test-cases/${testCaseId}/run`, {});
    return unwrap<any>(response);
  }

  async listPromptTestCaseResults(testCaseId: string, limit = 10): Promise<any[]> {
    const response = await apiClient.get(`/ai/prompts/test-cases/${testCaseId}/results`, { params: { limit } });
    return unwrap<any[]>(response);
  }

  async listFallbacks(params: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await apiClient.get("/ai/fallbacks", { params });
    if (response?.data?.data && response?.data?.pagination) {
      return { data: response.data.data, pagination: response.data.pagination };
    }
    return unwrap(response);
  }

  async getFallbackOrder(tenantId?: string): Promise<string[]> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.get("/ai/fallback-order", { headers });
    return unwrap<string[]>(response);
  }

  async updateFallbackOrder(fallbackOrder: string[], tenantId?: string): Promise<string[]> {
    const headers = tenantId ? { "x-tenant-id": tenantId } : undefined;
    const response = await apiClient.post("/ai/fallback-order", { fallback_order: fallbackOrder }, { headers });
    return unwrap<string[]>(response);
  }

  async getFallbackMapping(): Promise<Record<string, string>> {
    const response = await apiClient.get("/ai/fallback-mapping");
    return unwrap<Record<string, string>>(response);
  }

  async updateFallbackMapping(mapping: Record<string, string>): Promise<Record<string, string>> {
    const response = await apiClient.post("/ai/fallback-mapping", { mapping });
    return unwrap<Record<string, string>>(response);
  }
}

export const aiService = new AIService();
