import apiClient from './api-client';
import type { AuditLogsResponse, GetAuditLogResponse } from '@/types/audit-log';

export const auditLogService = {
  getAll: async (
    page: number = 1,
    limit: number = 100,
    filters: {
      method?: string | null;
      action?: string | null;
      resource_type?: string | null;
      user_id?: string | null;
      response_status?: number | null;
      tenant_id?: string | null;
      module_id?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      search?: string | null;
    } = {},
    orderBy?: string[] | null
  ): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filters.method) params.append('method', filters.method);
    if (filters.action) params.append('action', filters.action);
    if (filters.resource_type) params.append('resource_type', filters.resource_type);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.response_status) params.append('response_status', String(filters.response_status));
    if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
    if (filters.module_id) params.append('module_id', filters.module_id);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);

    if (orderBy && Array.isArray(orderBy) && orderBy.length === 2) {
      params.append('orderBy[]', orderBy[0]);
      params.append('orderBy[]', orderBy[1]);
    }

    const response = await apiClient.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
    return response.data;
  },

  getMyLogs: async (page: number = 1, limit: number = 50, module_id?: string | null, search?: string | null): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (module_id) params.append('module_id', module_id);
    if (search) params.append('search', search);

    const response = await apiClient.get<AuditLogsResponse>(
      `/audit-logs/my-logs?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<GetAuditLogResponse> => {
    const response = await apiClient.get<GetAuditLogResponse>(`/audit-logs/${id}`);
    return response.data;
  },

  getResourceTypesDropdown: async (tenant_id?: string): Promise<any> => {
    const params = new URLSearchParams();
    if (tenant_id) params.append('tenant_id', tenant_id);
    const response = await apiClient.get(`/audit-log-resource-types/dropdown?${params.toString()}`);
    return response.data;
  },

  getModulesDropdown: async (): Promise<{ success: boolean; data: Array<{ id: string; name: string }> }> => {
    const response = await apiClient.get('/modules/dropdown');
    return response.data;
  },

  getAllResourceTypes: async (page = 1, limit = 50, filters: any = {}): Promise<any> => {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.module_id) params.append('module_id', filters.module_id);
    if (filters.sort) params.append('sort', filters.sort);
    
    const response = await apiClient.get(`/audit-log-resource-types?${params.toString()}`);
    return response.data;
  },

  createResourceType: async (data: any): Promise<any> => {
    const response = await apiClient.post('/audit-log-resource-types', data);
    return response.data;
  },

  updateResourceType: async (id: string, data: any): Promise<any> => {
    const response = await apiClient.put(`/audit-log-resource-types/${id}`, data);
    return response.data;
  },

  deleteResourceType: async (id: string): Promise<any> => {
    const response = await apiClient.delete(`/audit-log-resource-types/${id}`);
    return response.data;
  },

  getStats: async (params: { tenantId?: string; startDate?: string; endDate?: string } = {}): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    
    const response = await apiClient.get(`/audit-logs/stats?${searchParams.toString()}`);
    return response.data;
  },

  export: async (params: {
    format?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: string;
  } = {}): Promise<any> => {
    const searchParams = new URLSearchParams();
    if (params.format) searchParams.append('format', params.format);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.tenantId) searchParams.append('tenantId', params.tenantId);

    const response = await apiClient.get(`/audit-logs/export?${searchParams.toString()}`);
    return response.data;
  },
};
