import { useState } from "react";
import { FailedEmailsTable } from "@/components/shared/FailedEmailsTable";
import { Layout } from "@/components/layout/Layout";

export default function FailedEmails() {
  const [resendAllButton, setResendAllButton] = useState<React.ReactNode>(null);

  return (
    <Layout
      currentPage="Failed Emails"
      pageHeader={{
        title: "Failed Emails Log",
        description: "View and resend failed system email dispatches and transaction logs for this tenant.",
        action: resendAllButton
      }}
    >
      <FailedEmailsTable onRegisterResendAll={setResendAllButton} />
    </Layout>
  );
}
