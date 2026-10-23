/**
 * Jeeva Pharmacy — Core Domain Types & Indian Healthcare / GST Contracts
 * Compliant with:
 * - Indian Central Board of Indirect Taxes and Customs (CBIC) Pharmacy Tax Rules
 * - Digital Personal Data Protection (DPDP) Act, 2023
 * - Drugs and Cosmetics Act (Schedule H / H1 / OTC)
 */

export type UserRole = 'ADMIN' | 'PHARMACY_ASSISTANT';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  storeName: string;
  dlNumber: string; // Drug License Number e.g. DL-TN-2024-8849
  gstin: string;    // e.g. 33AAAAA0000A1Z5
}

export type GSTRate = 0 | 5 | 12 | 18 | 28;

export type DrugSchedule = 'OTC' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X' | 'SCHEDULE_G';

export type PrinterFormat = 'THERMAL_80MM' | 'LASER_A4';

export interface PrinterSettings {
  isPrintingEnabled: boolean;       // Master toggle switch (ON/OFF)
  preferredFormat: PrinterFormat;   // 80mm continuous thermal slip vs A4 laser tax invoice
  autoCutPaper: boolean;
  printTaxBreakdown: boolean;
  printDoctorDetails: boolean;
  thermalWidthMm: number;           // Standard 80mm (printable area ~72mm)
  customFooterNote: string;
}

export interface Product {
  id: string;
  name: string;                    // Brand name e.g. "Dolo 650"
  genericComposition: string;      // Salt composition e.g. "Paracetamol IP 650mg"
  manufacturer: string;            // e.g. "Micro Labs Ltd"
  hsnCode: string;                 // Mandatory Indian HSN e.g. "3004"
  barcode: string;                 // EAN-13 or UPC string scanned by hardware
  stripSize: number;               // Conversion factor: units/tablets per 1 full strip
  drugSchedule: DrugSchedule;
  reorderLevelUnits: number;       // In atomic tablets
  defaultGstRate: GSTRate;
  rackLocation?: string;
  isActive: boolean;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;             // Manufacturer batch code e.g. "DL24K09"
  barcode?: string;
  expiryDate: string;              // ISO Date e.g. "2026-11-30"
  manufacturingDate: string;
  costPricePerStrip: number;       // Wholesaler purchase cost (₹)
  mrpPerStrip: number;             // Maximum Retail Price printed on packaging
  sellingPricePerStrip: number;    // Pharmacy checkout price per full strip
  gstRate: GSTRate;
  
  // Dual-Unit Fractional Inventory Tracking:
  // Stock is stored at the lowest atomic unit (Total Tablets/Capsules)
  totalTablets: number; 

  vendorId?: string;
}

export interface FormattedStock {
  strips: number;
  looseTablets: number;
  totalTablets: number;
  displayString: string; // e.g. "12 Strips, 4 Tablets remaining"
  isLowStock: boolean;
}

export type UnitType = 'STRIP' | 'TABLET';

