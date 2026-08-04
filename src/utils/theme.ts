/**
 * Extract domain from current URL for theme API
 * Example: https://tenant-admin.localhost:5173/tenant/login -> https://tenant-admin.localhost:5173/tenant
 */
export const extractDomainFromUrl = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const url = window.location.href;
  try {
    const urlObj = new URL(url);
    // Get protocol (http: or https:)
    const protocol = urlObj.protocol; // e.g., "http:" or "https:"
    // Get host (hostname + port) e.g., "tenant-admin.localhost:5173"
    const host = urlObj.host;
    const pathname = urlObj.pathname; // e.g., "/tenant/login"
    
    // Extract base path - if pathname starts with /tenant, use /tenant, otherwise use empty
    let basePath = '';
    if (pathname.startsWith('/tenant')) {
      // Get /tenant and any sub-path before the last segment
      const pathSegments = pathname.split('/').filter(Boolean);
      if (pathSegments[0] === 'tenant') {
        // If there are more segments, we still want just /tenant
        // But if user wants the full path, we can adjust
        basePath = '/tenant';
      }
    }
    
    // Return with protocol: http://tenant-admin.localhost:5173/tenant
    return `${protocol}//${host}${basePath}`;
  } catch (error) {
    console.error('Failed to extract domain from URL:', error);
    return '';
  }
};

/**
 * Apply theme colors to CSS variables
 */
export const applyThemeColors = (
  primaryColor: string | null,
  secondaryColor: string | null,
  accentColor: string | null
): void => {
  const root = document.documentElement;
  
  if (primaryColor) {
    root.style.setProperty('--theme-primary', primaryColor);
  } else {
    root.style.removeProperty('--theme-primary');
  }
  
  if (secondaryColor) {
    root.style.setProperty('--theme-secondary', secondaryColor);
  } else {
    root.style.removeProperty('--theme-secondary');
  }
  
  if (accentColor) {
    root.style.setProperty('--theme-accent', accentColor);
  } else {
    root.style.removeProperty('--theme-accent');
  }
};

/**
 * Get full URL for logo/favicon
 */
// export const getThemeImageUrl = (filePath: string | null): string | null => {
//   if (!filePath) return null;
  
//   const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
//   return `${apiBaseUrl}/uploads/${filePath}`;
// };
