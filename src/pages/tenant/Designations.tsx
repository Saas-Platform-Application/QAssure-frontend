import { useRef, useEffect, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  DesignationsTable,
  type DesignationsTableRef,
} from "@/components/superadmin";
import { PrimaryButton } from "@/components/shared";
import { Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "react-router-dom";

const Designations = (): ReactElement => {
  const tableRef = useRef<DesignationsTableRef>(null);
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
      currentPage="Designations"
      pageHeader={{
        title: "Designation Management",
        description: "View and manage all designations within your organization.",
        action: canCreate("designations") ? (
          <PrimaryButton
            size="default"
            className="flex items-center gap-2"
            onClick={() => tableRef.current?.openNewModal()}
          >
            <Plus className="w-4 h-4" />
            <span>New Designation</span>
          </PrimaryButton>
        ) : null,
      }}
    >
      <DesignationsTable ref={tableRef} />
    </Layout>
  );
};

export default Designations;
