import { useState } from "react";
import { FailedEmailsTable } from "@/components/shared/FailedEmailsTable";
import { Layout } from "@/components/layout/Layout";

export default function FailedEmails() {
  const [resendAllButton, setResendAllButton] = useState<React.ReactNode>(null);

  return (
    <Layout
      currentPage="Failed Emails"
      pageHeader={{
        title: "Platform Failed Emails",
        description: "Global monitoring of all failed system email dispatches and automatic/manual retry logs across all tenants.",
        action: resendAllButton
      }}
    >
      <FailedEmailsTable onRegisterResendAll={setResendAllButton} />
    </Layout>
  );
}
