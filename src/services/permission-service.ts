import apiClient from "./api-client";
import type { Permission } from "@/types/role";

export interface PermissionsResponse {
  success: boolean;
  data: Permission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface PermissionActionResponse {
  success: boolean;
  data: Permission;
  message?: string;
}

export interface DeletePermissionResponse {
  success: boolean;
  message: string;
}

export const permissionService = {
  /**
   * Get all permissions with pagination and filters
   */
  getAll: async (
    page: number = 1,
    limit: number = 100,
    filters: Record<string, any> = {}
  ): Promise<PermissionsResponse> => {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", String(limit));

    // Append filter options
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });

    const response = await apiClient.get<PermissionsResponse>(
      `/permissions?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get permission details by ID
   */
  getById: async (id: string): Promise<PermissionActionResponse> => {
    const response = await apiClient.get<PermissionActionResponse>(
      `/permissions/${id}`
    );
    return response.data;
  },

  /**
   * Create a new custom permission
   */
  create: async (data: {
    role_id: string;
    resource: string;
    action: string;
    scope: "global" | "tenant" | "module" | "platform";
    conditions?: any;
  }): Promise<PermissionActionResponse> => {
    const response = await apiClient.post<PermissionActionResponse>(
      "/permissions",
      data
    );
    return response.data;
  },

  /**
   * Update an existing permission
   */
  update: async (
    id: string,
    data: Partial<Permission>
  ): Promise<PermissionActionResponse> => {
    const response = await apiClient.put<PermissionActionResponse>(
      `/permissions/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete/revoke a permission
   */
  delete: async (id: string): Promise<DeletePermissionResponse> => {
    const response = await apiClient.delete<DeletePermissionResponse>(
      `/permissions/${id}`
    );
    return response.data;
  },
};
