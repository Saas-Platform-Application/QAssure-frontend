import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement } from 'react';
import { MoreVertical, Eye, Edit, Trash2, Users, BarChart3, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ActionItem {
  label: string;
  onClick: () => void | Promise<void>;
  icon?: React.ReactNode;
  variant?: 'danger' | 'default';
}

interface ActionDropdownProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onContacts?: () => void;
  onScorecards?: () => void;
  onDownload?: () => void;
  actions?: ActionItem[];
  trigger?: React.ReactNode;
  className?: string;
}

export const ActionDropdown = ({
  onView,
  onEdit,
  onDelete,
  onContacts,
  onScorecards,
  onDownload,
  actions,
  trigger,
  className,
}: ActionDropdownProps): ReactElement => {
  const { primaryColor } = useAppTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top?: string; bottom?: string; right: string; width: string }>({ right: '0', width: '0' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      const target = event.target as HTMLElement;
      if (dropdownMenuRef.current && (dropdownMenuRef.current === target || dropdownMenuRef.current.contains(target))) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen && buttonRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      
      // Calculate position when dropdown opens
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = (
        (onView ? 1 : 0) + 
        (onEdit ? 1 : 0) + 
        (onDelete ? 1 : 0) + 
        (onContacts ? 1 : 0) + 
        (onScorecards ? 1 : 0) + 
        (onDownload ? 1 : 0) + 
        (actions ? actions.length : 0)
      ) * 36 + 12;
      
      // Determine if should open upward or downward
      const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate dropdown position
      const right = window.innerWidth - rect.right;
      const width = (actions || onScorecards || onDownload || onContacts) ? 140 : 100; // Wider for longer labels
      
      if (shouldOpenUp) {
        // Position above the button
        const bottom = window.innerHeight - rect.top;
        setDropdownStyle({
          bottom: `${bottom}px`,
          right: `${right}px`,
          width: `${width}px`,
        });
      } else {
        // Position below the button
        const top = rect.bottom;
        setDropdownStyle({
          top: `${top}px`,
          right: `${right}px`,
          width: `${width}px`,
        });
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, actions]);

  const handleAction = (action?: () => void | Promise<void>) => {
    if (action) {
      void Promise.resolve(action()).catch(console.error);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {trigger ? (
        React.cloneElement(trigger as React.ReactElement<any>, {
          ref: buttonRef,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
            const triggerProps = (trigger as React.ReactElement<any>).props;
            if (triggerProps.onClick) triggerProps.onClick(e);
          },
        })
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-7 h-7 rounded-full border border-[rgba(0,0,0,0.08)] transition-colors cursor-pointer"
          style={isOpen 
            ? { backgroundColor: primaryColor, color: 'white', borderColor: primaryColor } 
            : { backgroundColor: 'white', color: '#0f1724' }
          }
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = primaryColor;
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.borderColor = primaryColor;
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.color = '#0f1724';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)';
            }
          }}
          aria-label="Actions"
          aria-expanded={isOpen}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && buttonRef.current && createPortal(
        <div
          ref={dropdownMenuRef}
          data-dropdown-menu="true"
          className="fixed bg-white border border-[rgba(0,0,0,0.2)] rounded-md shadow-[0px_4px_4px_0px_rgba(0,0,0,0.08)] z-[250] overflow-hidden"
          style={dropdownStyle}
        >
          <div className="flex flex-col py-1.5">
            {actions ? (
              actions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleAction(action.onClick)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors cursor-pointer w-full text-left",
                    action.variant === 'danger' 
                      ? "text-red-600 hover:bg-red-50" 
                      : "text-[#6b7280] hover:bg-gray-50"
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))
            ) : (
              <>
                {onView && (
                  <button
                    type="button"
                    onClick={() => handleAction(onView)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>View</span>
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => handleAction(onEdit)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <Edit className="w-3.5 h-3.5 shrink-0" />
                    <span>Edit</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => handleAction(onDelete)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Delete</span>
                  </button>
                )}
                {onContacts && (
                  <button
                    type="button"
                    onClick={() => handleAction(onContacts)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Contacts</span>
                  </button>
                )}
                {onScorecards && (
                  <button
                    type="button"
                    onClick={() => handleAction(onScorecards)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Scorecards</span>
                  </button>
                )}
                {onDownload && (
                  <button
                    type="button"
                    onClick={() => handleAction(onDownload)}
                    className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium text-[#6b7280] hover:bg-gray-50 transition-colors cursor-pointer w-full text-left"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Download</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

