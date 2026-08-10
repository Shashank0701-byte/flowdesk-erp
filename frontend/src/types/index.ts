// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';
export type CustomerType = 'Retail' | 'Wholesale' | 'Distributor';
export type CustomerStatus = 'Active' | 'Inactive';
export type ChallanStatus = 'Draft' | 'Confirmed' | 'Cancelled';
export type StockMovementType = 'IN' | 'OUT';

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  type: CustomerType;
  status: CustomerStatus;
  address?: string | null;
  followUpDate?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { challans: number };
  notes?: CustomerNote[];
  challans?: ChallanSummary[];
}

export interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  user: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantityChanged: number;
  reason: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface ChallanItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  product?: { id: string; name: string; sku: string; currentStock: number };
}

export interface Challan {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  customer: { id: string; name: string; businessName?: string | null };
  createdBy: { id: string; name: string; role?: Role };
  items: ChallanItem[];
  _count?: { items: number };
}

// Lightweight challan shape used in customer detail list
export interface ChallanSummary {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
