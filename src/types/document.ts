export interface DocumentCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  parent_id?: string | null;
  requires_training?: boolean;
  retention_years?: number;
  review_frequency_months?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentSummary {
  id: string;
  document_number: string;
  title: string;
  document_type: string;
  category: string | null;
  status: string;
  current_version?: string | null;
  owner?: string | null;
  next_review_date?: string | null;
  updated_at?: string;
  module_name?: string | null;
  source_record_id?: string | null;
}

export interface DocumentDetail {
  id: string;
  document_number: string;
  title: string;
  description?: string | null;
  document_type: string;
  category?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  status: string;
  current_version?: string | null;
  version_status?: string | null;
  owner?: {
    id: string;
    email: string;
    name?: string;
  } | null;
  department?: string | null;
  effective_date?: string | null;
  next_review_date?: string | null;
  tags?: string[];
  content?: string | null;
  content_html?: string | null;
  custom_fields?: Record<string, unknown>;
  workflow_instance_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  source_module?: string | null;
  source_module_id?: string | null;
  source_record_id?: string | null;
  category_id?: string | null;
  module_name?: string | null;
}

export interface DocumentVersion {
  id: string;
  version_number: string;
  major_version: number;
  minor_version: number;
  status: string;
  change_summary?: string | null;
  change_reason?: string | null;
  content?: string | null;
  content_html?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  module_name?: string | null;
}

// ── Section & Comment types (new) ──────────────────────────────────────────

export type SectionReviewStatus = "pending" | "reviewed" | "rework";

export interface DocumentSection {
  id: string;
  document_id: string;
  version_id: string;
  section_number?: string | null;
  title?: string | null;
  content?: string | null;
  content_html?: string | null;
  order_index: number;
  parent_id?: string | null;
  review_status: SectionReviewStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  is_mandatory: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  section_id?: string | null;
  comment_text: string;
  workflow_step?: string | null;
  authored_by: string;
  author_name?: string | null;
  status: "open" | "resolved";
  resolved_by?: string | null;
  resolved_at?: string | null;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Payload for creating a document section ────────────────────────────────

export interface DocumentSectionInput {
  section_number?: string;
  title?: string;
  content?: string;
  content_html?: string;
  order_index?: number;
  parent_id?: string;
  is_mandatory?: boolean;
}

export interface DocumentListResponse {
  success: boolean;
  data: DocumentSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface DocumentResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
