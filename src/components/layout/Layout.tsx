import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { PageHeader, type TabItem } from "@/components/shared";
import type { ReactNode, ReactElement } from "react";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  pageHeader?: {
    title: React.ReactNode;
    description?: string;
    tabs?: TabItem[];
    action?: React.ReactNode;
  };
}

export const Layout = ({
  children,
  currentPage,
  breadcrumbs,
  pageHeader,
}: LayoutProps): ReactElement => {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = (): void => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = (): void => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F9F9F9]">
      {/* Background */}
      <div className="absolute top-0 left-[-80px] w-full md:left-[-80px] md:w-[1440px] h-full bg-[#F9F9F9] z-0" />

      {/* Content Wrapper */}
      <div className="absolute inset-0 flex gap-0 md:gap-2 lg:gap-3 p-0 md:p-2 lg:p-3 max-w-full md:max-w-full lg:max-w-[1280px] xl:max-w-none h-full mx-auto lg:mx-auto xl:mx-0 z-10">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-0 max-w-full bg-white border-0 md:border border-[rgba(0,0,0,0.08)] rounded-none md:rounded-xl shadow-none md:shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          {/* Top Header */}
          <Header
            currentPage={currentPage}
            breadcrumbs={breadcrumbs}
            onMenuClick={toggleSidebar}
          />

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 p-4 md:p-4 lg:p-6 overflow-y-auto relative z-0">
            {/* Page Header */}
            {pageHeader && (
              <PageHeader
                title={pageHeader.title}
                description={pageHeader.description}
                tabs={pageHeader.tabs}
                action={pageHeader.action}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
