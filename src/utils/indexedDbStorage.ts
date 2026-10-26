/**
 * Client-Only Versioned IndexedDB Storage Engine for Jeeva Pharmacy
 * Provides structured offline persistence for all operational, master, and transactional data.
 * Zero external dependencies; uses the standard browser IndexedDB API.
 */

export const DB_NAME = 'JeevaPharmacyClientDB';
export const DB_VERSION = 1;

export interface StorageExportPayload {
  version: number;
  exportedAt: string;
  appName: string;
  checksum?: string;
  data: {
    pharmacyAccount?: any;
    staffUsers?: any[];
    products: any[];
    batches: any[];
    invoices: any[];
    vendors: any[];
    stockAuditLogs: any[];
    dpdpLogs: any[];
    purchaseInvoices: any[];
    backupSnapshots: any[];
    doctors: any[];
    customers: any[];
    salesReps: any[];
    racks: any[];
    manufacturers: any[];
    wantedBook: any[];
    salesReturns: any[];
    printerSettings?: any;
    backupConfig?: any;
    navigationConfig?: any;
    currentThemeId?: string;
  };
}

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or upgrades the versioned IndexedDB instance.
 */
export function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this runtime environment.'));
    }

    if (dbInstance) {
      return resolve(dbInstance);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Operational & transactional stores
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('batches')) {
        db.createObjectStore('batches', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vendors')) {
        db.createObjectStore('vendors', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stockAuditLogs')) {
        db.createObjectStore('stockAuditLogs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('dpdpLogs')) {
        db.createObjectStore('dpdpLogs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('purchaseInvoices')) {
        db.createObjectStore('purchaseInvoices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('backupSnapshots')) {
        db.createObjectStore('backupSnapshots', { keyPath: 'id' });
      }

      // 2. ShopAid masters store (keyed by identifier string)
      if (!db.objectStoreNames.contains('shopaidMasters')) {
        db.createObjectStore('shopaidMasters');
      }

      // 3. Meta & Configuration store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      };
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      const err = (event.target as IDBOpenDBRequest).error;
      reject(err || new Error('Failed to open IndexedDB database.'));
    };
  });
}

/**
 * Persists an array of entities into an entity-keyed object store (clearing existing and rewriting).
 */
export async function saveEntityCollection<T extends { id: string }>(
  storeName: 'products' | 'batches' | 'invoices' | 'vendors' | 'stockAuditLogs' | 'dpdpLogs' | 'purchaseInvoices' | 'backupSnapshots',
  items: T[]
): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      store.clear();
      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(`Failed to save items to ${storeName}`));
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error persisting collection ${storeName}:`, err);
  }
}

/**
 * Loads all items from an entity store.
 */
export async function loadEntityCollection<T>(
  storeName: 'products' | 'batches' | 'invoices' | 'vendors' | 'stockAuditLogs' | 'dpdpLogs' | 'purchaseInvoices' | 'backupSnapshots'
): Promise<T[]> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result || []) as T[]);
      request.onerror = () => reject(request.error || new Error(`Failed to load items from ${storeName}`));
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error loading collection ${storeName}:`, err);
    return [];
  }
}

/**
 * Sets an arbitrary key-value in a single-value store ('shopaidMasters' or 'meta').
 */
export async function setKvItem<T>(storeName: 'shopaidMasters' | 'meta', key: string, value: T): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(`Failed to set key ${key} in ${storeName}`));
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error saving KV ${key} in ${storeName}:`, err);
  }
}

/**
 * Gets an arbitrary key-value from a single-value store ('shopaidMasters' or 'meta').
 */
export async function getKvItem<T>(storeName: 'shopaidMasters' | 'meta', key: string): Promise<T | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
      req.onerror = () => reject(req.error || new Error(`Failed to get key ${key} from ${storeName}`));
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error reading KV ${key} in ${storeName}:`, err);
    return null;
  }
}

/**
 * Exports all local data into a verifiable JSON string.
 */
