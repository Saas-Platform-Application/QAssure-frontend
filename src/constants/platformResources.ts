/**
 * Platform Resources — QAssure Platform
 * Canonical list of resources that platform roles can be granted permissions on.
 * Derived from seed.js permissions list (lines 48–81).
 *
 * Used by:
 *  - Platform Role create/edit permission matrix (checklist)
 *  - Sidebar menu item filtering for platform users
 */

export interface PlatformResource {
  resource: string;
  label: string;
  actions: string[];
}

export const PLATFORM_RESOURCES: PlatformResource[] = [
  { resource: 'tenants',         label: 'Tenants',           actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'users',           label: 'Users',             actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'roles',           label: 'Roles',             actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'permissions',     label: 'Permissions',       actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'modules',         label: 'Modules',           actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'audit_logs',      label: 'Audit Logs',        actions: ['read'] },
  { resource: 'audit_resources', label: 'Audit Resources',   actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'notifications',   label: 'Notifications',     actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'smtp_config',     label: 'SMTP Config',       actions: ['read', 'update'] },
  { resource: 'api_keys',        label: 'API Keys',          actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'settings',        label: 'Settings',          actions: ['read', 'update'] },
  { resource: 'security',        label: 'Security',          actions: ['read', 'update'] },
  { resource: 'ai_completions',  label: 'AI Completions',    actions: ['read'] },
];

/** Convenience: all distinct action names */
export const ALL_ACTIONS = ['read', 'create', 'update', 'delete'];
