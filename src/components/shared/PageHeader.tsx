import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/hooks/redux-hooks';

export interface TabItem {
  label: string;
  path: string;
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  tabs?: TabItem[];
  action?: React.ReactNode;
}

const defaultTabs: TabItem[] = [
  // { label: 'Overview', path: '/dashboard' },
  // { label: 'Tenants', path: '/tenants' },
  // // { label: 'Users', path: '/users' },
  // // { label: 'Roles', path: '/roles' },
  // { label: 'Modules', path: '/modules' },
  // { label: 'Audit Logs', path: '/audit-logs' },
];

export const PageHeader = ({
  title,
  description,
  tabs,
  action,
}: PageHeaderProps): ReactElement => {
  const location = useLocation();
  const { roles } = useAppSelector((state) => state.auth);

  // Check if user is super_admin
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

  const isPathMatch = (tabPath: string): boolean =>
    location.pathname === tabPath || location.pathname.startsWith(`${tabPath}/`);

  const resolvedTabs = tabs ?? (isSuperAdmin ? defaultTabs : []);

  // Pick the most specific matching tab (longest path), so parent tabs
  // like /tenant/documents don't stay active on child routes.
  const activeTabPath =
    resolvedTabs
      .filter((tab) => isPathMatch(tab.path))
      .sort((a, b) => b.path.length - a.path.length)[0]?.path ?? null;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6 mb-4">
      {/* Title and Description */}
      <div className="flex flex-col gap-1 max-w-full md:max-w-[434px]">
        <h1 className="text-xl md:text-2xl font-bold text-[#0f1724] tracking-[-0.48px]">
          {title}
        </h1>
        {description && (
          <p className="text-sm font-normal text-[#6b7280]">
            {description}
          </p>
        )}
      </div>

      {/* Navigation Area: Tabs and Actions */}
      <div className="flex items-center gap-3">
        {/* Action Button */}
        {action && (
          <div className="flex shrink-0">
            {action}
          </div>
        )}

        {/* Tabs Navigation - Only show for super_admin */}
        {resolvedTabs.length > 0 && (
          <div className="border border-[rgba(0,0,0,0.2)] rounded-md p-1.5 flex gap-2 overflow-x-auto">
            {resolvedTabs.map((tab) => {
              const isActive = tab.path === activeTabPath;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    'flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors min-w-[76px]',
                    isActive
                      ? 'bg-[#112868] text-white'
                      : 'bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] text-[#0f1724] hover:bg-gray-100'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
