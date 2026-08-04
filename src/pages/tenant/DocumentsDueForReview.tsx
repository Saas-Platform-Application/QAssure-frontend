import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import {
  DataTable,
  FilterDropdown,
  type Column,
} from "@/components/shared";
import { documentService } from "@/services/document-service";
import type { DocumentSummary } from "@/types/document";
import { AlertCircle } from "lucide-react";

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDaysRemaining = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const DocumentsDueForReview = (): ReactElement => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [daysFilter, setDaysFilter] = useState<string>("30");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDueDocuments = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await documentService.getDueForReview(parseInt(daysFilter));
        setDocuments(response.data || []);
      } catch (err: any) {
        setError(
          err?.response?.data?.error?.message || "Failed to load documents due for review",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadDueDocuments();
  }, [daysFilter]);

  const columns: Column<DocumentSummary>[] = useMemo(
    () => [
      {
        key: "document_number",
        label: "Document No",
        render: (doc) => (
          <button
            type="button"
            className="text-[#084cc8] hover:underline"
            onClick={() => navigate(`/tenant/documents/${doc.id}`)}
          >
            {doc.document_number}
          </button>
        ),
      },
      {
        key: "title",
        label: "Title",
        render: (doc) => <span className="text-[#0f1724] font-medium">{doc.title}</span>,
      },
      {
        key: "category",
        label: "Category",
        render: (doc) => <span className="text-[#6b7280]">{doc.category || "-"}</span>,
      },
      {
        key: "owner",
        label: "Owner",
        render: (doc) => <span className="text-[#6b7280]">{doc.owner || "-"}</span>,
      },
      {
        key: "next_review_date",
        label: "Review Due Date",
        render: (doc) => (
          <span className="text-[#0f1724] font-semibold">{formatDate(doc.next_review_date)}</span>
        ),
      },
      {
        key: "days_remaining",
        label: "Status",
        render: (doc) => {
          const days = getDaysRemaining(doc.next_review_date);
          if (days === null) return "-";
          
          let colorClass = "bg-emerald-100 text-emerald-700";
          if (days <= 0) colorClass = "bg-rose-100 text-rose-700";
          else if (days <= 7) colorClass = "bg-amber-100 text-amber-700";
          
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${colorClass}`}>
              {days <= 0 ? "Overdue" : `${days} days left`}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: "Actions",
        render: (doc) => (
          <button
            type="button"
            className="text-xs text-[#084cc8] hover:underline font-bold"
            onClick={() => navigate(`/tenant/documents/${doc.id}`)}
          >
            Review Now
          </button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <Layout
      currentPage="Document Service"
      pageHeader={{
        title: "Documents Due for Review",
        description: "Review and update documents approaching their periodic review cycle to ensure compliance.",
      }}
    >
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-lg shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="border-b border-[rgba(0,0,0,0.08)] px-4 md:px-5 py-4 bg-amber-50/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Heads up: These documents need attention soon.</h3>
            </div>
            <FilterDropdown
                label="Review within"
                options={[
                    { value: "7", label: "7 Days" },
                    { value: "30", label: "30 Days" },
                    { value: "60", label: "60 Days" },
                    { value: "90", label: "90 Days" },
                ]}
                value={daysFilter}
                onChange={(value) => setDaysFilter(value as string)}
            />
        </div>

        <DataTable
          data={documents}
          columns={columns}
          keyExtractor={(doc) => doc.id}
          emptyMessage="No documents due for review within this period."
          isLoading={isLoading}
          error={error}
        />
      </div>
    </Layout>
  );
};

export default DocumentsDueForReview;
