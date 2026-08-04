import apiClient from './api-client';
import type { 
  CreateWorkflowDefinitionData, 
  UpdateWorkflowDefinitionData,
  WorkflowDefinitionsResponse,
  WorkflowDefinitionResponse,
  WorkflowInstanceResponse,
  WorkflowDeleteResponse,
  WorkflowTasksResponse,
  WorkflowTaskCountsResponse
} from '@/types/workflow';


class WorkflowService {
  private readonly baseUrl = '/workflows';

  async listDefinitions(params?: {
    tenantId?: string;
    entity_type?: string;
    status?: string;
    source_module?: string;
    source_module_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<WorkflowDefinitionsResponse> {
    const queryParams: any = { ...params };
    // if (params?.tenantId) {
    //   queryParams.tenant_id = params.tenantId;
    // }
    const response = await apiClient.get<WorkflowDefinitionsResponse>(`${this.baseUrl}/definitions`, { params: queryParams });
    return response.data;
  }

  async getDefinition(id: string, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.get<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions/${id}`, { params });
    return response.data;
  }

  async getInstance(id: string, tenantId?: string): Promise<WorkflowInstanceResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.get<WorkflowInstanceResponse>(`${this.baseUrl}/instances/${id}`, { params });
    return response.data;
  }

  async listInstances(params: {
    entity_type?: string;
    entity_id?: string;
    status?: string;
    source_module?: string;
    source_module_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data: any[]; pagination: { total: number; limit: number; offset: number } }> {
    const response = await apiClient.get(`${this.baseUrl}/instances`, { params });
    return response.data;
  }

  async createDefinition(data: CreateWorkflowDefinitionData, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.post<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions`, data, { params });
    return response.data;
  }

  async updateDefinition(id: string, data: UpdateWorkflowDefinitionData, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.put<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions/${id}`, data, { params });
    return response.data;
  }

  async deleteDefinition(id: string, tenantId?: string): Promise<WorkflowDeleteResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.delete<WorkflowDeleteResponse>(`${this.baseUrl}/definitions/${id}`, { params });
    return response.data;
  }

  async cloneDefinition(id: string, name: string, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.post<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions/${id}/clone`, { name }, { params });
    return response.data;
  }

  async activateDefinition(id: string, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.post<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions/${id}/activate`, {}, { params });
    return response.data;
  }

  async deprecateDefinition(id: string, tenantId?: string): Promise<WorkflowDefinitionResponse> {
    const params = tenantId ? { tenantId: tenantId } : {};
    const response = await apiClient.post<WorkflowDefinitionResponse>(`${this.baseUrl}/definitions/${id}/deprecate`, {}, { params });
    return response.data;
  }

  async listTasks(params?: { 
    limit?: number; 
    offset?: number;
    status?: string | null;
    module_id?: string | null;
  }): Promise<WorkflowTasksResponse> {
    const response = await apiClient.get<WorkflowTasksResponse>(`${this.baseUrl}/tasks`, { params });
    return response.data;
  }

  async getTaskCounts(params?: { module_id?: string | null; entity_type?: string | null; entity_id?: string | null }): Promise<WorkflowTaskCountsResponse> {
    const response = await apiClient.get<WorkflowTaskCountsResponse>(`${this.baseUrl}/tasks/counts`, { params });
    return response.data;
  }

  async transition(instanceId: string, data: { task_id: string; action: string; comments?: string; signature_id?: string; signature_action?: string; password?: string; pin?: string }): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/instances/${instanceId}/transition`, data);
    return response.data;
  }

  async getInstanceHistory(id: string): Promise<{ success: boolean; data: any[] }> {
    const response = await apiClient.get(`${this.baseUrl}/instances/${id}/history`);
    return response.data;
  }
}

export const workflowService = new WorkflowService();
