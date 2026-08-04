/**
 * File Attachment Service
 * Typed API client matching the backend file-attachment.routes.js exactly
 */
import apiClient from './api-client';

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export interface FileAttachment {
  id: string;
  tenant_id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  file_size_formatted: string;
  checksum: string;
  storage_provider: string;
  storage_bucket: string | null;
  storage_region: string | null;
  entity_type: string;
  entity_id: string;
  category: string;
  category_id: string | null;
  description: string | null;
  tags: string[];
  version: number;
  is_current_version: boolean;
  previous_version_id: string | null;
  /** Reference to the physical file blob (dedup model) */
  blob_id: string | null;
  is_public: boolean;
  access_level: string;
  download_count: number;
  has_thumbnail: boolean;
  thumbnail_path: string | null;
  metadata: Record<string, any>;
  scan_status: string;
  scanned_at: string | null;
  source_module: string;
  source_module_id: string | null;
  uploaded_by: string;
  uploaded_by_email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileAttachmentPagination {
  total: number;
  limit: number;
  offset: number;
}

export interface FileListResponse {
  success: boolean;
  data: FileAttachment[];
  pagination: FileAttachmentPagination;
}

export interface FileDetailResponse {
  success: boolean;
  data: FileAttachment;
}

export interface VersionHistoryResponse {
  success: boolean;
  data: FileAttachment[];
}

export interface StorageStats {
  quota: {
    max_storage: number;
    used_storage: number;
    available: number;
    usage_percent: number;
  };
  files: {
    total: number;
    images: number;
    pdfs: number;
    documents: number;
  };
  by_entity: Record<string, { count: number; size: number }>;
  by_module: Record<string, { count: number; size: number }>;
}

export interface StorageQuota {
  id: string;
  tenant_id: string;
  max_storage_bytes: number;
  max_file_size_bytes: number;
  used_storage_bytes: number;
  file_count: number;
  allowed_mime_types: string[] | null;
  blocked_extensions: string[];
  max_storage_formatted: string;
  used_storage_formatted: string;
  max_file_size_formatted: string;
  updated_at: string;
}

export interface FilterOptions {
  tags: string[];
  metadata: Record<string, string[]>;
}

export interface CategoriesFilterOptions {
  categories: Array<{ category: string; category_id: string | null }>;
}

export interface ShareResponse {
  id: string;
  tenant_id: string;
  file_id: string;
  share_token: string;
  share_type: 'link' | 'user';
  shared_with_user_id: string | null;
  shared_with_email: string | null;
  permissions: 'view' | 'download';
  expires_at: string | null;
  max_downloads: number | null;
  current_downloads: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
  share_url: string;
}

// ─────────────────────────────────────────
// Upload Params (matches UploadFileSchema)
// ─────────────────────────────────────────

export interface UploadFilesParams {
  files: File[];
  entity_type: string;       // required
  entity_id: string;         // required — must be valid UUID
  category?: string;         // optional string label
  category_id?: string;      // optional
  description?: string;      // max 500 chars
  tags?: string[];            // array of tag strings
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────
// List Params
// ─────────────────────────────────────────

export interface FileListParams {
  entity_type?: string;
  entity_id?: string;
  mime_type?: string;
  category?: string;
  category_id?: string;
  source_module?: string;
  source_module_id?: string;
  search?: string;
  tags?: string;
  uploaded_by?: string;
  sort_by?: 'created_at' | 'original_name' | 'file_size' | 'version' | 'category' | 'source_module';
  sort_order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// ─────────────────────────────────────────
// Update Params (matches UpdateFileMetadataSchema)
// ─────────────────────────────────────────

export interface UpdateFileMetadataParams {
  category?: string;
  category_id?: string | null;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────
// Share Params (matches CreateShareSchema)
// ─────────────────────────────────────────

export interface CreateShareParams {
  share_type?: 'link' | 'user';
  shared_with_user_id?: string | null;
  shared_with_email?: string | null;
  permissions?: 'view' | 'download';
  expires_at?: Date | null;
  expires_in_hours?: number;
  max_downloads?: number | null;
}

// ─────────────────────────────────────────
// Service
// ─────────────────────────────────────────

export const fileAttachmentService = {
  /** GET /files — list with filters */
  list: async (params: FileListParams = {}): Promise<FileListResponse> => {
    const response = await apiClient.get<FileListResponse>('/files', { params });
    return response.data;
  },

  /** GET /files/:id — single file detail */
  getById: async (id: string): Promise<FileDetailResponse> => {
    const response = await apiClient.get<FileDetailResponse>(`/files/${id}`);
    return response.data;
  },

  /** GET /files/entity/:entity_type/:entity_id */
  getByEntity: async (
    entityType: string,
    entityId: string,
    params: { category?: string; limit?: number; offset?: number; current_only?: boolean } = {}
  ): Promise<FileListResponse> => {
    const response = await apiClient.get<FileListResponse>(
      `/files/entity/${entityType}/${entityId}`,
      { params }
    );
    return response.data;
  },

  /** POST /files/upload — single file */
  upload: async (params: UploadFilesParams): Promise<FileDetailResponse> => {
    const formData = new FormData();
    formData.append('file', params.files[0]);
    formData.append('entity_type', params.entity_type);
    formData.append('entity_id', params.entity_id);
    if (params.category) formData.append('category', params.category);
    if (params.category_id) formData.append('category_id', params.category_id);
    if (params.description) formData.append('description', params.description);
    if (params.tags?.length) formData.append('tags', JSON.stringify(params.tags));
    if (params.metadata) formData.append('metadata', JSON.stringify(params.metadata));

    const response = await apiClient.post<FileDetailResponse>('/files/upload', formData);
    return response.data;
  },

  /** POST /files/upload/multiple — up to 10 files */
  uploadMultiple: async (
    params: UploadFilesParams,
    onProgress?: (fileIndex: number, percent: number) => void
  ): Promise<{ success: boolean; data: { uploaded: FileAttachment[]; errors: Array<{ file: string; error: string }>; total: number; success_count: number; error_count: number } }> => {
    const formData = new FormData();
    params.files.forEach((file) => formData.append('files', file));
    formData.append('entity_type', params.entity_type);
    formData.append('entity_id', params.entity_id);
    if (params.category) formData.append('category', params.category);
    if (params.category_id) formData.append('category_id', params.category_id);
    if (params.description) formData.append('description', params.description);
    if (params.tags?.length) formData.append('tags', JSON.stringify(params.tags));
    if (params.metadata) formData.append('metadata', JSON.stringify(params.metadata));

    const response = await apiClient.post('/files/upload/multiple', formData, {
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(0, Math.round((evt.loaded / evt.total) * 100));
        }
      },
    });
    return response.data;
  },

  /** PUT /files/:id — update metadata */
  updateMetadata: async (id: string, data: UpdateFileMetadataParams): Promise<FileDetailResponse> => {
    const response = await apiClient.put<FileDetailResponse>(`/files/${id}`, data);
    return response.data;
  },

  /**
   * DELETE /files/:id
   * @param hard - true: remove reference row from DB; false (default): soft-delete
   * @param keepBlob - true: keep binary on disk even if last reference (Layer 3)
   */
  delete: async (id: string, hard = false, keepBlob = false): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/files/${id}`, {
      params: {
        ...(hard && { hard: 'true' }),
        ...(keepBlob && { keep_blob: 'true' }),
      },
    });
    return response.data;
  },

  /** GET /files/:id/download — returns blob URL */
  getDownloadUrl: (id: string): string => {
    const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    return `${baseUrl}/files/${id}/download`;
  },

  /** GET /files/:id/download (blob) */
  download: async (id: string, filename?: string, tenantId?: string): Promise<void> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;
    const response = await apiClient.get(`/files/${id}/download`, { 
      responseType: 'blob',
      headers,
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.click();
    URL.revokeObjectURL(url);
  },

  /** GET /files/:id/preview — returns blob URL for inline preview */
  getPreviewUrl: async (id: string, tenantId?: string): Promise<string> => {
    const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;
    const response = await apiClient.get(`/files/${id}/preview`, { 
      responseType: 'blob',
      headers,
    });
    return URL.createObjectURL(response.data);
  },

  /** GET /files/:id/versions — version history */
  getVersionHistory: async (id: string): Promise<VersionHistoryResponse> => {
    const response = await apiClient.get<VersionHistoryResponse>(`/files/${id}/versions`);
    return response.data;
  },

  /** POST /files/:id/versions — upload new version */
  uploadVersion: async (
    id: string,
    file: File,
    options: { entity_id?: string; category?: string; description?: string; tags?: string[]; metadata?: Record<string, any> } = {}
  ): Promise<FileDetailResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.entity_id) formData.append('entity_id', options.entity_id);
    if (options.category) formData.append('category', options.category);
    if (options.description) formData.append('description', options.description);
    if (options.tags?.length) formData.append('tags', JSON.stringify(options.tags));
    if (options.metadata) formData.append('metadata', JSON.stringify(options.metadata));

    const response = await apiClient.post<FileDetailResponse>(`/files/${id}/versions`, formData);
    return response.data;
  },

  /** POST /files/:id/share — create share link */
  createShare: async (id: string, params: CreateShareParams): Promise<{ success: boolean; data: ShareResponse }> => {
    const response = await apiClient.post(`/files/${id}/share`, params);
    return response.data;
  },

  /** DELETE /files/shares/:shareId — revoke a share */
  revokeShare: async (shareId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/files/shares/${shareId}`);
    return response.data;
  },

  /** GET /files/stats */
  getStorageStats: async (): Promise<{ success: boolean; data: StorageStats }> => {
    const response = await apiClient.get('/files/stats');
    return response.data;
  },

  /** GET /files/quota */
  getQuota: async (): Promise<{ success: boolean; data: StorageQuota }> => {
    const response = await apiClient.get('/files/quota');
    return response.data;
  },

  /** PUT /files/quota — admin only */
  updateQuota: async (data: Partial<Pick<StorageQuota, 'max_storage_bytes' | 'max_file_size_bytes' | 'allowed_mime_types' | 'blocked_extensions'>>): Promise<{ success: boolean; data: StorageQuota }> => {
    const response = await apiClient.put('/files/quota', data);
    return response.data;
  },

  /** GET /files/filter-options */
  getFilterOptions: async (params?: { source_module?: string; uploaded_by?: string }): Promise<{ success: boolean; data: FilterOptions }> => {
    const response = await apiClient.get('/files/filter-options', { params });
    return response.data;
  },

  /** GET /files/categories-filter-options */
  getCategoriesFilterOptions: async (params?: { source_module?: string }): Promise<{ success: boolean; data: CategoriesFilterOptions }> => {
    const response = await apiClient.get('/files/categories-filter-options', { params });
    return response.data;
  },

  /** GET /files/:id/content — extract text/html */
  extractContent: async (id: string): Promise<{ 
    success: boolean; 
    data: { 
      html: string; 
      text: string; 
      original_name: string; 
      file_size: number; 
      mime_type: string; 
      checksum: string 
    } 
  }> => {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: { 
        html: string; 
        text: string; 
        original_name: string; 
        file_size: number; 
        mime_type: string; 
        checksum: string 
      } 
    }>(`/files/${id}/content`);
    return response.data;
  },

  /**
   * POST /files/blobs/purge-soft-deleted — admin only.
   * Purges soft-deleted blobs with zero references older than olderThanHours.
   * @param olderThanHours - 0 means purge all eligible blobs regardless of age.
   */
  purgeSoftDeletedBlobs: async (olderThanHours = 0): Promise<{ success: boolean; data: { purged: number } }> => {
    const response = await apiClient.post('/files/blobs/purge-soft-deleted', {}, {
      params: olderThanHours > 0 ? { older_than_hours: olderThanHours } : {},
    });
    return response.data;
  },
};

export default fileAttachmentService;
