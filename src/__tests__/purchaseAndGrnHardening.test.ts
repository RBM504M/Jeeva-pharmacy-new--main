// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { initDatabase } = require('../../electron/database.cjs');
const {
  PERMISSION_MATRIX,
  assertAuthenticated,
  assertPermission,
  setActiveSession,
} = require('../../electron/main.cjs');

describe('Phase 2: Atomic Purchase and GRN Receiving Hardening', () => {
  let tempDir: string;
  let dbPath: string;
  let db: any;

  const PHARMACY_A = 'pharmacy_alpha';
  const PHARMACY_B = 'pharmacy_beta';

  const VENDOR_A = 'vendor_a_001';
  const VENDOR_B = 'vendor_b_002';
  const PROD_A = 'prod_a_paracetamol';
  const PROD_B = 'prod_b_cetirizine';

  const futureDate = (daysAhead: number = 365) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const pastDate = (daysAgo: number = 30) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jeeva-phase2-test-'));
    dbPath = path.join(tempDir, 'test_phase2.db');
    db = initDatabase(dbPath);

    // Setup two distinct pharmacies
    const now = new Date().toISOString();
    db.db.prepare(`
      INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(PHARMACY_A, 'Alpha Pharmacy', 'DL-A-01', '33AAAAA0000A1Z1', 'Alpha St', '9840111111', 'a@test.com', 'TN', '600001', now, now);

    db.db.prepare(`
      INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(PHARMACY_B, 'Beta Pharmacy', 'DL-B-02', '33BBBBB0000B2Z2', 'Beta St', '9840222222', 'b@test.com', 'TN', '600002', now, now);

    // Setup Vendors using db.saveVendor
    db.saveVendor({
      id: VENDOR_A,
      pharmacyId: PHARMACY_A,
      companyName: 'MedSupply Distributors',
      contactPerson: 'Ramesh',
      phone: '9876543210',
      email: 'med@test.com',
      gstin: '33AAAAA9999A1Z9',
      drugLicenseNumber: 'DL-V-01',
      state: 'Tamil Nadu',
      creditPeriodDays: 30,
      balanceDue: 0,
      isActive: true,
    }, PHARMACY_A);

    db.saveVendor({
      id: VENDOR_B,
      pharmacyId: PHARMACY_B,
      companyName: 'HealthCorp Logistics',
      contactPerson: 'Suresh',
      phone: '9876543211',
      email: 'health@test.com',
      gstin: '33BBBBB9999B2Z9',
      drugLicenseNumber: 'DL-V-02',
      state: 'Tamil Nadu',
      creditPeriodDays: 30,
      balanceDue: 0,
      isActive: true,
    }, PHARMACY_B);

    // Setup Products using db.saveProduct
    db.saveProduct({
      id: PROD_A,
      pharmacyId: PHARMACY_A,
      name: 'Paracetamol 650mg',
      genericComposition: 'Paracetamol 650mg',
      manufacturer: 'Apex Labs',
      hsnCode: '30049099',
      barcode: '8901111111111',
      stripSize: 10,
      drugSchedule: 'OTC',
      reorderLevelUnits: 50,
      defaultGstRate: 12,
      rackLocation: 'Rack A-1',
      isActive: true,
    }, PHARMACY_A);

    db.saveProduct({
      id: PROD_B,
      pharmacyId: PHARMACY_B,
      name: 'Cetirizine 10mg',
      genericComposition: 'Cetirizine Hydrochloride',
      manufacturer: 'Cipla',
      hsnCode: '30049060',
      barcode: '8902222222222',
      stripSize: 15,
      drugSchedule: 'SCHEDULE_H',
      reorderLevelUnits: 20,
      defaultGstRate: 12,
      rackLocation: 'Rack B-2',
      isActive: true,
    }, PHARMACY_B);

    setActiveSession(null);
  });

  afterEach(() => {
    setActiveSession(null);
    try {
      if (db && db.close) db.close();
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. IPC Permission Boundaries for Purchase & GRN Channels', () => {
    it('restricts db:postPurchaseReceipt, db:confirmGrn, db:cancelGrn, db:postPurchaseReturn to ADMIN and PHARMACIST', () => {
      // Unauthenticated
      setActiveSession(null);
      expect(() => assertPermission('db:postPurchaseReceipt')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:confirmGrn')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:cancelGrn')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:postPurchaseReturn')).toThrow(/Unauthenticated/);
      expect(() => assertPermission('db:getPurchaseReceipts')).toThrow(/Unauthenticated/);

      // Cashier
      setActiveSession({
        user: { id: 'u_cash', username: 'cashier', fullName: 'Cashier 1', role: 'CASHIER' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      });
      expect(() => assertPermission('db:postPurchaseReceipt')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:confirmGrn')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:cancelGrn')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:postPurchaseReturn')).toThrow(/Unauthorized/);
      // Cashier CAN view purchase receipts
      expect(() => assertPermission('db:getPurchaseReceipts')).not.toThrow();

      // Pharmacy Assistant
      setActiveSession({
        user: { id: 'u_asst', username: 'assistant', fullName: 'Assistant 1', role: 'PHARMACY_ASSISTANT' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      });
      expect(() => assertPermission('db:postPurchaseReceipt')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:confirmGrn')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:cancelGrn')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:postPurchaseReturn')).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:getPurchaseReceipts')).toThrow(/Unauthorized/);

      // Pharmacist
      setActiveSession({
        user: { id: 'u_pharm', username: 'pharmacist', fullName: 'Pharmacist 1', role: 'PHARMACIST' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      });
      expect(() => assertPermission('db:postPurchaseReceipt')).not.toThrow();
      expect(() => assertPermission('db:confirmGrn')).not.toThrow();
      expect(() => assertPermission('db:cancelGrn')).not.toThrow();
      expect(() => assertPermission('db:postPurchaseReturn')).not.toThrow();
      expect(() => assertPermission('db:getPurchaseReceipts')).not.toThrow();

      // Admin
      setActiveSession({
        user: { id: 'u_admin', username: 'admin', fullName: 'Admin User', role: 'ADMIN' },
        pharmacy: { id: PHARMACY_A, name: 'Alpha Pharmacy' },
      });
      expect(() => assertPermission('db:postPurchaseReceipt')).not.toThrow();
      expect(() => assertPermission('db:confirmGrn')).not.toThrow();
      expect(() => assertPermission('db:cancelGrn')).not.toThrow();
      expect(() => assertPermission('db:postPurchaseReturn')).not.toThrow();
      expect(() => assertPermission('db:getPurchaseReceipts')).not.toThrow();
    });
  });

  describe('2. Direct Purchase Receipt Posting (postPurchaseReceipt)', () => {
    it('creates batches, updates stock, writes stock audit logs, and increments vendor balance for credit purchases', () => {
      const expDate = futureDate(365);
      const payload = {
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-2026-001',
        grnNumber: 'GRN-2026-001',
        grnDate: new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-PCM-01',
            quantityStrips: 50,
            freeStrips: 5,
            rejectedStrips: 0,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            discountPercent: 5,
            gstRate: 12,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      };

      const result = db.postPurchaseReceipt(payload, { fullName: 'Lead Pharmacist', role: 'PHARMACIST' }, PHARMACY_A);
      expect(result.success).toBe(true);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.grnNumber).toBe('GRN-2026-001');
      expect(result.receipt.status).toBe('POSTED_TO_STOCK');
      expect(result.receipt.items.length).toBe(1);

      // Verify batch created with acceptedStrips = 50 + 5 = 55 strips * 10 = 550 tablets
      const batch = db.db.prepare('SELECT * FROM batches WHERE productId = ? AND batchNumber = ?').get(PROD_A, 'BATCH-PCM-01');
      expect(batch).toBeDefined();
      expect(batch.totalTablets).toBe(550);
      expect(batch.costPricePerStrip).toBe(20);
      expect(batch.mrpPerStrip).toBe(30);

      // Verify stock audit log
      const audit = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ?').get(batch.id);
      expect(audit).toBeDefined();
      expect(audit.adjustmentType).toBe('INWARD_PURCHASE');
      expect(audit.previousStockTablets).toBe(0);
      expect(audit.newStockTablets).toBe(550);
      expect(audit.quantityChangeTablets).toBe(550);
      expect(audit.referenceNumber).toBe('GRN-2026-001');

      // Verify vendor balance updated for credit purchase
      // Subtotal = 50 * 20 = 1000, 5% disc = 50, taxable = 950, 12% gst = 114 -> grandTotal = 1064
      const vendor = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendor.balanceDue).toBe(1064);

      // Verify purchase_receipt_items normalized table
      const receiptItems = db.db.prepare('SELECT * FROM purchase_receipt_items WHERE receiptId = ?').all(result.receipt.id);
      expect(receiptItems.length).toBe(1);
      expect(receiptItems[0].quantityStrips).toBe(50);
      expect(receiptItems[0].freeStrips).toBe(5);
      expect(receiptItems[0].acceptedStrips).toBe(55);
      expect(receiptItems[0].costPricePerStrip).toBe(20);
    });

    it('increments existing batch stock and records correct previous/new stock in audit log', () => {
      const expDate = futureDate(300);

      // First receipt
      const res1 = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-A-101',
        grnNumber: 'GRN-A-101',
        status: 'POSTED_TO_STOCK',
        paymentStatus: 'PAID',
        paymentMode: 'BANK_TRANSFER',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-REPEAT-01',
            quantityStrips: 20,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, { fullName: 'Admin' }, PHARMACY_A);
      expect(res1.success).toBe(true);

      const batchBefore = db.db.prepare('SELECT * FROM batches WHERE productId = ? AND batchNumber = ?').get(PROD_A, 'BATCH-REPEAT-01');
      expect(batchBefore.totalTablets).toBe(200);

      // Second receipt for the same batch
      const res2 = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-A-102',
        grnNumber: 'GRN-A-102',
        status: 'POSTED_TO_STOCK',
        paymentStatus: 'PAID',
        paymentMode: 'BANK_TRANSFER',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-REPEAT-01',
            quantityStrips: 30,
            freeStrips: 2,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, { fullName: 'Admin' }, PHARMACY_A);
      expect(res2.success).toBe(true);

      const batchAfter = db.db.prepare('SELECT * FROM batches WHERE productId = ? AND batchNumber = ?').get(PROD_A, 'BATCH-REPEAT-01');
      // 200 + (32 * 10) = 520
      expect(batchAfter.totalTablets).toBe(520);

      // Check the latest audit log
      const logs = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ? ORDER BY id DESC').all(batchAfter.id);
      expect(logs.length).toBe(2);
      const latestLog = logs[0];
      expect(latestLog.previousStockTablets).toBe(200);
      expect(latestLog.newStockTablets).toBe(520);
      expect(latestLog.quantityChangeTablets).toBe(320);
    });

    it('does not alter vendor balance when paymentStatus is PAID', () => {
      const expDate = futureDate(365);
      const res = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-PAID-01',
        grnNumber: 'GRN-PAID-01',
        status: 'POSTED_TO_STOCK',
        paymentStatus: 'PAID',
        paymentMode: 'NEFT',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-PAID-01',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_A);
      expect(res.success).toBe(true);

      const vendor = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendor.balanceDue).toBe(0);
    });

    it('does not increment batch stock or vendor balance when status is PENDING_CONFIRMATION', () => {
      const expDate = futureDate(365);
      const res = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-PENDING-01',
        grnNumber: 'GRN-PENDING-01',
        status: 'PENDING_CONFIRMATION',
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-STAGED-01',
            quantityStrips: 25,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);
      expect(res.success).toBe(true);

      // Verify batch was NOT created yet
      const batch = db.db.prepare('SELECT * FROM batches WHERE productId = ? AND batchNumber = ?').get(PROD_A, 'BATCH-STAGED-01');
      expect(batch).toBeUndefined();

      // Verify vendor balance was NOT updated yet
      const vendor = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendor.balanceDue).toBe(0);

      // Receipt is stored with PENDING_CONFIRMATION
      const receipt = db.db.prepare('SELECT * FROM purchase_receipts WHERE grnNumber = ?').get('GRN-PENDING-01');
      expect(receipt.status).toBe('PENDING_CONFIRMATION');
    });
  });

  describe('3. Validation Guards and Duplicate Prevention', () => {
    const validItem = () => ({
      productId: PROD_A,
      batchNumber: 'BATCH-VALID-01',
      quantityStrips: 10,
      costPricePerStrip: 20,
      mrpPerStrip: 30,
      expiryDate: futureDate(365),
      packing: 10,
    });

    it('rejects duplicate supplier invoice number under the same vendor', () => {
      const first = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'SUPP-INV-999',
        grnNumber: 'GRN-D1',
        status: 'POSTED_TO_STOCK',
        items: [validItem()],
      }, {}, PHARMACY_A);
      expect(first.success).toBe(true);

      const duplicate = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'SUPP-INV-999',
        grnNumber: 'GRN-D2',
        status: 'POSTED_TO_STOCK',
        items: [validItem()],
      }, {}, PHARMACY_A);
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toMatch(/Duplicate supplier invoice/);
    });

    it('rejects duplicate GRN number', () => {
      const first = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-GRN-1',
        grnNumber: 'GRN-UNIQUE-01',
        status: 'POSTED_TO_STOCK',
        items: [validItem()],
      }, {}, PHARMACY_A);
      expect(first.success).toBe(true);

      const duplicate = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-GRN-2',
        grnNumber: 'GRN-UNIQUE-01',
        status: 'POSTED_TO_STOCK',
        items: [validItem()],
      }, {}, PHARMACY_A);
      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toMatch(/already exists/);
    });

    it('rejects when pricing is invalid (MRP < cost price)', () => {
      const res = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-PRICE-ERR',
        grnNumber: 'GRN-PRICE-ERR',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            ...validItem(),
            costPricePerStrip: 50,
            mrpPerStrip: 40, // MRP < cost!
          },
        ],
      }, {}, PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/MRP .* cannot be less than cost price/);
    });

    it('rejects already expired stock', () => {
      const res = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-EXP-ERR',
        grnNumber: 'GRN-EXP-ERR',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            ...validItem(),
            expiryDate: pastDate(10), // Expired!
          },
        ],
      }, {}, PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/already expired/);
    });

    it('rejects negative quantities or rejected > received + free', () => {
      const negativeQty = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-NEG-1',
        grnNumber: 'GRN-NEG-1',
        items: [{ ...validItem(), quantityStrips: -5 }],
      }, {}, PHARMACY_A);
      expect(negativeQty.success).toBe(false);
      expect(negativeQty.error).toMatch(/Quantities cannot be negative/);

      const overRejected = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-REJ-1',
        grnNumber: 'GRN-REJ-1',
        items: [{ ...validItem(), quantityStrips: 10, freeStrips: 2, rejectedStrips: 15 }],
      }, {}, PHARMACY_A);
      expect(overRejected.success).toBe(false);
      expect(overRejected.error).toMatch(/Rejected quantity cannot exceed/);
    });

    it('rejects batch conflict when existing batch has a different vendor or differing expiry (> 30 days)', () => {
      const expDate = futureDate(365);
      // Create initial batch under VENDOR_A
      const first = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-INIT-01',
        grnNumber: 'GRN-INIT-01',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-CONFLICT-TEST',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_A);
      expect(first.success).toBe(true);

      // Attempt receiving same batch under a different expiry (> 30 days)
      const diffExpiry = futureDate(365 + 60);
      const conflictExpiry = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-EXP-CONFLICT',
        grnNumber: 'GRN-EXP-CONFLICT',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-CONFLICT-TEST',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: diffExpiry,
          },
        ],
      }, {}, PHARMACY_A);
      expect(conflictExpiry.success).toBe(false);
      expect(conflictExpiry.error).toMatch(/Conflicting batch details/);
    });

    it('rolls back completely if any line in a multi-item receipt fails validation', () => {
      const res = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-MULTI-FAIL',
        grnNumber: 'GRN-MULTI-FAIL',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-LINE-1-OK',
            quantityStrips: 20,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: futureDate(365),
          },
          {
            productId: PROD_A,
            batchNumber: 'BATCH-LINE-2-BAD',
            quantityStrips: 10,
            costPricePerStrip: 50,
            mrpPerStrip: 30, // MRP < cost -> failure!
            expiryDate: futureDate(365),
          },
        ],
      }, {}, PHARMACY_A);

      expect(res.success).toBe(false);

      // Verify line 1 batch was NEVER created!
      const batch1 = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-LINE-1-OK');
      expect(batch1).toBeUndefined();

      // Verify receipt was NOT created
      const receipt = db.db.prepare('SELECT * FROM purchase_receipts WHERE grnNumber = ?').get('GRN-MULTI-FAIL');
      expect(receipt).toBeUndefined();
    });
  });

  describe('4. GRN Confirmation (confirmGrn) & Idempotency', () => {
    it('confirms a PENDING_CONFIRMATION GRN, posts stock, updates vendor balance, and is idempotent on repeat calls', () => {
      const expDate = futureDate(300);
      const stageRes = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-STAGE-01',
        grnNumber: 'GRN-STAGE-01',
        status: 'PENDING_CONFIRMATION',
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-CONFIRM-01',
            quantityStrips: 40,
            freeStrips: 4,
            rejectedStrips: 2, // accepted = 42 strips
            costPricePerStrip: 25,
            mrpPerStrip: 35,
            discountPercent: 10,
            gstRate: 12,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);
      expect(stageRes.success).toBe(true);
      const grnId = stageRes.receipt.id;

      // 1. Confirm GRN
      const confirmRes = db.confirmGrn(grnId, PHARMACY_A, { fullName: 'Pharmacist John', role: 'PHARMACIST' });
      expect(confirmRes.success).toBe(true);
      expect(confirmRes.receipt.status).toBe('POSTED_TO_STOCK');

      // Check stock created: 42 strips * 10 = 420 tabs
      const batch = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-CONFIRM-01');
      expect(batch).toBeDefined();
      expect(batch.totalTablets).toBe(420);

      // Check vendor balance updated:
      // Subtotal: 40 * 25 = 1000, 10% disc = 100, taxable = 900, 12% gst = 108 -> grandTotal = 1008
      const vendorAfterConfirm = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorAfterConfirm.balanceDue).toBe(1008);

      // Check audit log
      const audit = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ?').get(batch.id);
      expect(audit).toBeDefined();
      expect(audit.newStockTablets).toBe(420);

      // 2. Repeat confirmGrn (IDEMPOTENCY TEST)
      const repeatRes = db.confirmGrn(grnId, PHARMACY_A, { fullName: 'Pharmacist John' });
      expect(repeatRes.success).toBe(true);
      expect(repeatRes.message).toMatch(/already been confirmed/);

      // Verify stock was NOT doubled!
      const batchAfterRepeat = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-CONFIRM-01');
      expect(batchAfterRepeat.totalTablets).toBe(420);

      // Verify vendor balance was NOT doubled!
      const vendorAfterRepeat = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorAfterRepeat.balanceDue).toBe(1008);
    });

    it('rejects confirmation if GRN is cancelled', () => {
      const stageRes = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-TO-CANCEL-01',
        grnNumber: 'GRN-TO-CANCEL-01',
        status: 'PENDING_CONFIRMATION',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-TC-01',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: futureDate(365),
          },
        ],
      }, {}, PHARMACY_A);
      const grnId = stageRes.receipt.id;

      // Cancel it
      const cancelRes = db.cancelGrn(grnId, 'Supplier order cancelled', PHARMACY_A, {});
      expect(cancelRes.success).toBe(true);

      // Attempt to confirm
      const confirmRes = db.confirmGrn(grnId, PHARMACY_A, {});
      expect(confirmRes.success).toBe(false);
      expect(confirmRes.error).toMatch(/Cannot confirm a cancelled GRN/);
    });
  });

  describe('5. GRN Cancellation (cancelGrn) & Over-Dispensation Guard', () => {
    it('cancels a POSTED_TO_STOCK GRN, reverses batch stock and vendor balance, and writes reversal audit log', () => {
      const expDate = futureDate(365);
      const postRes = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-REVERSE-01',
        grnNumber: 'GRN-REVERSE-01',
        status: 'POSTED_TO_STOCK',
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-REV-01',
            quantityStrips: 20,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);
      const grnId = postRes.receipt.id;

      const batchBefore = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-REV-01');
      expect(batchBefore.totalTablets).toBe(200);

      const vendorBefore = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorBefore.balanceDue).toBeGreaterThan(0);

      // Cancel the GRN
      const cancelRes = db.cancelGrn(grnId, 'Damaged during unloading', PHARMACY_A, { fullName: 'Auditor' });
      expect(cancelRes.success).toBe(true);

      // Verify stock reversed to 0
      const batchAfter = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-REV-01');
      expect(batchAfter.totalTablets).toBe(0);

      // Verify vendor balance reversed back to 0
      const vendorAfter = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorAfter.balanceDue).toBe(0);

      // Verify cancellation audit log recorded
      const logs = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ? ORDER BY rowid DESC').all(batchBefore.id);
      expect(logs[0].adjustmentType).toBe('ADJUSTMENT_OUT');
      expect(logs[0].reason).toMatch(/Cancelled GRN/);

      // Verify receipt marked CANCELLED
      const receipt = db.db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(grnId);
      expect(receipt.status).toBe('CANCELLED');
      expect(receipt.cancelReason).toBe('Damaged during unloading');
    });

    it('rejects GRN cancellation if stock has already been dispensed/sold below received quantity', () => {
      const expDate = futureDate(365);
      const postRes = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-SOLD-01',
        grnNumber: 'GRN-SOLD-01',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-SOLD-01',
            quantityStrips: 10, // 100 tablets received
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);
      const grnId = postRes.receipt.id;

      const batch = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-SOLD-01');
      expect(batch.totalTablets).toBe(100);

      // Simulate POS sale dispensing 50 tablets from this batch
      db.db.prepare('UPDATE batches SET totalTablets = ? WHERE id = ?').run(50, batch.id);

      // Attempt to cancel the GRN (which needs to deduct 100 tablets)
      const cancelRes = db.cancelGrn(grnId, 'Supplier recall', PHARMACY_A, {});
      expect(cancelRes.success).toBe(false);
      expect(cancelRes.error).toMatch(/has already been dispensed\/sold/);

      // Verify batch stock was preserved at 50 (transaction aborted)
      const batchCheck = db.db.prepare('SELECT * FROM batches WHERE id = ?').get(batch.id);
      expect(batchCheck.totalTablets).toBe(50);

      // Verify receipt remains POSTED_TO_STOCK
      const receipt = db.db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(grnId);
      expect(receipt.status).toBe('POSTED_TO_STOCK');
    });
  });

  describe('6. Purchase Return (postPurchaseReturn / Debit Note)', () => {
    it('decrements batch stock, reduces vendor balance, and creates VENDOR_RETURN audit log', () => {
      const expDate = futureDate(365);
      // Inward initial stock on credit
      const postRes = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-RET-01',
        grnNumber: 'GRN-RET-01',
        status: 'POSTED_TO_STOCK',
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-RET-01',
            quantityStrips: 20, // 200 tabs @ 20/strip = 2/tab
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            discountPercent: 0,
            gstRate: 0,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);

      const batch = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-RET-01');
      const vendorBefore = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorBefore.balanceDue).toBe(400);

      // Perform Return of 50 tablets
      const returnRes = db.postPurchaseReturn({
        productId: PROD_A,
        batchId: batch.id,
        vendorId: VENDOR_A,
        returnTablets: 50,
        reason: 'Near-expiry stock return',
        debitNoteNumber: 'DN-2026-001',
      }, { fullName: 'Pharmacist Ravi', role: 'PHARMACIST' }, PHARMACY_A);

      expect(returnRes.success).toBe(true);

      // Verify batch stock decremented: 200 - 50 = 150
      const batchAfter = db.db.prepare('SELECT * FROM batches WHERE id = ?').get(batch.id);
      expect(batchAfter.totalTablets).toBe(150);

      // Verify vendor balance credited: 50 tabs * 2/tab = 100 credited -> 400 - 100 = 300
      const vendorAfter = db.db.prepare('SELECT * FROM vendors WHERE id = ?').get(VENDOR_A);
      expect(vendorAfter.balanceDue).toBe(300);

      // Verify audit log
      const logs = db.db.prepare('SELECT * FROM stock_audit_logs WHERE batchId = ? AND adjustmentType = ?').all(batch.id, 'VENDOR_RETURN');
      expect(logs.length).toBe(1);
      expect(logs[0].quantityChangeTablets).toBe(-50);
      expect(logs[0].previousStockTablets).toBe(200);
      expect(logs[0].newStockTablets).toBe(150);
      expect(logs[0].referenceNumber).toBe('DN-2026-001');
    });

    it('rejects return if return quantity exceeds available batch stock', () => {
      const expDate = futureDate(365);
      db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-OVER-RET',
        grnNumber: 'GRN-OVER-RET',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-OVER-RET',
            quantityStrips: 5, // 50 tabs
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
            packing: 10,
          },
        ],
      }, {}, PHARMACY_A);

      const batch = db.db.prepare('SELECT * FROM batches WHERE batchNumber = ?').get('BATCH-OVER-RET');

      const returnRes = db.postPurchaseReturn({
        productId: PROD_A,
        batchId: batch.id,
        vendorId: VENDOR_A,
        returnTablets: 60, // Exceeds 50!
        reason: 'Excess return',
      }, {}, PHARMACY_A);

      expect(returnRes.success).toBe(false);
      expect(returnRes.error).toMatch(/Cannot return 60 tablets. Available batch stock is 50 tablets/);
    });
  });

  describe('7. Cross-Tenant Pharmacy Isolation', () => {
    it('prevents Pharmacy A from inwarding stock for Pharmacy B products or vendors', () => {
      const expDate = futureDate(365);

      // Pharmacy A trying to use Pharmacy B's vendor
      const badVendor = db.postPurchaseReceipt({
        vendorId: VENDOR_B,
        vendorInvoiceNo: 'INV-CROSS-1',
        grnNumber: 'GRN-CROSS-1',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-CROSS-1',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_A);
      expect(badVendor.success).toBe(false);
      expect(badVendor.error).toMatch(/Vendor belongs to another pharmacy/);

      // Pharmacy A trying to use Pharmacy B's product
      const badProd = db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-CROSS-2',
        grnNumber: 'GRN-CROSS-2',
        items: [
          {
            productId: PROD_B,
            batchNumber: 'BATCH-CROSS-2',
            quantityStrips: 10,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_A);
      expect(badProd.success).toBe(false);
      expect(badProd.error).toMatch(/Product belongs to another pharmacy/);
    });

    it('prevents Pharmacy A from confirming or cancelling Pharmacy B GRNs', () => {
      const expDate = futureDate(365);
      // Inward a GRN in Pharmacy B
      const resB = db.postPurchaseReceipt({
        vendorId: VENDOR_B,
        vendorInvoiceNo: 'INV-B-99',
        grnNumber: 'GRN-B-99',
        status: 'PENDING_CONFIRMATION',
        items: [
          {
            productId: PROD_B,
            batchNumber: 'BATCH-B-99',
            quantityStrips: 10,
            costPricePerStrip: 15,
            mrpPerStrip: 25,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_B);
      expect(resB.success).toBe(true);
      const grnBId = resB.receipt.id;

      // Pharmacy A attempts to confirm Pharmacy B's GRN
      const confirmAttempt = db.confirmGrn(grnBId, PHARMACY_A, {});
      expect(confirmAttempt.success).toBe(false);
      expect(confirmAttempt.error).toMatch(/not found/);

      // Pharmacy A attempts to cancel Pharmacy B's GRN
      const cancelAttempt = db.cancelGrn(grnBId, 'Unauthorized cancel', PHARMACY_A, {});
      expect(cancelAttempt.success).toBe(false);
      expect(cancelAttempt.error).toMatch(/not found/);
    });

    it('strictly isolates getPurchaseReceipts by pharmacyId', () => {
      const expDate = futureDate(365);
      db.postPurchaseReceipt({
        vendorId: VENDOR_A,
        vendorInvoiceNo: 'INV-A-ONLY',
        grnNumber: 'GRN-A-ONLY',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_A,
            batchNumber: 'BATCH-A-ONLY',
            quantityStrips: 5,
            costPricePerStrip: 20,
            mrpPerStrip: 30,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_A);

      db.postPurchaseReceipt({
        vendorId: VENDOR_B,
        vendorInvoiceNo: 'INV-B-ONLY',
        grnNumber: 'GRN-B-ONLY',
        status: 'POSTED_TO_STOCK',
        items: [
          {
            productId: PROD_B,
            batchNumber: 'BATCH-B-ONLY',
            quantityStrips: 5,
            costPricePerStrip: 15,
            mrpPerStrip: 25,
            expiryDate: expDate,
          },
        ],
      }, {}, PHARMACY_B);

      const receiptsA = db.getPurchaseReceipts(PHARMACY_A);
      expect(receiptsA.length).toBe(1);
      expect(receiptsA[0].grnNumber).toBe('GRN-A-ONLY');

      const receiptsB = db.getPurchaseReceipts(PHARMACY_B);
      expect(receiptsB.length).toBe(1);
      expect(receiptsB[0].grnNumber).toBe('GRN-B-ONLY');
    });
  });
});
