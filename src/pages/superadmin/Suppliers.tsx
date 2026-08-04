import { type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { SuppliersTable } from "@/components/shared";

const Suppliers = (): ReactElement => {
  return (
    <Layout
      currentPage="Suppliers"
      pageHeader={{
        title: "Supplier Management (Global)",
        description: "Manage global suppliers.",
      }}
    >
      <div className="flex flex-col gap-6">
        <div className="border border-[rgba(0,0,0,0.08)] rounded-lg bg-white overflow-hidden p-4 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f1724]">
                Global Suppliers
              </h2>
            </div>
            <SuppliersTable showHeader={true} compact={false} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Suppliers;
