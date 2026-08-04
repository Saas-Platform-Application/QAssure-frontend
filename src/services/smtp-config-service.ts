import apiClient from './api-client';

export interface SmtpConfig {
  id?: string;
  tenant_id: string | null;
  scope: 'super_admin' | 'tenant';
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  from_name: string | null;
  from_email: string | null;
  is_active: boolean;
  tenant_name?: string;
}

class SmtpConfigService {
  async getConfig(tenantId?: string) {
    const params = tenantId ? { tenantId } : {};
    const response = await apiClient.get('/smtp-config', { params });
    return response.data;
  }

  async listAll(params: any = {}) {
    const response = await apiClient.get('/smtp-config/all', { params });
    return response.data;
  }

  async upsertConfig(data: Partial<SmtpConfig>) {
    const response = await apiClient.post('/smtp-config', data);
    return response.data;
  }

  async adminUpsertConfig(data: Partial<SmtpConfig>) {
    const response = await apiClient.post('/smtp-config/setup', data);
    return response.data;
  }

  async testConnection(data: any) {
    const response = await apiClient.post('/smtp-config/test', data);
    return response.data;
  }

  async adminTestConnection(data: any) {
    const response = await apiClient.post('/smtp-config/admin/test', data);
    return response.data;
  }

  async deleteConfig(id: string, tenantId?: string | null) {
    const params = tenantId ? { tenantId } : {};
    const response = await apiClient.delete(`/smtp-config/${id}`, { params });
    return response.data;
  }
}

export const smtpConfigService = new SmtpConfigService();
