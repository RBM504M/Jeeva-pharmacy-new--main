const electron = require('electron');
const isElectronRuntime = typeof electron === 'object' && electron !== null && Boolean(electron.app);
const app = isElectronRuntime ? electron.app : null;
const BrowserWindow = isElectronRuntime ? electron.BrowserWindow : null;
const ipcMain = isElectronRuntime ? electron.ipcMain : null;
const shell = isElectronRuntime ? electron.shell : null;
const safeStorage = isElectronRuntime ? electron.safeStorage : null;
const dialog = isElectronRuntime ? electron.dialog : null;

const path = require('node:path');
const fs = require('node:fs');
const PharmacyDatabase = require('./database.cjs');

function logCrash(err, context = 'Fatal') {
  console.error(`[${context}]`, err);
  try {
    if (!app) return;
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const crashLogPath = path.join(userDataPath, 'crash.log');
    const logEntry = `[${new Date().toISOString()}] [${context}] ${err?.stack || err}\n`;
    fs.appendFileSync(crashLogPath, logEntry, 'utf8');
  } catch {}
}

if (isElectronRuntime) {
  process.on('uncaughtException', (err) => {
    logCrash(err, 'uncaughtException');
    try {
      dialog?.showErrorBox(
        'Application Error',
        `An unexpected error occurred:\n\n${err?.message || err}\n\nA crash log was saved to the application data directory.`
      );
    } catch {}
  });

  process.on('unhandledRejection', (reason) => {
    logCrash(reason, 'unhandledRejection');
  });

  app.setName('Jeeva Pharmacy');
  if (process.platform === 'win32') {
    app.setAppUserModelId('in.jeevapharmacy.pos');
  }
}

let mainWindow = null;
let db = null;
let activeSession = null;

const PERMISSION_MATRIX = {
  'db:getAllData': ['ADMIN', 'PHARMACIST', 'CASHIER', 'PHARMACY_ASSISTANT'],
  'db:saveProduct': ['ADMIN', 'PHARMACIST'],
  'db:saveBatch': ['ADMIN', 'PHARMACIST'],
  'db:createBatch': ['ADMIN', 'PHARMACIST'],
  'db:updateBatchMetadata': ['ADMIN', 'PHARMACIST'],
  'db:receiveStock': ['ADMIN', 'PHARMACIST'],
  'db:adjustStock': ['ADMIN', 'PHARMACIST'],
  'db:recordStockAdjustment': ['ADMIN', 'PHARMACIST'],
  'db:createInvoice': ['ADMIN', 'PHARMACIST', 'CASHIER'],
  'db:cancelInvoice': ['ADMIN', 'PHARMACIST'],
  'db:updateInvoicePaymentMethod': ['ADMIN'],
  'db:saveVendor': ['ADMIN', 'PHARMACIST'],
  'db:postPurchaseReceipt': ['ADMIN', 'PHARMACIST'],
  'db:confirmGrn': ['ADMIN', 'PHARMACIST'],
  'db:cancelGrn': ['ADMIN', 'PHARMACIST'],
  'db:postPurchaseReturn': ['ADMIN', 'PHARMACIST'],
  'db:getPurchaseReceipts': ['ADMIN', 'PHARMACIST', 'CASHIER'],
  'db:logDpdp': ['ADMIN', 'PHARMACIST', 'CASHIER', 'PHARMACY_ASSISTANT'],
  'db:saveSetting': ['ADMIN', 'PHARMACIST'],
  'db:saveBackupSnapshot': ['ADMIN'],
  'db:restoreBackup': ['ADMIN'],
};

const ALLOWED_SETTINGS_KEYS = new Set([
  'active_theme',
  'navigation_config',
  'backup_config',
  'printer_settings',
  'user_profile',
  'sales_returns',
  'purchase_invoices',
  'wanted_book',
  'doctors',
  'customers',
  'sales_reps',
  'racks',
  'test_config',
]);

function assertAuthenticated(session = activeSession) {
  if (!session) {
    throw new Error('Unauthenticated: An active authenticated session is required.');
  }
  return session;
}

function assertAdmin(session = activeSession) {
  const sess = assertAuthenticated(session);
  if (sess.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Administrator privilege required for this operation.');
  }
  return sess;
}

function assertPermission(operation, session = activeSession) {
  const sess = assertAuthenticated(session);
  const allowedRoles = PERMISSION_MATRIX[operation];
  if (!allowedRoles) {
    throw new Error(`Unauthorized: Operation '${operation}' is not configured in permission matrix.`);
  }
  if (!allowedRoles.includes(sess.user.role)) {
    throw new Error(`Unauthorized: User role '${sess.user.role}' lacks permission for '${operation}'.`);
  }
  return sess;
}

