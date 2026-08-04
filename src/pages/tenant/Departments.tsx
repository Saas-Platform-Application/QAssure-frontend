import { useRef, useEffect, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  DepartmentsTable,
  type DepartmentsTableRef,
} from "@/components/superadmin/DepartmentsTable";
import { PrimaryButton } from "@/components/shared";
import { Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "react-router-dom";

const Departments = (): ReactElement => {
  const tableRef = useRef<DepartmentsTableRef>(null);
  const { canCreate } = usePermissions();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.openCreateModal) {
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        tableRef.current?.openNewModal();
      }, 100);
    }
  }, [location.state]);

  return (
    <Layout
      currentPage="Departments"
      pageHeader={{
        title: "Department Management",
        description:
          "View and manage all departments within your organization.",
        action: canCreate("departments") ? (
          <PrimaryButton
            size="default"
            className="flex items-center gap-2"
            onClick={() => tableRef.current?.openNewModal()}
          >
            <Plus className="w-4 h-4" />
            <span>New Department</span>
          </PrimaryButton>
        ) : null,
      }}
    >
      <DepartmentsTable ref={tableRef} />
    </Layout>
  );
};

export default Departments;
