import apiClient from './api-client';
import type {
  DesignationsResponse,
  DesignationResponse,
  CreateDesignationRequest,
  UpdateDesignationRequest,
} from '@/types/designation';

export const designationService = {
  list: async (tenantId?: string | null, params?: { active_only?: boolean; search?: string }): Promise<DesignationsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.active_only) queryParams.append('active_only', 'true');
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `/designations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    
    const response = await apiClient.get<DesignationsResponse>(url, { headers });
    return response.data;
  },

  getById: async (id: string, tenantId?: string | null): Promise<DesignationResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.get<DesignationResponse>(`/designations/${id}`, { headers });
    return response.data;
  },

  create: async (data: CreateDesignationRequest, tenantId?: string | null): Promise<DesignationResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.post<DesignationResponse>('/designations', data, { headers });
    return response.data;
  },

  update: async (id: string, data: UpdateDesignationRequest, tenantId?: string | null): Promise<DesignationResponse> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.put<DesignationResponse>(`/designations/${id}`, data, { headers });
    return response.data;
  },

  delete: async (id: string, tenantId?: string | null): Promise<{ success: boolean; message: string }> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/designations/${id}`, { headers });
    return response.data;
  },
};
