import apiClient from './api-client';
import type { 
  SuppliersResponse, 
  SupplierResponse, 
  SupplierContactsResponse,
  SupplierContact,
  SupplierScorecard,
  SupplierScorecardsResponse,
  CreateSupplierData,
  UpdateSupplierData
} from '@/types/supplier';

export const supplierService = {
  list: async (params: {
    tenantId?: string | null;
    status?: string;
    category?: string;
    supplier_type?: string;
    risk_level?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<SuppliersResponse> => {
    const queryParams = new URLSearchParams();
    if (params.tenantId) queryParams.append('tenantId', params.tenantId);
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.supplier_type) queryParams.append('supplier_type', params.supplier_type);
    if (params.risk_level) queryParams.append('risk_level', params.risk_level);
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    const response = await apiClient.get<SuppliersResponse>(`/suppliers?${queryParams.toString()}`);
    return response.data;
  },

  getById: async (id: string, tenantId?: string | null): Promise<SupplierResponse> => {
    const url = tenantId ? `/suppliers/${id}?tenantId=${tenantId}` : `/suppliers/${id}`;
    const response = await apiClient.get<SupplierResponse>(url);
    return response.data;
  },

  create: async (data: CreateSupplierData, tenantId?: string | null): Promise<SupplierResponse> => {
    const url = tenantId ? `/suppliers?tenantId=${tenantId}` : '/suppliers';
    const response = await apiClient.post<SupplierResponse>(url, data);
    return response.data;
  },

  update: async (id: string, data: UpdateSupplierData, tenantId?: string | null): Promise<SupplierResponse> => {
    const url = tenantId ? `/suppliers/${id}?tenantId=${tenantId}` : `/suppliers/${id}`;
    const response = await apiClient.put<SupplierResponse>(url, data);
    return response.data;
  },

  getContacts: async (id: string, tenantId?: string | null): Promise<SupplierContactsResponse> => {
    const url = tenantId ? `/suppliers/${id}/contacts?tenantId=${tenantId}` : `/suppliers/${id}/contacts`;
    const response = await apiClient.get<SupplierContactsResponse>(url);
    return response.data;
  },
  
  addContact: async (id: string, data: any, tenantId?: string | null): Promise<{ success: boolean; data: SupplierContact }> => {
    const url = tenantId ? `/suppliers/${id}/contacts?tenantId=${tenantId}` : `/suppliers/${id}/contacts`;
    const response = await apiClient.post<{ success: boolean; data: SupplierContact }>(url, data);
    return response.data;
  },

  getTypes: async (): Promise<{ success: boolean, data: { code: string, name: string }[] }> => {
    const response = await apiClient.get('/suppliers/types');
    return response.data;
  },

  getCategories: async (): Promise<{ success: boolean, data: { code: string, name: string, description?: string }[] }> => {
    const response = await apiClient.get('/suppliers/categories');
    return response.data;
  },

  getStatuses: async (): Promise<{ success: boolean, data: { code: string, name: string }[] }> => {
    const response = await apiClient.get('/suppliers/statuses');
    return response.data;
  },

  getScorecards: async (id: string, tenantId?: string | null): Promise<SupplierScorecardsResponse> => {
    const url = tenantId ? `/suppliers/${id}/scorecards?tenantId=${tenantId}` : `/suppliers/${id}/scorecards`;
    const response = await apiClient.get<SupplierScorecardsResponse>(url);
    return response.data;
  },

  createScorecard: async (id: string, data: any, tenantId?: string | null): Promise<{ success: boolean; data: SupplierScorecard }> => {
    const url = tenantId ? `/suppliers/${id}/scorecards?tenantId=${tenantId}` : `/suppliers/${id}/scorecards`;
    const response = await apiClient.post<{ success: boolean; data: SupplierScorecard }>(url, data);
    return response.data;
  }
};
