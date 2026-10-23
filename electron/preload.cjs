const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  
  // Database operations
  getAllData: () => ipcRenderer.invoke('db:getAllData'),
  saveProduct: (product) => ipcRenderer.invoke('db:saveProduct', product),
  saveBatch: (batch) => ipcRenderer.invoke('db:saveBatch', batch),
  createInvoice: (invoice) => ipcRenderer.invoke('db:createInvoice', invoice),
  recordStockAdjustment: (adjustment) => ipcRenderer.invoke('db:recordStockAdjustment', adjustment),
  saveVendor: (vendor) => ipcRenderer.invoke('db:saveVendor', vendor),
  logDpdp: (entry) => ipcRenderer.invoke('db:logDpdp', entry),
  saveSetting: (key, val) => ipcRenderer.invoke('db:saveSetting', { key, val }),
  saveBackupSnapshot: (snapshot) => ipcRenderer.invoke('db:saveBackupSnapshot', snapshot),
  restoreBackup: (backupData) => ipcRenderer.invoke('db:restoreBackup', backupData),

  // Printing & Hardware
  printReceipt: (options) => ipcRenderer.invoke('print:receipt', options),

  // App & System info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openFolder: (folderPath) => ipcRenderer.invoke('app:openFolder', folderPath),
});
