import { type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { SuppliersTable } from "@/components/shared";

const Suppliers = (): ReactElement => {
  return (
    <Layout
      currentPage="Suppliers"
      pageHeader={{
        title: "Supplier Management",
        description: "Manage suppliers and their details.",
      }}
    >
      <div className="flex flex-col gap-6">
        {/* <div className="bg-white overflow-hidden"> */}
          {/* <div className="flex flex-col gap-4"> */}
          {/* <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0f1724]">
                Suppliers
              </h2>
            </div> */}
          <SuppliersTable showHeader={true} compact={false} />
          {/* </div> */}
        {/* </div> */}
      </div>
    </Layout>
  );
};

export default Suppliers;
