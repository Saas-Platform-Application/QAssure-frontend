import apiClient from './api-client';

export interface CreateSignatureData {
  resource_type: string;
  resource_id: string;
  resource_name?: string | null;
  action: 'APPROVE' | 'REJECT' | 'REVIEW' | 'AUTHOR' | 'VERIFY' | 'RELEASE' | 'ACKNOWLEDGE' | 'WITHDRAW';
  meaning?: string | null;
  password?: string;
  pin?: string | null;
  auth_method?: 'password' | 'password_pin';
  signature_order?: number | null;
  required_signatures?: number | null;
  workflow_id?: string | null;
}

export interface SetPinData {
  password?: string;
  pin: string;
}

class ElectronicSignatureService {
  private readonly baseUrl = '/electronic-signatures';

  async sign(data: CreateSignatureData): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`${this.baseUrl}/sign`, data);
    return response.data;
  }

  async verify(signatureId: string): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`${this.baseUrl}/verify`, { signature_id: signatureId });
    return response.data;
  }

  async setPin(data: SetPinData): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.post(`${this.baseUrl}/pin`, data);
    return response.data;
  }

  async getResourceSignatures(resourceType: string, resourceId: string): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get(`${this.baseUrl}/resource/${resourceType}/${resourceId}`);
    return response.data;
  }

  async getWorkflowStatus(workflowId: string): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get(`${this.baseUrl}/workflow/${workflowId}/status`);
    return response.data;
  }

  async getSignature(id: string): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async getHistory(params?: { limit?: number; offset?: number }): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get(`${this.baseUrl}/history`, { params });
    return response.data;
  }

  async getStatistics(params?: { start_date?: string; end_date?: string }): Promise<{ success: boolean; data: any }> {
    const response = await apiClient.get(`${this.baseUrl}/statistics`, { params });
    return response.data;
  }
}

export const electronicSignatureService = new ElectronicSignatureService();