export interface PosCartItem {
  cartItemId: string;
  product: Product;
  batch: Batch;
  unitType: UnitType;              // Whether sold as full strip or individual loose tablets
  quantity: number;                // Count of selected unitType
  totalTabletsSold: number;
  unitPrice: number;               // Price per selected unit (strip price or loose tablet price)
  gstRate: GSTRate;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'CREDIT_DUE';

export interface PrescriptionDetails {
  patientName: string;
  patientContact: string;
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER';
  doctorName: string;
  doctorRegNumber: string;
  notes?: string;
  dpdpConsentAccepted: boolean;
}

export interface TaxBreakdownSummary {
  gstRate: GSTRate;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  isInterState: boolean;
  prescription: PrescriptionDetails;
  items: PosCartItem[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  cashierName: string;
  taxSlabBreakdowns: TaxBreakdownSummary[];
  createdAt: string;
}

export interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  drugLicenseNumber: string;
  state: string;
  creditPeriodDays: number;
  balanceDue: number;
  isActive: boolean;
}

export interface PurchaseOrderRecord {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantityStrips: number;
  costPricePerStrip: number;
  mrpPerStrip: number;
  gstRate: GSTRate;
  totalAmount: number;
  status: 'RECEIVED' | 'PENDING';
}

export interface ExpiryAlertItem {
  product: Product;
  batch: Batch;
  daysRemaining: number;
  zone: 'CRITICAL_30' | 'WARNING_60' | 'CAUTION_90' | 'SAFE';
  formattedStock: string;
  mrpValue: number;
}

export interface AnalyticsSummary {
  dailyRevenue: number;
  dailyProfit: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  averageMarginPercentage: number;
  totalTransactionsToday: number;
  lowStockItemsCount: number;
  nearExpiryItemsCount: number;
  fastestMovingByVolume: Array<{
    productId: string;
    productName: string;
    totalTabletsSold: number;
    stripsEquivalent: string;
    revenue: number;
  }>;
  fastestMovingByRevenue: Array<{
    productId: string;
    productName: string;
    revenue: number;
    unitsSold: number;
  }>;
  gstLiability: {
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    grossTax: number;
  };
}

export interface DpdpLogEntry {
  id: string;
  timestamp: string;
  patientPhoneMasked: string;
  action: string;
  operatorName: string;
  purpose: string;
}

export type StockAdjustmentType =
  | 'MANUAL_ADJUSTMENT'      // Physical stock audit correction / recount
  | 'SALE_DEDUCTION'         // Dispensed at POS billing
  | 'VENDOR_RETURN'          // Returned to supplier/wholesaler (e.g. expiry/damaged)
  | 'INWARD_PURCHASE'        // Inward stock receipt / GRN from distributor
  | 'DAMAGE_WRITEOFF'        // Broken blister/damaged bottle write-off
  | 'EXPIRY_DISPOSAL';       // Disposal of expired batches

export interface StockAuditLogEntry {
  id: string;
  timestamp: string;             // ISO Date string
  formattedTimestamp: string;    // e.g. "15 Oct 2026, 03:45 PM"
  productId: string;
  productName: string;
  genericComposition: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  drugSchedule: DrugSchedule;
  adjustmentType: StockAdjustmentType;
  quantityChangeTablets: number; // Signed atomic tablets: -15, +100
  formattedChange: string;       // e.g. "-1 Strip (-10 Tabs)" or "+5 Strips (+50 Tabs)"
  previousStockTablets: number;
  newStockTablets: number;
  formattedPreviousStock: string;// e.g. "10 Strips, 0 Tabs"
  formattedNewStock: string;     // e.g. "9 Strips, 0 Tabs"
  referenceNumber: string;       // "INV-2026-00481", "VR-2026-003", "ADJ-2026-015", "PO-2026-102"
  operatorName: string;          // Pharmacist / User name
  operatorRole: UserRole;
  reason: string;                // Audit justification / clinical note
  vendorId?: string;
  vendorName?: string;
  rackLocation?: string;
}

/**
 * Utility functions for Indian Pharmacy Calculations
 */

// Format stock into dual-unit display: "12 Strips, 4 Tablets remaining"
export function formatDualUnitStock(totalTablets: number, stripSize: number, reorderLevel: number = 50): FormattedStock {
  const safeTotal = Math.max(0, totalTablets);
  const strips = Math.floor(safeTotal / stripSize);
  const looseTablets = safeTotal % stripSize;

  let displayString = '';
  if (strips > 0 && looseTablets > 0) {
    displayString = `${strips} Strip${strips > 1 ? 's' : ''}, ${looseTablets} Tab${looseTablets > 1 ? 's' : ''} remaining`;
  } else if (strips > 0) {
    displayString = `${strips} Strip${strips > 1 ? 's' : ''} remaining`;
  } else {
    displayString = `${looseTablets} Tab${looseTablets > 1 ? 's' : ''} remaining`;
  }

  return {
    strips,
    looseTablets,
    totalTablets: safeTotal,
    displayString,
    isLowStock: safeTotal <= reorderLevel,
  };
}

// Calculate Days to Expiry and Zone
export function calculateExpiryZone(expiryDateStr: string): { days: number; zone: 'CRITICAL_30' | 'WARNING_60' | 'CAUTION_90' | 'SAFE' } {
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - now.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days <= 30) return { days, zone: 'CRITICAL_30' };
  if (days <= 60) return { days, zone: 'WARNING_60' };
  if (days <= 90) return { days, zone: 'CAUTION_90' };
  return { days, zone: 'SAFE' };
}

