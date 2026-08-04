import apiClient from './api-client';
import type { Tenant, Pagination } from '@/types/tenant';

export interface TenantsResponse {
  success: boolean;
  data: Tenant[];
  pagination: Pagination;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  settings?: Record<string, unknown> | null;
  subscription_tier?: string | null;
  max_users?: number | null;
  max_modules?: number | null;
  service_keys?: string[] | null;
}

export interface CreateTenantResponse {
  success: boolean;
  data: Tenant;
  message?: string;
}

export interface GeneralError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type TenantsError = GeneralError;

export interface GetTenantResponse {
  success: boolean;
  data: Tenant;
}

export interface UpdateTenantRequest {
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  domain?: string | null;
  settings?: Record<string, unknown> | null;
  subscription_tier?: string | null;
  max_users?: number | null;
  max_modules?: number | null;
  module_ids?: string[] | null;
  service_keys?: string[] | null;
}

export interface UpdateTenantResponse {
  success: boolean;
  data: Tenant;
  message?: string;
}

export interface DeleteTenantResponse {
  success: boolean;
  message?: string;
}

export interface TenantUserDropdownItem {
  id: string;
  name: string;
  role: string | null;
}

export const tenantService = {
  getAll: async (
    page: number = 1,
    limit: number = 20,
    status?: string | null,
    orderBy?: string[] | null,
    search?: string | null
  ): Promise<TenantsResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (status) {
      params.append('status', status);
    }
    if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
      // Send array as orderBy[]=field&orderBy[]=direction
      params.append('orderBy[]', orderBy[0]);
      params.append('orderBy[]', orderBy[1]);
    }
    if (search) {
      params.append('search', search);
    }
    const response = await apiClient.get<TenantsResponse>(`/tenants?${params.toString()}`);
    return response.data;
  },
  create: async (data: CreateTenantRequest): Promise<CreateTenantResponse> => {
    const response = await apiClient.post<CreateTenantResponse>('/tenants', data);
    return response.data;
  },
  getById: async (id: string): Promise<GetTenantResponse> => {
    const response = await apiClient.get<GetTenantResponse>(`/tenants/${id}`);
    return response.data;
  },
  update: async (id: string, data: UpdateTenantRequest): Promise<UpdateTenantResponse> => {
    const response = await apiClient.put<UpdateTenantResponse>(`/tenants/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<DeleteTenantResponse> => {
    const response = await apiClient.delete<DeleteTenantResponse>(`/tenants/${id}`);
    return response.data;
  },

  /** Active users in the current JWT tenant (for filter dropdowns: name + role). */
  getCurrentTenantUsersDropdown: async (): Promise<TenantUserDropdownItem[]> => {
    const response = await apiClient.get<{ success: boolean; data: TenantUserDropdownItem[] }>(
      "/tenants/current/users/dropdown",
    );
    if (response?.data?.data !== undefined) {
      return response.data.data;
    }
    return [];
  },
};
