import type { ReactElement, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useAppTheme } from "@/hooks/useAppTheme";

const secondaryButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-[14px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer leading-normal",
  {
    variants: {
      variant: {
        default: "",
        disabled: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface SecondaryButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof secondaryButtonVariants> {
  children: React.ReactNode;
}

export const SecondaryButton = ({
  children,
  variant,
  className,
  disabled,
  ...props
}: SecondaryButtonProps): ReactElement => {
  const buttonVariant = disabled ? "disabled" : variant || "default";
  const { primaryColor, secondaryColor } = useAppTheme();

  return (
    <button
      className={cn(
        secondaryButtonVariants({ variant: buttonVariant }),
        className,
      )}
      style={{
        backgroundColor: secondaryColor, // #112868
        color: primaryColor,
        opacity: buttonVariant === "disabled" ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = primaryColor;
          e.currentTarget.style.color = secondaryColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = secondaryColor;
          e.currentTarget.style.color = primaryColor;
        }
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
