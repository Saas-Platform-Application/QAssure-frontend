export interface AuditLogUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuditLogTenant {
  id: string;
  name: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  module_id: string | null;
  request_method: string | null;
  request_path: string | null;
  request_body: Record<string, unknown> | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  correlation_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  user: AuditLogUser | null;
  tenant: AuditLogTenant | null;
  module: { id: string; name: string } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  pagination: Pagination;
}

export interface GetAuditLogResponse {
  success: boolean;
  data: AuditLog;
}
