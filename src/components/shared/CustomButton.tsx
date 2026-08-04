import type { ReactElement, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Loader2 } from 'lucide-react';

const customButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: '', // Handled by style prop for theme colors
        secondary: '', // Handled by style prop for theme colors
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        warning: 'bg-amber-500 text-white hover:bg-amber-600',
        outline: 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
        ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        xs: 'h-7 px-2 text-[10px]',
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-10 px-6 text-sm',
        xl: 'h-12 px-8 text-base',
        icon: 'h-9 w-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface CustomButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof customButtonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const CustomButton = ({
  children,
  variant,
  size,
  fullWidth,
  className,
  disabled,
  isLoading,
  leftIcon,
  rightIcon,
  style,
  ...props
}: CustomButtonProps): ReactElement => {
  const { primaryColor, secondaryColor } = useAppTheme();
  
  
  const getThemeStyles = () => {
    if (variant === 'secondary') {
      return {
        backgroundColor: secondaryColor,
        color: primaryColor,
        border: `1px solid ${primaryColor}20`,
      };
    }
    if (variant === 'primary' || !variant) {
      return {
        backgroundColor: primaryColor,
        color: secondaryColor,
      };
    }
    return {};
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(customButtonVariants({ variant, size, fullWidth, className }))}
      style={{
        ...getThemeStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          if (variant === 'primary' || !variant) {
            e.currentTarget.style.filter = 'brightness(1.1)';
          } else if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = `${primaryColor}10`;
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          const styles = getThemeStyles() as any;
          if (styles.backgroundColor) e.currentTarget.style.backgroundColor = styles.backgroundColor;
          if (styles.color) e.currentTarget.style.color = styles.color;
          e.currentTarget.style.filter = 'none';
        }
      }}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
