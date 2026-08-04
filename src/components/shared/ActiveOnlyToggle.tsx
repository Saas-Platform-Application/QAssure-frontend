import type { ReactElement } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';

interface ActiveOnlyToggleProps {
  activeOnly: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export const ActiveOnlyToggle = ({
  activeOnly,
  onChange,
  label = 'Active Only',
  className = ''
}: ActiveOnlyToggleProps): ReactElement => {
  const { primaryColor } = useAppTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium text-[#475569]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!activeOnly)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
        style={{ backgroundColor: activeOnly ? primaryColor : '#e2e8f0' }}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            activeOnly ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};
