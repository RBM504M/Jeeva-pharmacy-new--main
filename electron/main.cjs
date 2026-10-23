const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const PharmacyDatabase = require('./database.cjs');

app.setName('Jeeva Pharmacy');
if (process.platform === 'win32') {
  app.setAppUserModelId('in.jeevapharmacy.pos');
}

let mainWindow = null;
let db = null;

function initializeDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'jeeva_pharmacy.db');
  console.log('[SQLite] Database location:', dbPath);

  db = new PharmacyDatabase(dbPath);

  if (db.isDatabaseEmpty()) {
    try {
      const seedFile = path.join(__dirname, 'seedData.json');
      if (fs.existsSync(seedFile)) {
        const seedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        db.seedInitialData(seedData);
        console.log('[SQLite] Seeded initial pharmacy inventory and data successfully.');
      }
    } catch (err) {
      console.error('[SQLite] Failed to load seedData.json:', err);
    }
  }
}

function registerIpcHandlers() {
  ipcMain.handle('db:getAllData', async () => {
    return db.getAllData();
  });

  ipcMain.handle('db:saveProduct', async (_, product) => {
    return db.saveProduct(product);
  });

  ipcMain.handle('db:saveBatch', async (_, batch) => {
    return db.saveBatch(batch);
  });

  ipcMain.handle('db:createInvoice', async (_, invoice) => {
    return db.createInvoice(invoice);
  });

  ipcMain.handle('db:recordStockAdjustment', async (_, adjustment) => {
    return db.recordStockAdjustment(adjustment);
  });

  ipcMain.handle('db:saveVendor', async (_, vendor) => {
    return db.saveVendor(vendor);
  });

  ipcMain.handle('db:logDpdp', async (_, entry) => {
    return db.logDpdp(entry);
  });

  ipcMain.handle('db:saveSetting', async (_, { key, val }) => {
    return db.saveSetting(key, val);
  });

  ipcMain.handle('db:saveBackupSnapshot', async (_, snapshot) => {
    return db.saveBackupSnapshot(snapshot);
  });

  ipcMain.handle('db:restoreBackup', async (_, backupData) => {
    return db.restoreBackup(backupData);
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
    const p = targetPath || app.getPath('userData');
    shell.openPath(p);
    return { success: true };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Jeeva Pharmacy — Indian Retail Pharmacy Management & POS System',
    backgroundColor: '#f4f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.maximize();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
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
  initializeDatabase();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
