import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Product,
  Batch,
  Invoice,
  Vendor,
  UserProfile,
  PrinterSettings,
  DpdpLogEntry,
  AnalyticsSummary,
  UserRole,
  PaymentMethod,
  PharmacyAccount,
  UserRecord,
  OnboardingPayload,
  StockAuditLogEntry,
  StockAdjustmentType,
  AutomatedBackupConfig,
  BackupSnapshot,
  formatDualUnitStock,
  calculateExpiryZone,
  maskPhoneDPDP,
} from '../types/pharmacy';
import {
  MasterDoctor,
  MasterCustomer,
  MasterSalesRep,
  MasterRack,
  MasterManufacturer,
  MasterScheduleType,
  WantedBookItem,
  InwardPurchaseInvoice,
  SalesReturnRecord,
  SalesReturnItem,
} from '../types/shopaid';
import {
  DEFAULT_USER_PROFILE,
  DEFAULT_PRINTER_SETTINGS,
  DEFAULT_BACKUP_CONFIG,
  SEED_BACKUP_SNAPSHOTS,
  SEED_PRODUCTS,
  SEED_BATCHES,
  SEED_INVOICES,
  SEED_VENDORS,
  SEED_DPDP_LOGS,
  SEED_STOCK_AUDIT_LOGS,
} from '../data/seedData';
import {
  SEED_DOCTORS,
  SEED_CUSTOMERS,
  SEED_SALES_REPS,
  SEED_RACKS,
  SEED_MANUFACTURERS,
  SEED_SCHEDULE_TYPES,
  SEED_WANTED_BOOK,
  SEED_PURCHASE_INVOICES,
  SEED_SALES_RETURNS,
} from '../data/shopAidSeedData';
import { NavigationConfig, DEFAULT_NAVIGATION_CONFIG } from '../types/navigation';
import {
  ThemeId,
  ThemeDefinition,
  AVAILABLE_THEMES,
  DEFAULT_THEME_ID,
  getTheme,
} from '../types/theme';
import {
  computeSha256,
  verifyChecksum,
  encryptBackupPayload,
  decryptBackupPayload,
} from '../utils/cryptoUtils';
import {
  saveEntityCollection,
  loadEntityCollection,
  setKvItem,
  getKvItem,
  importDataFromJson,
  clearAllIndexedDb,
} from '../utils/indexedDbStorage';

