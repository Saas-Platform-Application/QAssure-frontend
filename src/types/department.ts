export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  parent_id?: string | null;
  tenant_id: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Hierarchical properties if using tree
  parent_name?: string;
  child_count?: number;
  children?: Department[];
  user_count: string;
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

export interface DepartmentsResponse {
  success: boolean;
  data: Department[];
  total: number;
}

export interface DepartmentResponse {
  success: boolean;
  data: Department;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}
