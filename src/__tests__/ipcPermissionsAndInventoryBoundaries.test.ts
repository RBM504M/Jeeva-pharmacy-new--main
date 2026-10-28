// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { initDatabase } = require('../../electron/database.cjs');
const {
  PERMISSION_MATRIX,
  ALLOWED_SETTINGS_KEYS,
  assertAuthenticated,
  assertAdmin,
  assertPermission,
  setActiveSession,
  getActiveSession,
} = require('../../electron/main.cjs');

describe('Phase 1: IPC Permissions and Inventory Write Boundaries', () => {
  let tempDir: string;
  let dbPath: string;
  let db: any;

  const PHARMACY_A = 'pharmacy_alpha';
  const PHARMACY_B = 'pharmacy_beta';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jeeva-phase1-test-'));
    dbPath = path.join(tempDir, 'test_phase1.db');
    db = initDatabase(dbPath);

    // Setup two distinct pharmacies in the database
    db.db.prepare(`
      INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(PHARMACY_A, 'Alpha Pharmacy', 'DL-ALPHA-01', '33AAAAA0000A1Z1', '123 Alpha St', '9840111111', 'a@test.com', 'Tamil Nadu', '600001', new Date().toISOString(), new Date().toISOString());

    db.db.prepare(`
      INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(PHARMACY_B, 'Beta Pharmacy', 'DL-BETA-02', '33BBBBB0000B2Z2', '456 Beta St', '9840222222', 'b@test.com', 'Tamil Nadu', '600002', new Date().toISOString(), new Date().toISOString());

    // Reset session before each test
    setActiveSession(null);
  });

  afterEach(() => {
    setActiveSession(null);
    try {
      if (db && db.close) {
        db.close();
      }
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Authentication Gate and Unauthenticated Request Rejection', () => {
    it('rejects unauthenticated requests for all sensitive operations', () => {
      setActiveSession(null);

      expect(() => assertAuthenticated()).toThrow(/Unauthenticated/);
      expect(() => assertAdmin()).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:createInvoice')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:saveBatch')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:cancelInvoice')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:updateInvoicePaymentMethod')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:adjustStock')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:saveSetting')).toThrow(/Unauthenticated/);
    });
  });

  describe('2. Role Permission Matrix Enforcement', () => {
    it('enforces exact role permissions across all operations', () => {
      // Test ADMIN permissions
      const adminSession = {
        user: { id: 'u_admin', username: 'admin', fullName: 'Admin User', role: 'ADMIN' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      };
      setActiveSession(adminSession);

      expect(() => assertPermission('db:createInvoice')).not.toThrow();
      expect(() => assertPermission('db:cancelInvoice')).not.toThrow();
      expect(() => assertPermission('db:updateInvoicePaymentMethod')).not.toThrow();
      expect(() => assertPermission('db:adjustStock')).not.toThrow();
      expect(() => assertPermission('db:receiveStock')).not.toThrow();
      expect(() => assertPermission('db:saveProduct')).not.toThrow();
      expect(() => assertPermission('db:saveBatch')).not.toThrow();
      expect(() => assertPermission('db:saveVendor')).not.toThrow();
      expect(() => assertPermission('db:saveSetting')).not.toThrow();
      expect(() => assertPermission('db:saveBackupSnapshot')).not.toThrow();

      // Test PHARMACIST permissions
      const pharmacistSession = {
        user: { id: 'u_pharm', username: 'pharmacist', fullName: 'Pharmacist User', role: 'PHARMACIST' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      };
      setActiveSession(pharmacistSession);

      expect(() => assertPermission('db:createInvoice')).not.toThrow();
      expect(() => assertPermission('db:cancelInvoice')).not.toThrow();
      expect(() => assertPermission('db:adjustStock')).not.toThrow();
      expect(() => assertPermission('db:receiveStock')).not.toThrow();
      expect(() => assertPermission('db:saveProduct')).not.toThrow();
      expect(() => assertPermission('db:saveBatch')).not.toThrow();
      expect(() => assertPermission('db:saveVendor')).not.toThrow();
      expect(() => assertPermission('db:saveSetting')).not.toThrow();
      // Restricted from admin-only operations:
      expect(() => assertPermission('db:updateInvoicePaymentMethod')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveBackupSnapshot')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:restoreBackup')).toThrow(/Unauthorized/);

      // Test CASHIER permissions
      const cashierSession = {
        user: { id: 'u_cash', username: 'cashier', fullName: 'Cashier User', role: 'CASHIER' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      };
      setActiveSession(cashierSession);

      expect(() => assertPermission('db:createInvoice')).not.toThrow();
      expect(() => assertPermission('db:getAllData')).not.toThrow();
      expect(() => assertPermission('db:logDpdp')).not.toThrow();
      // Cashier CANNOT cancel invoice, adjust stock, save batch, or update payment method
      expect(() => assertPermission('db:cancelInvoice')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:updateInvoicePaymentMethod')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:adjustStock')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:receiveStock')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveProduct')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveBatch')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveVendor')).toThrow(/Unauthorized/);

      // Test PHARMACY_ASSISTANT permissions
      const assistantSession = {
        user: { id: 'u_asst', username: 'assistant', fullName: 'Assistant User', role: 'PHARMACY_ASSISTANT' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      };
      setActiveSession(assistantSession);

      expect(() => assertPermission('db:getAllData')).not.toThrow();
      expect(() => assertPermission('db:logDpdp')).not.toThrow();
      // Assistant CANNOT create invoices, cancel, or adjust inventory
      expect(() => assertPermission('db:createInvoice')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:cancelInvoice')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:updateInvoicePaymentMethod')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:adjustStock')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:receiveStock')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveProduct')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:saveBatch')).toThrow(/Unauthorized/);
    });
  });

  describe('3. Batch Immutability and Inventory Separation', () => {
    it('prevents batch metadata updates or saveBatch from manufacturing or wiping stock', () => {
      // 1. Create a product and batch in Pharmacy A with initial stock 100
      const prodRes = db.saveProduct({
        id: 'prod_para_01',
        pharmacyId: PHARMACY_A,
        name: 'Paracetamol 650mg',
        genericComposition: 'Paracetamol',
        manufacturer: 'Micro Labs',
        hsnCode: '300490',
        barcode: 'BAR-PARA-01',
        stripSize: 10,
        drugSchedule: 'OTC',
      }, PHARMACY_A);
      expect(prodRes.success).toBe(true);

      const createRes = db.createBatch({
        id: 'batch_para_b1',
        productId: 'prod_para_01',
        batchNumber: 'PARA-001',
        expiryDate: '2027-12-31',
        costPricePerStrip: 20,
        mrpPerStrip: 35,
        sellingPricePerStrip: 30,
        gstRate: 12,
        totalTablets: 100,
      }, PHARMACY_A);
      expect(createRes.success).toBe(true);

      // Verify initial stock
      let batch = db.getBatchWithProduct('batch_para_b1');
      expect(batch.totalTablets).toBe(100);

      // 2. Caller attempts to tamper with stock via updateBatchMetadata
      const metaRes = db.updateBatchMetadata({
        id: 'batch_para_b1',
        mrpPerStrip: 40,
        sellingPricePerStrip: 34,
        totalTablets: 999999, // Forged count
      } as any, PHARMACY_A);
      expect(metaRes.success).toBe(true);

      // Stock MUST REMAIN 100
      batch = db.getBatchWithProduct('batch_para_b1');
      expect(batch.totalTablets).toBe(100);
      expect(batch.mrpPerStrip).toBe(40);
      expect(batch.sellingPricePerStrip).toBe(34);

      // 3. Caller attempts to overwrite stock via general saveBatch on existing batch
      const saveRes = db.saveBatch({
        id: 'batch_para_b1',
        productId: 'prod_para_01',
        batchNumber: 'PARA-001',
        expiryDate: '2027-12-31',
        costPricePerStrip: 20,
        mrpPerStrip: 42,
        sellingPricePerStrip: 35,
        totalTablets: 0, // Attempt to zero out stock
      } as any, PHARMACY_A);
      expect(saveRes.success).toBe(true);

      // Stock MUST STILL REMAIN 100
      batch = db.getBatchWithProduct('batch_para_b1');
      expect(batch.totalTablets).toBe(100);
      expect(batch.mrpPerStrip).toBe(42);
    });

    it('requires adjustStock or receiveStock for quantity changes and creates authoritative audit rows', () => {
      db.saveProduct({
        id: 'prod_amox_01',
        pharmacyId: PHARMACY_A,
        name: 'Amoxicillin 500mg',
        genericComposition: 'Amoxicillin',
        manufacturer: 'Cipla',
        hsnCode: '300410',
        barcode: 'BAR-AMX-01',
      }, PHARMACY_A);

      db.createBatch({
        id: 'batch_amox_b1',
        productId: 'prod_amox_01',
        batchNumber: 'AMX-001',
        expiryDate: '2028-06-30',
        totalTablets: 50,
      }, PHARMACY_A);

      const operator = { fullName: 'Dr. Ramesh, Pharmacist', role: 'PHARMACIST' };

      // 1. Inward stock receipt
      const recRes = db.receiveStock({
        batchId: 'batch_amox_b1',
        quantityChangeTablets: 100,
        reason: 'GRN Inward #1001',
      }, operator, PHARMACY_A);

      expect(recRes.success).toBe(true);
      expect(recRes.newStockTablets).toBe(150);

      // Verify batch stock updated
      let batch = db.getBatchWithProduct('batch_amox_b1');
      expect(batch.totalTablets).toBe(150);

      // 2. Stock adjustment deduction
      const adjRes = db.adjustStock({
        batchId: 'batch_amox_b1',
        adjustmentType: 'DAMAGED_DISPOSAL',
        quantityChangeTablets: -10,
        reason: 'Water damaged strips removed',
      }, operator, PHARMACY_A);

      expect(adjRes.success).toBe(true);
      expect(adjRes.newStockTablets).toBe(140);

      batch = db.getBatchWithProduct('batch_amox_b1');
      expect(batch.totalTablets).toBe(140);

      // 3. Reject adjustment that would result in negative stock
      const overRes = db.adjustStock({
        batchId: 'batch_amox_b1',
        adjustmentType: 'MANUAL_DEDUCTION',
        quantityChangeTablets: -200,
      }, operator, PHARMACY_A);

      expect(overRes.success).toBe(false);
      expect(overRes.error).toMatch(/Insufficient stock on hand/);

      // Stock remains 140
      batch = db.getBatchWithProduct('batch_amox_b1');
      expect(batch.totalTablets).toBe(140);

      // 4. Verify audit entries were logged with server-computed before/after stock
      const audits = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ? ORDER BY timestamp ASC').all('batch_amox_b1');
      expect(audits.length).toBeGreaterThanOrEqual(2); // inward, deduction

      const inwardAudit = audits.find((a: any) => a.adjustmentType === 'PURCHASE_INWARD');
      expect(inwardAudit.previousStockTablets).toBe(50);
      expect(inwardAudit.newStockTablets).toBe(150);
      expect(inwardAudit.operatorName).toBe('Dr. Ramesh, Pharmacist');
      expect(inwardAudit.operatorRole).toBe('PHARMACIST');

      const damagedAudit = audits.find((a: any) => a.adjustmentType === 'DAMAGED_DISPOSAL');
      expect(damagedAudit.previousStockTablets).toBe(150);
      expect(damagedAudit.newStockTablets).toBe(140);
    });
  });

  describe('4. Cross-Pharmacy Boundary Protections', () => {
    beforeEach(() => {
      // Setup product and batch in Pharmacy B
      db.saveProduct({
        id: 'prod_beta_01',
        pharmacyId: PHARMACY_B,
        name: 'Beta Tablet 500mg',
        genericComposition: 'Beta Compound',
        manufacturer: 'Beta Pharma',
        hsnCode: '300490',
        barcode: 'BAR-BETA-01',
      }, PHARMACY_B);

      db.createBatch({
        id: 'batch_beta_b1',
        productId: 'prod_beta_01',
        batchNumber: 'BET-001',
        expiryDate: '2028-12-31',
        totalTablets: 50,
      }, PHARMACY_B);

      // Setup invoice in Pharmacy B
      db.createInvoice({
        id: 'inv_beta_01',
        pharmacyId: PHARMACY_B,
        invoiceNumber: 'INV-BETA-0001',
        invoiceDate: new Date().toISOString(),
        prescription: {},
        items: [
          {
            batchId: 'batch_beta_b1',
            quantity: 10,
            unitType: 'TABLET',
            totalTabletsSold: 10,
          },
        ],
        subtotal: 100,
        totalTax: 12,
        grandTotal: 112,
        paymentMethod: 'CASH',
        status: 'PAID',
      }, [], PHARMACY_B);
    });

    it('rejects cross-pharmacy batch updates and adjustments', () => {
      // Pharmacy A operator attempts to adjust Pharmacy B batch
      const adjRes = db.adjustStock({
        batchId: 'batch_beta_b1',
        quantityChangeTablets: 20,
      }, { fullName: 'Attacker' }, PHARMACY_A);

      expect(adjRes.success).toBe(false);
      expect(adjRes.error).toMatch(/Batch belongs to another pharmacy/);

      // Pharmacy A operator attempts to update Pharmacy B batch metadata
      const metaRes = db.updateBatchMetadata({
        id: 'batch_beta_b1',
        mrpPerStrip: 999,
      }, PHARMACY_A);

      expect(metaRes.success).toBe(false);
      expect(metaRes.error).toMatch(/Batch belongs to another pharmacy/);
    });

    it('rejects cross-pharmacy invoice cancellation and payment method modifications', () => {
      // Pharmacy A operator attempts to cancel Pharmacy B invoice
      const cancelRes = db.cancelInvoice('inv_beta_01', 'Unauthorized cancel', [], PHARMACY_A);
      expect(cancelRes.success).toBe(false);
      expect(cancelRes.error).toMatch(/Invoice belongs to another pharmacy/);

      // Pharmacy A operator attempts to change payment method of Pharmacy B invoice
      const payRes = db.updateInvoicePaymentMethod('inv_beta_01', 'UPI', PHARMACY_A);
      expect(payRes.success).toBe(false);
      expect(payRes.error).toMatch(/Invoice belongs to another pharmacy/);
    });

    it('rejects billing/dispensing batches from another pharmacy in createInvoice', () => {
      const crossSaleRes = db.createInvoice({
        id: 'inv_alpha_attack',
        pharmacyId: PHARMACY_A,
        invoiceNumber: 'INV-ALPHA-9999',
        invoiceDate: new Date().toISOString(),
        items: [
          {
            batchId: 'batch_beta_b1', // Foreign pharmacy batch
            quantity: 5,
            unitType: 'TABLET',
          },
        ],
        subtotal: 50,
        totalTax: 6,
        grandTotal: 56,
        paymentMethod: 'CASH',
      }, [], PHARMACY_A);

      expect(crossSaleRes.success).toBe(false);
      expect(crossSaleRes.error).toMatch(/belongs to another pharmacy/);
    });
  });

  describe('5. Settings Allow-List and Reserved Key Security', () => {
    it('blocks modification of remembered_session and arbitrary unauthorized keys', () => {
      // 1. remembered_session is strictly reserved for main process OS vault
      expect(ALLOWED_SETTINGS_KEYS.has('remembered_session')).toBe(false);

      // 2. Known valid settings are permitted
      expect(ALLOWED_SETTINGS_KEYS.has('active_theme')).toBe(true);
      expect(ALLOWED_SETTINGS_KEYS.has('printer_settings')).toBe(true);
      expect(ALLOWED_SETTINGS_KEYS.has('backup_config')).toBe(true);
      expect(ALLOWED_SETTINGS_KEYS.has('navigation_config')).toBe(true);

      // 3. Saving allowed setting works
      const saveRes = db.saveSetting('active_theme', 'theme_emerald_professional');
      expect(saveRes.success).toBe(true);
      expect(db.getSetting('active_theme')).toBe('theme_emerald_professional');
    });
  });
});
