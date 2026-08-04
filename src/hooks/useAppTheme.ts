import { useAppSelector } from '@/hooks/redux-hooks';

/**
 * Hook to get the current applied theme colors and configuration.
 * Automatically handles super_admin vs tenant role logic and route checks.
 */
export const useAppTheme = () => {
  const { theme, logoUrl: stateLogoUrl } = useAppSelector((state) => state.theme);
  const { roles } = useAppSelector((state) => state.auth);

  // Default platform colors
  const DEFAULT_PRIMARY = '#112868';
  const DEFAULT_SECONDARY = '#23dce1';
  const DEFAULT_ACCENT = '#084cc8';

  // Process roles safely
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

  const isSuperAdmin = rolesArray.includes('super_admin');
  const isTenantAdmin = !isSuperAdmin && rolesArray.length > 0;
  
  // Check if we're on a tenant route
  const isTenantRoute = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/tenant/') || window.location.pathname === '/tenant');
  
  // Logic to determine if theme should be applied
  const shouldUseTheme = (isTenantAdmin || (isTenantRoute && !isSuperAdmin)) && !!theme;

  const primaryColor = shouldUseTheme && theme?.primary_color ? theme.primary_color : DEFAULT_PRIMARY;
  const secondaryColor = shouldUseTheme && theme?.secondary_color ? theme.secondary_color : DEFAULT_SECONDARY;
  const accentColor = shouldUseTheme && theme?.accent_color ? theme.accent_color : DEFAULT_ACCENT;
  const logoUrl = shouldUseTheme && stateLogoUrl ? stateLogoUrl : null;

  return {
    theme,
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    shouldUseTheme,
    isSuperAdmin,
    isTenantAdmin,
    isTenantRoute
  };
};
