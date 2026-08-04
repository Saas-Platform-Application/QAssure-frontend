export interface Supplier {
  id: string;
  name: string;
  legal_name?: string | null;
  supplier_code?: string;
  supplier_type: string;
  category: string;
  status: string;
  risk_level?: string;
  website?: string | null;
  tax_id?: string | null;
  duns_number?: string | null;
  
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postal_code?: string | null;
  };
  
  quality_agreement?: {
    signed: boolean;
    date?: string | null;
  };
  
  dates?: {
    approved?: string | null;
    expiry?: string | null;
    last_audit?: string | null;
    next_audit?: string | null;
  };
  
  score?: {
    current?: number | null;
    grade?: string | null;
  };
  
  products_services?: string[];
  certifications?: Array<{
    name: string;
    issuing_body?: string;
    expiry_date?: string | null;
    document_url?: string | null;
  }>;
  
  contacts?: SupplierContact[];
  
  workflow_instance_id?: string | null;
  created_by?: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierScorecard {
  id: string;
  supplier_id: string;
  period: {
    start: string;
    end: string;
  };
  quality_score: number;
  defect_rate: number;
  lot_acceptance_rate: number;
  complaints_count: number;
  delivery_score: number;
  on_time_delivery_rate: number;
  lead_time_adherence: number;
  service_score: number;
  responsiveness_score: number;
  documentation_score: number;
  cost_score: number;
  price_competitiveness: number;
  overall: {
    score: number;
    grade: string;
  };
  notes?: string;
  calculated_by?: string;
  created_at: string;
}

export interface SuppliersResponse {
  success: boolean;
  data: Supplier[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SupplierResponse {
  success: boolean;
  data: Supplier;
}

export interface SupplierContactsResponse {
  success: boolean;
  data: SupplierContact[];
}

export interface SupplierScorecardsResponse {
  success: boolean;
  data: SupplierScorecard[];
}

export interface CreateSupplierData {
  name: string;
  code?: string;
  supplier_type: string;
  category: string;
  status?: string;
  risk_level?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  tax_id?: string;
  duns_number?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  products_services?: string[];
  certifications?: Array<{
    name: string;
    issuing_body?: string;
    expiry_date?: string | null;
    document_url?: string | null;
  }>;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  quality_agreement_signed?: boolean;
  quality_agreement_date?: string | Date | null;
}