function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'jeeva_pharmacy.db');
  console.log('[SQLite] Database location:', dbPath);

  db = new PharmacyDatabase(dbPath);

  // Check remembered session using OS credential vault (safeStorage)
  checkRememberedSession();
}

function checkRememberedSession() {
  try {
    const saved = db.getSetting('remembered_session');
    if (saved && safeStorage && safeStorage.isEncryptionAvailable()) {
      const token = safeStorage.decryptString(Buffer.from(saved, 'base64'));
      const validation = db.validateSession(token);
      if (validation.valid) {
        activeSession = {
          token,
          user: validation.user,
          pharmacy: validation.pharmacy,
        };
        console.log('[Auth] Restored remembered session securely for user:', validation.user.username);
        return;
      }
    }
  } catch (err) {
    console.warn('[Auth] Remembered session check failed or expired:', err.message);
  }
  activeSession = null;
}

function registerIpcHandlers() {
  // Authentication & Onboarding IPCs
  ipcMain.handle('auth:getAuthState', async () => {
    const isConfigured = db.isConfigured();
    return {
      isConfigured,
      isAuthenticated: Boolean(activeSession),
      user: activeSession?.user || null,
      pharmacy: activeSession?.pharmacy || null,
    };
  });

  ipcMain.handle('auth:setupOnboarding', async (_, payload) => {
    if (db.isConfigured()) {
      return { success: false, error: 'Pharmacy account is already configured.' };
    }
    const result = db.setupInitialPharmacy(payload);
    if (result.success && result.session) {
      activeSession = {
        token: result.session.token,
        user: result.user,
        pharmacy: result.pharmacy,
      };
    }
    return result;
  });

  ipcMain.handle('auth:login', async (_, { username, password, rememberMe }) => {
    const result = db.verifyUserCredentials(username, password);
    if (!result.success) {
      return result;
    }
    const session = db.createSession(result.user.id, result.user.pharmacyId, result.user.role);
    activeSession = {
      token: session.token,
      user: result.user,
      pharmacy: result.pharmacy,
    };

    if (rememberMe && safeStorage && safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = safeStorage.encryptString(session.token).toString('base64');
        db.saveSetting('remembered_session', encrypted);
      } catch (err) {
        console.warn('[Auth] Failed to encrypt session with safeStorage:', err);
      }
    } else {
      db.saveSetting('remembered_session', null);
    }

    return {
      success: true,
      user: result.user,
      pharmacy: result.pharmacy,
    };
  });

  ipcMain.handle('auth:logout', async () => {
    if (activeSession) {
      db.deleteSession(activeSession.token);
      activeSession = null;
    }
    db.saveSetting('remembered_session', null);
    return { success: true };
  });

  ipcMain.handle('auth:getUsers', async () => {
    assertAdmin();
    return db.getUsers(activeSession.pharmacy.id);
  });

  ipcMain.handle('auth:createUser', async (_, userData) => {
    assertAdmin();
    return db.createUser({ ...userData, pharmacyId: activeSession.pharmacy.id });
  });

  ipcMain.handle('auth:deactivateUser', async (_, userId) => {
    assertAdmin();
    if (userId === activeSession.user.id) {
      return { success: false, error: 'Cannot deactivate your own active administrator account.' };
    }
    return db.deactivateUser(userId, activeSession.pharmacy.id);
  });

  ipcMain.handle('auth:activateUser', async (_, userId) => {
    assertAdmin();
    return db.activateUser(userId, activeSession.pharmacy.id);
  });

  ipcMain.handle('auth:resetPassword', async (_, { userId, newPassword }) => {
    assertAdmin();
    return db.resetPassword(userId, newPassword);
  });

  ipcMain.handle('auth:updatePharmacyProfile', async (_, payload) => {
    assertAdmin();
    return db.updatePharmacyProfile(activeSession.pharmacy.id, payload);
  });

  const handleDbIpc = (channel, handler) => {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (err) {
        console.error(`Error in IPC ${channel}:`, err);
        return { success: false, error: err?.message || 'Database operation failed' };
      }
    });
  };

  // Protected Database Operations with Strict Role Permissions & Pharmacy Scoping
  handleDbIpc('db:getAllData', async () => {
    assertPermission('db:getAllData');
    return db.getAllData(activeSession.pharmacy.id);
  });

  handleDbIpc('db:saveProduct', async (_, product) => {
    assertPermission('db:saveProduct');
    return db.saveProduct(product, activeSession.pharmacy.id);
  });

  handleDbIpc('db:saveBatch', async (_, batch) => {
    assertPermission('db:saveBatch');
    return db.saveBatch(batch, activeSession.pharmacy.id);
  });

  handleDbIpc('db:createBatch', async (_, batch) => {
    assertPermission('db:createBatch');
    return db.createBatch(batch, activeSession.pharmacy.id);
  });

  handleDbIpc('db:updateBatchMetadata', async (_, batch) => {
    assertPermission('db:updateBatchMetadata');
    return db.updateBatchMetadata(batch, activeSession.pharmacy.id);
  });

  handleDbIpc('db:receiveStock', async (_, payload) => {
    assertPermission('db:receiveStock');
    return db.receiveStock(payload, activeSession.user, activeSession.pharmacy.id);
  });

  handleDbIpc('db:adjustStock', async (_, payload) => {
    assertPermission('db:adjustStock');
    return db.adjustStock(payload, activeSession.user, activeSession.pharmacy.id);
  });

  handleDbIpc('db:createInvoice', async (_, payload) => {
    assertPermission('db:createInvoice');
    const invoice = payload?.invoice || payload;
    const auditEntries = payload?.auditEntries || [];
    return db.createInvoice(
      {
        ...invoice,
        pharmacyId: activeSession.pharmacy.id,
        cashierName: activeSession.user.fullName || activeSession.user.username,
      },
      (auditEntries || []).map((a) => ({
        ...a,
        pharmacyId: activeSession.pharmacy.id,
        operatorName: activeSession.user.fullName || activeSession.user.username,
        operatorRole: activeSession.user.role,
      })),
      activeSession.pharmacy.id
    );
  });

  handleDbIpc('db:cancelInvoice', async (_, { invoiceId, reason, rollbackEntries }) => {
    assertPermission('db:cancelInvoice');
    return db.cancelInvoice(
      invoiceId,
      reason,
      (rollbackEntries || []).map((r) => ({
        ...r,
        pharmacyId: activeSession.pharmacy.id,
        operatorName: activeSession.user.fullName || activeSession.user.username,
        operatorRole: activeSession.user.role,
      })),
      activeSession.pharmacy.id,
      activeSession.user
    );
  });

  handleDbIpc('db:updateInvoicePaymentMethod', async (_, { invoiceId, newPaymentMethod }) => {
    assertPermission('db:updateInvoicePaymentMethod');
    return db.updateInvoicePaymentMethod(invoiceId, newPaymentMethod, activeSession.pharmacy.id);
  });

  handleDbIpc('db:recordStockAdjustment', async (_, adjustment) => {
    assertPermission('db:recordStockAdjustment');
    return db.recordStockAdjustment(adjustment, activeSession.pharmacy.id, activeSession.user);
  });

  handleDbIpc('db:saveVendor', async (_, vendor) => {
    assertPermission('db:saveVendor');
    return db.saveVendor(vendor, activeSession.pharmacy.id);
  });

  handleDbIpc('db:logDpdp', async (_, entry) => {
    assertPermission('db:logDpdp');
    return db.logDpdp({
      ...entry,
      pharmacyId: activeSession.pharmacy.id,
      operatorName: activeSession.user.fullName || activeSession.user.username,
    });
  });

  handleDbIpc('db:saveSetting', async (_, { key, val }) => {
    assertPermission('db:saveSetting');
    if (key === 'remembered_session') {
      throw new Error("Forbidden: 'remembered_session' is reserved for main process credential management.");
    }
    if (!ALLOWED_SETTINGS_KEYS.has(key)) {
      throw new Error(`Forbidden: Setting key '${key}' is not permitted for renderer modification.`);
    }
    return db.saveSetting(key, val);
  });

  handleDbIpc('db:postPurchaseReceipt', async (_, receipt) => {
    assertPermission('db:postPurchaseReceipt');
    return db.postPurchaseReceipt(receipt, activeSession.user, activeSession.pharmacy.id);
  });

  handleDbIpc('db:confirmGrn', async (_, grnId) => {
    assertPermission('db:confirmGrn');
    return db.confirmGrn(grnId, activeSession.pharmacy.id, activeSession.user);
  });

  handleDbIpc('db:cancelGrn', async (_, data) => {
    assertPermission('db:cancelGrn');
    const grnId = typeof data === 'string' ? data : data?.grnId;
    const reason = typeof data === 'string' ? 'Cancelled by operator' : (data?.reason || 'Cancelled by operator');
    return db.cancelGrn(grnId, reason, activeSession.pharmacy.id, activeSession.user);
  });

  handleDbIpc('db:postPurchaseReturn', async (_, params) => {
    assertPermission('db:postPurchaseReturn');
    return db.postPurchaseReturn(params, activeSession.user, activeSession.pharmacy.id);
  });

  handleDbIpc('db:getPurchaseReceipts', async () => {
    assertPermission('db:getPurchaseReceipts');
    return db.getPurchaseReceipts(activeSession.pharmacy.id);
  });

  handleDbIpc('db:saveBackupSnapshot', async (_, snapshot) => {
    assertPermission('db:saveBackupSnapshot');
    return db.saveBackupSnapshot({ ...snapshot, pharmacyId: activeSession.pharmacy.id });
  });

  handleDbIpc('db:restoreBackup', async (_, backupData) => {
    assertPermission('db:restoreBackup');
    return db.restoreBackup(backupData, activeSession.pharmacy.id);
  });

  ipcMain.handle('print:receipt', async (_, options = {}) => {
    if (!mainWindow) return { success: false, error: 'Window not available' };
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: options.silent || false,
          printBackground: true,
          deviceName: options.deviceName || '',
        },
        (success, failureReason) => {
          if (!success) {
            resolve({ success: false, error: failureReason });
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  ipcMain.handle('app:getInfo', async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      dbPath: path.join(app.getPath('userData'), 'jeeva_pharmacy.db'),
      userDataPath: app.getPath('userData'),
      isOffline: true,
    };
  });

  ipcMain.handle('app:openFolder', async (_, targetPath) => {
    const defaultPath = app.getPath('userData');
    let resolved = defaultPath;
    if (typeof targetPath === 'string' && targetPath.trim()) {
      try {
        const candidate = path.resolve(targetPath);
        // Disallow UNC or remote network shares to prevent NTLM leak / arbitrary execution
        if (candidate.startsWith('\\\\') || candidate.startsWith('//')) {
          return { success: false, error: 'Remote network paths are not allowed' };
        }
        const stat = fs.statSync(candidate);
        const folder = stat.isDirectory() ? candidate : path.dirname(candidate);

        // Restrict to safe user locations (userData, documents, downloads, desktop)
        const allowedRoots = [
          app.getPath('userData'),
          app.getPath('documents'),
          app.getPath('downloads'),
          app.getPath('desktop'),
        ].map((p) => path.normalize(p).toLowerCase());

        const normalizedFolder = path.normalize(folder).toLowerCase();
        const isAllowed = allowedRoots.some((root) => normalizedFolder.startsWith(root));
        if (isAllowed) {
          resolved = folder;
        } else {
          resolved = defaultPath;
        }
      } catch {
        resolved = defaultPath;
      }
    }
    await shell.openPath(resolved);
    return { success: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Pristine — Indian Retail Pharmacy Management & POS System',
    backgroundColor: '#f4f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.maximize();

  // Allow F12 or Ctrl+Shift+I to toggle DevTools only in development/unpackaged builds
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (!app?.isPackaged) {
        mainWindow.webContents.toggleDevTools();
      }
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console ${level}] ${message} (${sourceId}:${line})`);
    if (level >= 2) {
      logCrash(new Error(`[Renderer ${level}] ${message} (${sourceId}:${line})`), 'RendererError');
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Renderer FailLoad] ${errorCode}: ${errorDescription} (${validatedURL})`);
    logCrash(new Error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`), 'FailLoad');
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  // Prevent renderer from navigating away from the local application
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (devServerUrl && navigationUrl.startsWith(devServerUrl)) {
      return;
    }
    if (!navigationUrl.startsWith('file:')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

if (isElectronRuntime) {
  app.whenReady().then(() => {
    try {
      initializeDatabase();
    } catch (err) {
      logCrash(err, 'initializeDatabase');
      dialog.showErrorBox(
        'Database Error',
        `Failed to initialize local pharmacy database:\n\n${err?.message || err}\n\nPlease check crash.log or contact technical support.`
      );
      return;
    }

    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }).catch(err => {
    logCrash(err, 'app.whenReady');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = {
  PERMISSION_MATRIX,
  ALLOWED_SETTINGS_KEYS,
  assertAuthenticated,
  assertAdmin,
  assertPermission,
  registerIpcHandlers,
  getActiveSession: () => activeSession,
  setActiveSession: (sess) => { activeSession = sess; },
  setDatabase: (d) => { db = d; },
};

