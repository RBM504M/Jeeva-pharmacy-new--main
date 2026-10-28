import {
  Product,
  Batch,
  Vendor,
  UserProfile,
  PrinterSettings,
  Invoice,
  DpdpLogEntry,
  StockAuditLogEntry,
  AutomatedBackupConfig,
  BackupSnapshot,
} from '../types/pharmacy';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  role: 'CASHIER',
  storeName: '',
  dlNumber: '',
  gstin: '',
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  isPrintingEnabled: false, // Confirmed: Printing toggled OFF by default
  preferredFormat: 'THERMAL_80MM', // 3-inch 80mm continuous thermal receipt
  autoCutPaper: true,
  printTaxBreakdown: true,
  printDoctorDetails: true,
  thermalWidthMm: 80,
  customFooterNote: 'Prompt medicines recovery. Check batch & expiry before leaving counter.',
};

export const DEFAULT_BACKUP_CONFIG: AutomatedBackupConfig = {
  isEnabled: true,
  frequency: 'DAILY',
  scheduledTime: '23:00',
  triggerOnDayClose: true,
  triggerOnBulkInward: true,
  destinations: {
    localBrowser: true,
    autoDownload: true,
    cloudOffsite: false,
    emailDispatch: false,
  },
  cloudEndpoint: '',
  notificationEmail: '',
  retentionDays: 2920, // 8 Years Statutory under Indian IT Act Section 44AA & GST Rule 56
  isEncrypted: true,
  encryptionAlgorithm: 'AES-256-GCM',
  passphraseHint: '',
  maskDpdpData: true,
  scope: {
    products: true,
    batches: true,
    invoices: true,
    vendors: true,
    stockAuditLogs: true,
    dpdpLogs: true,
    printerSettings: true,
  },
  lastBackupTimestamp: undefined,
  lastBackupStatus: undefined,
  lastBackupChecksum: undefined,
  lastBackupSizeBytes: 0,
};

// All seeded and sample data purged. Clean state on installation.
export const SEED_VENDORS: Vendor[] = [];
export const SEED_PRODUCTS: Product[] = [];
export const SEED_BATCHES: Batch[] = [];
export const SEED_INVOICES: Invoice[] = [];
export const SEED_DPDP_LOGS: DpdpLogEntry[] = [];
export const SEED_STOCK_AUDIT_LOGS: StockAuditLogEntry[] = [];
export const SEED_BACKUP_SNAPSHOTS: BackupSnapshot[] = [];
