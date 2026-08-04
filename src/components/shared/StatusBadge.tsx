import type { ReactElement } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase',
  {
    variants: {
      variant: {
        success: 'bg-[rgba(16,185,129,0.1)] text-[#059669]',
        failure: 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]',
        info: 'bg-[#e7f8f2] text-[#084cc8]',
        process: 'bg-[rgba(245,158,11,0.1)] text-[#d97706]',
      },
    },
    defaultVariants: {
      variant: 'success',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
}

const statusDotColors = {
  success: 'bg-[#059669]',
  failure: 'bg-[#ef4444]',
  info: 'bg-[#084cc8]',
  process: 'bg-[#d97706]',
};

export const StatusBadge = ({
  children,
  variant = 'success',
  className,
}: StatusBadgeProps): ReactElement => {
  const { primaryColor } = useAppTheme();
  const isInfo = variant === 'info';

  return (
    <div 
      className={cn(statusBadgeVariants({ variant }), className)}
      style={isInfo ? { backgroundColor: `${primaryColor}1A`, color: primaryColor } : {}}
    >
      <div 
        className={cn('rounded size-1.5 shrink-0', variant && statusDotColors[variant])} 
        style={isInfo ? { backgroundColor: primaryColor } : {}}
      />
      <span>{children}</span>
    </div>
  );
};
