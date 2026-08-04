export interface Designation {
  id: string;
  name: string;
  code: string;
  description?: string;
  tenant_id: string;
  is_active: boolean;
  level: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  user_count?: number;
}

export interface DesignationsResponse {
  success: boolean;
  data: Designation[];
  total: number;
}

export interface DesignationResponse {
  success: boolean;
  data: Designation;
}

export interface CreateDesignationRequest {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  level?: number;
  sort_order?: number;
}

export interface UpdateDesignationRequest {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  level?: number;
  sort_order?: number;
}
