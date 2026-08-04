import { useRef, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  WorkflowDefinitionsTable,
  type WorkflowDefinitionsTableRef,
  PrimaryButton,
} from "@/components/shared";
import { Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

const WorkflowDefinationPage = (): ReactElement => {
  const { canCreate } = usePermissions();
  const tableRef = useRef<WorkflowDefinitionsTableRef>(null);

  return (
    <Layout
      currentPage="Workflow Definitions"
      pageHeader={{
        title: "Workflow Definitions",
        description:
          "Create and manage document approval workflow definitions.",
        action: canCreate("workflow") && (
          <PrimaryButton
            size="default"
            className="flex items-center gap-2"
            onClick={() => tableRef.current?.openNewModal()}
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </PrimaryButton>
        ),
      }}
    >
      <div className="flex flex-col gap-6">
        <WorkflowDefinitionsTable ref={tableRef} compact={false} />
      </div>
    </Layout>
  );
};

export default WorkflowDefinationPage;
