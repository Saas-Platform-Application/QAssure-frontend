export interface RoleModuleCombination {
  role_id: string;
  module_id?: string | null;
}

export interface UserRoleModuleCombination {
  role_id: string;
  role_name: string;
  role_code?: string;
  module_id: string | null;
  module_name: string | null;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'suspended' | 'deleted';
  auth_provider: string;
  tenant_id?: string;
  role_id?: string;
  tenant?: {
    id: string;
    name: string;
  };
  role?: {
    id: string;
    name: string;
    code?: string;
  };
  roles?: {
    id: string;
    name: string;
    code?: string;
  }[];
  department_id?: string;
  designation_id?: string;
  department?: {
    id: string;
    name: string;
  };
  designation?: {
    id: string;
    name: string;
  };
  modules?: {
    id: string;
    name: string;
  }[];
  role_module_combinations?: UserRoleModuleCombination[];
  category?: 'tenant_user' | 'supplier_user';
  supplier_id?: string | null;
  preferences?: any;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: Pagination;
}

export interface CreateUserRequest {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'suspended' | 'deleted';
  auth_provider: 'local';
  tenant_id?: string;
  role_id?: string;
  role_ids?: string[];
  role_module_combinations?: RoleModuleCombination[];
  department_id?: string | null;
  designation_id?: string | null;
  module_ids?: string[];
  category?: 'tenant_user' | 'supplier_user';
  supplier_id?: string | null;
}

export interface CreateUserResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface GetUserResponse {
  success: boolean;
  data: User;
}

export interface UpdateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  status: 'active' | 'suspended' | 'deleted';
  auth_provider?: string;
  tenant_id: string;
  role_id?: string;
  role_ids?: string[];
  role_module_combinations?: RoleModuleCombination[];
  department_id?: string | null;
  designation_id?: string | null;
  module_ids?: string[];
  category?: 'tenant_user' | 'supplier_user';
  supplier_id?: string | null;
}

export interface UpdateUserResponse {
  success: boolean;
  data: User;
  message?: string;
}

export interface DeleteUserResponse {
  success: boolean;
  message?: string;
}
