import type { ReactElement, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const themeButtonVariants = cva(
  'inline-flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-[#084cc8] text-white hover:bg-[#23dce1] hover:text-[#084cc8]',
        disabled: 'bg-[#084cc8] text-white opacity-50',
        light: 'bg-[#f5f7fa] text-[#0e1b2a] border border-[rgba(0,0,0,0.08)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ThemeButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof themeButtonVariants> {
  children: React.ReactNode;
}

export const ThemeButton = ({
  children,
  variant,
  className,
  disabled,
  ...props
}: ThemeButtonProps): ReactElement => {
  const buttonVariant = disabled ? 'disabled' : variant || 'default';

  return (
    <button
      className={cn(themeButtonVariants({ variant: buttonVariant }), className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
