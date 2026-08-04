export interface AIProviderInfo {
  name: string;
  displayName?: string;
  isEnabled?: boolean;
  models?: string[];
  defaultModel?: string | null;
  supportsStreaming?: boolean;
  supportsEmbeddings?: boolean;
  supportsMultimodal?: boolean;
}

export interface AIHealthResponse {
  healthy: boolean;
  latency_ms?: number;
  provider?: string;
  error?: string;
  providers?: Record<string, { healthy: boolean; latency_ms?: number; error?: string }>;
}

export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AICompletion {
  id: string;
  tenant_id?: string;
  module_id?: string | null;
  module_name?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  use_case?: string;
  prompt_template_id?: string | null;
  prompt?: string;
  system_message?: string;
  temperature?: number | null;
  max_tokens?: number | null;
  top_p?: number | null;
  frequency_penalty?: number | null;
  presence_penalty?: number | null;
  stop_sequences?: unknown;
  provider: string;
  model: string;
  content?: string;
  response?: string;
  usage?: AIUsage;
  cost?: number;
  latency_ms?: number;
  fallbackUsed?: boolean;
  cached?: boolean;
  cache_key?: string | null;
  streaming?: boolean;
  fallback_provider?: string | null;
  metadata?: unknown;
  correlation_id?: string | null;
  error_message?: string | null;
  error_code?: string | null;
  status?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  requestId?: string;
  request_id?: string;
}

export interface AICompletionListResponse {
  data: AICompletion[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantAIConfig {
  id: string;
  tenant_id: string;
  provider: string;
  config_type: "azure" | "direct";
  display_name?: string;
  api_key_masked?: string;
  endpoint?: string | null;
  deployment?: string | null;
  api_version?: string | null;
  custom_models?: string[];
  custom_embedding_models?: string[];
  custom_pricing?: Record<string, { input: number; output: number }>;
  default_model?: string | null;
  default_embedding_model?: string | null;
  fallback_provider?: string | null;
  is_active?: boolean;
  last_verified_at?: string | null;
  last_error?: string | null;
}

export interface PromptVariable {
  name: string;
  type?: "string" | "number" | "boolean" | "array";
  required?: boolean;
  default?: unknown;
}

export interface AIPrompt {
  id: string;
  name: string;
  description?: string;
  useCase: string;
  systemMessage?: string;
  template: string;
  status?: "draft" | "active" | "archived" | "deprecated";
  defaultParameters?: {
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
  };
  variables?: PromptVariable[];
  tags?: string[];
  isDefault?: boolean;
  version?: number;
  change_notes?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  created_by_email?:string;
  module_ids?: string[] | null;
  moduleIds?: string[];
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeSearchItem {
  id: string;
  score: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface AICostSummary {
  summary: {
    total_completions: number;
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
  };
  by_provider: Array<{
    provider: string;
    completions: number;
    tokens: number;
    cost: number;
  }>;
  by_model: Array<{
    model: string;
    provider: string;
    completions: number;
    tokens: number;
    cost: number;
  }>;
}

export interface AIPromptTestCase {
  id: string;
  prompt_id: string;
  tenant_id: string;
  name: string;
  description?: string;
  input_variables?: Record<string, any>;
  expected_output?: string;
  tags?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

