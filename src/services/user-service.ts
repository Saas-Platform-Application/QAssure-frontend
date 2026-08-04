import apiClient from './api-client';
import type {
  UsersResponse,
  CreateUserRequest,
  CreateUserResponse,
  GetUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  // DeleteUserResponse,
} from '@/types/user';

const getAllUsers = async (
  page: number = 1,
  limit: number = 20,
  status?: string | null,
  orderBy?: string[] | null,
  tenantId?: string | null,
  search?: string | null,
  roleId?: string | null,
  scope?: string | null
): Promise<UsersResponse> => {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (tenantId) {
    params.append('tenant_id', tenantId);
  }
  if (status) {
    params.append('status', status);
  }
  if (search) {
    params.append('search', search);
  }
  if (roleId) {
    params.append('role_id', roleId);
  }
  if (scope) {
    params.append('scope', scope);
  }
  if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
    // Send array as orderBy[]=field&orderBy[]=direction
    params.append('orderBy[]', orderBy[0]);
    params.append('orderBy[]', orderBy[1]);
  }
  const response = await apiClient.get<UsersResponse>(`/users?${params.toString()}`);
  return response.data;
};

export const userService = {
  getAll: (
    page: number = 1,
    limit: number = 20,
    status?: string | null,
    orderBy?: string[] | null,
    search?: string | null,
    roleId?: string | null,
    scope?: string | null
  ) => getAllUsers(page, limit, status, orderBy, null, search, roleId, scope),
  
  create: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const response = await apiClient.post<CreateUserResponse>('/users', data);
    return response.data;
  },
  getById: async (id: string): Promise<GetUserResponse> => {
    const response = await apiClient.get<GetUserResponse>(`/users/${id}`);
    return response.data;
  },
  getByTenant: async (
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string | null,
    orderBy?: string[] | null,
    search?: string | null,
    roleId?: string | null
  ): Promise<UsersResponse> => {
    return getAllUsers(page, limit, status, orderBy, tenantId, search, roleId);
  },
  update: async (id: string, data: UpdateUserRequest): Promise<UpdateUserResponse> => {
    const response = await apiClient.put<UpdateUserResponse>(`/users/${id}`, data);
    return response.data;
  },
  getDropdown: async (
    params: { search?: string }
  ) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    
    const response = await apiClient.get(`/tenants/current/users/dropdown?${query.toString()}`);
    return response.data;
  },
  // delete: async (id: string): Promise<DeleteUserResponse> => {
  //   const response = await apiClient.delete<DeleteUserResponse>(`/users/${id}`);
  //   return response.data;
  // },
};
