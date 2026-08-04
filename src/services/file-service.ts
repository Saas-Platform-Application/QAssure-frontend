import apiClient from './api-client';

export interface FileUploadResponse {
  success: boolean;
  data: {
    id: string;
    tenant_id: string;
    original_name: string;
    stored_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
    checksum: string;
    storage_provider: string;
    storage_bucket: string | null;
    storage_region: string | null;
    entity_type: string;
    entity_id: string;
    category: string;
    description: string;
    tags: string[];
    version: number;
    is_current_version: boolean;
    previous_version_id: string | null;
    is_public: boolean;
    access_level: string;
    download_count: number;
    has_thumbnail: boolean;
    thumbnail_path: string | null;
    metadata: Record<string, any>;
    scan_status: string;
    scanned_at: string | null;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    source_module: string;
    file_size_formatted: string;
    file_url?: string; // Kept for backward compatibility
  };
}

export const fileService = {
  uploadSimple: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<FileUploadResponse>('/files/upload', formData);
    return response.data;
  },

  upload: async (
    file: File,
    entityType: string = 'tenant',
    entityId?: string,
    tenantId?: string
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    if (entityId) formData.append('entity_id', entityId);
    if (tenantId) formData.append('tenantId', tenantId);

    const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;

    const response = await apiClient.post<FileUploadResponse>('/files/upload', formData, {
      headers
    });
    return response.data;
  },

  getPreview: async (fileId: string, tenantId?: string): Promise<string> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;
    const response = await apiClient.get(`/files/${fileId}/preview`, {
      responseType: 'blob',
      headers,
    });
    return URL.createObjectURL(response.data);
  },
};
