import apiClient from "@/services/api-client";
import type {
  DocumentCategory,
  DocumentDetail,
  DocumentListResponse,
  DocumentSummary,
  DocumentResponse,
  DocumentVersion,
} from "@/types/document";

export interface ListDocumentsParams {
  status?: string;
  category_id?: string;
  document_type?: string;
  owner_id?: string;
  source_module_id?: string;
  source_record_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentPayload {
  title: string;
  description?: string;
  document_number?: string;
  category_id?: string;
  document_type: string;
  owner_id?: string;
  department?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  content?: string;
  content_html?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  file_hash?: string;
  source_module?: string;
  source_module_id?: string;
  /** Links to a specific record in the source app (e.g. Report_ID_001) */
  source_record_id?: string;
  /** When provided, workflow is auto-started and document goes directly to in_review */
  workflow_definition_id?: string;
  /** Structured sections to create alongside the document */
  sections?: Array<{
    section_number?: string;
    title?: string;
    content?: string;
    content_html?: string;
    order_index?: number;
    is_mandatory?: boolean;
  }>;
}

export interface FileAttachmentItem {
  id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  file_size_formatted: string;
  category: string;
  description: string;
  uploaded_by_email: string;
  created_at: string;
}

export interface CreateCategoryPayload {
  name: string;
  code: string;
  description?: string;
  parent_id?: string | null;
  requires_training?: boolean;
  retention_years?: number;
  review_frequency_months?: number;
}

export interface CreateDocumentVersionPayload {
  content?: string;
  content_html?: string;
  change_summary?: string;
  change_reason?: string;
  is_major_version?: boolean;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  file_hash?: string;
  source_module?: string;
  source_module_id?: string;
}

export const documentService = {
  listFiles: async (): Promise<{ success: boolean; data: FileAttachmentItem[]; pagination: { total: number; limit: number; offset: number } }> => {
    const response = await apiClient.get<{ success: boolean; data: FileAttachmentItem[]; pagination: { total: number; limit: number; offset: number } }>("/files");
    return response.data;
  },

  listForDropdown: async (): Promise<{ success: boolean; data: FileAttachmentItem[] }> => {
    const response = await apiClient.get<{ success: boolean; data: FileAttachmentItem[] }>("/files/dropdown-options");
    return response.data;
  },

  getFileContent: async (fileId: string): Promise<{ 
    success: boolean; 
    data: { 
      html: string; 
      text: string; 
      original_name: string; 
      file_path: string; 
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
        file_path: string; 
        file_size: number; 
        mime_type: string; 
        checksum: string 
      } 
    }>(`/files/${fileId}/content`);
    return response.data;
  },