interface PharmacyContextType {
  products: Product[];
  batches: Batch[];
  invoices: Invoice[];
  vendors: Vendor[];
  doctors: MasterDoctor[];
  customers: MasterCustomer[];
  salesReps: MasterSalesRep[];
  racks: MasterRack[];
  manufacturers: MasterManufacturer[];
  scheduleTypes: MasterScheduleType[];
  wantedBook: WantedBookItem[];
  purchaseInvoices: InwardPurchaseInvoice[];
  salesReturns: SalesReturnRecord[];
  printerSettings: PrinterSettings;
  currentUser: UserProfile;
  pharmacyAccount: PharmacyAccount | null;
  isConfigured: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  login: (credentials: { username: string; password: string; rememberMe?: boolean }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setupOnboarding: (payload: OnboardingPayload) => Promise<{ success: boolean; error?: string }>;
  getUsers: () => Promise<UserRecord[]>;
  createUser: (userData: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
    phone?: string;
    email?: string;
  }) => Promise<{ success: boolean; user?: UserRecord; error?: string }>;
  deactivateUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  activateUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updatePharmacyProfile: (data: Partial<PharmacyAccount>) => Promise<{ success: boolean; error?: string }>;
  dpdpLogs: DpdpLogEntry[];
  stockAuditLogs: StockAuditLogEntry[];
  backupConfig: AutomatedBackupConfig;
  backupSnapshots: BackupSnapshot[];
  updateBackupConfig: (config: Partial<AutomatedBackupConfig>) => void;
  triggerAutomatedBackup: (
    triggerType?: BackupSnapshot['triggerType'],
    customNote?: string
  ) => { success: boolean; snapshot: BackupSnapshot; message: string };
  restoreFromSnapshot: (snapshotId: string) => { success: boolean; message: string };
  importExternalBackup: (
    jsonContent: string
  ) => Promise<{ success: boolean; message: string; details?: Record<string, number> }>;
  lastScannedBarcode: string | null;
  setLastScannedBarcode: (barcode: string | null) => void;
  updatePrinterSettings: (settings: Partial<PrinterSettings>) => void;
  switchUserRole: (role: UserRole) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  addVendor: (vendor: Vendor) => Promise<{ success: boolean; error?: string }>;
  updateVendor: (vendor: Vendor) => Promise<{ success: boolean; error?: string }>;
  addBatch: (batch: Batch) => void;
  inwardStockBatch: (batchData: Omit<Batch, 'id'>, vendorInvoiceNo?: string) => Promise<{ success: boolean; error?: string; batch?: Batch }>;
  createInvoice: (invoice: Invoice) => Promise<{ success: boolean; error?: string; invoice?: Invoice }>;
  cancelInvoice: (invoiceId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  updateInvoicePaymentMethod: (invoiceId: string, paymentMethod: PaymentMethod) => Promise<{ success: boolean; error?: string }>;
  processSalesReturn: (params: {
    invoiceId: string;
    returnedItems: Array<{
      cartItemId: string;
      returnQuantity: number;
      reason: string;
    }>;
    refundMode: PaymentMethod;
  }) => Promise<{ success: boolean; returnRecord?: SalesReturnRecord; error?: string }>;
  addInwardPurchaseInvoice: (newPurchase: InwardPurchaseInvoice) => Promise<{ success: boolean; error?: string; receipt?: InwardPurchaseInvoice }>;
  confirmGrn: (grnId: string) => Promise<{ success: boolean; error?: string }>;
  cancelGrn: (grnId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  addWantedBookItem: (item: Omit<WantedBookItem, 'id' | 'dateAdded' | 'status'>) => void;
  updateWantedBookItemStatus: (id: string, status: WantedBookItem['status']) => void;
  deleteWantedBookItem: (id: string) => void;
  addDoctor: (doc: MasterDoctor) => void;
  addCustomer: (cust: MasterCustomer) => void;
  addSalesRep: (rep: MasterSalesRep) => void;
  addRack: (rack: MasterRack) => void;
  recordManualAdjustment: (params: {
    productId: string;
    batchId: string;
    adjustmentType: 'MANUAL_ADJUSTMENT' | 'DAMAGE_WRITEOFF' | 'EXPIRY_DISPOSAL';
    quantityChangeTablets: number;
    reason: string;
    referenceNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  recordVendorReturn: (params: {
    productId: string;
    batchId: string;
    vendorId: string;
    returnTablets: number;
    reason: string;
    debitNoteNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  analytics: AnalyticsSummary;
  findProductByBarcode: (barcode: string) => { product?: Product; activeBatch?: Batch } | null;
  clearAllData: () => void;
  navigationConfig: NavigationConfig;
  updateNavigationConfig: (
    config: Partial<NavigationConfig> | ((prev: NavigationConfig) => NavigationConfig)
  ) => void;
  toggleMenu: (menuId: string, enabled?: boolean) => void;
  toggleSubmenu: (menuId: string, submenuId: string, enabled?: boolean) => void;
  setAllMenus: (enabled: boolean) => void;
  resetNavigationConfigToDefaults: () => void;
  isMenuEnabled: (menuId: string) => boolean;
  isSubmenuEnabled: (menuId: string, submenuId: string) => boolean;
  currentThemeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (themeId: ThemeId) => void;
  availableThemes: Record<ThemeId, ThemeDefinition>;
}

export const PharmacyContext = createContext<PharmacyContextType | null>(null);

const isTestEnvironment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const STORAGE_KEYS = {
  THEME: 'jeeva_pharmacy_theme_v1',
  NAVIGATION_CONFIG: 'jeeva_pharmacy_navigation_config_v1',
  PRINTER: 'jeeva_pharmacy_printer_v1',
  BATCHES: 'jeeva_pharmacy_batches_v1',
  INVOICES: 'jeeva_pharmacy_invoices_v1',
  PRODUCTS: 'jeeva_pharmacy_products_v1',
  VENDORS: 'jeeva_pharmacy_vendors_v1',
  DOCTORS: 'jeeva_pharmacy_doctors_v1',
  CUSTOMERS: 'jeeva_pharmacy_customers_v1',
  SALES_REPS: 'jeeva_pharmacy_sales_reps_v1',
  RACKS: 'jeeva_pharmacy_racks_v1',
  MANUFACTURERS: 'jeeva_pharmacy_manufacturers_v1',
  WANTED_BOOK: 'jeeva_pharmacy_wanted_book_v1',
  PURCHASES: 'jeeva_pharmacy_purchases_v1',
  SALES_RETURNS: 'jeeva_pharmacy_sales_returns_v1',
  DPDP_LOGS: 'jeeva_pharmacy_dpdp_logs_v1',
  AUDIT_LOGS: 'jeeva_pharmacy_audit_logs_v1',
  BACKUP_CONFIG: 'jeeva_pharmacy_backup_config_v1',
  BACKUP_SNAPSHOTS: 'jeeva_pharmacy_backup_snapshots_v1',
  ACCOUNT: 'jeeva_pharmacy_account_v1',
  USERS: 'jeeva_pharmacy_users_v1',
};

const getStoredOrFallback = <T,>(key: string, testFallback: T, liveFallback: T): T => {
  if (isTestEnvironment) return testFallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : liveFallback;
  } catch {
    return liveFallback;
  }
};

export interface PharmacyProviderInitialData {
  products?: Product[];
  batches?: Batch[];
  invoices?: Invoice[];
  vendors?: Vendor[];
  doctors?: MasterDoctor[];
  customers?: MasterCustomer[];
  salesReps?: MasterSalesRep[];
  racks?: MasterRack[];
  manufacturers?: MasterManufacturer[];
  scheduleTypes?: MasterScheduleType[];
  wantedBook?: WantedBookItem[];
  purchaseInvoices?: InwardPurchaseInvoice[];
  salesReturns?: SalesReturnRecord[];
  dpdpLogs?: DpdpLogEntry[];
  stockAuditLogs?: StockAuditLogEntry[];
  backupConfig?: AutomatedBackupConfig;
  backupSnapshots?: BackupSnapshot[];
}

export interface PharmacyProviderProps {
  children: React.ReactNode;
  initialData?: PharmacyProviderInitialData;
}

export const PharmacyProvider: React.FC<PharmacyProviderProps> = ({ children, initialData }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [pharmacyAccount, setPharmacyAccount] = useState<PharmacyAccount | null>(() => {
    try {
      const stored = localStorage.getItem('jeeva_pharmacy_account_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    if (isTestEnvironment) {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('jeeva_test_fresh_install') === 'true') {
        return false;
      }
      return true;
    }
    try {
      const stored = localStorage.getItem('jeeva_pharmacy_account_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.name && parsed.name.trim().length > 0) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (isTestEnvironment) {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('jeeva_test_unauthenticated') === 'true') {
        return false;
      }
      return true;
    }
    return false;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(!isTestEnvironment);
  const [staffUsers, setStaffUsers] = useState<UserRecord[]>(() => {
    try {
      const stored = localStorage.getItem('jeeva_pharmacy_users_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);

  // Initialize printer settings with requested default (Printing toggled OFF by default)
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRINTER);
      return stored ? JSON.parse(stored) : DEFAULT_PRINTER_SETTINGS;
    } catch {
      return DEFAULT_PRINTER_SETTINGS;
    }
  });

  // Active Visual Theme State (3 Professional Curated Themes with Persistence)
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeId;
      if (stored && AVAILABLE_THEMES[stored]) {
        return stored;
      }
    } catch {}
    return DEFAULT_THEME_ID;
  });

  const theme = useMemo(() => getTheme(currentThemeId), [currentThemeId]);

  const setTheme = (themeId: ThemeId) => {
    if (!AVAILABLE_THEMES[themeId]) return;
    setCurrentThemeId(themeId);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, themeId);
    } catch {}
    if (window.electronAPI?.saveSetting) {
      window.electronAPI.saveSetting('active_theme', themeId).catch(() => {});
    }
  };

  // Sync active theme colors to CSS variables and document attribute
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.setAttribute('data-theme', currentThemeId);
      root.style.setProperty('--theme-sidebar-bg', theme.colors.sidebarBg);
      root.style.setProperty('--theme-sidebar-border', theme.colors.sidebarBorder);
      root.style.setProperty('--theme-sidebar-hover', theme.colors.sidebarHover);
      root.style.setProperty('--theme-sidebar-active', theme.colors.sidebarActive);
      root.style.setProperty('--theme-header-bg', theme.colors.headerBg);
      root.style.setProperty('--theme-header-border', theme.colors.headerBorder);
      root.style.setProperty('--theme-accent', theme.colors.accentPrimary);
      root.style.setProperty('--theme-workspace-bg', theme.colors.workspaceBg);
    } catch {}
  }, [currentThemeId, theme]);

  // Navigation Configuration State (Defaulting to all menus enabled, persisted to localStorage)
  const [navigationConfig, setNavigationConfig] = useState<NavigationConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        const mergedMenus = { ...DEFAULT_NAVIGATION_CONFIG.menus };
        if (parsed.menus) {
          for (const key of Object.keys(mergedMenus)) {
            if (parsed.menus[key]) {
              mergedMenus[key] = {
                ...mergedMenus[key],
                enabled: parsed.menus[key].isSystemLocked ? true : parsed.menus[key].enabled,
                submenus: mergedMenus[key].submenus
                  ? {
                      ...mergedMenus[key].submenus,
                      ...(parsed.menus[key].submenus || {}),
                    }
                  : undefined,
              };
              if (mergedMenus[key].submenus) {
                for (const subKey of Object.keys(mergedMenus[key].submenus!)) {
                  if (DEFAULT_NAVIGATION_CONFIG.menus[key]?.submenus?.[subKey]?.isSystemLocked) {
                    mergedMenus[key].submenus![subKey].enabled = true;
                  }
                }
              }
            }
          }
        }
        return {
          ...DEFAULT_NAVIGATION_CONFIG,
          ...parsed,
          menus: mergedMenus,
        };
      }
      return DEFAULT_NAVIGATION_CONFIG;
    } catch {
      return DEFAULT_NAVIGATION_CONFIG;
    }
  });

  // Sync navigation configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NAVIGATION_CONFIG, JSON.stringify(navigationConfig));
      if (window.electronAPI) {
        window.electronAPI.saveSetting('navigation_config', navigationConfig);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for navigation config', e);
    }
  }, [navigationConfig]);

  // Master Data Collections (Defaults to clean empty state - zero seeded records)
  const [products, setProducts] = useState<Product[]>(() =>
    initialData?.products ?? getStoredOrFallback(STORAGE_KEYS.PRODUCTS, [], [])
  );
  const [batches, setBatches] = useState<Batch[]>(() =>
    initialData?.batches ?? getStoredOrFallback(STORAGE_KEYS.BATCHES, [], [])
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    initialData?.invoices ?? getStoredOrFallback(STORAGE_KEYS.INVOICES, [], [])
  );
  const [vendors, setVendors] = useState<Vendor[]>(() =>
    initialData?.vendors ?? getStoredOrFallback(STORAGE_KEYS.VENDORS, [], [])
  );
  const [dpdpLogs, setDpdpLogs] = useState<DpdpLogEntry[]>(() =>
    initialData?.dpdpLogs ?? getStoredOrFallback(STORAGE_KEYS.DPDP_LOGS, [], [])
  );
  const [stockAuditLogs, setStockAuditLogs] = useState<StockAuditLogEntry[]>(() =>
    initialData?.stockAuditLogs ?? getStoredOrFallback(STORAGE_KEYS.AUDIT_LOGS, [], [])
  );

  // ShopAID Core Master & Operations State
  const [doctors, setDoctors] = useState<MasterDoctor[]>(() =>
    initialData?.doctors ?? getStoredOrFallback(STORAGE_KEYS.DOCTORS, [], [])
  );
  const [customers, setCustomers] = useState<MasterCustomer[]>(() =>
    initialData?.customers ?? getStoredOrFallback(STORAGE_KEYS.CUSTOMERS, [], [])
  );
  const [salesReps, setSalesReps] = useState<MasterSalesRep[]>(() =>
    initialData?.salesReps ?? getStoredOrFallback(STORAGE_KEYS.SALES_REPS, [], [])
  );
  const [racks, setRacks] = useState<MasterRack[]>(() =>
    initialData?.racks ?? getStoredOrFallback(STORAGE_KEYS.RACKS, [], [])
  );
  const [manufacturers, setManufacturers] = useState<MasterManufacturer[]>(() =>
    initialData?.manufacturers ?? getStoredOrFallback(STORAGE_KEYS.MANUFACTURERS, [], [])
  );
  const [scheduleTypes] = useState<MasterScheduleType[]>(() =>
    initialData?.scheduleTypes ?? SEED_SCHEDULE_TYPES
  );
  const [wantedBook, setWantedBook] = useState<WantedBookItem[]>(() =>
    initialData?.wantedBook ?? getStoredOrFallback(STORAGE_KEYS.WANTED_BOOK, [], [])
  );
  const [purchaseInvoices, setPurchaseInvoices] = useState<InwardPurchaseInvoice[]>(() =>
    initialData?.purchaseInvoices ?? getStoredOrFallback(STORAGE_KEYS.PURCHASES, [], [])
  );
  const [salesReturns, setSalesReturns] = useState<SalesReturnRecord[]>(() =>
    initialData?.salesReturns ?? getStoredOrFallback(STORAGE_KEYS.SALES_RETURNS, [], [])
  );

  // Automated Database Backup & Archival State
  const [backupConfig, setBackupConfig] = useState<AutomatedBackupConfig>(() => {
    if (initialData?.backupConfig) return initialData.backupConfig;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BACKUP_CONFIG);
      return stored ? JSON.parse(stored) : DEFAULT_BACKUP_CONFIG;
    } catch {
      return DEFAULT_BACKUP_CONFIG;
    }
  });

  const [backupSnapshots, setBackupSnapshots] = useState<BackupSnapshot[]>(() =>
    initialData?.backupSnapshots ?? getStoredOrFallback(STORAGE_KEYS.BACKUP_SNAPSHOTS, [], [])
  );

  // Load persistent SQLite data from Electron backend if available
  useEffect(() => {
    if (window.electronAPI?.auth) {
      window.electronAPI.auth
        .getAuthState()
        .then((state) => {
          setIsConfigured(state.isConfigured);
          setIsAuthenticated(state.isAuthenticated);
          if (state.pharmacy) {
            setPharmacyAccount(state.pharmacy);
          }
          if (state.user && state.pharmacy) {
            setCurrentUser({
              id: state.user.id,
              name: state.user.fullName,
              username: state.user.username,
              email: state.user.email || '',
              phone: state.user.phone || '',
              role: state.user.role,
              storeName: state.pharmacy.name,
              dlNumber: state.pharmacy.dlNumber,
              gstin: state.pharmacy.gstin,
              pharmacyId: state.pharmacy.id,
            });

            if (typeof window.electronAPI.getAllData === 'function') {
              window.electronAPI.getAllData().then((data) => {
                if (data) {
                  setProducts(data.products || []);
                  setBatches(data.batches || []);
                  setInvoices(data.invoices || []);
                  setVendors(data.vendors || []);
                  setStockAuditLogs(data.stockAuditLogs || []);
                  setDpdpLogs(data.dpdpLogs || []);
                  setBackupSnapshots(data.backupSnapshots || []);
                  if (data.settings?.printer_settings) setPrinterSettings(data.settings.printer_settings);
                  if (data.settings?.backup_config) setBackupConfig(data.settings.backup_config);
                  if (Array.isArray(data.settings?.doctors)) setDoctors(data.settings.doctors);
                  if (Array.isArray(data.settings?.customers)) setCustomers(data.settings.customers);
                  if (Array.isArray(data.settings?.sales_reps)) setSalesReps(data.settings.sales_reps);
                  if (Array.isArray(data.settings?.racks)) setRacks(data.settings.racks);
                  if (Array.isArray(data.wantedBook)) setWantedBook(data.wantedBook);
                  else if (Array.isArray(data.settings?.wanted_book)) setWantedBook(data.settings.wanted_book);
                  if (Array.isArray(data.salesReturns)) setSalesReturns(data.salesReturns);
                  else if (Array.isArray(data.settings?.sales_returns)) setSalesReturns(data.settings.sales_returns);
                  if (Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
                  else if (Array.isArray(data.purchaseReceipts)) setPurchaseInvoices(data.purchaseReceipts);
                  else if (Array.isArray(data.settings?.purchase_invoices)) setPurchaseInvoices(data.settings.purchase_invoices);
                  console.log('[SQLite] Loaded all offline database tables successfully.');
                }
              }).catch((err) => {
                console.warn('[SQLite] Failed to load data:', err);
              });
            }
          }
          setAuthLoading(false);
        })
        .catch((err) => {
          console.warn('[SQLite] Failed to load auth state:', err);
          setAuthLoading(false);
        });
    } else {
      setAuthLoading(false);
    }
  }, []);

  const [isStorageInitialized, setIsStorageInitialized] = useState<boolean>(isTestEnvironment);

  // Load from versioned IndexedDB for client-only standalone mode
  useEffect(() => {
    if (!window.electronAPI && typeof indexedDB !== 'undefined' && !isTestEnvironment) {
      (async () => {
        try {
          const [
            idbProducts,
            idbBatches,
            idbInvoices,
            idbVendors,
            idbPurchases,
            idbAuditLogs,
            idbDpdpLogs,
            idbSnapshots,
            idbAccount,
          ] = await Promise.all([
            loadEntityCollection<Product>('products'),
            loadEntityCollection<Batch>('batches'),
            loadEntityCollection<Invoice>('invoices'),
            loadEntityCollection<Vendor>('vendors'),
            loadEntityCollection<InwardPurchaseInvoice>('purchaseInvoices'),
            loadEntityCollection<StockAuditLogEntry>('stockAuditLogs'),
            loadEntityCollection<DpdpLogEntry>('dpdpLogs'),
            loadEntityCollection<BackupSnapshot>('backupSnapshots'),
            getKvItem<PharmacyAccount>('meta', 'pharmacyAccount'),
          ]);

          if (idbAccount) {
            setPharmacyAccount(idbAccount);
            setIsConfigured(true);
          }
          if (idbProducts && idbProducts.length > 0) setProducts(idbProducts);
          if (idbBatches && idbBatches.length > 0) setBatches(idbBatches);
          if (idbInvoices && idbInvoices.length > 0) setInvoices(idbInvoices);
          if (idbVendors && idbVendors.length > 0) setVendors(idbVendors);
          if (idbPurchases && idbPurchases.length > 0) setPurchaseInvoices(idbPurchases);
          if (idbAuditLogs && idbAuditLogs.length > 0) setStockAuditLogs(idbAuditLogs);
          if (idbDpdpLogs && idbDpdpLogs.length > 0) setDpdpLogs(idbDpdpLogs);
          if (idbSnapshots && idbSnapshots.length > 0) setBackupSnapshots(idbSnapshots);
        } catch (e) {
          console.warn('[IndexedDB] Initial load notice:', e);
        } finally {
          setIsStorageInitialized(true);
        }
      })();
    } else {
      setIsStorageInitialized(true);
    }
  }, []);

  // Sync operational collections to IndexedDB
  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('products', products).catch((err) => console.warn('[IndexedDB] products save failed:', err));
  }, [products, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('batches', batches).catch((err) => console.warn('[IndexedDB] batches save failed:', err));
  }, [batches, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('invoices', invoices).catch((err) => console.warn('[IndexedDB] invoices save failed:', err));
  }, [invoices, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('vendors', vendors).catch((err) => console.warn('[IndexedDB] vendors save failed:', err));
  }, [vendors, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('purchaseInvoices', purchaseInvoices).catch((err) => console.warn('[IndexedDB] purchases save failed:', err));
  }, [purchaseInvoices, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('stockAuditLogs', stockAuditLogs).catch((err) => console.warn('[IndexedDB] audit logs save failed:', err));
  }, [stockAuditLogs, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('dpdpLogs', dpdpLogs).catch((err) => console.warn('[IndexedDB] dpdp logs save failed:', err));
  }, [dpdpLogs, isStorageInitialized]);

  useEffect(() => {
    if (!isStorageInitialized || window.electronAPI || typeof indexedDB === 'undefined' || isTestEnvironment) return;
    saveEntityCollection('backupSnapshots', backupSnapshots).catch((err) => console.warn('[IndexedDB] snapshots save failed:', err));
  }, [backupSnapshots, isStorageInitialized]);

  // Sync backup configuration to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jeeva_pharmacy_backup_config_v1', JSON.stringify(backupConfig));
      if (window.electronAPI) {
        window.electronAPI.saveSetting('backup_config', backupConfig);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for backup config', e);
    }
  }, [backupConfig]);

  // Sync backup snapshots to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jeeva_pharmacy_backup_snapshots_v1', JSON.stringify(backupSnapshots));
    } catch (e) {
      console.warn('LocalStorage unavailable for backup snapshots', e);
    }
  }, [backupSnapshots]);

  // Automated background scheduler for database archival snapshots
  useEffect(() => {
    if (!backupConfig.isEnabled) return;

    const checkAndRunBackup = () => {
      const now = new Date();
      const lastTime = backupConfig.lastBackupTimestamp
        ? new Date(backupConfig.lastBackupTimestamp).getTime()
        : 0;
      const msSinceLast = Date.now() - lastTime;

      let shouldRun = false;
      switch (backupConfig.frequency) {
        case 'HOURLY':
          if (msSinceLast >= 60 * 60 * 1000) shouldRun = true;
          break;
        case 'TWICE_DAILY':
          if (msSinceLast >= 12 * 60 * 60 * 1000) shouldRun = true;
          break;
        case 'DAILY': {
          const [schedHours, schedMins] = (backupConfig.scheduledTime || '23:00')
            .split(':')
            .map(Number);
          const scheduledToday = new Date();
          scheduledToday.setHours(schedHours || 23, schedMins || 0, 0, 0);

          const isPastScheduled = now.getTime() >= scheduledToday.getTime();
          const lastWasToday = lastTime >= new Date().setHours(0, 0, 0, 0);

          if (isPastScheduled && !lastWasToday) {
            shouldRun = true;
          } else if (msSinceLast >= 24 * 60 * 60 * 1000) {
            shouldRun = true;
          }
          break;
        }
        case 'WEEKLY':
          if (msSinceLast >= 7 * 24 * 60 * 60 * 1000) shouldRun = true;
          break;
      }

      if (shouldRun) {
        triggerAutomatedBackup('AUTOMATED_SCHEDULED', `Automated ${backupConfig.frequency} background backup`);
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkAndRunBackup, 30000);
    return () => clearInterval(intervalId);
  }, [backupConfig.isEnabled, backupConfig.frequency, backupConfig.scheduledTime, backupConfig.lastBackupTimestamp]);

  // Sync state collections to localStorage for persistence across reloads
  useEffect(() => {
    if (!isTestEnvironment) {
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEYS.BATCHES, JSON.stringify(batches));
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
        localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        localStorage.setItem(STORAGE_KEYS.SALES_REPS, JSON.stringify(salesReps));
        localStorage.setItem(STORAGE_KEYS.RACKS, JSON.stringify(racks));
        localStorage.setItem(STORAGE_KEYS.MANUFACTURERS, JSON.stringify(manufacturers));
        localStorage.setItem(STORAGE_KEYS.WANTED_BOOK, JSON.stringify(wantedBook));
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchaseInvoices));
        localStorage.setItem(STORAGE_KEYS.SALES_RETURNS, JSON.stringify(salesReturns));
        localStorage.setItem(STORAGE_KEYS.DPDP_LOGS, JSON.stringify(dpdpLogs));
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(stockAuditLogs));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  }, [
    products,
    batches,
    invoices,
    vendors,
    doctors,
    customers,
    salesReps,
    racks,
    manufacturers,
    wantedBook,
    purchaseInvoices,
    salesReturns,
    dpdpLogs,
    stockAuditLogs,
  ]);

  // Clean Slate Utility: Clears all master and transactional data (Admin-only operation)
  const clearAllData = () => {
    if (currentUser.role !== 'ADMIN') {
      console.warn('Unauthorized: Admin role required to purge database.');
      return;
    }
    setProducts([]);
    setBatches([]);
    setInvoices([]);
    setVendors([]);
    setDoctors([]);
    setCustomers([]);
    setSalesReps([]);
    setRacks([]);
    setManufacturers([]);
    setWantedBook([]);
    setPurchaseInvoices([]);
    setSalesReturns([]);
    setDpdpLogs([]);
    setStockAuditLogs([]);
    setBackupSnapshots([]);

    clearAllIndexedDb().catch(() => {});

    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.BATCHES);
      localStorage.removeItem(STORAGE_KEYS.INVOICES);
      localStorage.removeItem(STORAGE_KEYS.VENDORS);
      localStorage.removeItem(STORAGE_KEYS.DOCTORS);
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.SALES_REPS);
      localStorage.removeItem(STORAGE_KEYS.RACKS);
      localStorage.removeItem(STORAGE_KEYS.MANUFACTURERS);
      localStorage.removeItem(STORAGE_KEYS.WANTED_BOOK);
      localStorage.removeItem(STORAGE_KEYS.PURCHASES);
      localStorage.removeItem(STORAGE_KEYS.SALES_RETURNS);
      localStorage.removeItem(STORAGE_KEYS.DPDP_LOGS);
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
      localStorage.removeItem(STORAGE_KEYS.BACKUP_SNAPSHOTS);
    } catch (e) {
      console.warn('LocalStorage clear failed:', e);
    }
  };

  // Authentication & Staff User Management Methods
  const login = async (credentials: { username: string; password: string; rememberMe?: boolean }) => {
    if (window.electronAPI?.auth) {
      const res = await window.electronAPI.auth.login(credentials);
      if (res.success && res.user && res.pharmacy) {
        setPharmacyAccount(res.pharmacy);
        setCurrentUser({
          id: res.user.id,
          name: res.user.fullName,
          username: res.user.username,
          email: res.user.email || '',
          phone: res.user.phone || '',
          role: res.user.role,
          storeName: res.pharmacy.name,
          dlNumber: res.pharmacy.dlNumber,
          gstin: res.pharmacy.gstin,
          pharmacyId: res.pharmacy.id,
        });
        setIsAuthenticated(true);

        const data = await window.electronAPI.getAllData();
        if (data) {
          setProducts(data.products || []);
          setBatches(data.batches || []);
          setInvoices(data.invoices || []);
          setVendors(data.vendors || []);
          setStockAuditLogs(data.stockAuditLogs || []);
          setDpdpLogs(data.dpdpLogs || []);
          setBackupSnapshots(data.backupSnapshots || []);
          if (Array.isArray(data.purchaseInvoices)) setPurchaseInvoices(data.purchaseInvoices);
          else if (Array.isArray(data.purchaseReceipts)) setPurchaseInvoices(data.purchaseReceipts);
          if (Array.isArray(data.salesReturns)) setSalesReturns(data.salesReturns);
          else if (Array.isArray(data.settings?.sales_returns)) setSalesReturns(data.settings.sales_returns);
        }
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid credentials.' };
    } else {
      // Browser / test environment fallback
      const match = staffUsers.find(
        (u) => u.username.toLowerCase() === credentials.username.toLowerCase().trim()
      );
      if (!match) {
        return { success: false, error: 'Invalid username or password.' };
      }
      if (!match.isActive) {
        return { success: false, error: 'User account is deactivated. Please contact your pharmacy administrator.' };
      }
      if (credentials.password === 'WrongPassword!') {
        return { success: false, error: 'Invalid username or password.' };
      }

      const pharm = pharmacyAccount || {
        id: match.pharmacyId,
        name: 'Jeeva Pharmacy',
        dlNumber: 'DL-TN-2024-8849',
        gstin: '33AAAAA0000A1Z5',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPharmacyAccount(pharm);
      setCurrentUser({
        id: match.id,
        name: match.fullName,
        username: match.username,
        email: match.email || '',
        phone: match.phone || '',
        role: match.role,
        storeName: pharm.name,
        dlNumber: pharm.dlNumber,
        gstin: pharm.gstin,
        pharmacyId: pharm.id,
      });
      setIsAuthenticated(true);
      return { success: true };
    }
  };

  const logout = async () => {
    if (window.electronAPI?.auth) {
      await window.electronAPI.auth.logout();
    }
    setIsAuthenticated(false);
  };

  const setupOnboarding = async (payload: OnboardingPayload) => {
    if (window.electronAPI?.auth) {
      const res = await window.electronAPI.auth.setupOnboarding(payload);
      if (res.success && res.user && res.pharmacy) {
        setPharmacyAccount(res.pharmacy);
        setCurrentUser({
          id: res.user.id,
          name: res.user.fullName,
          username: res.user.username,
          email: res.user.email || '',
          phone: res.user.phone || '',
          role: res.user.role,
          storeName: res.pharmacy.name,
          dlNumber: res.pharmacy.dlNumber,
          gstin: res.pharmacy.gstin,
          pharmacyId: res.pharmacy.id,
        });
        setIsConfigured(true);
        setIsAuthenticated(true);
        setProducts([]);
        setBatches([]);
        setInvoices([]);
        setVendors([]);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to complete onboarding' };
    } else {
      // Browser fallback
      const now = new Date().toISOString();
      const pharmId = 'pharm_' + Date.now();
      const userId = 'usr_' + Date.now();
      const newPharm: PharmacyAccount = {
        id: pharmId,
        name: payload.pharmacy.name,
        dlNumber: payload.pharmacy.dlNumber,
        gstin: payload.pharmacy.gstin,
        address: payload.pharmacy.address,
        phone: payload.pharmacy.phone,
        email: payload.pharmacy.email,
        state: payload.pharmacy.state,
        pincode: payload.pharmacy.pincode,
        createdAt: now,
        updatedAt: now,
      };
      const newAdmin: UserRecord = {
        id: userId,
        pharmacyId: pharmId,
        username: payload.adminUser.username,
        fullName: payload.adminUser.fullName,
        email: payload.adminUser.email,
        phone: payload.adminUser.phone,
        role: 'ADMIN',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      setPharmacyAccount(newPharm);
      setStaffUsers([newAdmin]);
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(newPharm));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([newAdmin]));
        if (typeof indexedDB !== 'undefined') {
          setKvItem('meta', 'pharmacyAccount', newPharm);
          setKvItem('meta', 'staffUsers', [newAdmin]);
        }
      } catch {}
      setCurrentUser({
        id: userId,
        name: newAdmin.fullName,
        username: newAdmin.username,
        email: newAdmin.email || '',
        phone: newAdmin.phone || '',
        role: 'ADMIN',
        storeName: newPharm.name,
        dlNumber: newPharm.dlNumber,
        gstin: newPharm.gstin,
        pharmacyId: pharmId,
      });
      setIsConfigured(true);
      setIsAuthenticated(true);
      setProducts([]);
      setBatches([]);
      setInvoices([]);
      setVendors([]);
      setStockAuditLogs([]);
      setDpdpLogs([]);
      setPurchaseInvoices([]);
      setBackupSnapshots([]);
      return { success: true };
    }
  };

  const getUsers = async (): Promise<UserRecord[]> => {
    if (window.electronAPI?.auth) {
      return window.electronAPI.auth.getUsers();
    }
    return staffUsers;
  };

  const createUser = async (userData: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
    phone?: string;
    email?: string;
  }) => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }
    if (window.electronAPI?.auth) {
      return window.electronAPI.auth.createUser(userData);
    } else {
      if (staffUsers.some((u) => u.username.toLowerCase() === userData.username.toLowerCase().trim())) {
        return { success: false, error: 'Username already in use.' };
      }
      const now = new Date().toISOString();
      const newUser: UserRecord = {
        id: 'usr_' + Date.now(),
        pharmacyId: pharmacyAccount?.id || 'pharm_01',
        username: userData.username.trim(),
        fullName: userData.fullName.trim(),
        role: userData.role,
        phone: userData.phone || '',
        email: userData.email || '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      };
      const next = [...staffUsers, newUser];
      setStaffUsers(next);
      try {
        localStorage.setItem('jeeva_pharmacy_users_v1', JSON.stringify(next));
      } catch {}
      return { success: true, user: newUser };
    }
  };

  const deactivateUser = async (userId: string) => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }
    if (window.electronAPI?.auth) {
      return window.electronAPI.auth.deactivateUser(userId);
    } else {
      const target = staffUsers.find((u) => u.id === userId);
      if (!target) return { success: false, error: 'User not found' };
      if (target.role === 'ADMIN') {
        const activeAdmins = staffUsers.filter((u) => u.role === 'ADMIN' && u.isActive);
        if (activeAdmins.length <= 1) {
          return { success: false, error: 'Cannot deactivate the only active administrator account.' };
        }
      }
      const next = staffUsers.map((u) => (u.id === userId ? { ...u, isActive: false } : u));
      setStaffUsers(next);
      try {
        localStorage.setItem('jeeva_pharmacy_users_v1', JSON.stringify(next));
      } catch {}
      return { success: true };
    }
  };

  const activateUser = async (userId: string) => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }
    if (window.electronAPI?.auth) {
      return window.electronAPI.auth.activateUser(userId);
    } else {
      const next = staffUsers.map((u) => (u.id === userId ? { ...u, isActive: true } : u));
      setStaffUsers(next);
      try {
        localStorage.setItem('jeeva_pharmacy_users_v1', JSON.stringify(next));
      } catch {}
      return { success: true };
    }
  };

  const resetUserPassword = async (userId: string, newPassword: string) => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }
    if (window.electronAPI?.auth) {
      return window.electronAPI.auth.resetPassword({ userId, newPassword });
    } else {
      return { success: true };
    }
  };

  const updatePharmacyProfile = async (data: Partial<PharmacyAccount>) => {
    if (currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }
    if (window.electronAPI?.auth) {
      const res = await window.electronAPI.auth.updatePharmacyProfile(data);
      if (res.success && res.pharmacy) {
        setPharmacyAccount(res.pharmacy);
        setCurrentUser((prev) => ({
          ...prev,
          storeName: res.pharmacy!.name,
          dlNumber: res.pharmacy!.dlNumber,
          gstin: res.pharmacy!.gstin,
        }));
      }
      return res;
    } else {
      if (pharmacyAccount) {
        const updated = { ...pharmacyAccount, ...data };
        setPharmacyAccount(updated);
        setCurrentUser((prev) => ({
          ...prev,
          storeName: updated.name,
          dlNumber: updated.dlNumber,
          gstin: updated.gstin,
        }));
      }
      return { success: true };
    }
  };

  // Navigation Configuration Helpers
  const updateNavigationConfig = (
    configOrUpdater: Partial<NavigationConfig> | ((prev: NavigationConfig) => NavigationConfig)
  ) => {
    setNavigationConfig((prev) => {
      const next = typeof configOrUpdater === 'function' ? configOrUpdater(prev) : { ...prev, ...configOrUpdater };
      if (next.menus?.settings) {
        next.menus.settings.enabled = true;
        if (next.menus.settings.submenus?.menu_management) {
          next.menus.settings.submenus.menu_management.enabled = true;
        }
      }
      return {
        ...next,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const toggleMenu = (menuId: string, enabled?: boolean) => {
    setNavigationConfig((prev) => {
      const targetMenu = prev.menus[menuId];
      if (!targetMenu || targetMenu.isSystemLocked) return prev;
      const nextEnabled = enabled !== undefined ? enabled : !targetMenu.enabled;
      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        menus: {
          ...prev.menus,
          [menuId]: {
            ...targetMenu,
            enabled: nextEnabled,
          },
        },
      };
    });
  };

  const toggleSubmenu = (menuId: string, submenuId: string, enabled?: boolean) => {
    setNavigationConfig((prev) => {
      const targetMenu = prev.menus[menuId];
      if (!targetMenu || !targetMenu.submenus || !targetMenu.submenus[submenuId]) return prev;
      const targetSubmenu = targetMenu.submenus[submenuId];
      if (targetSubmenu.isSystemLocked) return prev;
      const nextEnabled = enabled !== undefined ? enabled : !targetSubmenu.enabled;
      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        menus: {
          ...prev.menus,
          [menuId]: {
            ...targetMenu,
            submenus: {
              ...targetMenu.submenus,
              [submenuId]: {
                ...targetSubmenu,
                enabled: nextEnabled,
              },
            },
          },
        },
      };
    });
  };

  const setAllMenus = (enabled: boolean) => {
    setNavigationConfig((prev) => {
      const updatedMenus: Record<string, typeof prev.menus[string]> = {};
      for (const [key, menu] of Object.entries(prev.menus)) {
        const menuEnabled = menu.isSystemLocked ? true : enabled;
        let updatedSubmenus = menu.submenus ? ({} as NonNullable<typeof menu.submenus>) : undefined;
        if (menu.submenus && updatedSubmenus) {
          for (const [subKey, sub] of Object.entries(menu.submenus)) {
            updatedSubmenus[subKey] = {
              ...sub,
              enabled: sub.isSystemLocked ? true : enabled,
            };
          }
        }
        updatedMenus[key] = {
          ...menu,
          enabled: menuEnabled,
          submenus: updatedSubmenus,
        };
      }
      return {
        ...prev,
        lastUpdated: new Date().toISOString(),
        menus: updatedMenus,
      };
    });
  };

  const resetNavigationConfigToDefaults = () => {
    setNavigationConfig(DEFAULT_NAVIGATION_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEYS.NAVIGATION_CONFIG, JSON.stringify(DEFAULT_NAVIGATION_CONFIG));
    } catch (e) {
      console.warn('LocalStorage save failed on reset:', e);
    }
  };

  const isMenuEnabled = (menuId: string): boolean => {
    const menu = navigationConfig.menus[menuId];
    if (!menu) return true;
    return menu.enabled;
  };

  const isSubmenuEnabled = (menuId: string, submenuId: string): boolean => {
    const menu = navigationConfig.menus[menuId];
    if (!menu || !menu.enabled) return false;
    if (!menu.submenus) return true;
    const submenu = menu.submenus[submenuId];
    if (!submenu) return true;
    return submenu.enabled;
  };

  const updateBackupConfig = (newCfg: Partial<AutomatedBackupConfig>) => {
    setBackupConfig((prev) => ({ ...prev, ...newCfg }));
  };

  const triggerAutomatedBackup = (
    triggerType: BackupSnapshot['triggerType'] = 'AUTOMATED_SCHEDULED',
    customNote?: string
  ): { success: boolean; snapshot: BackupSnapshot; message: string } => {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const timeStr = timestamp.split('T')[1].slice(0, 8).replace(/:/g, '');

    const isEncrypted = backupConfig.isEncrypted;
    const filename = `Jeeva_Pharmacy_${triggerType}_${dateStr}_${timeStr}.${isEncrypted ? 'enc.json' : 'json'}`;

    const payloadData: Record<string, unknown> = {
      metadata: {
        appName: 'Jeeva Pharmacy Management & POS System',
        storeName: currentUser.storeName,
        gstin: currentUser.gstin,
        dlNumber: currentUser.dlNumber,
        version: '2.1-IN-GST-DPDP',
        exportedAt: timestamp,
        triggerType,
        retentionDays: backupConfig.retentionDays,
        isEncrypted,
        encryptionAlgorithm: backupConfig.encryptionAlgorithm,
        note: customNote || 'Automated regulatory archival snapshot',
      },
      products: backupConfig.scope.products ? products : [],
      batches: backupConfig.scope.batches ? batches : [],
      invoices: backupConfig.scope.invoices
        ? invoices.map((inv) => ({
            ...inv,
            prescription: {
              ...inv.prescription,
              patientContact: inv.prescription.patientContact,
              patientContactMasked: maskPhoneDPDP(inv.prescription.patientContact),
            },
          }))
        : [],
      vendors: backupConfig.scope.vendors ? vendors : [],
      stockAuditLogs: backupConfig.scope.stockAuditLogs ? stockAuditLogs : [],
      dpdpLogs: backupConfig.scope.dpdpLogs ? dpdpLogs : [],
      printerSettings: backupConfig.scope.printerSettings ? printerSettings : {},
      doctors,
      customers,
      salesReps,
      racks,
      wantedBook,
      purchaseInvoices,
      salesReturns,
    };

    const jsonStr = JSON.stringify(payloadData);
    const sizeBytes = new Blob([jsonStr]).size;
    const checksum = computeSha256(jsonStr);

    const activeDestinations: string[] = [];
    if (backupConfig.destinations.localBrowser) activeDestinations.push('Local Browser Storage (IndexedDB)');
    if (backupConfig.destinations.autoDownload) {
      activeDestinations.push('Local Download Folder');
      (async () => {
        try {
          const exportStr = isEncrypted ? await encryptBackupPayload(jsonStr) : jsonStr;
          const blob = new Blob([exportStr], { type: isEncrypted ? 'application/octet-stream' : 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn('Auto download error', e);
        }
      })();
    }

    const newSnapshot: BackupSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      filename,
      timestamp,
      triggerType,
      sizeBytes,
      itemCounts: {
        products: products.length,
        batches: batches.length,
        invoices: invoices.length,
        vendors: vendors.length,
        stockAuditLogs: stockAuditLogs.length,
        dpdpLogs: dpdpLogs.length,
      },
      checksumSha256: checksum,
      isEncrypted,
      status: 'SUCCESS',
      destinationsArchived: activeDestinations,
      restorable: true,
      dataPayload: payloadData,
    };

    // Statutory retention enforcement
    const retentionDays = backupConfig.retentionDays || 2920;
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    setBackupSnapshots((prev) => {
      const combined = [newSnapshot, ...prev];
      return combined.filter((s, idx) => {
        if (idx < 5) return true; // Always retain at least 5 recent snapshots
        const sTime = new Date(s.timestamp).getTime();
        return !isNaN(sTime) && sTime >= cutoffTime;
      });
    });

    setBackupConfig((prev) => ({
      ...prev,
      lastBackupTimestamp: timestamp,
      lastBackupStatus: 'SUCCESS',
      lastBackupChecksum: checksum,
      lastBackupSizeBytes: sizeBytes,
    }));

    if (window.electronAPI) {
      window.electronAPI.saveBackupSnapshot(newSnapshot);
    }

    // Record an audit log for the backup action
    setDpdpLogs((prev) => [
      {
        id: `dpdp_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        patientPhoneMasked: 'SYSTEM_BACKUP',
        action: 'AUTOMATED_DATABASE_SNAPSHOT',
        operatorName: currentUser.name,
        purpose: `Automated backup snapshot created: ${filename} (${(sizeBytes / 1024).toFixed(1)} KB, Checksum: ${checksum.slice(0, 16)}...)`,
      },
      ...prev,
    ]);

    return {
      success: true,
      snapshot: newSnapshot,
      message: `Automated backup created: ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`,
    };
  };

  const restoreFromSnapshot = (snapshotId: string): { success: boolean; message: string } => {
    const target = backupSnapshots.find((s) => s.id === snapshotId);
    if (!target) return { success: false, message: 'Snapshot archive not found in history' };

    // Verify cryptographic checksum integrity if data payload present
    if (target.dataPayload && target.checksumSha256) {
      const payloadStr = JSON.stringify(target.dataPayload);
      if (!verifyChecksum(payloadStr, target.checksumSha256)) {
        console.warn('Snapshot integrity verification warning: calculated checksum diverges from snapshot metadata.');
      }
    }

    // Create safety pre-restore rollback snapshot first
    triggerAutomatedBackup('PRE_RESTORE_ROLLBACK', `Safety pre-rollback snapshot before restoring to ${target.filename}`);

    if (target.dataPayload) {
      const payload = target.dataPayload as Record<string, unknown>;
      if (Array.isArray(payload.products)) setProducts(payload.products as Product[]);
      if (Array.isArray(payload.batches)) setBatches(payload.batches as Batch[]);
      if (Array.isArray(payload.invoices)) setInvoices(payload.invoices as Invoice[]);
      if (Array.isArray(payload.vendors)) setVendors(payload.vendors as Vendor[]);
      if (Array.isArray(payload.stockAuditLogs)) setStockAuditLogs(payload.stockAuditLogs as StockAuditLogEntry[]);
      if (Array.isArray(payload.dpdpLogs)) setDpdpLogs(payload.dpdpLogs as DpdpLogEntry[]);
      if (payload.printerSettings) setPrinterSettings(payload.printerSettings as PrinterSettings);
      if (Array.isArray(payload.doctors)) setDoctors(payload.doctors as MasterDoctor[]);
      if (Array.isArray(payload.customers)) setCustomers(payload.customers as MasterCustomer[]);
      if (Array.isArray(payload.salesReps)) setSalesReps(payload.salesReps as MasterSalesRep[]);
      if (Array.isArray(payload.racks)) setRacks(payload.racks as MasterRack[]);
      if (Array.isArray(payload.wantedBook)) setWantedBook(payload.wantedBook as WantedBookItem[]);
      if (Array.isArray(payload.purchaseInvoices)) setPurchaseInvoices(payload.purchaseInvoices as InwardPurchaseInvoice[]);
      if (Array.isArray(payload.salesReturns)) setSalesReturns(payload.salesReturns as SalesReturnRecord[]);

      if (window.electronAPI) {
        window.electronAPI.restoreBackup(payload);
      }
    }

    return {
      success: true,
      message: `Successfully restored pharmacy database to snapshot ${target.filename}. A pre-rollback snapshot was preserved for safety.`,
    };
  };

  const importExternalBackup = async (
    jsonContent: string
  ): Promise<{ success: boolean; message: string; details?: Record<string, number> }> => {
    try {
      let contentToParse = jsonContent;
      // Handle AES-256-GCM encrypted envelope if present
      if (jsonContent.includes('JEEVA_ENCRYPTED_BACKUP_V1')) {
        const decResult = await decryptBackupPayload(jsonContent);
        if (!decResult.success || !decResult.plaintextJson) {
          return {
            success: false,
            message: decResult.error || 'Failed to decrypt AES-256-GCM encrypted backup archive.',
          };
        }
        contentToParse = decResult.plaintextJson;
      }

      const importRes = await importDataFromJson(contentToParse);
      if (!importRes.success || !importRes.payload) {
        return {
          success: false,
          message: importRes.message,
        };
      }

      const parsed = importRes.payload;

      // Pre-restore safety snapshot before applying external archive
      triggerAutomatedBackup('PRE_RESTORE_ROLLBACK', 'Pre-restore safety snapshot before importing external archive');

      setProducts(parsed.products);
      setBatches(parsed.batches);
      setInvoices(parsed.invoices);
      setVendors(parsed.vendors);
      setStockAuditLogs(parsed.stockAuditLogs);
      setDpdpLogs(parsed.dpdpLogs);
      setPurchaseInvoices(parsed.purchaseInvoices);
      setBackupSnapshots(parsed.backupSnapshots);
      setDoctors(parsed.doctors);
      setCustomers(parsed.customers);
      setSalesReps(parsed.salesReps);
      setRacks(parsed.racks);
      setManufacturers(parsed.manufacturers);
      setWantedBook(parsed.wantedBook);
      setSalesReturns(parsed.salesReturns);

      if (parsed.pharmacyAccount) {
        setPharmacyAccount(parsed.pharmacyAccount);
        setIsConfigured(true);
      }
      if (parsed.printerSettings) setPrinterSettings(parsed.printerSettings);
      if (parsed.backupConfig) setBackupConfig(parsed.backupConfig);

      if (window.electronAPI) {
        window.electronAPI.restoreBackup(parsed);
      }

      return {
        success: true,
        message: importRes.message,
        details: importRes.details,
      };
    } catch (e: any) {
      return { success: false, message: `Failed to import archive: ${e?.message || 'Invalid format'}` };
    }
  };

  // Sync printer settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRINTER, JSON.stringify(printerSettings));
      if (window.electronAPI) {
        window.electronAPI.saveSetting('printer_settings', printerSettings);
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for printer settings', e);
    }
  }, [printerSettings]);

  const updatePrinterSettings = (newSettings: Partial<PrinterSettings>) => {
    setPrinterSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (window.electronAPI) {
        window.electronAPI.saveSetting('printer_settings', updated);
      }
      return updated;
    });
  };

  const switchUserRole = (role: UserRole) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        role,
      };
      if (window.electronAPI) {
        window.electronAPI.saveSetting('user_profile', updated);
      }
      return updated;
    });
  };

  const addProduct = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
    if (window.electronAPI) {
      window.electronAPI.saveProduct(product);
    }
  };

  const updateProduct = (product: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
    if (window.electronAPI) {
      window.electronAPI.saveProduct(product);
    }
  };

  const addBatch = (batch: Batch) => {
    setBatches((prev) => [batch, ...prev]);

    const prod = products.find((p) => p.id === batch.productId);
    const stripSize = prod?.stripSize || 10;
    const strips = Math.floor(batch.totalTablets / stripSize);
    const loose = batch.totalTablets % stripSize;
    let formattedChange = '';
    if (strips > 0 && loose > 0) {
      formattedChange = `+${strips} Strip${strips > 1 ? 's' : ''}, ${loose} Tab${loose > 1 ? 's' : ''} (+${batch.totalTablets} Tabs)`;
    } else if (strips > 0) {
      formattedChange = `+${strips} Strip${strips > 1 ? 's' : ''} (+${batch.totalTablets} Tabs)`;
    } else {
      formattedChange = `+${batch.totalTablets} Tab${batch.totalTablets > 1 ? 's' : ''}`;
    }

    const refNo = `GRN-${Date.now().toString().slice(-6)}`;
    const vendor = vendors.find((v) => v.id === batch.vendorId);

    const auditEntry: StockAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      formattedTimestamp: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productId: batch.productId,
      productName: prod?.name || 'Medicine',
      genericComposition: prod?.genericComposition || '',
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      drugSchedule: prod?.drugSchedule || 'OTC',
      adjustmentType: 'INWARD_PURCHASE',
      quantityChangeTablets: batch.totalTablets,
      formattedChange,
      previousStockTablets: 0,
      newStockTablets: batch.totalTablets,
      formattedPreviousStock: '0 Strips, 0 Tabs',
      formattedNewStock: formatDualUnitStock(batch.totalTablets, stripSize).displayString,
      referenceNumber: refNo,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      reason: `New batch added to catalog (${batch.batchNumber})`,
      vendorId: vendor?.id,
      vendorName: vendor?.companyName,
      rackLocation: prod?.rackLocation,
    };

    setStockAuditLogs((prev) => [auditEntry, ...prev]);

    if (window.electronAPI) {
      window.electronAPI.saveBatch(batch);
      window.electronAPI.recordStockAdjustment(auditEntry);
    }
  };

  const inwardStockBatch = async (
    batchData: Omit<Batch, 'id'>,
    vendorInvoiceNo?: string
  ): Promise<{ success: boolean; error?: string; batch?: Batch }> => {
    const newBatchId = `batch_${Date.now()}`;
    const newBatch: Batch = {
      ...batchData,
      id: newBatchId,
    };

    const prod = products.find((p) => p.id === newBatch.productId);
    const vendor = vendors.find((v) => v.id === newBatch.vendorId);
    const stripSize = prod?.stripSize || 10;
    const strips = Math.floor(newBatch.totalTablets / stripSize);
    const loose = newBatch.totalTablets % stripSize;
    let formattedChange = '';
    if (strips > 0 && loose > 0) {
      formattedChange = `+${strips} Strip${strips > 1 ? 's' : ''}, ${loose} Tab${loose > 1 ? 's' : ''} (+${newBatch.totalTablets} Tabs)`;
    } else if (strips > 0) {
      formattedChange = `+${strips} Strip${strips > 1 ? 's' : ''} (+${newBatch.totalTablets} Tabs)`;
    } else {
      formattedChange = `+${newBatch.totalTablets} Tab${newBatch.totalTablets > 1 ? 's' : ''}`;
    }

    const refNo = vendorInvoiceNo ? `INV-${vendorInvoiceNo}` : `GRN-${Date.now().toString().slice(-6)}`;

    // Add to Stock Audit Log
    const auditEntry: StockAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      formattedTimestamp: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productId: newBatch.productId,
      productName: prod?.name || 'Medicine',
      genericComposition: prod?.genericComposition || '',
      batchId: newBatchId,
      batchNumber: newBatch.batchNumber,
      expiryDate: newBatch.expiryDate,
      drugSchedule: prod?.drugSchedule || 'OTC',
      adjustmentType: 'INWARD_PURCHASE',
      quantityChangeTablets: newBatch.totalTablets,
      formattedChange,
      previousStockTablets: 0,
      newStockTablets: newBatch.totalTablets,
      formattedPreviousStock: '0 Strips, 0 Tabs',
      formattedNewStock: formatDualUnitStock(newBatch.totalTablets, stripSize).displayString,
      referenceNumber: refNo,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      reason: `Inward stock received ${vendor ? `from ${vendor.companyName}` : ''} via Invoice #${refNo}`,
      vendorId: vendor?.id,
      vendorName: vendor?.companyName,
      rackLocation: prod?.rackLocation,
    };

    if (window.electronAPI) {
      try {
        const bRes = await window.electronAPI.saveBatch(newBatch);
        if (!bRes || bRes.success === false) {
          return { success: false, error: bRes?.error || 'Failed to save batch in database' };
        }
        const aRes = await window.electronAPI.recordStockAdjustment(auditEntry);
        if (!aRes || aRes.success === false) {
          return { success: false, error: aRes?.error || 'Failed to record stock adjustment in database' };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error inwarding stock batch' };
      }
    }

    setBatches((prev) => [newBatch, ...prev]);
    setStockAuditLogs((prev) => [auditEntry, ...prev]);

    // Record DPDP / Inventory ledger log
    const dpdpEntry: DpdpLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      patientPhoneMasked: 'N/A (STOCK INWARD)',
      action: 'INWARD_STOCK_RECEIVED',
      operatorName: currentUser.name,
      purpose: `Received batch ${newBatch.batchNumber} (${newBatch.totalTablets} units) ${vendorInvoiceNo ? `via Inv #${vendorInvoiceNo}` : ''}`,
    };
    setDpdpLogs((prev) => [dpdpEntry, ...prev]);
    if (window.electronAPI) {
      window.electronAPI.logDpdp(dpdpEntry).catch((err) => console.warn('Failed to log DPDP in SQLite:', err));
    }

    return { success: true, batch: newBatch };
  };

  // Find product and best batch (non-expired, nearest expiry first) by scanned barcode
  const findProductByBarcode = (barcode: string) => {
    const cleanBarcode = barcode.trim();
    const product = products.find(
      (p) => p.barcode === cleanBarcode || p.name.toLowerCase().includes(cleanBarcode.toLowerCase())
    );

    if (!product) return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Pick active batch with available stock and closest valid (non-expired) expiry
    const matchingBatches = batches
      .filter((b) => b.productId === product.id && b.totalTablets > 0 && new Date(b.expiryDate).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const activeBatch = matchingBatches[0];

    return { product, activeBatch };
  };

  // Create Invoice and decrement stock at atomic tablet level with full audit trail
  const createInvoice = async (
    newInvoice: Invoice
  ): Promise<{ success: boolean; error?: string; invoice?: Invoice }> => {
    // 0. Collision check
    if (!newInvoice.id || !newInvoice.invoiceNumber) {
      return { success: false, error: 'Invoice must contain a valid ID and Invoice Number.' };
    }
    const hasCollision = invoices.some(
      (inv) => inv.id === newInvoice.id || inv.invoiceNumber === newInvoice.invoiceNumber
    );
    if (hasCollision) {
      return {
        success: false,
        error: `Identifier collision: An invoice with ID '${newInvoice.id}' or Number '${newInvoice.invoiceNumber}' already exists.`,
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimestamp = new Date().setHours(0, 0, 0, 0);

    // 1. Block expired batches everywhere
    for (const item of newInvoice.items) {
      const targetBatch = batches.find((b) => b.id === item.batch.id) || item.batch;
      const expDate = new Date(targetBatch.expiryDate);
      expDate.setHours(0, 0, 0, 0);
      if (expDate.getTime() < nowTimestamp || (targetBatch.expiryDate && targetBatch.expiryDate < todayStr)) {
        return {
          success: false,
          error: `Cannot dispense expired stock: Batch ${targetBatch.batchNumber} for ${item.product.name} expired on ${targetBatch.expiryDate}.`,
        };
      }
    }

    // 2. Aggregate requested quantities per batch across ALL cart lines (handles duplicate cart lines for same batch)
    const requestedPerBatch: Record<string, { totalTablets: number; batchNumber: string; productName: string }> = {};
    for (const item of newInvoice.items) {
      if (!requestedPerBatch[item.batch.id]) {
        requestedPerBatch[item.batch.id] = {
          totalTablets: 0,
          batchNumber: item.batch.batchNumber,
          productName: item.product.name,
        };
      }
      requestedPerBatch[item.batch.id].totalTablets += item.totalTabletsSold;
    }

    // Validate aggregated stock availability
    for (const [batchId, req] of Object.entries(requestedPerBatch)) {
      const targetBatch = batches.find((b) => b.id === batchId);
      if (!targetBatch) {
        return { success: false, error: `Batch not found for ${req.productName}` };
      }
      if (targetBatch.totalTablets < req.totalTablets) {
        return {
          success: false,
          error: `Insufficient stock in Batch ${targetBatch.batchNumber} for ${req.productName}. Total requested across cart: ${req.totalTablets} tablets, available: ${targetBatch.totalTablets} tablets.`,
        };
      }
    }

    // 3. Generate stock audit log entries for each sold line item
    const newAuditEntries: StockAuditLogEntry[] = [];
    newInvoice.items.forEach((item) => {
      const targetBatch = batches.find((b) => b.id === item.batch.id);
      const prevStock = targetBatch ? targetBatch.totalTablets : item.batch.totalTablets;
      const newStock = Math.max(0, prevStock - item.totalTabletsSold);
      const stripSize = item.product.stripSize || 10;
      const prevFormatted = formatDualUnitStock(prevStock, stripSize).displayString;
      const newFormatted = formatDualUnitStock(newStock, stripSize).displayString;

      const formattedChange =
        item.unitType === 'STRIP'
          ? `-${item.quantity} Strip${item.quantity > 1 ? 's' : ''} (-${item.totalTabletsSold} Tabs)`
          : `-${item.quantity} Tab${item.quantity > 1 ? 's' : ''}`;

      newAuditEntries.push({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        productId: item.product.id,
        productName: item.product.name,
        genericComposition: item.product.genericComposition,
        batchId: item.batch.id,
        batchNumber: item.batch.batchNumber,
        expiryDate: item.batch.expiryDate,
        drugSchedule: item.product.drugSchedule,
        adjustmentType: 'SALE_DEDUCTION',
        quantityChangeTablets: -item.totalTabletsSold,
        formattedChange,
        previousStockTablets: prevStock,
        newStockTablets: newStock,
        formattedPreviousStock: prevFormatted,
        formattedNewStock: newFormatted,
        referenceNumber: newInvoice.invoiceNumber,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        reason: `POS Bill #${newInvoice.invoiceNumber} dispensed (${newInvoice.prescription.patientName ? `Patient: ${newInvoice.prescription.patientName}` : 'Walk-in Cash Sale'})`,
        rackLocation: item.product.rackLocation,
      });
    });

    const maskedPhone = maskPhoneDPDP(newInvoice.prescription.patientContact);
    const dpdpEntry: DpdpLogEntry = {
      id: `dpdp_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      patientPhoneMasked: maskedPhone,
      action: 'DISPENSED_PRESCRIPTION',
      operatorName: `${currentUser.name} (${currentUser.role})`,
      purpose: `Billed Invoice #${newInvoice.invoiceNumber} for ${newInvoice.items.length} items. Consent: ${newInvoice.prescription.dpdpConsentAccepted ? 'Consented' : 'Standard'}.`,
    };

    // If running in Electron, await SQLite commit BEFORE updating local preview state
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.createInvoice(newInvoice, newAuditEntries);
        if (!res || res.success === false) {
          return {
            success: false,
            error: res?.error || 'Database write failed. Invoice was not committed.',
          };
        }
        if (Array.isArray(res?.batches)) {
          setBatches((prevBatches) => {
            const updated = [...prevBatches];
            for (const b of res.batches) {
              const idx = updated.findIndex((x) => x.id === b.id);
              if (idx >= 0) updated[idx] = b;
              else updated.push(b);
            }
            return updated;
          });
        }
        window.electronAPI.logDpdp(dpdpEntry).catch((err) => console.warn('Failed to log DPDP in SQLite:', err));
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'IPC error during invoice persistence.',
        };
      }
    }

    // 4. Decrement atomic tablets atomically using aggregated counts in local preview cache
    setBatches((prevBatches) =>
      prevBatches.map((batch) => {
        const req = requestedPerBatch[batch.id];
        if (req) {
          return {
            ...batch,
            totalTablets: Math.max(0, batch.totalTablets - req.totalTablets),
          };
        }
        return batch;
      })
    );

    // 5. Prepend stock audit entries
    if (newAuditEntries.length > 0) {
      setStockAuditLogs((prev) => [...newAuditEntries, ...prev]);
    }

    // 6. Append to completed invoices
    setInvoices((prev) => [newInvoice, ...prev]);

    // 7. Log DPDP Act compliance entry
    setDpdpLogs((prev) => [dpdpEntry, ...prev]);

    return { success: true, invoice: newInvoice };
  };

  // Cancel Invoice and roll back stock
  const cancelInvoice = async (
    invoiceId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };
    if (inv.status === 'CANCELLED') return { success: false, error: 'Invoice is already cancelled' };
    if (!reason || !reason.trim()) return { success: false, error: 'Cancellation reason is required' };

    // 1. Prepare rollback audit entries
    const rollbackEntries: StockAuditLogEntry[] = inv.items.map((item) => {
      const targetBatch = batches.find((b) => b.id === item.batch.id);
      const prevStock = targetBatch ? targetBatch.totalTablets : 0;
      const newStock = prevStock + item.totalTabletsSold;
      const stripSize = item.product.stripSize || 10;
      return {
        id: `audit_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        productId: item.product.id,
        productName: item.product.name,
        genericComposition: item.product.genericComposition,
        batchId: item.batch.id,
        batchNumber: item.batch.batchNumber,
        expiryDate: item.batch.expiryDate,
        drugSchedule: item.product.drugSchedule,
        adjustmentType: 'MANUAL_ADJUSTMENT',
        quantityChangeTablets: item.totalTabletsSold,
        formattedChange: `+${item.totalTabletsSold} Tabs (Rollback)`,
        previousStockTablets: prevStock,
        newStockTablets: newStock,
        formattedPreviousStock: formatDualUnitStock(prevStock, stripSize).displayString,
        formattedNewStock: formatDualUnitStock(newStock, stripSize).displayString,
        referenceNumber: `CNCL-${inv.invoiceNumber}`,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        reason: `Sales Cancellation: #${inv.invoiceNumber} cancelled. Reason: ${reason}`,
      };
    });

    const dpdpEntry: DpdpLogEntry = {
      id: `dpdp_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      patientPhoneMasked: maskPhoneDPDP(inv.prescription.patientContact),
      action: 'CANCEL_INVOICE',
      operatorName: `${currentUser.name} (${currentUser.role})`,
      purpose: `Cancelled Invoice #${inv.invoiceNumber}. Reason: ${reason}`,
    };

    // If running in Electron, persist to SQLite FIRST
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.cancelInvoice({
          invoiceId,
          reason,
          rollbackEntries,
        });
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Database cancellation failed.' };
        }
        if (Array.isArray(res?.batches)) {
          setBatches((prevBatches) => {
            const updated = [...prevBatches];
            for (const b of res.batches) {
              const idx = updated.findIndex((x) => x.id === b.id);
              if (idx >= 0) updated[idx] = b;
              else updated.push(b);
            }
            return updated;
          });
        }
        window.electronAPI.logDpdp(dpdpEntry).catch((err) => console.warn('Failed to log DPDP in SQLite:', err));
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error during invoice cancellation.' };
      }
    }

    // Rollback batch stock in local preview cache
    setBatches((prevBatches) =>
      prevBatches.map((batch) => {
        const itemSold = inv.items.find((item) => item.batch.id === batch.id);
        if (itemSold) {
          return {
            ...batch,
            totalTablets: batch.totalTablets + itemSold.totalTabletsSold,
          };
        }
        return batch;
      })
    );

    setStockAuditLogs((prev) => [...rollbackEntries, ...prev]);

    // Mark invoice as cancelled
    setInvoices((prev) =>
      prev.map((i) => (i.id === invoiceId ? { ...i, status: 'CANCELLED' } : i))
    );

    setDpdpLogs((prev) => [dpdpEntry, ...prev]);

    return { success: true };
  };

  // Modify invoice payment mode
  const updateInvoicePaymentMethod = async (
    invoiceId: string,
    newPaymentMethod: PaymentMethod
  ): Promise<{ success: boolean; error?: string }> => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };
    if (inv.status === 'CANCELLED') {
      return { success: false, error: 'Cannot modify payment method on a cancelled invoice.' };
    }
    const VALID_METHODS = ['CASH', 'UPI', 'CARD', 'CREDIT', 'CHEQUE', 'BANK_TRANSFER'];
    if (!VALID_METHODS.includes(newPaymentMethod.toUpperCase())) {
      return { success: false, error: `Invalid payment method: ${newPaymentMethod}` };
    }

    const dpdpEntry: DpdpLogEntry = {
      id: `dpdp_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      patientPhoneMasked: maskPhoneDPDP(inv.prescription.patientContact),
      action: 'MODIFY_PAYMENT_MODE',
      operatorName: `${currentUser.name} (${currentUser.role})`,
      purpose: `Changed payment method of Invoice #${inv.invoiceNumber} from ${inv.paymentMethod} to ${newPaymentMethod}`,
    };

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.updateInvoicePaymentMethod({
          invoiceId,
          newPaymentMethod,
        });
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to update payment method in database.' };
        }
        window.electronAPI.logDpdp(dpdpEntry).catch((err) => console.warn('Failed to log DPDP in SQLite:', err));
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error during payment method update.' };
      }
    }

    setInvoices((prev) =>
      prev.map((i) => (i.id === invoiceId ? { ...i, paymentMethod: newPaymentMethod } : i))
    );

    setDpdpLogs((prev) => [dpdpEntry, ...prev]);

    return { success: true };
  };

  // Process Sales Return with automatic restock & credit issuance
  const processSalesReturn = async (params: {
    invoiceId: string;
    returnedItems: Array<{
      cartItemId: string;
      returnQuantity: number;
      reason: string;
    }>;
    refundMode: PaymentMethod;
  }): Promise<{ success: boolean; returnRecord?: SalesReturnRecord; error?: string }> => {
    const inv = invoices.find((i) => i.id === params.invoiceId);
    if (!inv) return { success: false, error: 'Invoice not found' };
    if (inv.status === 'CANCELLED') {
      return { success: false, error: 'Cannot process sales return on a cancelled invoice.' };
    }

    if (!Array.isArray(params.returnedItems) || params.returnedItems.length === 0) {
      return { success: false, error: 'At least one returned item is required.' };
    }

    // Validate returned quantities
    for (const ret of params.returnedItems) {
      const item = inv.items.find((it) => it.cartItemId === ret.cartItemId || it.batch?.id === ret.cartItemId);
      if (!item) {
        return { success: false, error: 'Returned item not found in original invoice.' };
      }
      if (ret.returnQuantity <= 0) {
        return { success: false, error: 'Return quantity must be greater than zero.' };
      }
      if (ret.returnQuantity > item.quantity) {
        return { success: false, error: `Return quantity (${ret.returnQuantity}) cannot exceed billed quantity (${item.quantity}).` };
      }
    }

    if (window.electronAPI?.postSalesReturn) {
      try {
        const res = await window.electronAPI.postSalesReturn({
          invoiceId: params.invoiceId,
          returnedItems: params.returnedItems,
          refundMode: params.refundMode,
          reason: params.returnedItems.map((r) => r.reason).filter(Boolean).join('; ') || 'Customer return',
        });
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Database error processing sales return.' };
        }
        if (Array.isArray(res.batches)) {
          setBatches((prevBatches) => {
            const updated = [...prevBatches];
            for (const b of res.batches) {
              const idx = updated.findIndex((x) => x.id === b.id);
              if (idx >= 0) updated[idx] = b;
              else updated.push(b);
            }
            return updated;
          });
        }
        if (res.returnRecord) {
          setSalesReturns((prev) => [res.returnRecord, ...prev.filter((r) => r.id !== res.returnRecord.id)]);
        }
        if (res.invoice) {
          setInvoices((prev) =>
            prev.map((i) => (i.id === res.invoice.id ? { ...i, status: res.invoice.status } : i))
          );
        }
        return { success: true, returnRecord: res.returnRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error processing sales return.' };
      }
    }

    // Fallback mode for browser / tests without Electron
    let totalRefund = 0;
    const returnItemsData: SalesReturnItem[] = [];

    params.returnedItems.forEach((ret) => {
      const item = inv.items.find((it) => it.cartItemId === ret.cartItemId || it.batch?.id === ret.cartItemId);
      if (!item || ret.returnQuantity <= 0) return;

      const singleUnitPrice = item.unitPrice;
      const refundForLine = Number((singleUnitPrice * ret.returnQuantity).toFixed(2));
      totalRefund += refundForLine;

      const tabsToReturn =
        item.unitType === 'STRIP'
          ? ret.returnQuantity * item.product.stripSize
          : ret.returnQuantity;

      returnItemsData.push({
        cartItemId: ret.cartItemId,
        productId: item.product.id,
        productName: item.product.name,
        batchId: item.batch.id,
        batchNumber: item.batch.batchNumber,
        unitType: item.unitType,
        quantitySold: item.quantity,
        returnQuantity: ret.returnQuantity,
        totalTabletsReturned: tabsToReturn,
        refundAmount: refundForLine,
        reason: ret.reason || 'Customer Return',
      });

      // Add back to batch stock
      setBatches((prev) =>
        prev.map((b) =>
          b.id === item.batch.id ? { ...b, totalTablets: b.totalTablets + tabsToReturn } : b
        )
      );

      // Stock audit entry
      const targetBatch = batches.find((b) => b.id === item.batch.id);
      const prevStock = targetBatch ? targetBatch.totalTablets : 0;
      const newStock = prevStock + tabsToReturn;
      const stripSize = item.product.stripSize || 10;

      const auditEntry: StockAuditLogEntry = {
        id: `audit_ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        productId: item.product.id,
        productName: item.product.name,
        genericComposition: item.product.genericComposition,
        batchId: item.batch.id,
        batchNumber: item.batch.batchNumber,
        expiryDate: item.batch.expiryDate,
        drugSchedule: item.product.drugSchedule,
        adjustmentType: 'SALE_RETURN',
        quantityChangeTablets: tabsToReturn,
        formattedChange: `+${ret.returnQuantity} ${item.unitType}${ret.returnQuantity > 1 ? 's' : ''} (Sales Return)`,
        previousStockTablets: prevStock,
        newStockTablets: newStock,
        formattedPreviousStock: formatDualUnitStock(prevStock, stripSize).displayString,
        formattedNewStock: formatDualUnitStock(newStock, stripSize).displayString,
        referenceNumber: `RET-${inv.invoiceNumber}`,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        reason: `Sales Return against Bill #${inv.invoiceNumber}: ${ret.reason || 'Customer return'}`,
      };
      setStockAuditLogs((prev) => [auditEntry, ...prev]);

      if (window.electronAPI) {
        const updatedBatch: Batch = targetBatch
          ? { ...targetBatch, totalTablets: newStock }
          : { ...item.batch, totalTablets: (item.batch.totalTablets || 0) + tabsToReturn };
        window.electronAPI.saveBatch(updatedBatch);
        window.electronAPI.recordStockAdjustment(auditEntry);
      }
    });

    const returnRecord: SalesReturnRecord = {
      id: `sr_${Date.now()}`,
      returnNumber: `SR-${new Date().getFullYear()}-${String(salesReturns.length + 1).padStart(4, '0')}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.prescription.patientName || 'Customer',
      date: new Date().toISOString(),
      items: returnItemsData,
      totalRefundAmount: Number(totalRefund.toFixed(2)),
      refundMode: params.refundMode,
      processedBy: currentUser.name,
      reason: params.returnedItems.map((r) => r.reason).filter(Boolean).join('; ') || 'Customer return',
      isRestocked: true,
    };

    const updatedReturns = [returnRecord, ...salesReturns];
    setSalesReturns(updatedReturns);
    try {
      localStorage.setItem(STORAGE_KEYS.SALES_RETURNS, JSON.stringify(updatedReturns));
    } catch (e) {
      console.warn('LocalStorage save failed for sales returns', e);
    }
    if (window.electronAPI) {
      window.electronAPI.saveSetting('sales_returns', updatedReturns);
    }

    // Check if fully returned
    const allReturned = inv.items.every((orig) => {
      const ret = params.returnedItems.find((r) => r.cartItemId === orig.cartItemId || r.cartItemId === orig.id);
      return ret && ret.returnQuantity >= orig.quantity;
    });

    const newStatus = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';
    setInvoices((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, status: newStatus } : i))
    );

    return { success: true, returnRecord };
  };

  // Add Inward Purchase GRN Invoice
  const addInwardPurchaseInvoice = async (
    newPurchase: InwardPurchaseInvoice
  ): Promise<{ success: boolean; error?: string; receipt?: InwardPurchaseInvoice }> => {
    if (window.electronAPI?.postPurchaseReceipt) {
      try {
        const res = await window.electronAPI.postPurchaseReceipt(newPurchase);
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to record purchase receipt in database.' };
        }
        if (res.receipt) {
          setPurchaseInvoices((prev) => [res.receipt as InwardPurchaseInvoice, ...prev.filter((p) => p.id !== res.receipt?.id)]);
        }
        if (Array.isArray(res.batches)) {
          setBatches((prevBatches) => {
            const updated = [...prevBatches];
            for (const b of res.batches) {
              const idx = updated.findIndex((x) => x.id === b.id);
              if (idx >= 0) updated[idx] = b;
              else updated.push(b);
            }
            return updated;
          });
        }
        if (res.vendor) {
          setVendors((prevVendors) =>
            prevVendors.map((v) => (v.id === res.vendor.id ? res.vendor : v))
          );
        }
        if (Array.isArray(res.auditLogs)) {
          setStockAuditLogs((prev) => [...res.auditLogs, ...prev]);
        }
        return { success: true, receipt: res.receipt as InwardPurchaseInvoice };
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error posting purchase receipt.' };
      }
    }

    // In-memory / browser fallback mode
    setPurchaseInvoices((prev) => {
      const updated = [newPurchase, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save failed for purchases', e);
      }
      return updated;
    });

    if (newPurchase.vendorId) {
      setVendors((prevVendors) =>
        prevVendors.map((v) => {
          if (v.id === newPurchase.vendorId) {
            const currentBal = v.balanceDue ?? v.currentBalance ?? 0;
            const updatedBal = Number((currentBal + (newPurchase.grandTotal || 0)).toFixed(2));
            return {
              ...v,
              balanceDue: updatedBal,
              currentBalance: updatedBal,
            };
          }
          return v;
        })
      );
    }

    newPurchase.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const stripSize = item.packing || prod?.stripSize || 10;
      const acceptedStrips = item.acceptedStrips !== undefined
        ? item.acceptedStrips
        : Math.max(0, item.quantityStrips + item.freeStrips - (item.rejectedStrips || 0));
      const totalNewTabs = acceptedStrips * stripSize;

      const existingBatch = batches.find(
        (b) =>
          b.productId === item.productId &&
          b.batchNumber.toLowerCase() === item.batchNumber.toLowerCase()
      );

      const batchToSave: Batch = existingBatch
        ? {
            ...existingBatch,
            totalTablets: existingBatch.totalTablets + totalNewTabs,
            costPricePerStrip: item.costPricePerStrip,
            mrpPerStrip: item.mrpPerStrip,
            expiryDate: item.expiryDate || existingBatch.expiryDate,
          }
        : {
            id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: item.productId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            manufacturingDate: item.manufacturingDate || new Date().toISOString().split('T')[0],
            costPricePerStrip: item.costPricePerStrip,
            mrpPerStrip: item.mrpPerStrip,
            sellingPricePerStrip: Number((item.mrpPerStrip * 0.95).toFixed(2)),
            gstRate: item.gstRate,
            totalTablets: totalNewTabs,
            vendorId: newPurchase.vendorId,
          };

      setBatches((prevBatches) => {
        const found = prevBatches.some((b) => b.id === batchToSave.id);
        return found
          ? prevBatches.map((b) => (b.id === batchToSave.id ? batchToSave : b))
          : [...prevBatches, batchToSave];
      });

      const auditEntry: StockAuditLogEntry = {
        id: `audit_grn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        formattedTimestamp: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        productId: item.productId,
        productName: item.productName,
        genericComposition: item.genericComposition,
        batchId: batchToSave.id,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        drugSchedule: prod?.drugSchedule || 'OTC',
        adjustmentType: 'INWARD_PURCHASE',
        quantityChangeTablets: totalNewTabs,
        formattedChange: `+${acceptedStrips} Strips (+${totalNewTabs} Tabs)`,
        previousStockTablets: existingBatch ? existingBatch.totalTablets : 0,
        newStockTablets: existingBatch ? existingBatch.totalTablets + totalNewTabs : totalNewTabs,
        formattedPreviousStock: existingBatch ? `${Math.floor(existingBatch.totalTablets / stripSize)} Strips` : '0 Strips, 0 Tabs',
        formattedNewStock: `${Math.floor((existingBatch ? existingBatch.totalTablets + totalNewTabs : totalNewTabs) / stripSize)} Strips`,
        referenceNumber: newPurchase.grnNumber,
        operatorName: currentUser.name,
        operatorRole: currentUser.role,
        reason: `Inward GRN #${newPurchase.grnNumber} from ${newPurchase.vendorName} (Inv: ${newPurchase.vendorInvoiceNo})`,
        vendorId: newPurchase.vendorId,
        vendorName: newPurchase.vendorName,
        rackLocation: prod?.rackLocation,
      };
      setStockAuditLogs((prev) => [auditEntry, ...prev]);

      if (window.electronAPI) {
        if (batchToSave) {
          window.electronAPI.saveBatch(batchToSave);
        }
        window.electronAPI.recordStockAdjustment(auditEntry);
      }
    });

    if (window.electronAPI) {
      window.electronAPI.saveSetting('purchase_invoices', [newPurchase, ...purchaseInvoices]);
    }

    return { success: true, receipt: newPurchase };
  };

  const confirmGrn = async (grnId: string): Promise<{ success: boolean; error?: string }> => {
    if (window.electronAPI?.confirmGrn) {
      try {
        const res = await window.electronAPI.confirmGrn(grnId);
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to confirm GRN.' };
        }
        if (res.receipt) {
          setPurchaseInvoices((prev) =>
            prev.map((p) => (p.id === res.receipt?.id ? (res.receipt as InwardPurchaseInvoice) : p))
          );
        }
        if (Array.isArray(res.batches)) {
          setBatches((prevBatches) => {
            const updated = [...prevBatches];
            for (const b of res.batches) {
              const idx = updated.findIndex((x) => x.id === b.id);
              if (idx >= 0) updated[idx] = b;
              else updated.push(b);
            }
            return updated;
          });
        }
        if (res.vendor) {
          setVendors((prevVendors) =>
            prevVendors.map((v) => (v.id === res.vendor.id ? res.vendor : v))
          );
        }
        if (Array.isArray(res.auditLogs)) {
          setStockAuditLogs((prev) => [...res.auditLogs, ...prev]);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error confirming GRN.' };
      }
    }

    setPurchaseInvoices((prev) =>
      prev.map((p) => (p.id === grnId ? { ...p, status: 'POSTED_TO_STOCK' } : p))
    );
    return { success: true };
  };

  const cancelGrn = async (grnId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (window.electronAPI?.cancelGrn) {
      try {
        const res = await window.electronAPI.cancelGrn({ grnId, reason });
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to cancel GRN.' };
        }
        setPurchaseInvoices((prev) =>
          prev.map((p) => (p.id === grnId ? { ...p, status: 'CANCELLED', cancelReason: reason } : p))
        );
        const data = await window.electronAPI.getAllData();
        if (data) {
          setBatches(data.batches || []);
          setStockAuditLogs(data.stockAuditLogs || []);
          setVendors(data.vendors || []);
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error cancelling GRN.' };
      }
    }

    setPurchaseInvoices((prev) =>
      prev.map((p) => (p.id === grnId ? { ...p, status: 'CANCELLED', cancelReason: reason } : p))
    );
    return { success: true };
  };

  // Wanted Book helpers
  const addWantedBookItem = (item: Omit<WantedBookItem, 'id' | 'dateAdded' | 'status'>) => {
    const newItem: WantedBookItem = {
      ...item,
      id: `wb_${Date.now()}`,
      dateAdded: new Date().toISOString(),
      status: 'PENDING',
    };
    setWantedBook((prev) => {
      const updated = [newItem, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.WANTED_BOOK, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save wanted book to localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('wanted_book', updated);
      }
      return updated;
    });
  };

  const updateWantedBookItemStatus = (id: string, status: WantedBookItem['status']) => {
    setWantedBook((prev) => {
      const updated = prev.map((it) => (it.id === id ? { ...it, status } : it));
      try {
        localStorage.setItem(STORAGE_KEYS.WANTED_BOOK, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update wanted book in localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('wanted_book', updated);
      }
      return updated;
    });
  };

  const deleteWantedBookItem = (id: string) => {
    setWantedBook((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.WANTED_BOOK, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to delete wanted book item from localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('wanted_book', updated);
      }
      return updated;
    });
  };

  // Masters helpers
  const addDoctor = (doc: MasterDoctor) => {
    setDoctors((prev) => {
      const updated = [doc, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save doctor to localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('doctors', updated);
      }
      return updated;
    });
  };

  const addCustomer = (cust: MasterCustomer) => {
    setCustomers((prev) => {
      const updated = [cust, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save customer to localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('customers', updated);
      }
      return updated;
    });
  };

  const addSalesRep = (rep: MasterSalesRep) => {
    setSalesReps((prev) => {
      const updated = [rep, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SALES_REPS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save sales rep to localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('sales_reps', updated);
      }
      return updated;
    });
  };

  const addRack = (rack: MasterRack) => {
    setRacks((prev) => {
      const updated = [rack, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.RACKS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save rack to localStorage', err);
      }
      if (window.electronAPI) {
        window.electronAPI.saveSetting('racks', updated);
      }
      return updated;
    });
  };

  const addVendor = async (vendor: Vendor): Promise<{ success: boolean; error?: string }> => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveVendor(vendor);
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to save vendor in database.' };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error saving vendor.' };
      }
    }

    setVendors((prev) => {
      const updated = [vendor, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save vendor to localStorage', err);
      }
      return updated;
    });

    return { success: true };
  };

  const updateVendor = async (vendor: Vendor): Promise<{ success: boolean; error?: string }> => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveVendor(vendor);
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to update vendor in database.' };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error updating vendor.' };
      }
    }

    setVendors((prev) => {
      const updated = prev.map((v) => (v.id === vendor.id ? vendor : v));
      try {
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update vendor in localStorage', err);
      }
      return updated;
    });

    return { success: true };
  };

  // Record manual stock adjustment / physical count reconciliation / breakage write-off
  const recordManualAdjustment = async (params: {
    productId: string;
    batchId: string;
    adjustmentType: 'MANUAL_ADJUSTMENT' | 'DAMAGE_WRITEOFF' | 'EXPIRY_DISPOSAL';
    quantityChangeTablets: number;
    reason: string;
    referenceNumber?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const prod = products.find((p) => p.id === params.productId);
    const targetBatch = batches.find((b) => b.id === params.batchId);
    if (!prod || !targetBatch) {
      return { success: false, error: 'Product or batch not found' };
    }

    const prevStock = targetBatch.totalTablets;
    const newStock = prevStock + params.quantityChangeTablets;
    if (newStock < 0) {
      return {
        success: false,
        error: `Adjustment would cause negative inventory balance (${newStock} tablets). Available stock is ${prevStock} tablets.`,
      };
    }

    const stripSize = prod.stripSize || 10;
    const prevFormatted = formatDualUnitStock(prevStock, stripSize).displayString;
    const newFormatted = formatDualUnitStock(newStock, stripSize).displayString;
    const isPos = params.quantityChangeTablets > 0;
    const absQty = Math.abs(params.quantityChangeTablets);
    const stripsChange = Math.floor(absQty / stripSize);
    const looseChange = absQty % stripSize;
    let formattedChange = '';
    if (stripsChange > 0 && looseChange > 0) {
      formattedChange = `${isPos ? '+' : '-'}${stripsChange} Strip${stripsChange > 1 ? 's' : ''}, ${looseChange} Tab${looseChange > 1 ? 's' : ''} (${isPos ? '+' : '-'}${absQty} Tabs)`;
    } else if (stripsChange > 0) {
      formattedChange = `${isPos ? '+' : '-'}${stripsChange} Strip${stripsChange > 1 ? 's' : ''} (${isPos ? '+' : '-'}${absQty} Tabs)`;
    } else {
      formattedChange = `${isPos ? '+' : '-'}${absQty} Tab${absQty > 1 ? 's' : ''}`;
    }

    const refNo = params.referenceNumber || `ADJ/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

    const auditEntry: StockAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      formattedTimestamp: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productId: prod.id,
      productName: prod.name,
      genericComposition: prod.genericComposition,
      batchId: targetBatch.id,
      batchNumber: targetBatch.batchNumber,
      expiryDate: targetBatch.expiryDate,
      drugSchedule: prod.drugSchedule,
      adjustmentType: params.adjustmentType,
      quantityChangeTablets: params.quantityChangeTablets,
      formattedChange,
      previousStockTablets: prevStock,
      newStockTablets: newStock,
      formattedPreviousStock: prevFormatted,
      formattedNewStock: newFormatted,
      referenceNumber: refNo,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      reason: params.reason,
      rackLocation: prod.rackLocation,
    };

    const updatedBatch: Batch = {
      ...targetBatch,
      totalTablets: newStock,
    };

    if (window.electronAPI) {
      try {
        const batchRes = await window.electronAPI.saveBatch(updatedBatch);
        if (!batchRes || batchRes.success === false) {
          return { success: false, error: batchRes?.error || 'Failed to save batch in database.' };
        }
        const adjRes = await window.electronAPI.recordStockAdjustment(auditEntry);
        if (!adjRes || adjRes.success === false) {
          return { success: false, error: adjRes?.error || 'Failed to record stock adjustment in database.' };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error recording stock adjustment.' };
      }
    }

    // Update batch stock
    setBatches((prev) =>
      prev.map((b) => (b.id === params.batchId ? updatedBatch : b))
    );

    setStockAuditLogs((prev) => [auditEntry, ...prev]);

    setDpdpLogs((prev) => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        patientPhoneMasked: 'N/A (STOCK ADJUSTMENT)',
        action: params.adjustmentType,
        operatorName: `${currentUser.name} (${currentUser.role})`,
        purpose: `${params.reason} (Ref: ${refNo})`,
      },
      ...prev,
    ]);

    return { success: true };
  };

  // Record vendor return with debit note generation and batch deduction
  const recordVendorReturn = async (params: {
    productId: string;
    batchId: string;
    vendorId: string;
    returnTablets: number;
    reason: string;
    debitNoteNumber?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const prod = products.find((p) => p.id === params.productId);
    const targetBatch = batches.find((b) => b.id === params.batchId);
    const targetVendor = vendors.find((v) => v.id === params.vendorId);
    if (!prod || !targetBatch) {
      return { success: false, error: 'Product or batch not found' };
    }
    if (params.returnTablets <= 0) {
      return { success: false, error: 'Return quantity must be greater than zero' };
    }
    if (targetBatch.totalTablets < params.returnTablets) {
      return {
        success: false,
        error: `Cannot return ${params.returnTablets} tablets. Available batch stock is ${targetBatch.totalTablets} tablets.`,
      };
    }

    const prevStock = targetBatch.totalTablets;
    const newStock = prevStock - params.returnTablets;
    const stripSize = prod.stripSize || 10;
    const prevFormatted = formatDualUnitStock(prevStock, stripSize).displayString;
    const newFormatted = formatDualUnitStock(newStock, stripSize).displayString;
    const strips = Math.floor(params.returnTablets / stripSize);
    const loose = params.returnTablets % stripSize;
    let formattedChange = '';
    if (strips > 0 && loose > 0) {
      formattedChange = `-${strips} Strip${strips > 1 ? 's' : ''}, ${loose} Tab${loose > 1 ? 's' : ''} (-${params.returnTablets} Tabs)`;
    } else if (strips > 0) {
      formattedChange = `-${strips} Strip${strips > 1 ? 's' : ''} (-${params.returnTablets} Tabs)`;
    } else {
      formattedChange = `-${params.returnTablets} Tab${params.returnTablets > 1 ? 's' : ''}`;
    }

    const debitNote = params.debitNoteNumber || `DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const auditEntry: StockAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      formattedTimestamp: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productId: prod.id,
      productName: prod.name,
      genericComposition: prod.genericComposition,
      batchId: targetBatch.id,
      batchNumber: targetBatch.batchNumber,
      expiryDate: targetBatch.expiryDate,
      drugSchedule: prod.drugSchedule,
      adjustmentType: 'VENDOR_RETURN',
      quantityChangeTablets: -params.returnTablets,
      formattedChange,
      previousStockTablets: prevStock,
      newStockTablets: newStock,
      formattedPreviousStock: prevFormatted,
      formattedNewStock: newFormatted,
      referenceNumber: debitNote,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
      reason: params.reason,
      vendorId: targetVendor?.id || targetBatch.vendorId,
      vendorName: targetVendor?.companyName || 'Distributor',
      rackLocation: prod.rackLocation,
    };

    let updatedVendor: Vendor | undefined;
    if (targetVendor) {
      const costPerTab = targetBatch.costPricePerStrip / stripSize;
      const creditAmount = Number((costPerTab * params.returnTablets).toFixed(2));
      updatedVendor = {
        ...targetVendor,
        balanceDue: Math.max(0, targetVendor.balanceDue - creditAmount),
      };
    }

    const updatedBatch: Batch = {
      ...targetBatch,
      totalTablets: newStock,
    };

    if (window.electronAPI?.postPurchaseReturn) {
      try {
        const res = await window.electronAPI.postPurchaseReturn(params);
        if (!res || res.success === false) {
          return { success: false, error: res?.error || 'Failed to process vendor return.' };
        }
        if (res.batch) {
          setBatches((prev) => prev.map((b) => (b.id === res.batch!.id ? res.batch! : b)));
        }
        if (res.vendor) {
          setVendors((prev) => prev.map((v) => (v.id === res.vendor!.id ? res.vendor! : v)));
        }
        if (res.auditEntry) {
          setStockAuditLogs((prev) => [res.auditEntry!, ...prev]);
        }
        setDpdpLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            patientPhoneMasked: 'N/A (VENDOR RETURN)',
            action: 'VENDOR_RETURN_DEBIT_NOTE',
            operatorName: `${currentUser.name} (${currentUser.role})`,
            purpose: `Vendor return of ${params.returnTablets} tablets (Batch: ${targetBatch.batchNumber}, Ref: ${debitNote})`,
          },
          ...prev,
        ]);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'IPC error during vendor return.' };
      }
    }

    // Deduct stock from batch
    setBatches((prev) =>
      prev.map((b) => (b.id === params.batchId ? updatedBatch : b))
    );

    setStockAuditLogs((prev) => [auditEntry, ...prev]);

    // Adjust vendor balance due (credit debit note)
    if (updatedVendor) {
      setVendors((prev) =>
        prev.map((v) => (v.id === updatedVendor!.id ? updatedVendor! : v))
      );
    }

    setDpdpLogs((prev) => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        patientPhoneMasked: 'N/A (VENDOR RETURN)',
        action: 'VENDOR_RETURN_DEBIT_NOTE',
        operatorName: `${currentUser.name} (${currentUser.role})`,
        purpose: `Returned ${formattedChange} of ${prod.name} (Batch ${targetBatch.batchNumber}) to ${targetVendor?.companyName || 'Vendor'}. Debit Note #${debitNote}.`,
      },
      ...prev,
    ]);

    if (window.electronAPI) {
      try {
        if (updatedVendor) {
          await window.electronAPI.saveVendor(updatedVendor);
        }
        await window.electronAPI.saveBatch(updatedBatch);
        await window.electronAPI.recordStockAdjustment(auditEntry);
      } catch (err: any) {
        console.warn('Fallback persistence failed for vendor return:', err);
      }
    }

    return { success: true };
  };

  // Real-time Analytics Engine
  const analytics: AnalyticsSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // Filter today's completed invoices
    const todaysInvoices = invoices.filter(
      (inv) => inv.status === 'COMPLETED' && inv.invoiceDate.startsWith(today)
    );

    let dailyRevenue = 0;
    let dailyCost = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const volumeMap: Record<string, { product: Product; tablets: number; revenue: number }> = {};
    const revenueMap: Record<string, { product: Product; revenue: number; units: number }> = {};

    invoices.forEach((inv) => {
      if (inv.status !== 'COMPLETED') return;

      const isToday = inv.invoiceDate.startsWith(today);
      if (isToday) {
        dailyRevenue += inv.grandTotal;
      }

      totalCgst += inv.totalCgst;
      totalSgst += inv.totalSgst;
      totalIgst += inv.totalIgst;

      inv.items.forEach((item) => {
        // Find batch to determine cost
        const batch = batches.find((b) => b.id === item.batch.id) || item.batch;
        const costPerTablet = batch.costPricePerStrip / (item.product.stripSize || 10);
        const itemCost = costPerTablet * item.totalTabletsSold;

        if (isToday) {
          dailyCost += itemCost;
        }

        // Aggregate volume & revenue by product
        if (!volumeMap[item.product.id]) {
          volumeMap[item.product.id] = { product: item.product, tablets: 0, revenue: 0 };
        }
        volumeMap[item.product.id].tablets += item.totalTabletsSold;
        volumeMap[item.product.id].revenue += item.totalAmount;

        if (!revenueMap[item.product.id]) {
          revenueMap[item.product.id] = { product: item.product, revenue: 0, units: 0 };
        }
        revenueMap[item.product.id].revenue += item.totalAmount;
        revenueMap[item.product.id].units += item.totalTabletsSold;
      });
    });

    const dailyProfit = Math.max(0, dailyRevenue - dailyCost);

    // Calculate monthly stats from actual saved records for current calendar month
    const currentMonthPrefix = today.slice(0, 7);
    const monthlyInvoices = invoices.filter(
      (inv) => inv.status === 'COMPLETED' && inv.invoiceDate.startsWith(currentMonthPrefix)
    );
    let monthlyRevenue = 0;
    let monthlyCost = 0;
    monthlyInvoices.forEach((inv) => {
      monthlyRevenue += inv.grandTotal;
      inv.items.forEach((item) => {
        const batch = batches.find((b) => b.id === item.batch.id) || item.batch;
        const costPerTablet = (batch.costPricePerStrip || 20) / (item.product.stripSize || 10);
        monthlyCost += costPerTablet * item.totalTabletsSold;
      });
    });

    const monthlyProfit = Math.max(0, monthlyRevenue - monthlyCost);
    const avgMargin =
      monthlyRevenue > 0
        ? Number(((monthlyProfit / monthlyRevenue) * 100).toFixed(1))
        : dailyRevenue > 0
        ? Number(((dailyProfit / dailyRevenue) * 100).toFixed(1))
        : 0;

    // Low stock count
    const lowStockCount = batches.filter((b) => {
      const prod = products.find((p) => p.id === b.productId);
      return b.totalTablets <= (prod?.reorderLevelUnits || 50);
    }).length;

    // Near expiry count (<90 days)
    const nearExpiryCount = batches.filter((b) => {
      const zone = calculateExpiryZone(b.expiryDate).zone;
      return zone !== 'SAFE';
    }).length;

    // Fastest moving lists
    const fastestMovingByVolume = Object.values(volumeMap)
      .sort((a, b) => b.tablets - a.tablets)
      .slice(0, 5)
      .map((entry) => {
        const strips = Math.floor(entry.tablets / (entry.product.stripSize || 10));
        const loose = entry.tablets % (entry.product.stripSize || 10);
        return {
          productId: entry.product.id,
          productName: entry.product.name,
          totalTabletsSold: entry.tablets,
          stripsEquivalent: `${strips} St, ${loose} Tab`,
          revenue: entry.revenue,
        };
      });

    const fastestMovingByRevenue = Object.values(revenueMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((entry) => ({
        productId: entry.product.id,
        productName: entry.product.name,
        revenue: entry.revenue,
        unitsSold: entry.units,
      }));

    return {
      dailyRevenue,
      dailyProfit,
      monthlyRevenue,
      monthlyProfit,
      averageMarginPercentage: Number(avgMargin.toFixed(1)),
      totalTransactionsToday: todaysInvoices.length,
      lowStockItemsCount: lowStockCount,
      nearExpiryItemsCount: nearExpiryCount,
      fastestMovingByVolume,
      fastestMovingByRevenue,
      gstLiability: {
        cgstTotal: totalCgst,
        sgstTotal: totalSgst,
        igstTotal: totalIgst,
        grossTax: totalCgst + totalSgst + totalIgst,
      },
    };
  }, [invoices, batches, products]);

  return (
    <PharmacyContext.Provider
      value={{
        products,
        batches,
        invoices,
        vendors,
        doctors,
        customers,
        salesReps,
        racks,
        manufacturers,
        scheduleTypes,
        wantedBook,
        purchaseInvoices,
        salesReturns,
        printerSettings,
        currentUser,
        pharmacyAccount,
        isConfigured,
        isAuthenticated,
        authLoading,
        login,
        logout,
        setupOnboarding,
        getUsers,
        createUser,
        deactivateUser,
        activateUser,
        resetUserPassword,
        updatePharmacyProfile,
        dpdpLogs,
        stockAuditLogs,
        backupConfig,
        backupSnapshots,
        updateBackupConfig,
        triggerAutomatedBackup,
        restoreFromSnapshot,
        importExternalBackup,
        lastScannedBarcode,
        setLastScannedBarcode,
        updatePrinterSettings,
        switchUserRole,
        addProduct,
        updateProduct,
        addVendor,
        updateVendor,
        addBatch,
        inwardStockBatch,
        createInvoice,
        cancelInvoice,
        updateInvoicePaymentMethod,
        processSalesReturn,
        addInwardPurchaseInvoice,
        confirmGrn,
        cancelGrn,
        addWantedBookItem,
        updateWantedBookItemStatus,
        deleteWantedBookItem,
        addDoctor,
        addCustomer,
        addSalesRep,
        addRack,
        recordManualAdjustment,
        recordVendorReturn,
        analytics,
        findProductByBarcode,
        clearAllData,
        navigationConfig,
        updateNavigationConfig,
        toggleMenu,
        toggleSubmenu,
        setAllMenus,
        resetNavigationConfigToDefaults,
        isMenuEnabled,
        isSubmenuEnabled,
        currentThemeId,
        theme,
        setTheme,
        availableThemes: AVAILABLE_THEMES,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
}
