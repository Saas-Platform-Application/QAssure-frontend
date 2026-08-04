import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  Loader2,
  Globe,
  MapPin,
  Building2,
  Tag,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Modal, SecondaryButton } from "@/components/shared";
import { supplierService } from "@/services/supplier-service";
import type { Supplier } from "@/types/supplier";

// Helper function to get status badge variant
// const getStatusVariant = (
//   status: string,
// ): "success" | "failure" | "process" | "info" => {
//   switch (status.toLowerCase()) {
//     case "approved":
//     case "active":
//       return "success";
//     case "rejected":
//     case "inactive":
//       return "failure";
//     case "pending":
//       return "process";
//     default:
//       return "info";
//   }
// };

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface ViewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  tenantId?: string | null;
}

const getRiskBadge = (level?: string) => {
  const l = level?.toLowerCase();
  if (l === "high")
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
        HIGH RISK
      </span>
    );
  if (l === "medium")
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
        MEDIUM RISK
      </span>
    );
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      LOW RISK
    </span>
  );
};

export const ViewSupplierModal = ({
  isOpen,
  onClose,
  supplierId,
  tenantId,
}: ViewSupplierModalProps): ReactElement | null => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load supplier data when modal opens
  useEffect(() => {
    if (isOpen && supplierId) {
      const loadSupplier = async (): Promise<void> => {
        try {
          setIsLoading(true);
          setError(null);
          const response = await supplierService.getById(supplierId, tenantId);
          if (response.success) {
            setSupplier(response.data);
          } else {
            setError("Failed to load supplier details");
          }
        } catch (err: any) {
          setError(
            err?.response?.data?.error?.message ||
              "Failed to load supplier details",
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadSupplier();
    } else {
      setSupplier(null);
      setError(null);
    }
  }, [isOpen, supplierId, tenantId]);

  const InfoRow = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: React.ReactNode | string | null;
    icon?: any;
  }) => (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300">
      <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#64748b]" />}
        {label}
      </label>
      <div className="text-sm text-[#334155] font-semibold break-words">
        {value || (
          <span className="text-[#cbd5e1] font-normal italic lowercase">
            not specified
          </span>
        )}
      </div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, colorClass }: { icon: any, title: string, colorClass: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="text-xs font-black text-[#1e293b] uppercase tracking-[0.2em]">
        {title}
      </h4>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supplier Profile"
      maxWidth="xl"
      footer={
        <SecondaryButton
          type="button"
          onClick={onClose}
          className="px-8 py-2.5 rounded-lg border-[rgba(0,0,0,0.1)] hover:bg-gray-50 font-semibold"
        >
          Dismiss
        </SecondaryButton>
      }
    >
      <div className="p-0">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-[#112868] animate-spin opacity-25" />
            <span className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase animate-pulse">
              Retrieving Profile...
            </span>
          </div>
        )}

        {error && (
          <div className="p-8">
            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">
                  Access Error
                </h4>
                <p className="text-xs text-red-600/80 mt-1 font-medium leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && supplier && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="relative px-8 py-10 bg-gradient-to-br from-[#112868] via-[#1a365d] to-[#1e3a8a] text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(35,220,225,0.15),transparent)] pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl shrink-0 ring-8 ring-white/5">
                  <Building2 className="w-12 h-12 text-[#23dce1]" />
                </div>

                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      <h2 className="text-3xl font-black tracking-tighter uppercase">
                        {supplier.name}
                      </h2>
                      {getRiskBadge(supplier.risk_level)}
                    </div>
                    {supplier.legal_name && (
                      <p className="text-sm text-white/60 italic">{supplier.legal_name}</p>
                    )}
                    <span className="inline-block px-2 py-0.5 bg-white/10 rounded font-mono text-[10px] text-[#23dce1] border border-white/10 tracking-widest mt-2">
                        REF: {supplier.supplier_code || "UNASSIGNED"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-5">
                    <div className="flex items-center gap-2 text-white/80">
                      <Tag className="w-4 h-4 text-[#23dce1]" />
                      <span className="text-xs font-black uppercase tracking-widest">
                        {supplier.supplier_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Globe className="w-4 h-4 text-[#23dce1]" />
                      <span className="text-xs font-black uppercase tracking-widest">
                        {supplier.category} UNIT
                      </span>
                    </div>
                  </div>
                </div>

                {/* <div className="shrink-0">
                  <StatusBadge
                    variant={getStatusVariant(supplier.status)}
                    className=" shadow-xl !px-6 !py-2 !text-[12px] font-black"
                  >
                    {supplier.status}
                  </StatusBadge>
                  {supplier.score?.current && (
                    <div className="mt-4 flex flex-col items-center md:items-end">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Compliance Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-[#23dce1]">{supplier.score.current}%</span>
                        {supplier.score.grade && (
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded font-bold text-white">{supplier.score.grade} Grade</span>
                        )}
                      </div>
                    </div>
                  )}
                </div> */}
              </div>
            </div>

            <div className="p-8 space-y-10 bg-white">
              {/* Detailed Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Column 1: General & Legal */}
                <div className="space-y-6">
                  <SectionHeader icon={ShieldCheck} title="Registry Info" colorClass="bg-blue-50 text-blue-600" />
                  <div className="space-y-1">
                    <InfoRow label="Legal Entity" value={supplier.legal_name} />
                    <InfoRow label="Tax ID / VAT" value={supplier.tax_id} />
                    <InfoRow label="DUNS Number" value={supplier.duns_number} />
                    <InfoRow 
                      label="Website" 
                      value={supplier.website ? (
                        <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" className="text-blue-600 hover:underline">{supplier.website}</a>
                      ) : null} 
                    />
                  </div>
                </div>

                {/* Column 2: Location & Address */}
                <div className="space-y-6">
                  <SectionHeader icon={MapPin} title="Headquarters" colorClass="bg-red-50 text-red-600" />
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                    {supplier.address && (supplier.address.line1 || supplier.address.city || supplier.address.country) ? (
                      <>
                        {supplier.address.line1 && <p className="text-sm font-bold text-slate-700">{supplier.address.line1}</p>}
                        {supplier.address.line2 && <p className="text-sm text-slate-600">{supplier.address.line2}</p>}
                        <p className="text-xs font-semibold text-slate-500">
                          {[supplier.address.city, supplier.address.state, supplier.address.postal_code].filter(Boolean).join(', ')}
                        </p>
                        {supplier.address.country && (
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider pt-2 border-t mt-2">
                            {supplier.address.country}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No address recorded</p>
                    )}
                  </div>
                  <div className="pt-2">
                    <SectionHeader icon={Clock} title="Lifecycle" colorClass="bg-amber-50 text-amber-600" />
                    <div className="grid grid-cols-1 gap-1">
                      <InfoRow label="Ingested On" value={formatDate(supplier.created_at)} />
                      <InfoRow label="Created By" value={supplier.created_by} />
                      {supplier.workflow_instance_id && (
                        <InfoRow label="Internal Workflow ID" value={supplier.workflow_instance_id} />
                      )}
                      {/* <InfoRow label="Approved On" value={supplier.dates?.approved ? formatDate(supplier.dates.approved) : "Pending Approval"} />
                      <InfoRow label="Expiry Date" value={supplier.dates?.expiry ? formatDate(supplier.dates.expiry) : null} /> */}
                    </div>
                  </div>
                </div>

                {/* Column 3: Audit & Compliance */}
                <div className="space-y-6">
                  <SectionHeader icon={ShieldCheck} title="Compliance" colorClass="bg-emerald-50 text-emerald-600" />
                  <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Quality Agreement</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${supplier.quality_agreement?.signed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {supplier.quality_agreement?.signed ? 'SIGNED' : 'UNSIGNED'}
                      </span>
                    </div>
                    {supplier.quality_agreement?.date && (
                        <div className="text-[11px] text-emerald-800">
                            Effective since: <b>{new Date(supplier.quality_agreement.date).toLocaleDateString()}</b>
                        </div>
                    )}
                  </div>
                  {/* <div className="space-y-1">
                    <InfoRow label="Last Audit" value={supplier.dates?.last_audit ? formatDate(supplier.dates.last_audit) : null} />
                    <InfoRow label="Next Scheduled Audit" value={supplier.dates?.next_audit ? formatDate(supplier.dates.next_audit) : null} />
                  </div> */}
                </div>
              </div>

              {/* Products & Services Section */}
              {supplier.products_services && supplier.products_services.length > 0 && (
                <div className="space-y-4">
                  <SectionHeader icon={Tag} title="Deliverables" colorClass="bg-indigo-50 text-indigo-600" />
                  <div className="flex flex-wrap gap-2">
                    {supplier.products_services.map((item, idx) => (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {supplier.certifications && supplier.certifications.length > 0 && (
                <div className="space-y-4">
                    <SectionHeader icon={ShieldCheck} title="Certifications" colorClass="bg-cyan-50 text-cyan-600" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {supplier.certifications.map((cert, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-1">
                                <span className="text-sm font-black text-slate-800 uppercase leading-tight">{cert.name}</span>
                                {cert.issuing_body && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{cert.issuing_body}</span>}
                                {cert.expiry_date && (
                                    <span className={`text-[10px] font-bold mt-2 ${new Date(cert.expiry_date) < new Date() ? 'text-red-500' : 'text-emerald-600'}`}>
                                        Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* Extended Contacts Section */}
              {/* {supplier.contacts && supplier.contacts.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <SectionHeader icon={Building2} title="Associated Contacts" colorClass="bg-slate-100 text-slate-600" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supplier.contacts.map((contact) => (
                      <div key={contact.id} className="group p-4 rounded-2xl border border-gray-100 hover:border-slate-200 transition-all flex items-start gap-4 hover:shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#112868] group-hover:text-white transition-all">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">{contact.name}</span>
                            {contact.is_primary && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-black">PRIMARY</span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{contact.title || 'Contact'}</p>
                          <div className="mt-2 space-y-0.5">
                            {contact.email && <div className="text-[11px] text-slate-600 truncate">{contact.email}</div>}
                            {contact.phone && <div className="text-[11px] text-slate-500">{contact.phone} (O)</div>}
                            {contact.mobile && <div className="text-[11px] text-slate-400">{contact.mobile} (M)</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Operational Narrative */}
              {/* <div className="space-y-4">
                <SectionHeader icon={Building2} title="Operational Scope" colorClass="bg-slate-50 text-slate-500" />
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <p className="text-[14px] font-medium text-slate-600 italic leading-relaxed">
                    {supplier.description || "No operational description available for this profile."}
                  </p>
                </div>
              </div> */}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
