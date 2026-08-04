import React, { useState, useEffect } from "react";
import {
  failedEmailsService,
  type FailedEmail,
} from "../../services/failed-emails-service";
import { DataTable, type Column } from "./DataTable";
import { Modal } from "./Modal";
// import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Eye, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pagination } from "./Pagination";
import { ActionDropdown } from "./ActionDropdown";
import { PrimaryButton } from "./PrimaryButton";
import { usePermissions } from "@/hooks/usePermissions";

interface FailedEmailsTableProps {
  onRegisterResendAll?: (node: React.ReactNode) => void;
}

export const FailedEmailsTable: React.FC<FailedEmailsTableProps> = ({ onRegisterResendAll }) => {
  const { canUpdate, canDelete } = usePermissions();
  const [emails, setEmails] = useState<FailedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmail, setSelectedEmail] = useState<FailedEmail | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResendingAll, setIsResendingAll] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchEmails = async (page = 1, currentLimit = limit) => {
    setLoading(true);
    try {
      const offset = (page - 1) * currentLimit;
      const res = await failedEmailsService.getFailedEmails(
        currentLimit,
        offset,
      );
      setEmails(res.data || []);
      setTotal(res.total || 0);
      setCurrentPage(page);
    } catch (error: any) {
      setError(
        error?.response?.data?.error?.message || "Failed to load failed emails",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      await failedEmailsService.resendEmail(id);
      toast.success("Email resent successfully.");
      fetchEmails(currentPage);
    } catch (error: any) {
      toast.error("Failed to resend email", { description: error.message });
    } finally {
      setResendingId(null);
    }
  };

  const handleResendAll = async () => {
    setIsResendingAll(true);
    try {
      const res = await failedEmailsService.resendAll();
      toast.success(res.message);
      fetchEmails(currentPage);
    } catch (error: any) {
      toast.error("Failed to resend all emails", {
        description: error.message,
      });
    } finally {
      setIsResendingAll(false);
    }
  };

  useEffect(() => {
    if (onRegisterResendAll) {
      onRegisterResendAll(
        canUpdate("settings") ? (
          <PrimaryButton
            onClick={handleResendAll}
            disabled={
              isResendingAll ||
              emails.filter((e) => e.status === "failed").length === 0
            }
          >
            {isResendingAll ? (
              <>
                <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />
                Resending...
              </>
            ) : (
              "Resend All Failed"
            )}
          </PrimaryButton>
        ) : null
      );
    }
    return () => {
      if (onRegisterResendAll) {
        onRegisterResendAll(null);
      }
    };
  }, [isResendingAll, emails, onRegisterResendAll, canUpdate]);

  const handleDelete = async (id: string) => {
    try {
      await failedEmailsService.deleteEmail(id);
      toast.success("Email deleted successfully.");
      fetchEmails(currentPage);
    } catch (error: any) {
      toast.error("Failed to delete email", { description: error.message });
    }
  };

  const showEmailDetails = (email: FailedEmail) => {
    setSelectedEmail(email);
    setIsModalVisible(true);
  };

  const columns: Column<FailedEmail>[] = [
    {
      label: "Date",
      key: "created_at",
      render: (record: FailedEmail) =>
        format(new Date(record.created_at), "yyyy-MM-dd HH:mm:ss"),
    },
    {
      label: "To",
      key: "to_email",
      render: (record: FailedEmail) => record.to_email,
    },
    {
      label: "Subject",
      key: "subject",
      render: (record: FailedEmail) => record.subject,
    },
    {
      label: "Status",
      key: "status",
      render: (record: FailedEmail) => (
        <StatusBadge
          variant={record.status === "failed" ? "failure" : "success"}
        >
          {record.status}
        </StatusBadge>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      align: "right",
      render: (record: FailedEmail) => (
        <div className="flex justify-end">
          <ActionDropdown
            actions={[
              {
                label: "View Details",
                onClick: () => showEmailDetails(record),
                icon: <Eye className="w-3.5 h-3.5 text-gray-500" />,
              },
              ...(record.status === "failed" && canUpdate("settings")
                ? [
                    {
                      label:
                        resendingId === record.id
                          ? "Resending..."
                          : "Resend Email",
                      onClick: () => handleResend(record.id),
                      icon:
                        resendingId === record.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                        ),
                    },
                  ]
                : []),
              ...(canDelete("settings")
                ? [
                    {
                      label: "Delete Email",
                      onClick: () => handleDelete(record.id),
                      icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
                      variant: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* Toolbar / Actions Header */}
      {!onRegisterResendAll && canUpdate("settings") && (
        <div className="pb-2 flex justify-end">
          <PrimaryButton
            onClick={handleResendAll}
            disabled={
              isResendingAll ||
              emails.filter((e) => e.status === "failed").length === 0
            }
          >
            {isResendingAll ? (
              <>
                <Loader2 className="mr-2 w-3.5 h-3.5 animate-spin" />
                Resending...
              </>
            ) : (
              "Resend All Failed"
            )}
          </PrimaryButton>
        </div>
      )}

      {/* Table Section */}
      <DataTable
        columns={columns}
        data={emails}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No failed emails found"
        error={error}
      />

      {/* Pagination Footer */}
      {total > limit && (
        <div className="border-t border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-3">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(total / limit)}
            totalItems={total}
            limit={limit}
            onPageChange={(page) => fetchEmails(page)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              fetchEmails(1, newLimit);
            }}
          />
        </div>
      )}

      {/* Modal Details */}
      <Modal
        title="Email Details"
        isOpen={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        maxWidth="xl"
      >
        {selectedEmail && (
          <div>
            <div className="grid grid-cols-1 gap-2 mb-4">
              <p>
                <strong className="text-[#0f1724]">To:</strong>{" "}
                <span className="text-[#6b7280]">{selectedEmail.to_email}</span>
              </p>
              <p>
                <strong className="text-[#0f1724]">Subject:</strong>{" "}
                <span className="text-[#6b7280]">{selectedEmail.subject}</span>
              </p>
              <p>
                <strong className="text-[#0f1724]">Error Message:</strong>{" "}
                <span className="text-[#ef4444]">
                  {selectedEmail.error_message}
                </span>
              </p>
            </div>
            <div className="mt-4">
              <strong className="text-[#0f1724] mb-2 block">Body:</strong>
              <div
                className="border border-[rgba(0,0,0,0.08)] rounded p-4 mt-2 max-h-[400px] overflow-auto bg-gray-50 text-sm"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
