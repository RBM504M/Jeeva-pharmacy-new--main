import { Product, Batch, GSTRate, DrugSchedule, PaymentMethod, Invoice } from './pharmacy';

export interface MasterDoctor {
  id: string;
  name: string;
  regNumber: string;
  specialty: string;
  clinicHospital: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

export interface MasterCustomer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  creditLimit: number;
  currentBalance: number;
  discountPercent: number;
  gstin?: string;
  isActive: boolean;
}

export interface MasterSalesRep {
  id: string;
  code: string;
  name: string;
  phone: string;
  division: string;
  commissionPercent: number;
  isActive: boolean;
}

export interface MasterRack {
  id: string;
  rackCode: string;
  shelfNumber: string;
  zoneDescription: string;
  storageType: 'ROOM_TEMP' | 'COLD_CHAIN_2_TO_8' | 'LOCKED_SCHEDULE_H1';
}

export interface MasterManufacturer {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
}

export interface MasterScheduleType {
  code: DrugSchedule;
  name: string;
  description: string;
  storageRequirement: string;
  statutoryWarning: string;
  requiresDoctorPrescription: boolean;
  requiresPrescriptionRegister: boolean;
  retentionYears: number;
}

export interface WantedBookItem {
  id: string;
  drugName: string;
  genericComposition: string;
  requestedQuantityStrips: number;
  preferredVendorId?: string;
  doctorName?: string;
  patientName?: string;
  patientContact?: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'ORDERED' | 'FULFILLED';
  dateAdded: string;
  notes?: string;
}

export interface InwardPurchaseItem {
  productId: string;
  productName: string;
  genericComposition: string;
  packing: number;               // Strip size
  quantityStrips: number;
  freeStrips: number;
  batchNumber: string;
  expiryDate: string;
  costPricePerStrip: number;
  mrpPerStrip: number;
  discountPercent: number;
  hsnCode: string;
  gstRate: GSTRate;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
}

export interface InwardPurchaseInvoice {
  id: string;
  grnNumber: string;             // e.g. "GRN-2026-081"
  grnDate: string;
  vendorId: string;
  vendorName: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  paymentDueDate: string;
  items: InwardPurchaseItem[];
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: 'PAID' | 'CREDIT_PENDING';
  paymentMode: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface SalesReturnItem {
  cartItemId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  unitType: 'STRIP' | 'TABLET';
  quantitySold: number;
  returnQuantity: number;
  totalTabletsReturned: number;
  refundAmount: number;
  reason: string;
}

export interface SalesReturnRecord {
  id: string;
  returnNumber: string;          // e.g. "SR-2026-0042"
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  items: SalesReturnItem[];
  totalRefundAmount: number;
  refundMode: PaymentMethod;
  processedBy: string;
  reason: string;
  isRestocked: boolean;
}

export interface SuggestedOrderItem {
  productId: string;
  productName: string;
  genericComposition: string;
  manufacturer: string;
  currentStockTablets: number;
  currentStockStripsFormatted: string;
  reorderLevelTablets: number;
  dailySalesRate: number;        // Units sold per day
  leadTimeDays: number;
  suggestedOrderStrips: number;
  estimatedCost: number;
  preferredVendorName: string;
  preferredVendorId?: string;
}
