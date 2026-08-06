/**
 * Storage Bucket Service — QAssure Frontend
 * API client for tenant-wise storage bucket management
 */

import apiClient from './api-client';
import type { StorageType } from '@/constants/storage';

export interface StorageBucket {
  id: string;
  name: string;
  description?: string;
  owner_tenant_id: string;
  storage_type: StorageType;
  // Azure Blob Storage
  azure_account?: string;
  azure_container?: string;
  azure_sas_token_masked?: string;
  azure_url?: string;
  // Amazon S3
  s3_bucket?: string;
  s3_region?: string;
  s3_access_key_id?: string;
  s3_secret_access_key_masked?: string;
  // Google Cloud Storage
  gcs_bucket?: string;
  gcs_project_id?: string;
  gcs_service_account_key_masked?: string;
  // E2E Networks Object Storage (EOS / Vyoma) — S3-compatible
  e2e_bucket?: string;
  e2e_endpoint?: string;
  e2e_region?: string;
  e2e_access_key?: string;
  e2e_secret_key_masked?: string;
  e2e_force_path_style?: boolean;
  // Common
  is_active: boolean;
  assigned_tenants_count?: number;
  assigned_tenants?: Array<{
    tenant_id: string;
    tenant_name: string;
    assigned_at: string;
    notes?: string;
  }>;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BucketAssignment {
  id: string;
  tenant_id: string;
  bucket_id: string;
  bucket_name?: string;
  storage_type?: string;
  azure_account?: string;
  azure_container?: string;
  assigned_by?: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
}

export interface CreateBucketPayload {
  name: string;
  description?: string;
  storage_type: StorageType;
  // Azure
  azure_account?: string;
  azure_container?: string;
  azure_sas_token?: string;
  azure_url?: string;
  // Amazon S3
  s3_bucket?: string;
  s3_region?: string;
  s3_access_key_id?: string;
  s3_secret_access_key?: string;
  // GCP
  gcs_bucket?: string;
  gcs_project_id?: string;
  gcs_service_account_key?: string;
  // E2E Networks Object Storage (EOS)
  e2e_bucket?: string;
  e2e_endpoint?: string;
  e2e_region?: string;
  e2e_access_key?: string;
  e2e_secret_key?: string;
  e2e_force_path_style?: boolean;
}

export interface UpdateBucketPayload extends Partial<CreateBucketPayload> {
  is_active?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  storage_type: StorageType;
  /** Human-readable description of what was reached, e.g. "https://…/my-bucket" */
  target: string;
}

export const storageBucketService = {
  /** List all buckets (superadmin: all; tenant: own / assigned) */
  list: async (): Promise<StorageBucket[]> => {
    const res = await apiClient.get('/storage-buckets');
    return res.data.data;
  },

  /** Get a single bucket by ID */
  getById: async (id: string): Promise<StorageBucket> => {
    const res = await apiClient.get(`/storage-buckets/${id}`);
    return res.data.data;
  },

  /** Create a new bucket (owner_tenant_id auto-set by backend) */
  create: async (payload: CreateBucketPayload): Promise<StorageBucket> => {
    const res = await apiClient.post('/storage-buckets', payload);
    return res.data.data;
  },

  /** Update an existing bucket */
  update: async (id: string, payload: UpdateBucketPayload): Promise<StorageBucket> => {
    const res = await apiClient.put(`/storage-buckets/${id}`, payload);
    return res.data.data;
  },

  /** Soft-delete a bucket */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/storage-buckets/${id}`);
  },

  /**
   * Probe an unsaved bucket config before creating it — verifies the
   * credentials and endpoint actually reach the bucket.
   */
  testConnection: async (payload: CreateBucketPayload): Promise<TestConnectionResult> => {
    const res = await apiClient.post('/storage-buckets/test-connection', payload);
    return res.data.data;
  },

  /**
   * Probe a saved bucket config. Field overrides are optional — omitted
   * secrets fall back to the stored (encrypted) values.
   */
  testSavedConnection: async (
    id: string,
    overrides: UpdateBucketPayload = {},
  ): Promise<TestConnectionResult> => {
    const res = await apiClient.post(`/storage-buckets/${id}/test-connection`, overrides);
    return res.data.data;
  },

  /** Assign a bucket to a specific tenant (superadmin action) */
  assignToTenant: async (bucketId: string, tenantId: string, notes?: string): Promise<void> => {
    await apiClient.post(`/storage-buckets/${bucketId}/assign`, { tenant_id: tenantId, notes });
  },

  /** SuperAdmin: share own bucket with another tenant */
  assignSelfBucket: async (bucketId: string, tenantId: string): Promise<void> => {
    await apiClient.post(`/storage-buckets/${bucketId}/assign-self`, { tenant_id: tenantId });
  },

  /** Unassign bucket from a tenant */
  unassignFromTenant: async (tenantId: string): Promise<void> => {
    await apiClient.delete(`/storage-buckets/tenant/${tenantId}/unassign`);
  },

  /** Get the currently active bucket for a tenant */
  getActiveForTenant: async (tenantId: string): Promise<StorageBucket | null> => {
    const res = await apiClient.get(`/storage-buckets/tenant/${tenantId}/active`);
    return res.data.data ?? null;
  },

  /** Get assignment history for a tenant (superadmin only) */
  getAssignmentHistory: async (tenantId: string): Promise<BucketAssignment[]> => {
    const res = await apiClient.get(`/storage-buckets/tenant/${tenantId}/history`);
    return res.data.data;
  },
};
