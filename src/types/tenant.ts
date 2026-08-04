export interface TenantSettings {
  timezone?: string;
}

import type { Module } from './module';

export interface TenantModule {
  assigned_at: string;
  assigned_by: string | null;
  status: string;
}

export interface AssignedModule extends Module {
  TenantModule: TenantModule;
}

export interface TenantUser {
  email: string;
  status: string;
}

export interface TenantAdmin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  contact_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export interface TenantBranding {
  logo_file_path?: string | null;
  logo_file_attachment_uuid?: string | null;
  favicon_file_path?: string | null;
  favicon_file_attachment_uuid?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'deleted';
  settings: TenantSettings | null;
  subscription_tier: string | null;
  max_users: number | null;
  max_modules: number | null;
  domain?: string | null;
  enable_sso?: boolean;
  enable_2fa?: boolean;
  logo_file_path?: string | null;
  logo_file_attachment_uuid?: string | null;
  favicon_file_path?: string | null;
  favicon_file_attachment_uuid?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  modules?: string[]; // Array of module IDs (legacy, for backward compatibility)
  assignedModules?: AssignedModule[]; // Array of assigned modules with full details
  users?: TenantUser[]; // Array of tenant users
  tenant_admin?: TenantAdmin; // Tenant admin user details
  user_count?: number;
  module_count?: number;
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
