import { useState, type ReactElement } from "react";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Building2,
  Plus,
  Edit2,
  Trash2,
} from "lucide-react";
import type { Department } from "@/types/department";

interface TreeItemProps {
  item: Department;
  level?: number;
  onAddSub?: (item: Department) => void;
  onEdit?: (item: Department) => void;
  onDelete?: (item: Department) => void;
}

const TreeItem = ({
  item,
  level = 0,
  onAddSub,
  onEdit,
  onDelete,
}: TreeItemProps) => {
  const { primaryColor } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isPrimaryActive = level === 0 && hasChildren && isExpanded;

  return (
    <div className="flex flex-col">
      <div
        className={`group flex h-[44px] items-center gap-2 self-stretch transition-all duration-200 border ${
          level === 0
            ? isPrimaryActive
              ? "border-transparent text-white rounded-t-md"
              : "border-[#E5E7EB] text-[#111827] rounded-md"
            : "border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#111827] rounded-md"
        } ${
          level === 0 && isExpanded && hasChildren
            ? "border-b-transparent"
            : ""
        }`}
        style={{
          backgroundColor:
            level === 0
              ? isPrimaryActive
                ? primaryColor
                : "#FFFFFF"
              : "transparent",
          paddingLeft: level > 0 ? `${level * 28 + 12}px` : "12px",
          paddingRight: "12px",
          marginBottom: level === 0 && isExpanded && hasChildren ? "0" : "4px",
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-5 h-5">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className={`p-0.5 rounded transition-colors ${
                  isPrimaryActive
                    ? "hover:bg-white/10 text-white/70"
                    : "hover:bg-gray-100 text-[#94a3b8]"
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <div
            className={`p-1.5 rounded-md ${isPrimaryActive ? "bg-white/10" : "bg-transparent"}`}
          >
            {level === 0 ? (
              <Building2
                className={`w-4 h-4 shrink-0 ${isPrimaryActive ? "text-white" : "text-[#64748b]"}`}
              />
            ) : (
              <Folder
                className={`w-4 h-4 shrink-0 ${isPrimaryActive ? "text-white" : "text-[#64748b]"}`}
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`text-[14px] font-medium truncate ${
                isPrimaryActive ? "text-white" : "text-[#111827]"
              }`}
            >
              {item.name}
            </span>
            <span
              className={`px-1.5 py-[2px] rounded text-[10px] font-semibold ${
                isPrimaryActive
                  ? "bg-white/15 text-white"
                  : "bg-[#F3F4F6] text-[#374151]"
              }`}
            >
              {item.code}
            </span>

            {
            /* level === 0 ? (
              <span
                className={`text-xs ${
                  isPrimaryActive ? "text-white/70" : "text-[#9CA3AF]"
                }`}
              >
                {item.child_count || 0} total
              </span>
            ) :  */
            hasChildren ? (
              <span
                className={`text-xs ${
                  isPrimaryActive ? "text-white/70" : "text-[#9CA3AF]"
                }`}
              >
                {item.child_count || 0} sub-departments
              </span>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onAddSub && (
            <button
              onClick={() => onAddSub(item)}
              className={`p-1.5 rounded transition-colors ${
                isPrimaryActive
                  ? "hover:bg-white/10 text-white"
                  : "hover:bg-gray-100 text-[#64748B]"
              }`}
              title="Add Sub-department"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className={`p-1.5 rounded transition-colors ${
                isPrimaryActive
                  ? "hover:bg-white/10 text-white"
                  : "hover:bg-gray-100 text-[#64748B]"
              }`}
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className={`p-1.5 rounded transition-colors ${
                isPrimaryActive
                  ? "hover:bg-white/10 text-white/70"
                  : "hover:bg-red-50 hover:text-red-600"
              }`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div
          className={`flex flex-col self-stretch p-3 gap-1 ${
            level === 0
              ? "rounded-b-md border border-[#D1D5DB] border-t-0 bg-white"
              : ""
          }`}
          style={{
            marginTop: "0px",
          }}
        >
          {item.children?.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onAddSub={onAddSub}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface DepartmentTreeViewProps {
  data: Department[];
  isLoading: boolean;
  error: string | null;
  onAddSub?: (item: Department) => void;
  onEdit?: (item: Department) => void;
  onDelete?: (item: Department) => void;
}

export const DepartmentTreeView = ({
  data,
  isLoading,
  error,
  onAddSub,
  onEdit,
  onDelete,
}: DepartmentTreeViewProps): ReactElement => {
  const { primaryColor } = useAppTheme();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderBottomColor: primaryColor }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-10 min-h-[400px]">
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-10 min-h-[400px]">
        No departments found in hierarchy
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 border border-[#D1D5DB] bg-white self-stretch">
      {data.map((item) => (
        <TreeItem
          key={item.id}
          item={item}
          onAddSub={onAddSub}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
