import apiClient from './api-client';
import type { ModulesResponse, GetModuleResponse, CreateModuleRequest, CreateModuleResponse, LaunchModuleResponse, MyModulesResponse, UpdateModuleRequest } from '@/types/module';

export const moduleService = {
  getDropdown: async (): Promise<{ success: boolean; data: Array<{ id: string; name: string }> }> => {
    const response = await apiClient.get('/modules/dropdown');
    return response.data;
  },
  getAll: async (
    page: number = 1,
    limit: number = 20,
    status?: string | null,
    orderBy?: string[] | null,
    search?: string | null
  ): Promise<ModulesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (status) {
      params.append('status', status);
    }
    if (search) {
      params.append('search', search);
    }
    if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
      params.append('sort_by', orderBy[0]);
      params.append('sort_order', orderBy[1]);
    }
    const response = await apiClient.get<ModulesResponse>(`/modules?${params.toString()}`);
    return response.data;
  },
  getRunningModules: async (
    page: number = 1,
    limit: number = 20
  ): Promise<ModulesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    params.append('status', 'running');
    const response = await apiClient.get<ModulesResponse>(`/modules?${params.toString()}`);
    return response.data;
  },
  getModulesByTenant: async (
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ModulesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    params.append('tenant_id', tenantId);
    const response = await apiClient.get<ModulesResponse>(`/modules?${params.toString()}`);
    return response.data;
  },
  getAvailable: async (
    page: number = 1,
    limit: number = 100,
    tenantId?: string | null
  ): Promise<ModulesResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (tenantId) {
      params.append('tenant_id', tenantId);
    }
    const response = await apiClient.get<ModulesResponse>(`/modules/available?${params.toString()}`);
    return response.data;
  },
  getById: async (id: string): Promise<GetModuleResponse> => {
    const response = await apiClient.get<GetModuleResponse>(`/modules/${id}`);
    return response.data;
  },
  create: async (data: CreateModuleRequest): Promise<CreateModuleResponse> => {
    const response = await apiClient.post<CreateModuleResponse>('/modules', data);
    return response.data;
  },
  update: async (id: string, data: UpdateModuleRequest): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/modules/${id}`, data);
    return response.data;
  },
  launch: async (id: string, tenantId?: string | null): Promise<LaunchModuleResponse> => {
    const params = new URLSearchParams();
    if (tenantId) {
      params.append('tenant_id', tenantId);
    }
    const url = `/modules/${id}/launch${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.post<LaunchModuleResponse>(url);
    return response.data;
  },
  getMyModules: async (tenantId?: string | null): Promise<MyModulesResponse> => {
    const params = new URLSearchParams();
    if (tenantId) {
      params.append('tenant_id', tenantId);
    }
    const url = `/modules/my${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<MyModulesResponse>(url);
    return response.data;
  },
  syncWebhookData: async (id: string, sync_webhook_url?: string): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/modules/${id}/webhook-sync`, { sync_webhook_url });
    return response.data;
  },
  reissueApiKey: async (id: string, webhookurl?: string): Promise<{ success: boolean; data: { api_key: { key: string } } }> => {
    const response = await apiClient.post<{ success: boolean; data: { api_key: { key: string } } }>(`/modules/${id}/reissue-key`, { webhookurl });
    return response.data;
  },
};
