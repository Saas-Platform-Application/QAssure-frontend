import type { ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { PlatformUsersTable } from "@/components/superadmin/PlatformUsersTable";

const Users = (): ReactElement => {
  return (
    <Layout
      currentPage="Users"
      pageHeader={{
        title: "Platform Users",
        description: "Manage system-wide administrative personnel and platform users.",
      }}
    >
      <PlatformUsersTable />
    </Layout>
  );
};

export default Users;
