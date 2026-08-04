import { useRef, useEffect, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { UsersTable, type UsersTableRef } from "@/components/superadmin";
import { PrimaryButton } from "@/components/shared";
import { Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "react-router-dom";

const Users = (): ReactElement => {
  const tableRef = useRef<UsersTableRef>(null);
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
      currentPage="Users"
      pageHeader={{
        title: "User List",
        description: "View and manage all users within your organization.",
        action: canCreate("users") ? (
          <PrimaryButton
            size="default"
            className="flex items-center gap-2"
            onClick={() => tableRef.current?.openNewModal()}
          >
            <Plus className="w-4 h-4" />
            <span>New User</span>
          </PrimaryButton>
        ) : null,
      }}
    >
      <UsersTable ref={tableRef} showHeader={true} />
    </Layout>
  );
};

export default Users;