  list: async (params: ListDocumentsParams): Promise<DocumentListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.category_id) queryParams.append("category_id", params.category_id);
    if (params.document_type)
      queryParams.append("document_type", params.document_type);
    if (params.owner_id) queryParams.append("owner_id", params.owner_id);
    if (params.source_module_id)
      queryParams.append("source_module_id", params.source_module_id);
    if (params.source_record_id)
      queryParams.append("source_record_id", params.source_record_id);
    if (params.search) queryParams.append("search", params.search);
    if (params.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params.offset !== undefined)
      queryParams.append("offset", params.offset.toString());

    const response = await apiClient.get<DocumentListResponse>(
      `/documents?${queryParams.toString()}`,
    );
    return response.data;
  },

  getById: async (id: string): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.get<DocumentResponse<DocumentDetail>>(
      `/documents/${id}`,
    );
    return response.data;
  },

  create: async (
    payload: CreateDocumentPayload,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      "/documents",
      payload,
    );
    return response.data;
  },

  update: async (
    id: string,
    payload: Partial<CreateDocumentPayload>,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.put<DocumentResponse<DocumentDetail>>(
      `/documents/${id}`,
      payload,
    );
    return response.data;
  },

  getTypes: async (): Promise<
    DocumentResponse<Array<{ code: string; name: string }>>
  > => {
    const response = await apiClient.get<
      DocumentResponse<Array<{ code: string; name: string }>>
    >("/documents/types");
    return response.data;
  },

  getStatuses: async (): Promise<
    DocumentResponse<
      Array<{ code: string; name: string; description?: string }>
    >
  > => {
    const response = await apiClient.get<
      DocumentResponse<
        Array<{ code: string; name: string; description?: string }>
      >
    >("/documents/statuses");
    return response.data;
  },

  getCategories: async (): Promise<DocumentResponse<DocumentCategory[]>> => {
    const response = await apiClient.get<DocumentResponse<DocumentCategory[]>>(
      "/documents/categories",
    );
    return response.data;
  },

  createCategory: async (
    payload: CreateCategoryPayload,
  ): Promise<DocumentResponse<DocumentCategory>> => {
    const response = await apiClient.post<DocumentResponse<DocumentCategory>>(
      "/documents/categories",
      payload,
    );
    return response.data;
  },

  updateCategory: async (
    id: string,
    payload: Partial<CreateCategoryPayload>,
  ): Promise<DocumentResponse<DocumentCategory>> => {
    const response = await apiClient.put<DocumentResponse<DocumentCategory>>(
      `/documents/categories/${id}`,
      payload,
    );
    return response.data;
  },

  deleteCategory: async (
    id: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/documents/categories/${id}`,
    );
    return response.data;
  },

  getVersions: async (
    id: string,
  ): Promise<DocumentResponse<DocumentVersion[]>> => {
    const response = await apiClient.get<DocumentResponse<DocumentVersion[]>>(
      `/documents/${id}/versions`,
    );
    return response.data;
  },

  createVersion: async (
    id: string,
    payload: CreateDocumentVersionPayload,
  ): Promise<DocumentResponse<DocumentVersion>> => {
    const response = await apiClient.post<DocumentResponse<DocumentVersion>>(
      `/documents/${id}/versions`,
      payload,
    );
    return response.data;
  },

  submitForReview: async (
    id: string,
    workflow_definition_id: string,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      `/documents/${id}/submit`,
      { workflow_definition_id },
    );
    return response.data;
  },

  approve: async (
    id: string,
    comments?: string,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      `/documents/${id}/approve`,
      { comments: comments || "" },
    );
    return response.data;
  },

  reject: async (
    id: string,
    reason: string,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      `/documents/${id}/reject`,
      { reason },
    );
    return response.data;
  },

  makeEffective: async (
    id: string,
    effective_date: string,
    signature_id?: string,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      `/documents/${id}/make-effective`,
      { effective_date, signature_id: signature_id || null },
    );
    return response.data;
  },

  makeObsolete: async (
    id: string,
    reason: string,
  ): Promise<DocumentResponse<DocumentDetail>> => {
    const response = await apiClient.post<DocumentResponse<DocumentDetail>>(
      `/documents/${id}/obsolete`,
      { reason },
    );
    return response.data;
  },

  checkout: async (
    id: string,
    reason?: string,
  ): Promise<DocumentResponse<{ checked_out?: boolean; expires_at?: string }>> => {
    const response = await apiClient.post<
      DocumentResponse<{ checked_out?: boolean; expires_at?: string }>
    >(`/documents/${id}/checkout`, { reason: reason || "" });
    return response.data;
  },

  checkin: async (
    id: string,
  ): Promise<DocumentResponse<{ checked_in?: boolean }>> => {
    const response = await apiClient.post<
      DocumentResponse<{ checked_in?: boolean }>
    >(`/documents/${id}/checkin`);
    return response.data;
  },
  
  getDueForReview: async (daysAhead?: number): Promise<DocumentResponse<DocumentSummary[]>> => {
    const response = await apiClient.get<DocumentResponse<DocumentSummary[]>>(
      "/documents/due-for-review",
      { params: { days_ahead: daysAhead } }
    );
    return response.data;
  },

  // ── Sections ──────────────────────────────────────────────────────────────

  getSections: async (
    documentId: string,
  ): Promise<DocumentResponse<import("@/types/document").DocumentSection[]>> => {
    const response = await apiClient.get(
      `/documents/${documentId}/sections`,
    );
    return response.data;
  },

  updateSection: async (
    documentId: string,
    sectionId: string,
    data: Partial<{
      title: string;
      content: string;
      content_html: string;
      section_number: string;
      order_index: number;
      is_mandatory: boolean;
    }>,
  ): Promise<DocumentResponse<import("@/types/document").DocumentSection>> => {
    const response = await apiClient.patch(
      `/documents/${documentId}/sections/${sectionId}`,
      data,
    );
    return response.data;
  },

  markSectionStatus: async (
    documentId: string,
    sectionId: string,
    status: "reviewed" | "rework" | "pending",
  ): Promise<DocumentResponse<import("@/types/document").DocumentSection>> => {
    const response = await apiClient.post(
      `/documents/${documentId}/sections/${sectionId}/review`,
      { status },
    );
    return response.data;
  },

  // ── Comments ──────────────────────────────────────────────────────────────

  listComments: async (
    documentId: string,
    sectionId?: string,
  ): Promise<DocumentResponse<import("@/types/document").DocumentComment[]>> => {
    const params = sectionId ? { section_id: sectionId } : {};
    const response = await apiClient.get(
      `/documents/${documentId}/comments`,
      { params },
    );
    return response.data;
  },

  addComment: async (
    documentId: string,
    payload: {
      comment_text: string;
      section_id?: string;
      parent_id?: string;
    },
  ): Promise<DocumentResponse<import("@/types/document").DocumentComment>> => {
    const response = await apiClient.post(
      `/documents/${documentId}/comments`,
      payload,
    );
    return response.data;
  },

  resolveComment: async (
    documentId: string,
    commentId: string,
  ): Promise<DocumentResponse<import("@/types/document").DocumentComment>> => {
    const response = await apiClient.patch(
      `/documents/${documentId}/comments/${commentId}/resolve`,
      {},
    );
    return response.data;
  },
};

