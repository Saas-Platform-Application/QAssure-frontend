import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { 
  ArrowRight, 
  Layout as LayoutIcon, 
  Shield, 
  FileText, 
  LayoutGrid, 
  Database, 
  ClipboardCheck,
  Package,
  ArrowUpRight,
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hooks';
import { logoutAsync } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { showToast } from '@/utils/toast';
import { moduleService } from '@/services/module-service';
import type { MyModule } from '@/types/module';
import { AuthenticatedImage } from '@/components/shared';

interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
  isExternal?: boolean;
}

const WorkspaceCard = ({ 
  title, 
  description, 
  icon, 
  iconBg, 
  iconColor, 
  onClick,
  isExternal = false
}: WorkspaceCardProps) => (
  <div 
    className="group bg-white border border-[rgba(0,0,0,0.08)] rounded-[24px] p-8 flex flex-col h-full transition-all hover:border-[rgba(0,0,0,0.15)] hover:shadow-[0px_8px_32px_0px_rgba(0,0,0,0.04)] cursor-pointer"
    onClick={onClick}
  >
    <div className="flex-1">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-105"
        style={{ backgroundColor: iconBg }}
      >
        <div style={{ color: iconColor }}>{icon}</div>
      </div>
      <h3 className="text-xl font-semibold text-[#0f1724] mb-3">{title}</h3>
      <p className="text-[#64748b] text-sm leading-relaxed mb-8 line-clamp-3">
        {description}
      </p>
    </div>
    
    <div className="flex items-center justify-between pt-6 border-t border-[rgba(0,0,0,0.08)]">
      <span className="text-sm font-semibold text-[#0f1724]">Open Workspace</span>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748b] group-hover:text-[#0f1724] transition-colors">
        {isExternal ? <ArrowUpRight className="w-5 h-5" /> : <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
      </div>
    </div>
  </div>
);

const LandingPage = (): ReactElement => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, roles, tenantId, isLoading: isAuthLoading } = useAppSelector((state) => state.auth);
  const { logoUrl } = useAppSelector((state) => state.theme);
  const [modules, setModules] = useState<MyModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleLogout = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(false);
    
    const isTenantRoute = window.location.pathname.startsWith('/tenant/') || window.location.pathname === '/tenant';
    const isSuperAdmin = roles.includes('super_admin');
    const redirectPath = isSuperAdmin ? '/' : (isTenantRoute ? '/tenant/login' : '/');
    
    try {
      const result = await dispatch(logoutAsync()).unwrap();
      showToast.success(result.message || 'Logged out successfully');
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('Logout error:', error);
      dispatch({ type: 'auth/logout' });
      showToast.success(error?.message || 'Logged out successfully');
      navigate(redirectPath, { replace: true });
    }
  };

  const getUserInitials = (): string => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await moduleService.getMyModules();
        if (response.success && response.data) {
          setModules(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch modules:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModules();
  }, []);

  const handleLaunchModule = async (moduleId: string) => {
    try {
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) {
        rolesArray = roles;
      } else if (typeof roles === 'string') {
        try { rolesArray = JSON.parse(roles); } catch { rolesArray = []; }
      }
      
      const isSuperAdmin = rolesArray.includes('super_admin');
      const launchTenantId = isSuperAdmin ? tenantId : null;
      
      const response = await moduleService.launch(moduleId, launchTenantId);
      if (response.success && response.data.launch_url) {
        window.open(response.data.launch_url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to launch module:', error);
    }
  };

  const getUserName = () => {
    if (user?.first_name) return user.first_name;
    return user?.email?.split('@')[0] || 'User';
  };

  const getRoleDisplayName = () => {
    let rolesArray: string[] = [];
    if (Array.isArray(roles)) {
      rolesArray = roles;
    } else if (typeof roles === 'string') {
      try { rolesArray = JSON.parse(roles); } catch { rolesArray = []; }
    }
    const role = rolesArray[0] || 'User';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const getUserDisplayName = (): string => {
    let rolesArray: string[] = [];
    if (Array.isArray(roles)) {
      rolesArray = roles;
    } else if (typeof roles === 'string') {
      try { rolesArray = JSON.parse(roles); } catch { rolesArray = []; }
    }
    
    if (user?.first_name) {
      return `${user.first_name} - ${rolesArray[0] || 'User'}`;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Icon mapping for modules based on code or name
  const getModuleIcon = (module: MyModule) => {
    const code = module.name.toUpperCase();
    if (code.includes('CER') || code.includes('ENTITY')) return <Database className="w-6 h-6" />;
    if (code.includes('COC') || code.includes('CHAIN')) return <Shield className="w-6 h-6" />;
    if (code.includes('LSR') || code.includes('SERVICE')) return <FileText className="w-6 h-6" />;
    if (code.includes('DCT') || code.includes('DATA')) return <LayoutGrid className="w-6 h-6" />;
    if (code.includes('TMT') || code.includes('TASK')) return <ClipboardCheck className="w-6 h-6" />;
    return <Package className="w-6 h-6" />;
  };

  const getModuleColor = (index: number) => {
    const colors = [
      { bg: '#ECFDF5', text: '#059669' }, // Green
      { bg: '#FEF2F2', text: '#DC2626' }, // Red
      { bg: '#F5F3FF', text: '#7C3AED' }, // Purple
      { bg: '#F0FDFA', text: '#0D9488' }, // Teal
      { bg: '#FEFCE8', text: '#CA8A04' }, // Yellow
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Landing Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[rgba(0,0,0,0.08)] py-3 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <AuthenticatedImage
              src={logoUrl}
              alt="Logo"
              className="h-8 w-auto max-w-[150px] object-contain"
              fallback={
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-[#112868]">
                  <Shield className="w-5 h-5 text-white" strokeWidth={1.67} />
                </div>
              }
            />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-[#112868]">
              <Shield className="w-5 h-5 text-white" strokeWidth={1.67} />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#0f1724] leading-tight">QAssure</span>
            <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
              {getRoleDisplayName()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-1.5 py-1.5 pr-1.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-full hover:bg-gray-50 transition-colors cursor-pointer min-h-[44px]"
              aria-label="User menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="w-7 h-7 bg-[#f1f5f9] rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-[#0f1724]">
                  {getUserInitials()}
                </span>
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

                {/* Logout Button */}
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isAuthLoading}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isAuthLoading ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center px-6 py-6 md:py-10">
        {/* Welcome Section */}
        <div className="text-center mb-4 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold text-[#0f1724] mb-4">
            Welcome back, {getUserName()}
          </h1>
          <p className="text-[#64748b] text-md max-w-2xl mx-auto leading-relaxed">
            Select a module below to access your workspace. You can switch between modules anytime from the main navigation.
          </p>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          {/* Platform Administration Card */}
          <WorkspaceCard
            title="Platform Administration"
            description="Manage organizations, user access, billing, and global workspace settings."
            icon={<LayoutIcon className="w-6 h-6" />}
            iconBg="#EFF6FF"
            iconColor="#2563EB"
            onClick={() => navigate('/tenant')}
          />

          {/* Dynamic Module Cards */}
          {!isLoading && modules.map((module, index) => {
            const color = getModuleColor(index);
            return (
              <WorkspaceCard
                key={module.id}
                title={module.name}
                description={module.description || `Access and manage your ${module.name} workspace details and operations.`}
                icon={getModuleIcon(module)}
                iconBg={color.bg}
                iconColor={color.text}
                isExternal={true}
                onClick={() => handleLaunchModule(module.id)}
              />
            );
          })}
          
          {/* Loading States */}
          {isLoading && [1, 2].map((i) => (
            <div key={i} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[24px] p-8 h-[320px] animate-pulse">
              <div className="w-12 h-12 bg-gray-100 rounded-xl mb-6" />
              <div className="h-6 bg-gray-100 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      </main>

      {/* Footer Decoration */}
      <footer className="py-12 flex justify-center opacity-40 grayscale pointer-events-none">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">QAssure Secure Workspace</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