export async function exportAllDataToJson(): Promise<string> {
  const [
    products,
    batches,
    invoices,
    vendors,
    stockAuditLogs,
    dpdpLogs,
    purchaseInvoices,
    backupSnapshots,
  ] = await Promise.all([
    loadEntityCollection('products'),
    loadEntityCollection('batches'),
    loadEntityCollection('invoices'),
    loadEntityCollection('vendors'),
    loadEntityCollection('stockAuditLogs'),
    loadEntityCollection('dpdpLogs'),
    loadEntityCollection('purchaseInvoices'),
    loadEntityCollection('backupSnapshots'),
  ]);

  const [
    doctors,
    customers,
    salesReps,
    racks,
    manufacturers,
    wantedBook,
    salesReturns,
    pharmacyAccount,
    staffUsers,
    printerSettings,
    backupConfig,
    navigationConfig,
    currentThemeId,
  ] = await Promise.all([
    getKvItem('shopaidMasters', 'doctors'),
    getKvItem('shopaidMasters', 'customers'),
    getKvItem('shopaidMasters', 'salesReps'),
    getKvItem('shopaidMasters', 'racks'),
    getKvItem('shopaidMasters', 'manufacturers'),
    getKvItem('shopaidMasters', 'wantedBook'),
    getKvItem('shopaidMasters', 'salesReturns'),
    getKvItem('meta', 'pharmacyAccount'),
    getKvItem('meta', 'staffUsers'),
    getKvItem('meta', 'printerSettings'),
    getKvItem('meta', 'backupConfig'),
    getKvItem('meta', 'navigationConfig'),
    getKvItem('meta', 'currentThemeId'),
  ]);

  const payload: StorageExportPayload = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'Jeeva Pharmacy (Client-Only)',
    data: {
      pharmacyAccount,
      staffUsers: (staffUsers as any[]) || [],
      products,
      batches,
      invoices,
      vendors,
      stockAuditLogs,
      dpdpLogs,
      purchaseInvoices,
      backupSnapshots,
      doctors: (doctors as any[]) || [],
      customers: (customers as any[]) || [],
      salesReps: (salesReps as any[]) || [],
      racks: (racks as any[]) || [],
      manufacturers: (manufacturers as any[]) || [],
      wantedBook: (wantedBook as any[]) || [],
      salesReturns: (salesReturns as any[]) || [],
      printerSettings,
      backupConfig,
      navigationConfig,
      currentThemeId: currentThemeId as string,
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and imports a JSON backup/migration string into IndexedDB.
 * Returns detailed record counts or explicit error without silently corrupting state.
 */
export async function importDataFromJson(jsonContent: string): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, number>;
  error?: string;
  payload?: StorageExportPayload['data'];
}> {
  if (!jsonContent || typeof jsonContent !== 'string') {
    return { success: false, message: 'Invalid or empty backup file.', error: 'Empty payload' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err: any) {
    return {
      success: false,
      message: 'Corrupted backup file: JSON syntax parsing failed.',
      error: err?.message || 'JSON parse error',
    };
  }

  // Handle both enveloped StorageExportPayload and flat payloads
  const data = parsed.data || parsed;

  if (typeof data !== 'object' || data === null) {
    return {
      success: false,
      message: 'Invalid backup structure: missing data payload.',
      error: 'Malformed root data object',
    };
  }

  // Schema validation: ensure core array fields are valid arrays if present
  const arrayKeys = [
    'products',
    'batches',
    'invoices',
    'vendors',
    'stockAuditLogs',
    'dpdpLogs',
    'purchaseInvoices',
    'doctors',
    'customers',
  ];

  const hasRecognizedKey =
    arrayKeys.some((k) => k in data) ||
    Boolean(parsed.appName) ||
    Boolean(parsed.version) ||
    'pharmacyAccount' in data;

  if (!hasRecognizedKey) {
    return {
      success: false,
      message: 'Corrupted or incompatible backup file: no recognized pharmacy collections or version metadata found.',
      error: 'Unrecognized schema',
    };
  }

  for (const key of arrayKeys) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      return {
        success: false,
        message: `Corrupted backup payload: field '${key}' must be an array.`,
        error: `Invalid array for ${key}`,
      };
    }
  }

  const products = Array.isArray(data.products) ? data.products : [];
  const batches = Array.isArray(data.batches) ? data.batches : [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const vendors = Array.isArray(data.vendors) ? data.vendors : [];
  const stockAuditLogs = Array.isArray(data.stockAuditLogs) ? data.stockAuditLogs : [];
  const dpdpLogs = Array.isArray(data.dpdpLogs) ? data.dpdpLogs : [];
  const purchaseInvoices = Array.isArray(data.purchaseInvoices) ? data.purchaseInvoices : [];
  const backupSnapshots = Array.isArray(data.backupSnapshots) ? data.backupSnapshots : [];

  const doctors = Array.isArray(data.doctors) ? data.doctors : [];
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const salesReps = Array.isArray(data.salesReps) ? data.salesReps : [];
  const racks = Array.isArray(data.racks) ? data.racks : [];
  const manufacturers = Array.isArray(data.manufacturers) ? data.manufacturers : [];
  const wantedBook = Array.isArray(data.wantedBook) ? data.wantedBook : [];
  const salesReturns = Array.isArray(data.salesReturns) ? data.salesReturns : [];

  // Persist into IndexedDB
  await Promise.all([
    saveEntityCollection('products', products),
    saveEntityCollection('batches', batches),
    saveEntityCollection('invoices', invoices),
    saveEntityCollection('vendors', vendors),
    saveEntityCollection('stockAuditLogs', stockAuditLogs),
    saveEntityCollection('dpdpLogs', dpdpLogs),
    saveEntityCollection('purchaseInvoices', purchaseInvoices),
    saveEntityCollection('backupSnapshots', backupSnapshots),
    setKvItem('shopaidMasters', 'doctors', doctors),
    setKvItem('shopaidMasters', 'customers', customers),
    setKvItem('shopaidMasters', 'salesReps', salesReps),
    setKvItem('shopaidMasters', 'racks', racks),
    setKvItem('shopaidMasters', 'manufacturers', manufacturers),
    setKvItem('shopaidMasters', 'wantedBook', wantedBook),
    setKvItem('shopaidMasters', 'salesReturns', salesReturns),
  ]);

  if (data.pharmacyAccount) {
    await setKvItem('meta', 'pharmacyAccount', data.pharmacyAccount);
  }
  if (Array.isArray(data.staffUsers)) {
    await setKvItem('meta', 'staffUsers', data.staffUsers);
  }
  if (data.printerSettings) {
    await setKvItem('meta', 'printerSettings', data.printerSettings);
  }
  if (data.backupConfig) {
    await setKvItem('meta', 'backupConfig', data.backupConfig);
  }

  const details: Record<string, number> = {
    products: products.length,
    batches: batches.length,
    invoices: invoices.length,
    vendors: vendors.length,
    purchaseInvoices: purchaseInvoices.length,
    doctors: doctors.length,
    customers: customers.length,
    stockAuditLogs: stockAuditLogs.length,
    dpdpLogs: dpdpLogs.length,
  };

  return {
    success: true,
    message: `Successfully restored ${invoices.length} invoices, ${products.length} products, ${batches.length} batches, and ${vendors.length} vendors.`,
    details,
    payload: {
      ...data,
      products,
      batches,
      invoices,
      vendors,
      stockAuditLogs,
      dpdpLogs,
      purchaseInvoices,
      backupSnapshots,
      doctors,
      customers,
      salesReps,
      racks,
      manufacturers,
      wantedBook,
      salesReturns,
    },
  };
}

/**
 * Clears all IndexedDB object stores (for Admin full purge).
 */
export async function clearAllIndexedDb(): Promise<void> {
  const db = await openIndexedDb();
  const stores = [
    'products',
    'batches',
    'invoices',
    'vendors',
    'stockAuditLogs',
    'dpdpLogs',
    'purchaseInvoices',
    'backupSnapshots',
    'shopaidMasters',
  ] as const;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([...stores], 'readwrite');
    for (const s of stores) {
      tx.objectStore(s).clear();
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to purge IndexedDB'));
  });
}
