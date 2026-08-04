import type { ReactElement, ReactNode } from "react";
import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: "left" | "right" | "center";
  mobileLabel?: string;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCardRenderer?: (item: T) => ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  error?: string | null;
  expandableRows?: boolean;
  isRowExpanded?: (item: T) => boolean;
  onRowExpandToggle?: (item: T) => void;
  renderExpandedRow?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  showExpandColumn?: boolean;
  expandedColSpan?: number;
}

export const DataTable = <T,>({
  data,
  columns,
  keyExtractor,
  mobileCardRenderer,
  emptyMessage = "No data found",
  isLoading = false,
  error = null,
  expandableRows = false,
  isRowExpanded,
  onRowExpandToggle,
  renderExpandedRow,
  onRowClick,
  showExpandColumn = true,
  expandedColSpan,
}: DataTableProps<T>): ReactElement => {
  const canExpand =
    expandableRows &&
    !!onRowExpandToggle &&
    !!isRowExpanded &&
    !!renderExpandedRow;
  const desktopColSpan =
    expandedColSpan || columns.length + (canExpand && showExpandColumn ? 1 : 0);

  // Loading State
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 text-center">
        <p className="text-xs md:text-sm text-[#6b7280]">Loading...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 text-center">
        <p className="text-xs md:text-sm text-[#ef4444]">{error}</p>
      </div>
    );
  }

  // Empty State - show table structure with empty message
  if (data.length === 0) {
    return (
      <>
        {/* Desktop Table Empty State */}
        <div className="hidden md:block overflow-x-auto -mx-2 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full table-auto">
              <thead>
                {/* <tr className="bg-[#f5f7fa] border-b border-[rgba(0,0,0,0.08)]"> */}
                <tr className="bg-[#F9F9F9] border-b border-[#D1D5DB]">
                  {canExpand && showExpandColumn && (
                    <th
                      className="w-10 px-2 py-2 md:py-1 lg:py-2.5 xl:py-3 text-left"
                      aria-label="Expand"
                    />
                  )}
                  {columns.map((column) => {
                    const alignClass =
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      // <th
                      //   key={column.key}
                      //   className={`px-3 md:px-2 lg:px-4 xl:px-5 py-2 md:py-1 lg:py-2.5 xl:py-3 ${alignClass} text-[10px] md:text-[8px] lg:text-[13px] font-medium text-[#9aa6b2] uppercase`}
                      // >
                      <th
                        key={column.key}
                        className={`h-[41px] px-2 py-3 ${alignClass} bg-[#F9F9F9] text-[13px] font-medium text-[#6B7280] align-bottom whitespace-nowrap ${column.className || ""}`}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {column.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={desktopColSpan}
                    className="px-3 md:px-2 lg:px-4 xl:px-5 py-6 md:py-3 lg:py-7 xl:py-8 text-center text-xs md:text-xs lg:text-[13px] text-[#6b7280]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {/* Mobile Empty State */}
        <div className="md:hidden p-4 text-center">
          <p className="text-xs text-[#6b7280]">{emptyMessage}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto -mx-2 md:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full table-auto">
            <thead>
              {/* <tr className="bg-[#f5f7fa] border-b border-[rgba(0,0,0,0.08)]"> */}
              <tr className="bg-[#F9F9F9] border-b border-[#D1D5DB]">
                {canExpand && showExpandColumn && (
                  <th
                    // className="w-10 px-2 py-2 md:py-1 lg:py-2.5 xl:py-3 text-left"
                    className="w-10 px-2 py-3 text-left"
                    aria-label="Expand"
                  />
                )}
                {columns.map((column) => {
                  const alignClass =
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left";
                  return (
                    // <th
                    //   key={column.key}
                    //   className={`px-3 md:px-2 lg:px-4 xl:px-5 py-2 md:py-1 lg:py-2.5 xl:py-3 ${alignClass} text-[10px] md:text-[8px] lg:text-[13px] font-medium text-[#9aa6b2] uppercase`}
                    // >
                    <th
                      key={column.key}
                      className={`h-[41px] px-2 py-3 ${alignClass} bg-[#F9F9F9] text-[13px] font-medium text-[#6B7280] align-bottom whitespace-nowrap ${column.className || ""}`}
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => {
                const rowId = keyExtractor(item);
                const expanded = canExpand ? !!isRowExpanded(item) : false;
                return (
                  <Fragment key={rowId}>
                    <tr
                      className="border-b border-[#D1D5DB] hover:bg-gray-50 transition-colors"
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                    >
                      {canExpand && showExpandColumn && (
                        <td
                          // className="px-2 py-2.5 md:py-1.5 lg:py-3 xl:py-4 align-middle"
                          className="w-10 px-2 py-3 align-middle"
                        >
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-gray-200/80 text-[#64748b]"
                            aria-expanded={expanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowExpandToggle(item);
                            }}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>
                      )}
                      {columns.map((column) => {
                        const alignClass =
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : "text-left";
                        return (
                          // <td
                          //   key={column.key}
                          //   className={`px-3 md:px-2 lg:px-4 xl:px-5 py-2.5 md:py-1.5 lg:py-3 xl:py-4 ${alignClass} text-xs md:text-[10px] lg:text-[13px]`}
                          // >
                          <td
                            key={column.key}
                            className={`h-[56px] px-2 py-3 ${alignClass} text-[13px] font-normal text-[#0F1724] align-middle ${column.className || ""}`}
                            style={column.width ? { width: column.width } : undefined}
                          >
                            {column.render
                              ? column.render(item)
                              : String((item as any)[column.key])}
                          </td>
                        );
                      })}
                    </tr>
                    {canExpand && expanded && (
                      <tr className="border-t border-[#D1D5DB] bg-[#F9F9F9]">
                        <td colSpan={desktopColSpan}>
                          <div className="flex flex-col items-start bg-[#FFF] border border-gray-300 rounded-md p-4 text-xs text-gray-700 m-4">
                            {renderExpandedRow(item)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-[rgba(0,0,0,0.08)]">
        {mobileCardRenderer
          ? data.map((item) => (
              <div key={keyExtractor(item)}>{mobileCardRenderer(item)}</div>
            ))
          : data.map((item) => {
              const expanded = canExpand ? !!isRowExpanded(item) : false;
              return (
                <div key={keyExtractor(item)} className="p-3 sm:p-4">
                  {canExpand && (
                    <div className="mb-2">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-gray-100 text-[#64748b]"
                        aria-expanded={expanded}
                        onClick={() => onRowExpandToggle(item)}
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                  )}
                  {columns.map((column) => (
                    <div key={column.key} className="mb-2.5 sm:mb-3 last:mb-0">
                      <span className="text-[10px] sm:text-xs text-[#9aa6b2] mb-0.5 sm:mb-1 block">
                        {column.mobileLabel || column.label}:
                      </span>
                      <div className="text-xs sm:text-sm text-[#0f1724]">
                        {column.render
                          ? column.render(item)
                          : String((item as any)[column.key])}
                      </div>
                    </div>
                  ))}
                  {canExpand && expanded && renderExpandedRow && (
                    <div className="mt-3">{renderExpandedRow(item)}</div>
                  )}
                </div>
              );
            })}
      </div>
    </>
  );
};
