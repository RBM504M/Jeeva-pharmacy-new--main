import {
  Product,
  Batch,
  Invoice,
  Vendor,
  StockAuditLogEntry,
  DpdpLogEntry,
  BackupSnapshot,
  UserProfile,
  PrinterSettings,
  AutomatedBackupConfig,
} from './pharmacy';

export interface ElectronAPI {
  isElectron: boolean;
  getAllData: () => Promise<{
    products: Product[];
    batches: Batch[];
    invoices: Invoice[];
    vendors: Vendor[];
    stockAuditLogs: StockAuditLogEntry[];
    dpdpLogs: DpdpLogEntry[];
    backupSnapshots: BackupSnapshot[];
    settings: {
      printer_settings?: PrinterSettings;
      user_profile?: UserProfile;
      backup_config?: AutomatedBackupConfig;
    };
  }>;
  saveProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  saveBatch: (batch: Batch) => Promise<{ success: boolean; error?: string }>;
  createInvoice: (invoice: Invoice) => Promise<{ success: boolean; error?: string }>;
  recordStockAdjustment: (logEntry: StockAuditLogEntry) => Promise<{ success: boolean; error?: string }>;
  saveVendor: (vendor: Vendor) => Promise<{ success: boolean; error?: string }>;
  logDpdp: (entry: DpdpLogEntry) => Promise<{ success: boolean; error?: string }>;
  saveSetting: (key: string, val: any) => Promise<{ success: boolean; error?: string }>;
  saveBackupSnapshot: (snapshot: BackupSnapshot) => Promise<{ success: boolean; error?: string }>;
  restoreBackup: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  printReceipt: (options?: { silent?: boolean; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    dbPath: string;
    userDataPath: string;
    isOffline: boolean;
  }>;
  openFolder: (path?: string) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
