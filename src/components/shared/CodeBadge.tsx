import { cn } from "@/lib/utils";

interface CodeBadgeProps {
  label: string;
  className?: string;
}

export default function CodeBadge({ label, className }: CodeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#EDF3FE] px-3 py-1 text-[12px] font-medium text-[#4C89FA]",
        className
      )}
    >
      {label}
    </span>
  );
}