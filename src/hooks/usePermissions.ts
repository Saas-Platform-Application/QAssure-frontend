import { useMemo } from 'react';
import { useAppSelector } from './redux-hooks';

/**
 * Hook to check user permissions
 * @returns Object with permission check functions
 */
export const usePermissions = () => {
  const { roles, permissions } = useAppSelector((state) => state.auth);

  const parsedRoles = useMemo((): string[] => {
    if (Array.isArray(roles)) {
      return roles;
    }
    if (typeof roles === 'string') {
      try {
        const parsed = JSON.parse(roles);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return [roles];
      } catch {
        return [roles];
      }
    }
    return [];
  }, [roles]);

  const isSuperAdmin = useMemo(() => {
    return parsedRoles.includes('super_admin');
  }, [parsedRoles]);

  /**
   * Check if user has permission for a specific resource and action
   * @param resource - The resource name (e.g., 'roles', 'users', 'audit_logs')
   * @param action - The action name (e.g., 'create', 'read', 'update', 'delete', '*')
   * @returns boolean - true if user has permission, false otherwise
   */
  const hasPermission = useMemo(
    () => (resource: string, action: string): boolean => {
      // Super admin has all permissions
      if (isSuperAdmin) {
        return true;
      }

      // Check if user has permission with exact match or wildcard
      return permissions.some((perm) => {
        // Check resource match (exact or wildcard)
        const resourceMatches = perm.resource === resource || perm.resource === '*';
        
        // Check action match (exact or wildcard)
        const actionMatches = perm.action === action || perm.action === '*';
        
        return resourceMatches && actionMatches;
      });
    },
    [permissions, isSuperAdmin]
  );

  /**
   * Check if user can create a resource
   */
  const canCreate = useMemo(
    () => (resource: string): boolean => {
      return hasPermission(resource, '*') || hasPermission(resource, 'create');
    },
    [hasPermission]
  );

  /**
   * Check if user can read a resource
   */
  const canRead = useMemo(
    () => (resource: string): boolean => {
      return hasPermission(resource, '*') || hasPermission(resource, 'read');
    },
    [hasPermission]
  );

  /**
   * Check if user can update a resource
   */
  const canUpdate = useMemo(
    () => (resource: string): boolean => {
      return hasPermission(resource, '*') || hasPermission(resource, 'update');
    },
    [hasPermission]
  );

  /**
   * Check if user can delete a resource
   */
  const canDelete = useMemo(
    () => (resource: string): boolean => {
      return hasPermission(resource, '*') || hasPermission(resource, 'delete');
    },
    [hasPermission]
  );

  const isTenantAdmin = useMemo(() => {
    return parsedRoles.includes('tenant_admin') || parsedRoles.includes('super_admin');
  }, [parsedRoles]);

  return {
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    isSuperAdmin,
    isTenantAdmin,
  };
};
