import apiClient from './api-client';
import type {
  RolesResponse,
  CreateRoleRequest,
  CreateRoleResponse,
  GetRoleResponse,
  UpdateRoleRequest,
  UpdateRoleResponse,
  DeleteRoleResponse,
} from '@/types/role';

export const roleService = {
  getAll: async (
    page: number = 1,
    limit: number = 20,
    orderBy?: string[] | null,
    search?: string | null,
    scope?: string | null,
    isActive?: boolean | null
  ): Promise<RolesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) {
      params.append('search', search);
    }
    if (scope) {
      params.append('scope', scope);
    }
    if (isActive !== undefined && isActive !== null) {
      params.append('is_active', String(isActive));
    }
    if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
      params.append('orderBy[]', orderBy[0]);
      params.append('orderBy[]', orderBy[1]);
    }
    const response = await apiClient.get<RolesResponse>(`/roles?${params.toString()}`);
    return response.data;
  },
  getByTenant: async (
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    orderBy?: string[] | null,
    search?: string | null,
    isActive?: boolean | null
  ): Promise<RolesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    params.append('tenant_id', tenantId);
    if (search) {
      params.append('search', search);
    }
    if (isActive !== undefined && isActive !== null) {
      params.append('is_active', String(isActive));
    }
    if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
      params.append('orderBy[]', orderBy[0]);
      params.append('orderBy[]', orderBy[1]);
    }
    const response = await apiClient.get<RolesResponse>(`/roles?${params.toString()}`);
    return response.data;
  },
  getById: async (id: string): Promise<GetRoleResponse> => {
    const response = await apiClient.get<GetRoleResponse>(`/roles/${id}`);
    return response.data;
  },
  create: async (data: CreateRoleRequest): Promise<CreateRoleResponse> => {
    const response = await apiClient.post<CreateRoleResponse>('/roles', data);
    return response.data;
  },
  update: async (id: string, data: UpdateRoleRequest): Promise<UpdateRoleResponse> => {
    const response = await apiClient.put<UpdateRoleResponse>(`/roles/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<DeleteRoleResponse> => {
    const response = await apiClient.delete<DeleteRoleResponse>(`/roles/${id}`);
    return response.data;
  },
};
