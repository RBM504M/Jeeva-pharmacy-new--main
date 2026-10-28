const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Authentication & Onboarding
  auth: {
    getAuthState: () => ipcRenderer.invoke('auth:getAuthState'),
    setupOnboarding: (payload) => ipcRenderer.invoke('auth:setupOnboarding', payload),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUsers: () => ipcRenderer.invoke('auth:getUsers'),
    createUser: (userData) => ipcRenderer.invoke('auth:createUser', userData),
    deactivateUser: (userId) => ipcRenderer.invoke('auth:deactivateUser', userId),
    activateUser: (userId) => ipcRenderer.invoke('auth:activateUser', userId),
    resetPassword: (payload) => ipcRenderer.invoke('auth:resetPassword', payload),
    updatePharmacyProfile: (payload) => ipcRenderer.invoke('auth:updatePharmacyProfile', payload),
  },

  // Database operations
  getAllData: () => ipcRenderer.invoke('db:getAllData'),
  saveProduct: (product) => ipcRenderer.invoke('db:saveProduct', product),
  saveBatch: (batch) => ipcRenderer.invoke('db:saveBatch', batch),
  createBatch: (batch) => ipcRenderer.invoke('db:createBatch', batch),
  updateBatchMetadata: (batch) => ipcRenderer.invoke('db:updateBatchMetadata', batch),
  receiveStock: (payload) => ipcRenderer.invoke('db:receiveStock', payload),
  adjustStock: (payload) => ipcRenderer.invoke('db:adjustStock', payload),
  createInvoice: (invoice, auditEntries = []) => {
    if (invoice && invoice.invoice) {
      return ipcRenderer.invoke('db:createInvoice', invoice);
    }
    return ipcRenderer.invoke('db:createInvoice', { invoice, auditEntries });
  },
  cancelInvoice: (data) => ipcRenderer.invoke('db:cancelInvoice', data),
  updateInvoicePaymentMethod: (data) => ipcRenderer.invoke('db:updateInvoicePaymentMethod', data),
  recordStockAdjustment: (adjustment) => ipcRenderer.invoke('db:recordStockAdjustment', adjustment),
  saveVendor: (vendor) => ipcRenderer.invoke('db:saveVendor', vendor),
  logDpdp: (entry) => ipcRenderer.invoke('db:logDpdp', entry),
  saveSetting: (key, val) => ipcRenderer.invoke('db:saveSetting', { key, val }),
  saveBackupSnapshot: (snapshot) => ipcRenderer.invoke('db:saveBackupSnapshot', snapshot),
  restoreBackup: (backupData) => ipcRenderer.invoke('db:restoreBackup', backupData),
  postPurchaseReceipt: (receipt) => ipcRenderer.invoke('db:postPurchaseReceipt', receipt),
  confirmGrn: (grnId) => ipcRenderer.invoke('db:confirmGrn', grnId),
  cancelGrn: (data) => ipcRenderer.invoke('db:cancelGrn', data),
  postPurchaseReturn: (params) => ipcRenderer.invoke('db:postPurchaseReturn', params),
  getPurchaseReceipts: () => ipcRenderer.invoke('db:getPurchaseReceipts'),
  postSalesReturn: (payload) => ipcRenderer.invoke('db:postSalesReturn', payload),
  getSalesReturns: () => ipcRenderer.invoke('db:getSalesReturns'),

  // Printing & Hardware
  printReceipt: (options) => ipcRenderer.invoke('print:receipt', options),

  // App & System info
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openFolder: (folderPath) => ipcRenderer.invoke('app:openFolder', folderPath),
});
