import type { ReactElement } from 'react';
import { Search } from 'lucide-react';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
}

export const SearchBox = ({
  value,
  onChange,
  placeholder = 'Search...',
  containerClassName = 'relative w-full sm:w-64',
  inputClassName = 'w-full pl-9 pr-4 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-sm focus:outline-none focus:ring-2 transition-all bg-gray-50/30'
}: SearchBoxProps): ReactElement => {
  const { primaryColor } = useAppTheme();

  return (
    <div className={containerClassName}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = primaryColor;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${primaryColor}1A`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};
