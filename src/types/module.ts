export interface Module {
  id: string;
  module_id: string;
  name: string;
  description: string;
  version: string;
  status: string;
  runtime_language: string | null;
  framework: string | null;
  webhookurl: string | null;
  sync_webhook_url: string | null;
  frontend_base_url: string;
  backend_base_url: string;
  health_endpoint: string;
  endpoints: string[] | null;
  kafka_topics: string[] | null;
  cpu_request: string;
  cpu_limit: string;
  memory_request: string;
  memory_limit: string;
  min_replicas: number;
  max_replicas: number;
  last_health_check: string | null;
  health_status: string | null;
  consecutive_failures: number | null;
  registered_by: string;
  tenant_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  registered_by_email: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ModulesResponse {
  success: boolean;
  data: Module[];
  pagination: Pagination;
}

export interface GetModuleResponse {
  success: boolean;
  data: Module;
}

export interface CreateModuleRequest {
  module_id: string;
  name: string;
  description?: string | null;
  version: string;
  status?: string;
  runtime_language: string;
  framework?: string | null;
  frontend_base_url: string;
  backend_base_url: string;
  health_endpoint: string;
  webhookurl?: string | null;
  sync_webhook_url?: string | null;
  endpoints?: any | null;
  kafka_topics?: any | null;
  cpu_request?: string | null;
  cpu_limit?: string | null;
  memory_request?: string | null;
  memory_limit?: string | null;
  min_replicas?: number | null;
  max_replicas?: number | null;
  last_health_check?: string | null;
  health_status?: string | null;
  consecutive_failures?: number | null;
  registered_by?: string | null;
  tenant_id?: string | null;
  metadata?: any | null;
}

export interface UpdateModuleRequest extends Partial<Omit<CreateModuleRequest, 'module_id' | 'version' | 'status' | 'runtime_language' | 'framework' | 'webhookurl' | 'sync_webhook_url'>> {}

export interface CreateModuleResponse {
  success: boolean;
  data: {
    module: Module;
    api_key: {
      key: string;
    };
  };
  message?: string;
}

export interface LaunchModuleResponse {
  success: boolean;
  data: {
    launch_url: string;
    expires_in: number;
    module: {
      id: string;
      module_id: string;
      name: string;
    };
    tenant: {
      id: string;
      name: string;
    };
  };
}

export interface MyModule {
  id: string;
  module_id: string;
  name: string;
  description: string | null;
  version: string;
  status: string;
  frontend_base_url: string;
  health_status: string | null;
  assigned_at: string;
  tenant_settings: Record<string, unknown> | null;
}

export interface MyModulesResponse {
  success: boolean;
  data: MyModule[];
  meta: {
    tenant_id: string;
    is_super_admin: boolean;
    is_tenant_admin: boolean;
    total: number;
  };
}
