import { cn } from '@/lib/utils';

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = ['Overview', 'Tenants', 'Users', 'Roles', 'Modules', 'Audit Logs'];

export const DashboardTabs = ({ activeTab, onTabChange }: DashboardTabsProps) => {
  return (
    <div className="border border-[rgba(0,0,0,0.2)] rounded-[5px] p-1.5 flex gap-1.5 md:gap-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'flex-shrink-0 min-w-[60px] md:min-w-[76px] rounded px-2 md:px-3 py-1.5 text-xs font-medium text-center transition-all flex items-center justify-center min-h-[44px]',
            activeTab === tab
              ? 'bg-[#084cc8] text-white'
              : 'bg-[#f5f7fa] border border-[rgba(0,0,0,0.08)] text-[#0e1b2a] hover:bg-[#e9ecef]'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
