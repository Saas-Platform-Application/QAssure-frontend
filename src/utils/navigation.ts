/**
 * Navigation utility for programmatic navigation outside React components
 * This allows us to use React Router's navigate function in services/interceptors
 */

type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;

let navigateFunction: NavigateFunction | null = null;

/**
 * Set the navigate function (should be called once during app initialization)
 */
export const setNavigate = (navigate: NavigateFunction): void => {
  navigateFunction = navigate;
};

/**
 * Get the navigate function
 */
export const getNavigate = (): NavigateFunction | null => {
  return navigateFunction;
};

/**
 * Navigate to a path (wrapper around React Router's navigate)
 */
export const navigate = (to: string, options?: { replace?: boolean }): void => {
  if (navigateFunction) {
    navigateFunction(to, options);
  } else {
    // Fallback to window.location if navigate is not available
    window.location.href = to;
  }
};
