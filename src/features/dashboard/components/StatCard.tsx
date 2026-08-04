import { cn } from '@/lib/utils';
import type { StatCardData } from '@/types/dashboard';

interface StatCardProps {
  data: StatCardData;
}

export const StatCard = ({ data }: StatCardProps) => {
  const Icon = data.icon;

  return (
    <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg p-[17px] flex flex-col gap-3 h-[107px] overflow-hidden">
      <div className="flex items-start justify-between">
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {data.badge && (
          <div
            className={cn(
              'px-1.5 py-0.5 rounded text-[11px] font-semibold h-[14px] whitespace-nowrap',
              data.badge.variant === 'green'
                ? 'bg-[rgba(16,185,129,0.1)] text-[#16a34a]'
                : 'bg-white text-[#6b7280]'
            )}
          >
            {data.badge.text}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0">
        <div className="text-2xl font-bold text-[#0f1724] tracking-[-0.48px] whitespace-nowrap">
          {data.value}
        </div>
        <div className="text-xs font-medium text-[#6b7280] whitespace-nowrap">
          {data.label}
        </div>
      </div>
    </div>
  );
};
