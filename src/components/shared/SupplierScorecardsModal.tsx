import { useState, useEffect, type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Modal,
  FormField,
  PrimaryButton,
  DataTable,
  type Column,
} from "@/components/shared";
import { Plus, X, BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { supplierService } from "@/services/supplier-service";
import type { SupplierScorecard } from "@/types/supplier";
import { showToast } from "@/utils/toast";
import { formatDate } from "@/utils/format-date";

const scorecardSchema = z.object({
  period_start: z.string().min(1, "Period start is required"),
  period_end: z.string().min(1, "Period end is required"),
  
  // Scores (0-100)
  quality_score: z.coerce.number().min(0).max(100),
  delivery_score: z.coerce.number().min(0).max(100),
  service_score: z.coerce.number().min(0).max(100),
  cost_score: z.coerce.number().min(0).max(100),
  
  // Specific metrics (0-100 recommended)
  defect_rate: z.coerce.number().min(0).optional().default(0),
  lot_acceptance_rate: z.coerce.number().min(0).optional().default(0),
  complaints_count: z.coerce.number().min(0).optional().default(0),
  on_time_delivery_rate: z.coerce.number().min(0).optional().default(0),
  lead_time_adherence: z.coerce.number().min(0).optional().default(0),
  responsiveness_score: z.coerce.number().min(0).optional().default(0),
  documentation_score: z.coerce.number().min(0).optional().default(0),
  price_competitiveness: z.coerce.number().min(0).optional().default(0),
  
  notes: z.string().optional().or(z.literal("")),
});

type ScorecardFormData = z.infer<typeof scorecardSchema>;

interface SupplierScorecardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  supplierName?: string;
  tenantId?: string | null;
}

