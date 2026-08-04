import type { ReactElement, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";

const primaryButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-[14px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer leading-normal",
  {
    variants: {
      size: {
        default: "h-10",
        small: "h-8",
        large: "h-12",
      },
      variant: {
        default: "",
        disabled: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

interface PrimaryButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof primaryButtonVariants> {
  children: React.ReactNode;
}

export const PrimaryButton = ({
  children,
  size,
  variant,
  className,
  disabled,
  ...props
}: PrimaryButtonProps): ReactElement => {
  const buttonVariant = disabled ? "disabled" : variant || "default";
  const { primaryColor, secondaryColor } = useAppTheme();

  return (
    <button
      className={cn(
        primaryButtonVariants({ size, variant: buttonVariant }),
        className,
      )}
      style={{
        backgroundColor: primaryColor, // #112868
        color: secondaryColor,
        opacity: buttonVariant === "disabled" ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = secondaryColor;
          e.currentTarget.style.color = primaryColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = primaryColor;
          e.currentTarget.style.color = secondaryColor;
        }
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
