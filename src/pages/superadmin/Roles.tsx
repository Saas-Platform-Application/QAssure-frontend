import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { PlatformRolesTable } from "@/components/superadmin/PlatformRolesTable";

const Roles = (): ReactElement => {
  return (
    <Layout
      currentPage="Roles"
      pageHeader={{
        title: "Platform Roles",
        description: "Manage system-wide administrative roles and permissions.",
      }}
    >
      <PlatformRolesTable />
    </Layout>
  );
};

export default Roles;