export const SupplierScorecardsModal = ({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  tenantId,
}: SupplierScorecardsModalProps): ReactElement => {
  const [scorecards, setScorecards] = useState<SupplierScorecard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScorecardFormData>({
    resolver: zodResolver(scorecardSchema) as any,
    defaultValues: {
      period_start: "",
      period_end: "",
      quality_score: 0,
      delivery_score: 0,
      service_score: 0,
      cost_score: 0,
      defect_rate: 0,
      lot_acceptance_rate: 100,
      complaints_count: 0,
      on_time_delivery_rate: 100,
      lead_time_adherence: 100,
      responsiveness_score: 100,
      documentation_score: 100,
      price_competitiveness: 100,
      notes: "",
    },
  });

  const fetchScorecards = async () => {
    if (!supplierId || !isOpen) return;
    try {
      setIsLoading(true);
      const response = await supplierService.getScorecards(supplierId, tenantId);
      if (response.success) {
        setScorecards(response.data);
      }
    } catch (error: any) {
      showToast.error("Failed to load scorecards", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchScorecards();
      setShowAddForm(false);
      reset();
    }
  }, [isOpen, supplierId, tenantId]);

  const onSubmit = async (data: any) => {
    if (!supplierId) return;
    try {
      setIsSubmitting(true);
      const response = await supplierService.createScorecard(supplierId, data, tenantId);
      if (response.success) {
        showToast.success("Scorecard created successfully");
        setShowAddForm(false);
        reset();
        fetchScorecards();
      }
    } catch (error: any) {
      showToast.error("Failed to create scorecard", error?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'C': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'F': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const columns: Column<SupplierScorecard>[] = [
    {
      key: "period",
      label: "Evaluation Period",
      render: (sc) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[#112868]">
            {formatDate(sc.period?.start)} - {formatDate(sc.period?.end)}
          </span>
          {/* <span className="text-[10px] text-gray-400">Created on {formatDate(sc.created_at)}</span> */}
        </div>
      ),
    },
    {
      key: "overall_score",
      label: "Performance",
      render: (sc) => (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center min-w-[40px] h-10 border rounded-lg bg-white shadow-sm font-black">
            <span className="text-[10px] text-gray-400 uppercase leading-none mb-1">Score</span>
            <span className="text-sm text-[#112868]">{Math.round(sc.overall?.score)}</span>
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-black text-sm shadow-sm ${getGradeColor(sc.overall?.grade)}`}>
            {sc.overall?.grade}
          </div>
        </div>
      ),
    },
    {
        key: "metrics",
        label: "Key Metrics",
        render: (sc) => (
            <div className="flex gap-4 text-[10px] uppercase font-bold tracking-tight">
                <div className="flex flex-col">
                    <span className="text-gray-400">Quality</span>
                    <span className="text-slate-700">{sc.quality_score}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-400">Delivery</span>
                    <span className="text-slate-700">{sc.delivery_score}%</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-400">Service</span>
                    <span className="text-slate-700">{sc.service_score}%</span>
                </div>
            </div>
        )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Supplier Scorecards - ${supplierName || "Supplier"}`}
      maxWidth="2xl"
    >
      <div>
        <div className="p-6 space-y-6">
            {/* Actions Bar */}
            <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                <h3 className="text-[15px] font-black text-[#112868] uppercase tracking-wide">
                    {showAddForm ? "Generate New Evaluation" : "Performance History"}
                </h3>
            </div>
            <PrimaryButton
                onClick={() => {
                if (showAddForm) {
                    setShowAddForm(false);
                    reset();
                } else {
                    setShowAddForm(true);
                }
                }}
                className="flex items-center gap-2 h-9"
                disabled={isSubmitting}
            >
                {showAddForm ? (
                <>
                    <X className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Exit Evaluation</span>
                </>
                ) : (
                <>
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">New Scorecard</span>
                </>
                )}
            </PrimaryButton>
            </div>

            {/* Add Form */}
            {showAddForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-2xl space-y-8 border-2 border-indigo-50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                
                {/* Period Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs font-black uppercase">Evaluation Period</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            label="Start Date"
                            type="date"
                            required
                            {...register("period_start")}
                            error={errors.period_start?.message}
                        />
                        <FormField
                            label="End Date"
                            type="date"
                            required
                            {...register("period_end")}
                            error={errors.period_end?.message}
                        />
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Quality Section */}
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b pb-2">Quality Assurance (40%)</span>
                        <div className="space-y-4">
                            <FormField
                                label="Overall Quality Score (0-100)"
                                type="number"
                                required
                                {...register("quality_score")}
                                error={errors.quality_score?.message}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Defect Rate %" type="number" {...register("defect_rate")} />
                                <FormField label="Acceptance Rate %" type="number" {...register("lot_acceptance_rate")} />
                            </div>
                        </div>
                    </div>

                    {/* Delivery Section */}
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b pb-2">Logistics & Delivery (30%)</span>
                        <div className="space-y-4">
                            <FormField
                                label="Overall Delivery Score (0-100)"
                                type="number"
                                required
                                {...register("delivery_score")}
                                error={errors.delivery_score?.message}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="On-Time Rate %" type="number" {...register("on_time_delivery_rate")} />
                                <FormField label="Lead Time Adherence %" type="number" {...register("lead_time_adherence")} />
                            </div>
                        </div>
                    </div>

                    {/* Service & Support */}
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b pb-2">Service & Support (20%)</span>
                        <div className="space-y-4">
                            <FormField
                                label="Overall Service Score (0-100)"
                                type="number"
                                required
                                {...register("service_score")}
                                error={errors.service_score?.message}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Responsiveness %" type="number" {...register("responsiveness_score")} />
                                <FormField label="Documentation %" type="number" {...register("documentation_score")} />
                            </div>
                        </div>
                    </div>

                    {/* Cost Competitiveness */}
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b pb-2">Cost & Commercial (10%)</span>
                        <div className="space-y-4">
                            <FormField
                                label="Overall Cost Score (0-100)"
                                type="number"
                                required
                                {...register("cost_score")}
                                error={errors.cost_score?.message}
                            />
                            <FormField label="Price Competitiveness %" type="number" {...register("price_competitiveness")} />
                        </div>
                    </div>
                </div>

                <FormField
                    label="Evaluation Notes"
                    placeholder="Provide context for this scorecard..."
                    {...register("notes")}
                    error={errors.notes?.message}
                />

                <div className="pt-4 border-t flex flex-col gap-4">
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            The overall performance score and grade will be automatically calculated based on the weighted average of the Quality, Delivery, Service, and Cost scores.
                        </p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <PrimaryButton
                            type="submit"
                            disabled={isSubmitting}
                            className="min-w-[150px] font-black uppercase h-11"
                        >
                            {isSubmitting ? "Calculating..." : "Submit Evaluation"}
                        </PrimaryButton>
                    </div>
                </div>
            </form>
            )}

            {/* List Table */}
            <div className="bg-white rounded-2xl border-2 border-slate-50 shadow-sm overflow-hidden">
                <DataTable
                    data={scorecards}
                    columns={columns}
                    keyExtractor={(sc) => sc.id}
                    isLoading={isLoading}
                    emptyMessage="No performance evaluations recorded yet."
                />
            </div>
        </div>
      </div>
    </Modal>
  );
};
