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
import { InwardPurchaseInvoice } from './shopaid';

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
    purchaseInvoices?: InwardPurchaseInvoice[];
    purchaseReceipts?: InwardPurchaseInvoice[];
    salesReturns?: any[];
    settings: {
      printer_settings?: PrinterSettings;
      user_profile?: UserProfile;
      backup_config?: AutomatedBackupConfig;
      [key: string]: any;
    };
  }>;
  saveProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  saveBatch: (batch: Batch) => Promise<{ success: boolean; error?: string }>;
  createBatch: (batch: Batch) => Promise<{ success: boolean; error?: string; batchId?: string }>;
  updateBatchMetadata: (batch: Partial<Batch> & { id: string }) => Promise<{ success: boolean; error?: string }>;
  receiveStock: (payload: { batchId: string; quantityChangeTablets: number; reason?: string; referenceNumber?: string; rackLocation?: string }) => Promise<{ success: boolean; error?: string; newStockTablets?: number }>;
  adjustStock: (payload: { batchId: string; adjustmentType?: string; quantityChangeTablets?: number; newStockTablets?: number; reason?: string; referenceNumber?: string; rackLocation?: string }) => Promise<{ success: boolean; error?: string; newStockTablets?: number; previousStockTablets?: number; change?: number }>;
  createInvoice: (invoice: Invoice, auditEntries?: StockAuditLogEntry[]) => Promise<{ success: boolean; error?: string; batches?: Batch[] }>;
  cancelInvoice: (data: { invoiceId: string; reason: string; rollbackEntries: StockAuditLogEntry[] }) => Promise<{ success: boolean; error?: string; batches?: Batch[] }>;
  updateInvoicePaymentMethod: (data: { invoiceId: string; newPaymentMethod: string }) => Promise<{ success: boolean; error?: string }>;
  recordStockAdjustment: (logEntry: StockAuditLogEntry) => Promise<{ success: boolean; error?: string }>;
  saveVendor: (vendor: Vendor) => Promise<{ success: boolean; error?: string }>;
  logDpdp: (entry: DpdpLogEntry) => Promise<{ success: boolean; error?: string }>;
  saveSetting: (key: string, val: any) => Promise<{ success: boolean; error?: string }>;
  saveBackupSnapshot: (snapshot: BackupSnapshot) => Promise<{ success: boolean; error?: string }>;
  restoreBackup: (backupData: any) => Promise<{ success: boolean; error?: string }>;
  postPurchaseReceipt: (receipt: any) => Promise<{ success: boolean; error?: string; receipt?: InwardPurchaseInvoice; batches?: Batch[]; vendor?: Vendor; auditLogs?: StockAuditLogEntry[] }>;
  confirmGrn: (grnId: string) => Promise<{ success: boolean; error?: string; receipt?: InwardPurchaseInvoice; batches?: Batch[]; vendor?: Vendor; auditLogs?: StockAuditLogEntry[] }>;
  cancelGrn: (data: { grnId: string; reason: string }) => Promise<{ success: boolean; error?: string }>;
  postPurchaseReturn: (params: { productId: string; batchId: string; vendorId?: string; returnTablets: number; reason: string; debitNoteNumber?: string }) => Promise<{ success: boolean; error?: string; batch?: Batch; vendor?: Vendor; auditEntry?: StockAuditLogEntry }>;
  getPurchaseReceipts: () => Promise<InwardPurchaseInvoice[]>;
  postSalesReturn: (payload: any) => Promise<{ success: boolean; error?: string; returnRecord?: any; batches?: Batch[]; invoice?: Invoice }>;
  getSalesReturns: () => Promise<any[]>;
  printReceipt: (options?: { silent?: boolean; deviceName?: string }) => Promise<{ success: boolean; error?: string }>;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    dbPath: string;
    userDataPath: string;
    isOffline: boolean;
  }>;
  openFolder: (path?: string) => Promise<{ success: boolean }>;
  auth: {
    getAuthState: () => Promise<{
      isConfigured: boolean;
      isAuthenticated: boolean;
      user?: import('./pharmacy').UserRecord | null;
      pharmacy?: import('./pharmacy').PharmacyAccount | null;
    }>;
    setupOnboarding: (payload: import('./pharmacy').OnboardingPayload) => Promise<{
      success: boolean;
      user?: import('./pharmacy').UserRecord;
      pharmacy?: import('./pharmacy').PharmacyAccount;
      error?: string;
    }>;
    login: (credentials: {
      username: string;
      password: string;
      rememberMe?: boolean;
    }) => Promise<{
      success: boolean;
      user?: import('./pharmacy').UserRecord;
      pharmacy?: import('./pharmacy').PharmacyAccount;
      error?: string;
    }>;
    logout: () => Promise<{ success: boolean }>;
    getUsers: () => Promise<import('./pharmacy').UserRecord[]>;
    createUser: (userData: {
      fullName: string;
      username: string;
      password: string;
      role: import('./pharmacy').UserRole;
      email?: string;
      phone?: string;
    }) => Promise<{ success: boolean; user?: import('./pharmacy').UserRecord; error?: string }>;
    deactivateUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
    activateUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (payload: {
      userId: string;
      newPassword: string;
    }) => Promise<{ success: boolean; error?: string }>;
    updatePharmacyProfile: (payload: Partial<import('./pharmacy').PharmacyAccount>) => Promise<{
      success: boolean;
      pharmacy?: import('./pharmacy').PharmacyAccount;
      error?: string;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
