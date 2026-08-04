import apiClient from './api-client';
import type {
  DepartmentsResponse,
  DepartmentResponse,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '@/types/department';

export const departmentService = {
  list: async (tenantId?: string | null, params?: { active_only?: boolean; search?: string }): Promise<DepartmentsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) queryParams.append('active_only', 'true');
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `/departments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    
    const response = await apiClient.get<DepartmentsResponse>(url, { headers });
    return response.data;
  },

  getTree: async (tenantId?: string | null, activeOnly: boolean = false): Promise<DepartmentsResponse> => {
    const url = `/departments/tree${activeOnly ? '?active_only=true' : ''}`;
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    
    const response = await apiClient.get<DepartmentsResponse>(url, { headers });
    return response.data;
  },

  getById: async (id: string, tenantId?: string | null): Promise<DepartmentResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.get<DepartmentResponse>(`/departments/${id}`, { headers });
    return response.data;
  },

  create: async (data: CreateDepartmentRequest, tenantId?: string | null): Promise<DepartmentResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.post<DepartmentResponse>('/departments', data, { headers });
    return response.data;
  },

  update: async (id: string, data: UpdateDepartmentRequest, tenantId?: string | null): Promise<DepartmentResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.put<DepartmentResponse>(`/departments/${id}`, data, { headers });
    return response.data;
  },

  delete: async (id: string, tenantId?: string | null): Promise<{ success: boolean; message: string }> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/departments/${id}`, { headers });
    return response.data;
  },
};
