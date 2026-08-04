import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hooks';
import { fetchThemeAsync, fetchAuthThemeAsync } from '@/store/themeSlice';
import apiClient from '@/services/api-client';

/**
 * Hook to fetch and apply tenant theme
 * Should be used in tenant admin screens and login
 */
export const useTenantTheme = (): void => {
  const dispatch = useAppDispatch();
  const { faviconUrl, isInitialized, isLoading } = useAppSelector((state) => state.theme);
  const { isAuthenticated, roles } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only fetch if not already initialized
    if (!isInitialized && !isLoading) {
      let isSuperAdmin = false;
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) {
        rolesArray = roles;
      } else if (typeof roles === 'string') {
        try {
          rolesArray = JSON.parse(roles);
        } catch {
          rolesArray = [];
        }
      }
      isSuperAdmin = rolesArray.includes('super_admin');

      if (isAuthenticated && !isSuperAdmin) {
        dispatch(fetchAuthThemeAsync());
      } else {
        dispatch(fetchThemeAsync());
      }
    }
  }, [dispatch, isInitialized, isLoading, isAuthenticated, roles]);

  // Apply favicon
  useEffect(() => {
    if (!faviconUrl) return;

    let isMounted = true;
    let blobUrl: string | null = null;

    const applyFavicon = async () => {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
      const cleanBase = baseUrl.replace(/\/+$/, '');
      
      // Robust check for backend URL (handles localhost vs IP mismatch)
      const isBackendUrl = faviconUrl.includes(`${cleanBase}/files/`) || 
                          (faviconUrl.includes("/api/v1/files/") && faviconUrl.includes("/preview")) ||
                          (faviconUrl.startsWith('/') && faviconUrl.includes("/files/") && faviconUrl.includes("/preview"));

      let finalUrl = isBackendUrl ? null : faviconUrl;

      // If it's a backend URL, fetch it with authentication
      if (isBackendUrl) {
        try {
          const response = await apiClient.get(faviconUrl, { responseType: 'blob' });
          if (isMounted) {
            blobUrl = URL.createObjectURL(response.data);
            finalUrl = blobUrl;
          }
        } catch (err) {
          console.error('Failed to fetch authenticated favicon:', err);
        }
      }

      // Only proceed if we have a valid URL to apply
      if (isMounted && finalUrl) {
        // Remove existing favicon links
        const existingFavicons = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
        existingFavicons.forEach((favicon) => favicon.remove());

        // Add new favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        // Try to detect type or default to image/png
        link.type = faviconUrl.endsWith('.ico') ? 'image/x-icon' : 'image/png';
        link.href = finalUrl;
        document.head.appendChild(link);
      }
    };

    applyFavicon();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [faviconUrl]);
};
