import { type ReactElement } from "react";
import { DataTable, Pagination, type Column } from "@/components/shared";
import type { Department } from "@/types/department";

interface DepartmentListViewProps {
  data: Department[];
  columns: Column<Department>[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const DepartmentListView = ({
  data,
  columns,
  isLoading,
  error,
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: DepartmentListViewProps): ReactElement => {
  return (
    <div className="overflow-hidden">
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(dept) => dept.id}
        isLoading={isLoading}
        error={error}
        emptyMessage="No departments found"
      />

      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
      </div>
  );
};
