import { useState, useEffect, useMemo } from 'react';
import { platformServiceApi } from '@/services/platform-service';
import { useAppSelector } from './redux-hooks';

// Simple module-level cache for the tenant's enabled services
let cachedTenantId: string | null = null;
let cachedServices: string[] | null = null;
let activePromise: Promise<string[]> | null = null;

export const useEnabledServices = () => {
  const { tenantId, isAuthenticated, roles } = useAppSelector((state) => state.auth);
  const [enabledServices, setEnabledServices] = useState<string[]>(
    cachedTenantId === tenantId && cachedServices ? cachedServices : []
  );
  const [isLoading, setIsLoading] = useState(!cachedServices || cachedTenantId !== tenantId);
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    if (!isAuthenticated || !tenantId) {
      setEnabledServices([]);
      setIsLoading(false);
      return;
    }

    // If already cached for this tenant, use it
    if (cachedTenantId === tenantId && cachedServices) {
      setEnabledServices(cachedServices);
      setIsLoading(false);
      return;
    }

    // Reset cache if tenant changed
    if (cachedTenantId !== tenantId) {
      cachedTenantId = tenantId;
      cachedServices = null;
      activePromise = null;
    }

    setIsLoading(true);

    // De-duplicate concurrent calls using the same activePromise
    if (!activePromise) {
      activePromise = platformServiceApi.getMyServices()
        .then((services) => {
          cachedServices = services;
          return services;
        })
        .catch((err) => {
          activePromise = null;
          throw err;
        });
    }

    activePromise
      .then((services) => {
        setEnabledServices(services);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tenantId, isAuthenticated]);

  /**
   * Checks whether a given service key is enabled.
   * System-critical services are always enabled.
   * Super Admins bypass all service restrictions.
   */
  const isServiceEnabled = (key: string): boolean => {
    if (isSuperAdmin) {
      return true;
    }
    const normalizedKey = key.toLowerCase().trim();
    if (['identity', 'audit_logs', 'notification', 'audit_log', 'identity_service', 'notifications'].includes(normalizedKey)) {
      return true;
    }
    return enabledServices.includes(normalizedKey);
  };

  return {
    enabledServices,
    isServiceEnabled,
    isLoading,
    error,
  };
};
