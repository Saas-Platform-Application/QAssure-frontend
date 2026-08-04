import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, LogOut, User, ChevronRight, Shield } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hooks';
import { logoutAsync } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { showToast } from '@/utils/toast';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { ProfileModal } from '@/components/shared/ProfileModal';
import type { ReactElement } from 'react';

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; path?: string }>;
  currentPage: string;
  onMenuClick?: () => void;
}

export const Header = ({ breadcrumbs, currentPage, onMenuClick }: HeaderProps): ReactElement => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isLoading, roles, tenantId } = useAppSelector((state) => state.auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'sessions'>('sessions');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openProfileModal = (tab: 'profile' | 'sessions') => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
    setIsDropdownOpen(false);
  };

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'A';
  };

  // Get user display name
  const getUserDisplayName = (): string => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} - ${roles[0] || 'N/A'}`;
    }
    return user?.email?.split('@')[0] || 'Admin';
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside the dropdown container
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      // Use mousedown instead of click to avoid interfering with button clicks
      // Add listener in bubble phase (not capture) so button clicks fire first
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const isPlatformUser = roles.includes('super_admin') || tenantId === '00000000-0000-0000-0000-000000000001';

  // Handle logout
  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close dropdown immediately
    setIsDropdownOpen(false);
    
    // Check if user is on a tenant route to determine redirect path
    // Note: use /tenant/ instead of /tenant to avoid matching /tenants
    const isTenantRoute = window.location.pathname.startsWith('/tenant/') || window.location.pathname === '/tenant';
    
    // Platform users always go to root login, tenant users go to /tenant/login if on a tenant route
    const redirectPath = isPlatformUser ? '/' : (isTenantRoute ? '/tenant/login' : '/');
    
    try {
      // Call logout API with Bearer token
      const result = await dispatch(logoutAsync()).unwrap();
      const message = result.message || 'Logged out successfully';
      const description = result.message ? undefined : 'You have been logged out';
      showToast.success(message, description);
      // Clear state and redirect to appropriate login page
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      // Even if API call fails, clear local state and redirect to login
      console.error('Logout error:', error);
      // Try to get message from error response
      const message = error?.message || 'Logged out successfully';
      const description = error?.message ? undefined : 'You have been logged out';
      // Dispatch logout action to clear local state
      dispatch({ type: 'auth/logout' });
      showToast.success(message, description);
      navigate(redirectPath, { replace: true });
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-[rgba(0,0,0,0.08)] py-3 md:py-4 px-4 md:px-6 flex items-center justify-between z-50 sticky top-0">
      {/* Left Side - Menu Button (Mobile) + Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-2">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-[#0f1724]" />
        </button>
 
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 md:gap-2">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <>
              {breadcrumbs[0].label !== 'QAssure' && (
                <>
                  <button
                    onClick={() => navigate(isPlatformUser ? '/dashboard' : '/tenant')}
                    className="text-xs md:text-[13px] font-normal text-[#6b7280] hover:text-[#0f1724] transition-colors cursor-pointer"
                  >
                    QAssure
                  </button>
                  <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#6b7280]" />
                </>
              )}
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1.5 md:gap-2">
                  {crumb.path ? (
                    <button
                      onClick={() => navigate(crumb.path!)}
                      className="text-xs md:text-[13px] font-normal text-[#6b7280] hover:text-[#0f1724] transition-colors cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-xs md:text-[13px] font-medium text-[#0f1724] truncate max-w-[120px] md:max-w-none">
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#6b7280]" />
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(isPlatformUser ? '/dashboard' : '/tenant')}
                className="text-xs md:text-[13px] font-normal text-[#6b7280] hover:text-[#0f1724] transition-colors cursor-pointer"
              >
                QAssure
              </button>
              <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#6b7280]" />
              <span className="text-xs md:text-[13px] font-medium text-[#0f1724] truncate max-w-[120px] md:max-w-none">
                {currentPage}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 md:w-8 md:h-8 rounded-full border border-[rgba(0,0,0,0.08)] min-h-[44px] min-w-[44px]"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </Button> */}
        <NotificationBell />

        {/* Desktop User Dropdown */}
        <div className="hidden md:block relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 px-1.5 py-1.5 pr-1.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-full hover:bg-gray-50 transition-colors cursor-pointer min-h-[44px]"
            aria-label="User menu"
            aria-expanded={isDropdownOpen}
          >
            <div className="w-7 h-7 bg-[#f1f5f9] rounded-[14px] flex items-center justify-center">
              <span className="text-xs font-medium text-[#0f1724]">{getUserInitials()}</span>
            </div>
            <span className="text-[13px] font-medium text-[#0f1724] pr-1">
              {getUserDisplayName()}
            </span>
            <ChevronDown
              className={cn('w-3.5 h-3.5 text-[#0f1724] transition-transform', isDropdownOpen && 'rotate-180')}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div 
              className="absolute right-0 top-[52px] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)] w-64 z-[100]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* User Info Section */}
              <div className="p-4 border-b border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#0f1724]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f1724] truncate">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Profile & Sessions Options */}
              <div className="p-1.5 border-b border-[rgba(0,0,0,0.08)] space-y-1">
                <button
                  type="button"
                  onClick={() => openProfileModal('profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[#0f1724] hover:bg-gray-100 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[#6b7280]" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => openProfileModal('sessions')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[#0f1724] hover:bg-gray-100 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-[#6b7280]" />
                  <span>Active Sessions</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile User Avatar */}
        <div className="md:hidden relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-8 h-8 min-h-[44px] min-w-[44px] bg-[#f1f5f9] rounded-full flex items-center justify-center cursor-pointer"
            aria-label="User menu"
            aria-expanded={isDropdownOpen}
          >
            <span className="text-xs font-medium text-[#0f1724]">{getUserInitials()}</span>
          </button>

          {/* Mobile Dropdown Menu */}
          {isDropdownOpen && (
            <div 
              className="absolute right-0 top-[52px] bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.08)] w-64 z-[100]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* User Info Section */}
              <div className="p-4 border-b border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[#0f1724]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f1724] truncate">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-[#6b7280] truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Profile & Sessions Options */}
              <div className="p-1.5 border-b border-[rgba(0,0,0,0.08)] space-y-1">
                <button
                  type="button"
                  onClick={() => openProfileModal('profile')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[#0f1724] hover:bg-gray-100 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-[#6b7280]" />
                  <span>My Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => openProfileModal('sessions')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-[#0f1724] hover:bg-gray-100 transition-colors text-left"
                >
                  <Shield className="w-4 h-4 text-[#6b7280]" />
                  <span>Active Sessions</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        defaultTab={profileModalTab}
      />
    </header>
  );
};

