const { app, BrowserWindow, ipcMain, shell, safeStorage, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const PharmacyDatabase = require('./database.cjs');

function logCrash(err, context = 'Fatal') {
  console.error(`[${context}]`, err);
  try {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const crashLogPath = path.join(userDataPath, 'crash.log');
    const logEntry = `[${new Date().toISOString()}] [${context}] ${err?.stack || err}\n`;
    fs.appendFileSync(crashLogPath, logEntry, 'utf8');
  } catch {}
}

process.on('uncaughtException', (err) => {
  logCrash(err, 'uncaughtException');
  try {
    dialog.showErrorBox(
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

let mainWindow = null;
let db = null;
let activeSession = null;

function assertAuthenticated() {
  if (!activeSession) {
    throw new Error('Unauthenticated: An active authenticated session is required.');
  }
  return activeSession;
}

function assertAdmin() {
  const session = assertAuthenticated();
  if (session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Administrator privilege required for this operation.');
  }
  return session;
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

  // Protected Database Operations
  ipcMain.handle('db:getAllData', async () => {
    assertAuthenticated();
    return db.getAllData(activeSession.pharmacy.id);
  });

  ipcMain.handle('db:saveProduct', async (_, product) => {
    assertAuthenticated();
    return db.saveProduct({ ...product, pharmacyId: activeSession.pharmacy.id });
  });

  ipcMain.handle('db:saveBatch', async (_, batch) => {
    assertAuthenticated();
    return db.saveBatch(batch);
  });

  ipcMain.handle('db:createInvoice', async (_, payload) => {
    assertAuthenticated();
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
        operatorName: a.operatorName || activeSession.user.fullName || activeSession.user.username,
        operatorRole: a.operatorRole || activeSession.user.role,
      }))
    );
  });

  ipcMain.handle('db:cancelInvoice', async (_, { invoiceId, reason, rollbackEntries }) => {
    assertAuthenticated();
    return db.cancelInvoice(
      invoiceId,
      reason,
      (rollbackEntries || []).map((r) => ({
        ...r,
        pharmacyId: activeSession.pharmacy.id,
        operatorName: activeSession.user.fullName || activeSession.user.username,
        operatorRole: activeSession.user.role,
      }))
    );
  });

  ipcMain.handle('db:updateInvoicePaymentMethod', async (_, { invoiceId, newPaymentMethod }) => {
    assertAuthenticated();
    return db.updateInvoicePaymentMethod(invoiceId, newPaymentMethod);
  });

  ipcMain.handle('db:recordStockAdjustment', async (_, adjustment) => {
    assertAuthenticated();
    return db.recordStockAdjustment({
      ...adjustment,
      pharmacyId: activeSession.pharmacy.id,
      operatorName: activeSession.user.fullName || activeSession.user.username,
      operatorRole: activeSession.user.role,
    });
  });

  ipcMain.handle('db:saveVendor', async (_, vendor) => {
    assertAuthenticated();
    return db.saveVendor({ ...vendor, pharmacyId: activeSession.pharmacy.id });
  });

  ipcMain.handle('db:logDpdp', async (_, entry) => {
    assertAuthenticated();
    return db.logDpdp({
      ...entry,
      pharmacyId: activeSession.pharmacy.id,
      operatorName: activeSession.user.fullName || activeSession.user.username,
    });
  });

  ipcMain.handle('db:saveSetting', async (_, { key, val }) => {
    assertAuthenticated();
    return db.saveSetting(key, val);
  });

  ipcMain.handle('db:saveBackupSnapshot', async (_, snapshot) => {
    assertAdmin();
    return db.saveBackupSnapshot({ ...snapshot, pharmacyId: activeSession.pharmacy.id });
  });

  ipcMain.handle('db:restoreBackup', async (_, backupData) => {
    assertAdmin();
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
        const stat = fs.statSync(candidate);
        resolved = stat.isDirectory() ? candidate : path.dirname(candidate);
      } catch {
        resolved = defaultPath;
      }
    }
    shell.openPath(resolved);
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

  // Allow F12 or Ctrl+Shift+I to toggle DevTools for troubleshooting
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
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

