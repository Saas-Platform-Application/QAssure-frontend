export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  scope: 'platform' | 'tenant' | 'module';
  is_system?: boolean;
  is_active?: boolean;
  tenant_id?: string | null;
  module_ids?: string[] | null;
  modules?: string[] | null;
  permissions?: Permission[] | null;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  pagination: Pagination;
}

export interface Permission {
  id?: string;
  role_id?: string;
  resource: string;
  action: string;
  scope?: "global" | "tenant" | "module" | "platform";
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description: string;
  is_active?: boolean;
  tenant_id?: string | null;
  module_ids?: string[] | null;
  modules?: string[] | null;
  permissions?: Permission[] | null;
}

export interface CreateRoleResponse {
  success: boolean;
  data: Role;
  message?: string;
}

export interface GetRoleResponse {
  success: boolean;
  data: Role;
}

export interface UpdateRoleRequest {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  tenant_id?: string | null;
  module_ids?: string[] | null;
  modules?: string[] | null;
  permissions?: Permission[] | null;
}

export interface UpdateRoleResponse {
  success: boolean;
  data: Role;
  message?: string;
}

export interface DeleteRoleResponse {
  success: boolean;
  message?: string;
}
