import { useRef, useEffect, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { RolesTable, type RolesTableRef } from "@/components/superadmin";
import { useLocation } from "react-router-dom";

const Roles = (): ReactElement => {
  const tableRef = useRef<RolesTableRef>(null);
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
      currentPage="Roles"
      pageHeader={{
        title: "Role Management",
        description: "Define and manage roles to control user access based on job responsibilities",
      }}
    >
      <RolesTable ref={tableRef} showHeader={true} />
    </Layout>
  );
};

export default Roles;
