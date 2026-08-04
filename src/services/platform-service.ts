import apiClient from './api-client';

export interface PlatformService {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  sort_order: number;
}

export interface TenantPlatformService extends PlatformService {
  service_id: string;
  is_enabled: boolean;
  changed_by: string | null;
  changed_at: string | null;
  notes: string | null;
}

export interface ListPlatformServicesResponse {
  success: boolean;
  data: PlatformService[];
}

export interface ListTenantPlatformServicesResponse {
  success: boolean;
  data: TenantPlatformService[];
  tenant: {
    id: string;
    name: string;
  };
}

export interface ListMyPlatformServicesResponse {
  success: boolean;
  data: Array<{
    key: string;
    name: string;
    icon: string | null;
    category: string | null;
    sort_order: number;
    is_enabled: boolean;
  }>;
}

export const platformServiceApi = {
  /**
   * Get all registered platform services.
   * Auth: Super Admin
   */
  getAll: async (): Promise<PlatformService[]> => {
    const response = await apiClient.get<ListPlatformServicesResponse>('/platform-services');
    return response.data?.data || [];
  },

  /**
   * Get all services with enabled status for a tenant.
   * Auth: Super Admin
   */
  getTenantServices: async (tenantId: string): Promise<TenantPlatformService[]> => {
    const response = await apiClient.get<ListTenantPlatformServicesResponse>(`/platform-services/tenant/${tenantId}`);
    return response.data?.data || [];
  },

  /**
   * Get enabled services for the current tenant.
   * Auth: Tenant User / Admin
   */
  getMyServices: async (): Promise<string[]> => {
    const response = await apiClient.get<ListMyPlatformServicesResponse>('/platform-services/my');
    const services = response.data?.data || [];
    return services
      .filter((s) => s.is_enabled)
      .map((s) => s.key);
  },
};
