import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';

interface LimitOption {
  value: string;
  label: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: LimitOption[];
}

const defaultLimitOptions = [
  { value: '5', label: '5 per page' },
  { value: '10', label: '10 per page' },
  { value: '20', label: '20 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
];

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  limitOptions = defaultLimitOptions,
}: PaginationProps): ReactElement => {
  const { primaryColor } = useAppTheme();
  const [isLimitOpen, setIsLimitOpen] = useState<boolean>(false);
  const limitDropdownRef = useRef<HTMLDivElement>(null);
  const limitButtonRef = useRef<HTMLButtonElement>(null);
  const [limitDropdownStyle, setLimitDropdownStyle] = useState<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
  }>({ left: '0', width: '0' });

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  const handlePrevious = (): void => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = (): void => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Handle limit dropdown click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isDropdownClick = target.closest('[data-limit-dropdown="true"]');
      if (
        limitDropdownRef.current &&
        !limitDropdownRef.current.contains(target) &&
        !isDropdownClick &&
        limitButtonRef.current &&
        !limitButtonRef.current.contains(target)
      ) {
        setIsLimitOpen(false);
      }
    };

    if (isLimitOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (limitButtonRef.current) {
        const rect = limitButtonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 200;

        const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        const left = rect.left;
        const width = rect.width;

        if (shouldOpenUp) {
          const bottom = window.innerHeight - rect.top;
          setLimitDropdownStyle({
            bottom: `${bottom}px`,
            left: `${left}px`,
            width: `${width}px`,
          });
        } else {
          const top = rect.bottom;
          setLimitDropdownStyle({
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
          });
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLimitOpen]);

  const selectedLimitOption = limitOptions.find((opt) => Number(opt.value) === limit);

  return (
    <div className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Items Info and Limit Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="text-xs text-[#6B7280]">
          Showing {startItem} to {endItem} of {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </div>
        <div className="flex items-center gap-2 relative" ref={limitDropdownRef}>
          <span className="text-xs text-[#6B7280]">Show:</span>
          <div className="w-[120px] relative">
            <button
              ref={limitButtonRef}
              type="button"
              onClick={() => setIsLimitOpen(!isLimitOpen)}
              className="h-8 w-full px-3.5 py-2 border border-[rgba(0,0,0,0.08)] rounded-md text-xs text-[#0e1b2a] flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span>{selectedLimitOption ? selectedLimitOption.label : `${limit} per page`}</span>
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform', isLimitOpen && 'rotate-180')}
              />
            </button>
            {isLimitOpen &&
              limitButtonRef.current &&
              createPortal(
                <div
                  data-limit-dropdown="true"
                  className="fixed bg-white border border-[rgba(0,0,0,0.15)] rounded-md shadow-lg z-[250] max-h-60 overflow-y-auto"
                  style={limitDropdownStyle}
                >
                  <ul className="py-1.5">
                    {limitOptions.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          onClick={() => {
                            onLimitChange(Number(option.value));
                            setIsLimitOpen(false);
                          }}
                          className={cn(
                            'w-full px-3 py-2 text-left text-xs text-[#0e1b2a] hover:bg-gray-50 transition-colors',
                            Number(option.value) === limit && 'bg-gray-50'
                          )}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-1.5 border border-[rgba(0,0,0,0.08)] rounded text-xs text-[#0f1724] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#6b7280] px-2">
            Page {currentPage} of {totalPages}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 text-white rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={currentPage < totalPages ? { backgroundColor: primaryColor } : { backgroundColor: '#112868', opacity: 0.5 }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.filter = 'none';
            }
          }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
