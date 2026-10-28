// @vitest-environment node
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const { initDatabase } = require('../../electron/database.cjs');
const {
  PERMISSION_MATRIX,
  assertAuthenticated,
  assertPermission,
  setActiveSession,
} = require('../../electron/main.cjs');

describe('Phase 3: POS Sales & Invoice Lifecycle Hardening', () => {
  let tempDbPath: string;
  let db: any;
  const PHARMACY_A = 'pharm_a';
  const PHARMACY_B = 'pharm_b';
  const OPERATOR = { fullName: 'Test Pharmacist', role: 'PHARMACIST', username: 'pharm1' };

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test_pos_hardening_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.db`);
    db = initDatabase(tempDbPath);

    // Setup Product and Batches for testing
    db.saveProduct({
      id: 'prod_paracetamol',
      name: 'Paracetamol 500mg',
      genericComposition: 'Paracetamol',
      stripSize: 10,
      defaultGstRate: 12,
      drugSchedule: 'OTC',
      pharmacyId: PHARMACY_A,
    }, PHARMACY_A);

    db.createBatch({
      id: 'batch_para_valid',
      productId: 'prod_paracetamol',
      batchNumber: 'PARA-001',
      expiryDate: '2028-12-31',
      totalTablets: 50,
      mrpPerStrip: 20,
      sellingPricePerStrip: 18,
      costPricePerStrip: 12,
      gstRate: 12,
    }, PHARMACY_A);

    db.createBatch({
      id: 'batch_para_expired',
      productId: 'prod_paracetamol',
      batchNumber: 'PARA-EXP',
      expiryDate: '2020-01-01',
      totalTablets: 50,
      mrpPerStrip: 20,
      sellingPricePerStrip: 18,
      costPricePerStrip: 12,
      gstRate: 12,
    }, PHARMACY_A);

    db.createBatch({
      id: 'batch_para_lowstock',
      productId: 'prod_paracetamol',
      batchNumber: 'PARA-LOW',
      expiryDate: '2028-12-31',
      totalTablets: 10,
      mrpPerStrip: 20,
      sellingPricePerStrip: 18,
      costPricePerStrip: 12,
      gstRate: 12,
    }, PHARMACY_A);
  });

  afterEach(() => {
    try {
      if (db) db.close();
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    } catch {
      // Ignore cleanup error on windows file lock
    }
  });

  describe('createInvoice validation & atomic commitment', () => {
    test('rejects duplicate invoice ID and duplicate invoiceNumber', () => {
      const inv1 = {
        id: 'inv_dup_01',
        invoiceNumber: 'JP/2026-27/0001',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            productName: 'Paracetamol 500mg',
            batchId: 'batch_para_valid',
            batchNumber: 'PARA-001',
            unitType: 'STRIP',
            quantity: 1,
            unitPrice: 18,
            mrp: 20,
            gstRate: 12,
            taxableAmount: 16.07,
            totalAmount: 18,
            totalTabletsSold: 10,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
        prescription: { patientName: 'Ramesh' },
      };

      const res1 = db.createInvoice(inv1, [], PHARMACY_A, OPERATOR);
      expect(res1.success).toBe(true);

      // Attempt duplicate ID
      const resDupId = db.createInvoice({ ...inv1, invoiceNumber: 'JP/2026-27/0002' }, [], PHARMACY_A, OPERATOR);
      expect(resDupId.success).toBe(false);
      expect(resDupId.error).toContain('already exists');

      // Attempt duplicate invoiceNumber
      const resDupNum = db.createInvoice({ ...inv1, id: 'inv_dup_02' }, [], PHARMACY_A, OPERATOR);
      expect(resDupNum.success).toBe(false);
      expect(resDupNum.error).toContain('already exists');
    });

    test('rejects line item with non-positive quantity', () => {
      const invalidInv = {
        id: 'inv_zero_qty',
        invoiceNumber: 'JP/2026-27/0002',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_valid',
            quantity: 0,
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
      };

      const res = db.createInvoice(invalidInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Quantity must be greater than zero');
    });

    test('rejects selling price exceeding statutory MRP', () => {
      const overpricedInv = {
        id: 'inv_overpriced',
        invoiceNumber: 'JP/2026-27/0003',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_valid',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 25, // MRP is 20
            mrp: 20,
          },
        ],
        grandTotal: 25,
        paymentMethod: 'CASH',
      };

      const res = db.createInvoice(overpricedInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot exceed MRP');
    });

    test('rejects dispensing expired stock batches', () => {
      const expiredInv = {
        id: 'inv_expired',
        invoiceNumber: 'JP/2026-27/0004',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_expired',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
      };

      const res = db.createInvoice(expiredInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('expired');
    });

    test('rejects dispensing when requested stock exceeds available stock (no ghost stock / negative)', () => {
      const excessiveInv = {
        id: 'inv_excess_stock',
        invoiceNumber: 'JP/2026-27/0005',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_lowstock', // has 10 tablets
            quantity: 2, // 2 strips * 10 = 20 tablets
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
          },
        ],
        grandTotal: 36,
        paymentMethod: 'CASH',
      };

      const res = db.createInvoice(excessiveInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient stock');

      // Verify stock was NOT modified
      const batch = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_lowstock');
      expect(batch.totalTablets).toBe(10);
    });

    test('aggregates multiple cart lines referencing the same batch and rejects if sum exceeds stock', () => {
      // batch_para_lowstock has 10 tablets. Line 1: 6 tabs, Line 2: 5 tabs. Total = 11 tabs > 10.
      const multiLineInv = {
        id: 'inv_multiline_excess',
        invoiceNumber: 'JP/2026-27/0006',
        items: [
          {
            cartItemId: 'item_line1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_lowstock',
            quantity: 6,
            unitType: 'TABLET',
            unitPrice: 1.8,
            mrp: 2.0,
          },
          {
            cartItemId: 'item_line2',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_lowstock',
            quantity: 5,
            unitType: 'TABLET',
            unitPrice: 1.8,
            mrp: 2.0,
          },
        ],
        grandTotal: 19.8,
        paymentMethod: 'CASH',
      };

      const res = db.createInvoice(multiLineInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient stock');
    });

    test('commits valid invoice atomically: decrements batch, populates invoice_items, writes SALE_DEDUCTION audit log', () => {
      const validInv = {
        id: 'inv_atomic_success',
        invoiceNumber: 'JP/2026-27/0007',
        items: [
          {
            cartItemId: 'item_line1',
            productId: 'prod_paracetamol',
            productName: 'Paracetamol 500mg',
            batchId: 'batch_para_valid', // starts with 50 tablets
            batchNumber: 'PARA-001',
            quantity: 2, // 2 strips = 20 tablets
            unitType: 'STRIP',
            stripSize: 10,
            unitPrice: 18,
            mrp: 20,
            gstRate: 12,
            taxableAmount: 32.14,
            cgstAmount: 1.93,
            sgstAmount: 1.93,
            igstAmount: 0,
            totalAmount: 36,
          },
        ],
        subtotal: 32.14,
        totalCgst: 1.93,
        totalSgst: 1.93,
        totalTax: 3.86,
        roundOff: 0,
        grandTotal: 36,
        paymentMethod: 'UPI',
        prescription: { patientName: 'Kavitha', patientContact: '9876543210' },
      };

      const res = db.createInvoice(validInv, [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(true);
      expect(res.batches).toBeDefined();
      expect(res.batches[0].totalTablets).toBe(30); // 50 - 20 = 30

      // Verify batch stock in SQLite
      const batchInDb = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchInDb.totalTablets).toBe(30);

      // Verify invoice in SQLite
      const invInDb = db.db.prepare('SELECT * FROM invoices WHERE id = ?').get('inv_atomic_success');
      expect(invInDb.invoiceNumber).toBe('JP/2026-27/0007');
      expect(invInDb.status).toBe('COMPLETED');
      expect(invInDb.paymentMethod).toBe('UPI');

      // Verify normalized invoice_items table
      const lineItems = db.db.prepare('SELECT * FROM invoice_items WHERE invoiceId = ?').all('inv_atomic_success');
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].totalTabletsSold).toBe(20);
      expect(lineItems[0].totalAmount).toBe(36);

      // Verify stock audit log
      const auditLog = db.db.prepare('SELECT * FROM stock_audit_logs WHERE referenceNumber = ?').get('JP/2026-27/0007');
      expect(auditLog).toBeDefined();
      expect(auditLog.adjustmentType).toBe('SALE_DEDUCTION');
      expect(auditLog.quantityChangeTablets).toBe(-20);
      expect(auditLog.previousStockTablets).toBe(50);
      expect(auditLog.newStockTablets).toBe(30);
    });
  });

  describe('cancelInvoice lifecycle hardening', () => {
    let billedInvoiceId: string;

    beforeEach(() => {
      billedInvoiceId = 'inv_to_cancel_01';
      db.createInvoice({
        id: billedInvoiceId,
        invoiceNumber: 'JP/2026-27/0010',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            productName: 'Paracetamol 500mg',
            batchId: 'batch_para_valid',
            batchNumber: 'PARA-001',
            quantity: 1,
            unitType: 'STRIP',
            stripSize: 10,
            unitPrice: 18,
            mrp: 20,
            totalAmount: 18,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
        prescription: { patientName: 'Suresh' },
      }, [], PHARMACY_A, OPERATOR);
    });

    test('authoritatively restores stock from itemsJson even if caller provides empty rollback entries', () => {
      // Prior to cancellation, batch_para_valid had 50 - 10 = 40 tablets
      const batchBefore = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchBefore.totalTablets).toBe(40);

      // Pass empty rollbackEntries
      const res = db.cancelInvoice(billedInvoiceId, 'Patient changed mind', [], PHARMACY_A, OPERATOR);
      expect(res.success).toBe(true);

      // Stock authoritatively restored to 50
      const batchAfter = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchAfter.totalTablets).toBe(50);

      // Invoice status marked CANCELLED
      const inv = db.db.prepare('SELECT status, cancelReason FROM invoices WHERE id = ?').get(billedInvoiceId);
      expect(inv.status).toBe('CANCELLED');
      expect(inv.cancelReason).toBe('Patient changed mind');

      // Stock audit log created with SALE_CANCEL
      const audit = db.db.prepare('SELECT * FROM stock_audit_logs WHERE referenceNumber = ? ORDER BY rowid DESC').get('JP/2026-27/0010');
      expect(audit.adjustmentType).toBe('SALE_CANCEL');
      expect(audit.quantityChangeTablets).toBe(10);
      expect(audit.newStockTablets).toBe(50);
    });

    test('rejects cancelling an invoice that is already CANCELLED', () => {
      db.cancelInvoice(billedInvoiceId, 'First cancel', [], PHARMACY_A, OPERATOR);
      const res2 = db.cancelInvoice(billedInvoiceId, 'Second cancel attempt', [], PHARMACY_A, OPERATOR);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('already cancelled');
    });

    test('rejects cancelling an invoice belonging to a different pharmacy tenant', () => {
      const res = db.cancelInvoice(billedInvoiceId, 'Unauthorized cancel', [], PHARMACY_B, OPERATOR);
      expect(res.success).toBe(false);
      expect(res.error).toContain('another pharmacy');
    });
  });

  describe('updateInvoicePaymentMethod hardening', () => {
    let testInvoiceId: string;

    beforeEach(() => {
      testInvoiceId = 'inv_payment_mod';
      db.createInvoice({
        id: testInvoiceId,
        invoiceNumber: 'JP/2026-27/0020',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_paracetamol',
            batchId: 'batch_para_valid',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
            totalAmount: 18,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
      }, [], PHARMACY_A, OPERATOR);
    });

    test('allows updating between valid statutory payment methods', () => {
      const res = db.updateInvoicePaymentMethod(testInvoiceId, 'UPI', PHARMACY_A);
      expect(res.success).toBe(true);

      const inv = db.db.prepare('SELECT paymentMethod FROM invoices WHERE id = ?').get(testInvoiceId);
      expect(inv.paymentMethod).toBe('UPI');
    });

    test('rejects updating with an invalid payment method string', () => {
      const res = db.updateInvoicePaymentMethod(testInvoiceId, 'BITCOIN_CRYPTO', PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid payment method');
    });

    test('rejects updating payment method of a CANCELLED invoice', () => {
      db.cancelInvoice(testInvoiceId, 'Cancelled bill', [], PHARMACY_A, OPERATOR);
      const res = db.updateInvoicePaymentMethod(testInvoiceId, 'CARD', PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cancelled invoice');
    });
  });

  describe('postSalesReturn lifecycle & restock verification', () => {
    let salesInvId: string;

    beforeEach(() => {
      salesInvId = 'inv_sales_return_src';
      db.createInvoice({
        id: salesInvId,
        invoiceNumber: 'JP/2026-27/0030',
        items: [
          {
            cartItemId: 'cart_1',
            productId: 'prod_paracetamol',
            productName: 'Paracetamol 500mg',
            batchId: 'batch_para_valid',
            batchNumber: 'PARA-001',
            quantity: 4, // 4 strips = 40 tablets
            unitType: 'STRIP',
            stripSize: 10,
            unitPrice: 18,
            mrp: 20,
            totalAmount: 72,
          },
        ],
        grandTotal: 72,
        paymentMethod: 'CASH',
        prescription: { patientName: 'Priya' },
      }, [], PHARMACY_A, OPERATOR);
    });

    test('rejects return quantity exceeding billed quantity', () => {
      const payload = {
        invoiceId: salesInvId,
        returnedItems: [
          {
            cartItemId: 'cart_1',
            returnQuantity: 5, // Billed was 4
            reason: 'Excess return',
          },
        ],
        refundMode: 'CASH',
      };

      const res = db.postSalesReturn(payload, OPERATOR, PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot exceed billed quantity');
    });

    test('handles partial sales return: restocks batch, sets PARTIALLY_RETURNED status and logs SALE_RETURN', () => {
      // Prior to return: 50 initial - 40 sold = 10 tablets in batch
      const batchBefore = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchBefore.totalTablets).toBe(10);

      const payload = {
        invoiceId: salesInvId,
        returnedItems: [
          {
            cartItemId: 'cart_1',
            returnQuantity: 1, // 1 strip = 10 tablets
            reason: 'Patient doctor changed dosage',
          },
        ],
        refundMode: 'CASH',
      };

      const res = db.postSalesReturn(payload, OPERATOR, PHARMACY_A);
      expect(res.success).toBe(true);
      expect(res.returnRecord).toBeDefined();
      expect(res.returnRecord.totalRefundAmount).toBe(18);

      // Batch stock restored by 10 tablets: 10 + 10 = 20
      const batchAfter = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchAfter.totalTablets).toBe(20);

      // Invoice status transitioned to PARTIALLY_RETURNED
      const invAfter = db.db.prepare('SELECT status FROM invoices WHERE id = ?').get(salesInvId);
      expect(invAfter.status).toBe('PARTIALLY_RETURNED');

      // Record persisted in sales_returns table
      const srInDb = db.db.prepare('SELECT * FROM sales_returns WHERE invoiceId = ?').get(salesInvId);
      expect(srInDb).toBeDefined();
      expect(srInDb.totalRefundAmount).toBe(18);

      // Audit log records SALE_RETURN
      const audit = db.db.prepare('SELECT * FROM stock_audit_logs WHERE referenceNumber = ?').get(res.returnRecord.returnNumber);
      expect(audit).toBeDefined();
      expect(audit.adjustmentType).toBe('SALE_RETURN');
      expect(audit.quantityChangeTablets).toBe(10);
      expect(audit.newStockTablets).toBe(20);
    });

    test('handles full sales return: sets status to RETURNED and restores full batch quantity', () => {
      const payload = {
        invoiceId: salesInvId,
        returnedItems: [
          {
            cartItemId: 'cart_1',
            returnQuantity: 4, // All 4 strips returned
            reason: 'Wrong medication purchased',
          },
        ],
        refundMode: 'CASH',
      };

      const res = db.postSalesReturn(payload, OPERATOR, PHARMACY_A);
      expect(res.success).toBe(true);

      // Full stock restored: 10 + 40 = 50 tablets
      const batchAfter = db.db.prepare('SELECT totalTablets FROM batches WHERE id = ?').get('batch_para_valid');
      expect(batchAfter.totalTablets).toBe(50);

      // Invoice status transitioned to RETURNED
      const invAfter = db.db.prepare('SELECT status FROM invoices WHERE id = ?').get(salesInvId);
      expect(invAfter.status).toBe('RETURNED');
    });

    test('rejects sales return on a cancelled invoice', () => {
      db.cancelInvoice(salesInvId, 'Pre-cancellation', [], PHARMACY_A, OPERATOR);

      const payload = {
        invoiceId: salesInvId,
        returnedItems: [{ cartItemId: 'cart_1', returnQuantity: 1, reason: 'Test' }],
        refundMode: 'CASH',
      };

      const res = db.postSalesReturn(payload, OPERATOR, PHARMACY_A);
      expect(res.success).toBe(false);
      expect(res.error).toContain('cancelled invoice');
    });
  });

  describe('PERMISSION_MATRIX role enforcement for POS and Sales Return operations', () => {
    const adminSession = { user: { role: 'ADMIN', username: 'admin' }, pharmacy: { id: PHARMACY_A } };
    const pharmacistSession = { user: { role: 'PHARMACIST', username: 'pharm' }, pharmacy: { id: PHARMACY_A } };
    const cashierSession = { user: { role: 'CASHIER', username: 'cash' }, pharmacy: { id: PHARMACY_A } };
    const assistantSession = { user: { role: 'PHARMACY_ASSISTANT', username: 'asst' }, pharmacy: { id: PHARMACY_A } };

    test('createInvoice is permitted for CASHIER, PHARMACIST, and ADMIN', () => {
      expect(() => assertPermission('db:createInvoice', cashierSession)).not.toThrow();
      expect(() => assertPermission('db:createInvoice', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:createInvoice', adminSession)).not.toThrow();
      expect(() => assertPermission('db:createInvoice', assistantSession)).toThrow(/Unauthorized/);
    });

    test('cancelInvoice is restricted to PHARMACIST and ADMIN (CASHIER blocked)', () => {
      expect(() => assertPermission('db:cancelInvoice', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:cancelInvoice', adminSession)).not.toThrow();
      expect(() => assertPermission('db:cancelInvoice', cashierSession)).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:cancelInvoice', assistantSession)).toThrow(/Unauthorized/);
    });

    test('updateInvoicePaymentMethod is restricted to ADMIN only', () => {
      expect(() => assertPermission('db:updateInvoicePaymentMethod', adminSession)).not.toThrow();
      expect(() => assertPermission('db:updateInvoicePaymentMethod', pharmacistSession)).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:updateInvoicePaymentMethod', cashierSession)).toThrow(/Unauthorized/);
    });

    test('postSalesReturn is restricted to PHARMACIST and ADMIN', () => {
      expect(() => assertPermission('db:postSalesReturn', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:postSalesReturn', adminSession)).not.toThrow();
      expect(() => assertPermission('db:postSalesReturn', cashierSession)).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:postSalesReturn', assistantSession)).toThrow(/Unauthorized/);
    });

    test('getSalesReturns is permitted for CASHIER, PHARMACIST, and ADMIN', () => {
      expect(() => assertPermission('db:getSalesReturns', cashierSession)).not.toThrow();
      expect(() => assertPermission('db:getSalesReturns', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:getSalesReturns', adminSession)).not.toThrow();
      expect(() => assertPermission('db:getSalesReturns', assistantSession)).toThrow(/Unauthorized/);
    });
  });

  describe('getAllData includes salesReturns and respects tenant isolation', () => {
    test('getAllData returns salesReturns array populated from SQLite sales_returns table', () => {
      // Create invoice and sales return
      db.createInvoice({
        id: 'inv_gad_01',
        invoiceNumber: 'JP/2026-27/0040',
        items: [
          {
            cartItemId: 'c_1',
            productId: 'prod_paracetamol',
            productName: 'Paracetamol 500mg',
            batchId: 'batch_para_valid',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
            totalAmount: 18,
          },
        ],
        grandTotal: 18,
        paymentMethod: 'CASH',
      }, [], PHARMACY_A, OPERATOR);

      db.postSalesReturn({
        invoiceId: 'inv_gad_01',
        returnedItems: [{ cartItemId: 'c_1', returnQuantity: 1, reason: 'Test Return' }],
        refundMode: 'CASH',
      }, OPERATOR, PHARMACY_A);

      const allDataA = db.getAllData(PHARMACY_A);
      expect(Array.isArray(allDataA.salesReturns)).toBe(true);
      expect(allDataA.salesReturns.length).toBe(1);
      expect(allDataA.salesReturns[0].invoiceId).toBe('inv_gad_01');
      expect(allDataA.salesReturns[0].items.length).toBe(1);

      // Verify Pharmacy B does not see Pharmacy A's sales returns
      const allDataB = db.getAllData(PHARMACY_B);
      expect(allDataB.salesReturns.length).toBe(0);
    });
  });
});