// Compute Indian GST for a single line item
export function calculateItemGst(
  unitPrice: number,
  quantity: number,
  gstRate: GSTRate,
  isInterState: boolean = false
): { taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number } {
  // Pharmacy MRPs in India are inclusive of GST.
  // Taxable = MRP / (1 + Rate / 100)
  // Tax = MRP - Taxable
  const grossLineTotal = Number((unitPrice * quantity).toFixed(2));
  const rateFactor = 1 + gstRate / 100;
  const taxableAmount = Number((grossLineTotal / rateFactor).toFixed(2));
  const totalTax = Number((grossLineTotal - taxableAmount).toFixed(2));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalTax;
  } else {
    cgstAmount = Number((totalTax / 2).toFixed(2));
    sgstAmount = Number((totalTax - cgstAmount).toFixed(2)); // Guard against half-paisa split
  }

  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount: grossLineTotal,
  };
}

// Indian Currency Formatter with ₹ and standard lakh/crore commas
export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

// Mask Phone for DPDP compliance e.g. "XXXXXX8912"
export function maskPhoneDPDP(phone: string): string {
  if (!phone) return 'XXXXXX';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length > 10) {
    clean = clean.slice(-10);
  } else if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(-10);
  }
  if (clean.length <= 4) return 'XXXXXX';
  return `XXXXXX${clean.slice(-4)}`;
}

/**
 * Automated Database & Audit Backup Types
 * Compliant with Indian Income Tax Sec 44AA (8-Year Record Retention),
 * GST Rule 56 (Accounts & Records), and CDSCO Inspection Archival
 */
export type BackupFrequency = 'HOURLY' | 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' | 'ON_SETTLEMENT';
export type BackupDestination = 'LOCAL_BROWSER' | 'AUTO_DOWNLOAD' | 'CLOUD_OFFSITE' | 'EMAIL_DISPATCH';
export type RetentionPeriodDays = 7 | 30 | 90 | 365 | 2920; // 2920 days = 8 years statutory

export interface AutomatedBackupConfig {
  isEnabled: boolean;
  frequency: BackupFrequency;
  scheduledTime: string;              // e.g. "23:00" (11:00 PM closing)
  triggerOnDayClose: boolean;         // Trigger upon closing register / day-end settlement
  triggerOnBulkInward: boolean;       // Trigger after receiving bulk PO / GRN
  destinations: {
    localBrowser: boolean;
    autoDownload: boolean;
    cloudOffsite: boolean;
    emailDispatch: boolean;
  };
  cloudEndpoint?: string;             // e.g. "s3://backups.jeevapharmacy.in/asia-south1"
  notificationEmail: string;          // e.g. "pharmacist@jeevapharmacy.in"
  retentionDays: RetentionPeriodDays;
  isEncrypted: boolean;
  encryptionAlgorithm: 'AES-256-GCM' | 'NONE';
  passphraseHint?: string;
  maskDpdpData: boolean;              // Mask patient numbers in offsite backups
  scope: {
    products: boolean;
    batches: boolean;
    invoices: boolean;
    vendors: boolean;
    stockAuditLogs: boolean;
    dpdpLogs: boolean;
    printerSettings: boolean;
  };
  lastBackupTimestamp?: string;
  lastBackupStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastBackupChecksum?: string;
  lastBackupSizeBytes?: number;
}

export interface BackupSnapshot {
  id: string;
  filename: string;
  timestamp: string;
  triggerType: 'AUTOMATED_SCHEDULED' | 'DAY_CLOSE_SETTLEMENT' | 'MANUAL_INSTANT' | 'PRE_RESTORE_ROLLBACK';
  sizeBytes: number;
  itemCounts: {
    products: number;
    batches: number;
    invoices: number;
    vendors: number;
    stockAuditLogs: number;
    dpdpLogs: number;
  };
  checksumSha256: string;
  isEncrypted: boolean;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  destinationsArchived: string[];
  restorable: boolean;
  dataPayload?: Record<string, unknown>; // JSON payload for in-browser instant restore
}

