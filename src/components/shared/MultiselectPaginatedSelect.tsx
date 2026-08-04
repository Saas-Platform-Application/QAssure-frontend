import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ReactElement } from "react";
import { ChevronDown, Loader2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiselectPaginatedSelectOption {
  value: string;
  label: string;
}

interface MultiselectPaginatedSelectProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  onLoadOptions: (
    page: number,
    limit: number,
    search?: string,
  ) => Promise<{
    options: MultiselectPaginatedSelectOption[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }>;
  initialOptions?: MultiselectPaginatedSelectOption[]; // Initial options to display before loading
  className?: string;
  id?: string;
  multiple?: boolean;
  disabled?: boolean;
  isSearchable?: boolean;
}

export const MultiselectPaginatedSelect = ({
  label,
  required = false,
  error,
  helperText,
  placeholder = "Select Items",
  value,
  onValueChange,
  onLoadOptions,
  initialOptions = [],
  className,
  id,
  multiple = true,
  disabled = false,
  isSearchable = false,
}: MultiselectPaginatedSelectProps): ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [options, setOptions] = useState<MultiselectPaginatedSelectOption[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
  }>({ left: "0", width: "0" });

  // Load initial options
  const loadOptions = useCallback(
    async (page: number = 1, append: boolean = false, search: string = "") => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const result = await onLoadOptions(page, pagination.limit, search);

        if (append) {
          setOptions((prev) => [...prev, ...result.options]);
        } else {
          setOptions(result.options);
        }

        setPagination(result.pagination);
      } catch (err) {
        console.error("Error loading options:", err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [onLoadOptions, pagination.limit],
  );

  // Load options when dropdown opens
  useEffect(() => {
    if (isOpen) {
      if (options.length === 0) {
        loadOptions(1, false, searchTerm);
      }
      // Focus search input if searchable
      if (isSearchable) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
  }, [isOpen, options.length, loadOptions, isSearchable]);

  // Debounced search
  useEffect(() => {
    if (!isOpen || !isSearchable) return;

    const timer = setTimeout(() => {
      loadOptions(1, false, searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, isSearchable, loadOptions]);

  // Handle scroll for infinite loading
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isOpen) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isNearBottom && pagination.hasMore && !isLoadingMore && !isLoading) {
        loadOptions(pagination.page + 1, true, searchTerm);
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen, pagination, isLoadingMore, isLoading, loadOptions, searchTerm]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the dropdown's internal scroll container
      const target = event.target as HTMLElement;
      if (
        scrollContainerRef.current &&
        (scrollContainerRef.current === target ||
          scrollContainerRef.current.contains(target))
      ) {
        return;
      }
      // Don't close if scrolling inside the dropdown menu itself
      if (
        dropdownMenuRef.current &&
        (dropdownMenuRef.current === target ||
          dropdownMenuRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen && buttonRef.current) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);

      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = isSearchable ? 300 : 240;

      const shouldOpenUp =
        spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      if (shouldOpenUp) {
        setDropdownStyle({
          bottom: `${window.innerHeight - rect.top + 5}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
      } else {
        setDropdownStyle({
          top: `${rect.bottom + 5}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, isSearchable]);

  const fieldId =
    id || `multiselect-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasError = Boolean(error);
  // Combine loaded options with initial options, prioritizing loaded options
  const allOptions = [
    ...initialOptions,
    ...options.filter(
      (opt) => !initialOptions.some((init) => init.value === opt.value),
    ),
  ];
  const selectedOptions = value.map((val) => {
    const found = allOptions.find((opt) => opt.value === val);
    return found || { value: val, label: val };
  });

  const handleToggle = (optionValue: string) => {
    if (multiple) {
      if (value.includes(optionValue)) {
        onValueChange(value.filter((v) => v !== optionValue));
      } else {
        onValueChange([...value, optionValue]);
      }
    } else {
      onValueChange([optionValue]);
      setIsOpen(false);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div className="flex flex-col gap-2 pb-4">
      <label
        htmlFor={fieldId}
        className="flex items-center gap-1.5 text-[13px] font-medium text-[#0e1b2a]"
      >
        <span>{label}</span>
        {required && <span className="text-[#e02424]">*</span>}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          id={fieldId}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "min-h-10 w-full px-3.5 py-2 bg-white border rounded-md text-sm transition-colors",
            "flex items-center justify-between gap-2",
            "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50",
            hasError
              ? "border-[#ef4444] focus-visible:border-[#ef4444] focus-visible:ring-[#ef4444]/20"
              : "border-[rgba(0,0,0,0.08)] focus-visible:border-[#112868] focus-visible:ring-[#112868]/20",
            "focus-visible:outline-none focus-visible:ring-2",
            className,
          )}
          aria-invalid={hasError}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[24px]">
            {value.length === 0 ? (
              <span className="text-[#9aa6b2]">{placeholder}</span>
            ) : (
              <>
                {selectedOptions.slice(0, 2).map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#112868]/10 text-[#112868] rounded text-xs font-medium"
                  >
                    {option.label}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(option.value, e)}
                      className="hover:bg-[#112868]/20 rounded p-0.5 transition-colors"
                      aria-label={`Remove ${option.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {value.length > 2 && (
                  <span className="text-[#0e1b2a] text-xs">
                    +{value.length - 2} more
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform flex-shrink-0",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen &&
          buttonRef.current &&
          createPortal(
            <div
              ref={dropdownMenuRef}
              className="fixed bg-white border border-[rgba(0,0,0,0.2)] rounded-md shadow-lg z-[250] max-h-80 overflow-hidden flex flex-col"
              style={dropdownStyle}
              data-dropdown-menu="true"
            >
              {isSearchable && (
                <div className="px-3 pt-3 pb-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-[#112868] transition-colors"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {isLoading && allOptions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#112868] animate-spin" />
                </div>
              ) : allOptions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-[#6b7280]">Not available</p>
                </div>
              ) : (
                <>
                  <ul
                    ref={scrollContainerRef}
                    role="listbox"
                    className="py-1.5 overflow-y-auto flex-1"
                  >
                    {allOptions.map((option) => {
                      const isSelected = value.includes(option.value);
                      return (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(option.value)}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm text-[#0e1b2a] hover:bg-gray-50 transition-colors",
                              "flex items-center gap-2",
                              isSelected && "bg-gray-50",
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 border rounded flex items-center justify-center flex-shrink-0",
                                isSelected
                                  ? "bg-[#112868] border-[#112868]"
                                  : "border-[rgba(0,0,0,0.2)]",
                              )}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="flex-1">{option.label}</span>
                          </button>
                        </li>
                      );
                    })}
                    {isLoadingMore && (
                      <li className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 text-[#112868] animate-spin" />
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>,
            document.body,
          )}
      </div>
      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-[#ef4444]"
          role="alert"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${fieldId}-helper`} className="text-sm text-[#6b7280]">
          {helperText}
        </p>
      )}
    </div>
  );
};
