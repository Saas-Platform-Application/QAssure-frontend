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
import { Plus, X } from "lucide-react";
import { supplierService } from "@/services/supplier-service";
import type { SupplierContact } from "@/types/supplier";
import { showToast } from "@/utils/toast";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  is_primary: z.boolean(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface SupplierContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  supplierName?: string;
  tenantId?: string | null;
}

export const SupplierContactsModal = ({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  tenantId,
}: SupplierContactsModalProps): ReactElement => {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      mobile: "",
      is_primary: false,
    },
  });

  const fetchContacts = async () => {
    if (!supplierId || !isOpen) return;
    try {
      setIsLoading(true);
      const response = await supplierService.getContacts(supplierId, tenantId);
      if (response.success) {
        setContacts(response.data);
      }
    } catch (error: any) {
      showToast.error("Failed to load contacts", error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchContacts();
      setShowAddForm(false);
      reset();
    }
  }, [isOpen, supplierId, tenantId]);

  const onSubmit = async (data: ContactFormData) => {
    if (!supplierId) return;
    try {
      setIsSubmitting(true);
      const response = await supplierService.addContact(supplierId, data, tenantId);
      if (response.success) {
        showToast.success("Contact added successfully");
        setShowAddForm(false);
        reset();
        fetchContacts();
      }
    } catch (error: any) {
      showToast.error("Failed to add contact", error?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<SupplierContact>[] = [
    {
      key: "name",
      label: "Name",
      render: (contact) => (
        <div className="flex flex-col">
          <span className="font-medium text-[#0f1724]">{contact.name}</span>
          {contact.is_primary && (
            <span className="text-[10px] text-[#084cc8] bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1">
              Primary
            </span>
          )}
        </div>
      ),
    },
    {
      key: "title",
      label: "Title/Role",
      render: (contact) => <span className="text-[#6b7280]">{contact.title || "-"}</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (contact) => <span className="text-[#6b7280]">{contact.email || "-"}</span>,
    },
    {
      key: "phone",
      label: "Phone/Mobile",
      render: (contact) => (
        <div className="flex flex-col text-[#6b7280]">
          <span>{contact.phone || "-"}</span>
          {contact.mobile && <span className="text-[10px]">{contact.mobile} (M)</span>}
        </div>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contacts - ${supplierName || "Supplier"}`}
      maxWidth="2xl"
    >
      <div className="p-5 space-y-6">
        {/* Actions Bar */}
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-[#112868]">
            {showAddForm ? "Add New Contact" : "Supplier Contacts"}
          </h3>
          <PrimaryButton
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                reset();
              } else {
                setShowAddForm(true);
              }
            }}
            className="flex items-center gap-2"
            disabled={isSubmitting}
          >
            {showAddForm ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span className="text-xs">Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span className="text-xs">Add Contact</span>
              </>
            )}
          </PrimaryButton>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Contact Name"
                placeholder="Full name"
                required
                {...register("name")}
                error={errors.name?.message}
              />
              <FormField
                label="Job Title / Role"
                placeholder="e.g. Sales Manager"
                {...register("title")}
                error={errors.title?.message}
              />
              <FormField
                label="Email Address"
                type="email"
                placeholder="email@example.com"
                {...register("email")}
                error={errors.email?.message}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Phone"
                  placeholder="Office phone"
                  {...register("phone")}
                  error={errors.phone?.message}
                />
                <FormField
                  label="Mobile"
                  placeholder="Personal mobile"
                  {...register("mobile")}
                  error={errors.mobile?.message}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_primary"
                className="w-4 h-4 text-[#112868] rounded border-gray-300"
                {...register("is_primary")}
              />
              <label htmlFor="is_primary" className="text-sm text-gray-700">
                Set as primary contact
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <PrimaryButton
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? "Adding..." : "Save Contact"}
              </PrimaryButton>
            </div>
          </form>
        )}

        {/* List Table */}
        <div className="border border-[rgba(0,0,0,0.08)] rounded-lg overflow-hidden bg-white">
          <DataTable
            data={contacts}
            columns={columns}
            keyExtractor={(c) => c.id}
            isLoading={isLoading}
            emptyMessage="No contacts found for this supplier"
          />
        </div>
      </div>
    </Modal>
  );
};
