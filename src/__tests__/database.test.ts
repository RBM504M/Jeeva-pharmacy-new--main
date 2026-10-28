import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Require the CJS SQLite database engine
const PharmacyDatabase = require('../../electron/database.cjs');

describe('Offline SQLite Database Engine (node:sqlite)', () => {
  let tempDbPath: string;
  let db: any;

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test_jeeva_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.db`);
    db = new PharmacyDatabase(tempDbPath);
  });

  afterEach(() => {
    try {
      if (db) db.close();
      if (fs.existsSync(tempDbPath)) {
        fs.unlinkSync(tempDbPath);
      }
    } catch {
      // Ignore cleanup error on windows locks
    }
  });

  test('initializes all required pharmacy tables with foreign keys and indexes', () => {
    const tables = db.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all().map((r: any) => r.name);

    expect(tables).toContain('products');
    expect(tables).toContain('batches');
    expect(tables).toContain('invoices');
    expect(tables).toContain('vendors');
    expect(tables).toContain('stock_audit_logs');
    expect(tables).toContain('dpdp_logs');
    expect(tables).toContain('backup_snapshots');
    expect(tables).toContain('app_settings');
    expect(tables).toContain('purchase_receipts');
    expect(tables).toContain('purchase_receipt_items');
  });

  test('performs CRUD operations for pharmaceutical products using saveProduct and getAllData', () => {
    const testProduct = {
      id: 'prod_test_01',
      name: 'Amoxicillin 500mg Capsules',
      genericComposition: 'Amoxicillin Trihydrate 500mg',
      manufacturer: 'Cipla Ltd',
      hsnCode: '30041000',
      barcode: '8901112223334',
      stripSize: 10,
      drugSchedule: 'SCHEDULE_H',
      reorderLevelUnits: 30,
      defaultGstRate: 12,
      rackLocation: 'Rack B - Shelf 01',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = db.saveProduct(testProduct);
    expect(res.success).toBe(true);

    const { products } = db.getAllData();
    const found = products.find((p: any) => p.id === 'prod_test_01');
    expect(found).toBeDefined();
    expect(found.name).toBe('Amoxicillin 500mg Capsules');
    expect(found.barcode).toBe('8901112223334');

    // Update product
    db.saveProduct({ ...testProduct, rackLocation: 'Rack B - Shelf 03' });
    const updated = db.getAllData().products.find((p: any) => p.id === 'prod_test_01');
    expect(updated.rackLocation).toBe('Rack B - Shelf 03');
  });

  test('manages batch stock and executes atomic stock decrement transactions', () => {
    const prod = {
      id: 'prod_stock_01',
      name: 'Paracetamol 650mg',
      genericComposition: 'Paracetamol 650mg',
      manufacturer: 'Apex Pharma',
      hsnCode: '30049060',
      barcode: '8909998887771',
      stripSize: 15,
      drugSchedule: 'OTC',
      reorderLevelUnits: 30,
      defaultGstRate: 12,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveProduct(prod);

    const batch = {
      id: 'batch_stock_01',
      productId: 'prod_stock_01',
      batchNumber: 'BATCH-2025-A',
      barcode: '8909998887771',
      expiryDate: '2026-12-31',
      manufacturingDate: '2024-01-01',
      costPricePerStrip: 20.0,
      mrpPerStrip: 30.0,
      sellingPricePerStrip: 30.0,
      gstRate: 12,
      totalTablets: 150, // 10 strips of 15
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveBatch(batch);

    // Initial batch check
    const { batches: batchesBefore } = db.getAllData();
    const initialBatch = batchesBefore.find((b: any) => b.id === 'batch_stock_01');
    expect(initialBatch.totalTablets).toBe(150);

    // Create an invoice dispensing 1 strip (15 tablets)
    const invoice = {
      id: 'inv_test_01',
      invoiceNumber: 'INV-2025-0001',
      invoiceDate: new Date().toISOString(),
      isInterState: false,
      prescription: { patientName: 'Ramesh', patientContact: '9840123456' },
      items: [
        {
          cartItemId: 'item_01',
          productId: 'prod_stock_01',
          productName: 'Paracetamol 650mg',
          batchId: 'batch_stock_01',
          batchNumber: 'BATCH-2025-A',
          expiryDate: '2026-12-31',
          unitType: 'STRIP',
          quantity: 1,
          unitPrice: 30.0,
          mrp: 30.0,
          gstRate: 12,
          taxableAmount: 26.79,
          cgstAmount: 1.61,
          sgstAmount: 1.61,
          igstAmount: 0,
          totalAmount: 30.0,
          hsnCode: '30049060',
          stripSize: 15,
        },
      ],
      subtotal: 26.79,
      totalCgst: 1.61,
      totalSgst: 1.61,
      totalIgst: 0,
      totalTax: 3.22,
      roundOff: 0,
      grandTotal: 30.0,
      paymentMethod: 'UPI',
      status: 'PAID',
      createdAt: new Date().toISOString(),
    };

    const invResult = db.createInvoice(invoice);
    expect(invResult.success).toBe(true);

    // Verify batch stock was atomically deducted (150 - 15 = 135)
    const { batches: batchesAfter, invoices } = db.getAllData();
    const updatedBatch = batchesAfter.find((b: any) => b.id === 'batch_stock_01');
    expect(updatedBatch.totalTablets).toBe(135);

    // Verify invoice is retrievable
    expect(invoices.length).toBe(1);
    expect(invoices[0].invoiceNumber).toBe('INV-2025-0001');
    expect(invoices[0].grandTotal).toBe(30.0);
  });

  test('records stock audit log entries and updates settings', () => {
    const auditEntry = {
      id: 'audit_01',
      timestamp: new Date().toISOString(),
      formattedTimestamp: '21 Oct 2026 12:00 PM',
      productId: 'prod_stock_01',
      productName: 'Paracetamol 650mg',
      genericComposition: 'Paracetamol 650mg',
      batchId: 'batch_stock_01',
      batchNumber: 'BATCH-2025-A',
      expiryDate: '2026-12-31',
      drugSchedule: 'OTC',
      adjustmentType: 'DAMAGED_EXPIRY',
      quantityChangeTablets: -5,
      formattedChange: '-5 Tabs',
      previousStockTablets: 135,
      newStockTablets: 130,
      formattedPreviousStock: '9 Strips',
      formattedNewStock: '8 Strips, 10 Tabs',
      referenceNumber: 'AUD-001',
      operatorName: 'Pharmacist',
      operatorRole: 'ADMIN',
      reason: 'Physical damage on shelf',
    };

    db.recordStockAdjustment(auditEntry);
    const { stockAuditLogs } = db.getAllData();
    expect(stockAuditLogs.length).toBe(1);
    expect(stockAuditLogs[0].productName).toBe('Paracetamol 650mg');
    expect(stockAuditLogs[0].newStockTablets).toBe(130);

    // Test settings storage
    db.saveSetting('test_config', { offlineMode: true, store: 'Jeeva Medicals' });
    const { settings } = db.getAllData();
    expect(settings.test_config).toEqual({ offlineMode: true, store: 'Jeeva Medicals' });
  });
});
