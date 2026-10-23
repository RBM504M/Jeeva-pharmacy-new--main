const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

class PharmacyDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        genericComposition TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        hsnCode TEXT NOT NULL,
        barcode TEXT NOT NULL,
        stripSize INTEGER NOT NULL DEFAULT 10,
        drugSchedule TEXT NOT NULL DEFAULT 'OTC',
        reorderLevelUnits INTEGER NOT NULL DEFAULT 50,
        defaultGstRate INTEGER NOT NULL DEFAULT 12,
        rackLocation TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        barcode TEXT,
        expiryDate TEXT NOT NULL,
        manufacturingDate TEXT NOT NULL,
        costPricePerStrip REAL NOT NULL,
        mrpPerStrip REAL NOT NULL,
        sellingPricePerStrip REAL NOT NULL,
        gstRate INTEGER NOT NULL DEFAULT 12,
        totalTablets INTEGER NOT NULL DEFAULT 0,
        vendorId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoiceNumber TEXT UNIQUE NOT NULL,
        invoiceDate TEXT NOT NULL,
        isInterState INTEGER NOT NULL DEFAULT 0,
        prescriptionJson TEXT NOT NULL,
        itemsJson TEXT NOT NULL,
        subtotal REAL NOT NULL,
        totalCgst REAL NOT NULL,
        totalSgst REAL NOT NULL,
        totalIgst REAL NOT NULL,
        totalTax REAL NOT NULL,
        roundOff REAL NOT NULL,
        grandTotal REAL NOT NULL,
        paymentMethod TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        cashierName TEXT NOT NULL,
        taxSlabBreakdownsJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        companyName TEXT NOT NULL,
        contactPerson TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        gstin TEXT NOT NULL,
        drugLicenseNumber TEXT NOT NULL,
        state TEXT NOT NULL,
        creditPeriodDays INTEGER NOT NULL DEFAULT 30,
        balanceDue REAL NOT NULL DEFAULT 0,
        isActive INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS stock_audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        formattedTimestamp TEXT,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        genericComposition TEXT,
        batchId TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        expiryDate TEXT,
        drugSchedule TEXT,
        adjustmentType TEXT NOT NULL,
        quantityChangeTablets INTEGER NOT NULL,
        formattedChange TEXT,
        previousStockTablets INTEGER NOT NULL,
        newStockTablets INTEGER NOT NULL,
        formattedPreviousStock TEXT,
        formattedNewStock TEXT,
        referenceNumber TEXT NOT NULL,
        operatorName TEXT NOT NULL,
        operatorRole TEXT NOT NULL,
        reason TEXT NOT NULL,
        vendorId TEXT,
        vendorName TEXT,
        rackLocation TEXT
      );

      CREATE TABLE IF NOT EXISTS dpdp_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        patientPhoneMasked TEXT NOT NULL,
        action TEXT NOT NULL,
        operatorName TEXT NOT NULL,
        purpose TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backup_snapshots (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        filename TEXT NOT NULL,
        triggerType TEXT NOT NULL,
        recordCountsJson TEXT NOT NULL,
        totalSizeKb REAL NOT NULL,
        sha256Checksum TEXT NOT NULL,
        isEncrypted INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        valueJson TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(productId);
      CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiryDate);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoiceDate);
    `);
  }

  isDatabaseEmpty() {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM products').get();
    return !row || row.cnt === 0;
  }

  seedInitialData(seedData) {
    if (!seedData) return;
    this.db.exec('BEGIN TRANSACTION');
    try {
      if (Array.isArray(seedData.products)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO products (
            id, name, genericComposition, manufacturer, hsnCode, barcode, stripSize,
            drugSchedule, reorderLevelUnits, defaultGstRate, rackLocation, isActive, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of seedData.products) {
          const now = new Date().toISOString();
          stmt.run(
            p.id, p.name, p.genericComposition, p.manufacturer, p.hsnCode, p.barcode,
            p.stripSize, p.drugSchedule, p.reorderLevelUnits, p.defaultGstRate,
            p.rackLocation || null, p.isActive ? 1 : 0, now, now
          );
        }
      }

      if (Array.isArray(seedData.batches)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO batches (
            id, productId, batchNumber, barcode, expiryDate, manufacturingDate,
            costPricePerStrip, mrpPerStrip, sellingPricePerStrip, gstRate, totalTablets,
            vendorId, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const b of seedData.batches) {
          const now = new Date().toISOString();
          stmt.run(
            b.id, b.productId, b.batchNumber, b.barcode || null, b.expiryDate,
            b.manufacturingDate, b.costPricePerStrip, b.mrpPerStrip, b.sellingPricePerStrip,
            b.gstRate, b.totalTablets, b.vendorId || null, now, now
          );
        }
      }

      if (Array.isArray(seedData.vendors)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO vendors (
            id, companyName, contactPerson, phone, email, gstin,
            drugLicenseNumber, state, creditPeriodDays, balanceDue, isActive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const v of seedData.vendors) {
          stmt.run(
            v.id, v.companyName, v.contactPerson, v.phone, v.email || null,
            v.gstin, v.drugLicenseNumber, v.state, v.creditPeriodDays,
            v.balanceDue, v.isActive ? 1 : 0
          );
        }
      }

      if (Array.isArray(seedData.invoices)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO invoices (
            id, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
            subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
            grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inv of seedData.invoices) {
          stmt.run(
            inv.id, inv.invoiceNumber, inv.invoiceDate, inv.isInterState ? 1 : 0,
            JSON.stringify(inv.prescription), JSON.stringify(inv.items),
            inv.subtotal, inv.totalCgst, inv.totalSgst, inv.totalIgst, inv.totalTax,
            inv.roundOff, inv.grandTotal, inv.paymentMethod, inv.status, inv.cashierName,
            JSON.stringify(inv.taxSlabBreakdowns), inv.createdAt || inv.invoiceDate
          );
        }
      }

      if (Array.isArray(seedData.dpdpLogs)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO dpdp_logs (id, timestamp, patientPhoneMasked, action, operatorName, purpose)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const d of seedData.dpdpLogs) {
          stmt.run(d.id, d.timestamp, d.patientPhoneMasked, d.action, d.operatorName, d.purpose);
        }
      }

      if (Array.isArray(seedData.stockAuditLogs)) {
        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO stock_audit_logs (
            id, timestamp, formattedTimestamp, productId, productName, genericComposition,
            batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
            formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
            formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of seedData.stockAuditLogs) {
          stmt.run(
            s.id, s.timestamp, s.formattedTimestamp, s.productId, s.productName, s.genericComposition,
            s.batchId, s.batchNumber, s.expiryDate, s.drugSchedule, s.adjustmentType, s.quantityChangeTablets,
            s.formattedChange, s.previousStockTablets, s.newStockTablets, s.formattedPreviousStock,
            s.formattedNewStock, s.referenceNumber, s.operatorName, s.operatorRole, s.reason,
            s.vendorId || null, s.vendorName || null, s.rackLocation || null
          );
        }
      }

      if (seedData.printerSettings) {
        this.saveSetting('printer_settings', seedData.printerSettings);
      }
      if (seedData.userProfile) {
        this.saveSetting('user_profile', seedData.userProfile);
      }
      if (seedData.backupConfig) {
        this.saveSetting('backup_config', seedData.backupConfig);
      }

      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to seed initial data into SQLite:', e);
    }
  }

  getAllData() {
    const products = this.db.prepare('SELECT * FROM products').all().map(p => ({
      ...p,
      isActive: Boolean(p.isActive),
    }));

    const batches = this.db.prepare('SELECT * FROM batches').all();

    const invoices = this.db.prepare('SELECT * FROM invoices ORDER BY invoiceDate DESC').all().map(inv => ({
      ...inv,
      isInterState: Boolean(inv.isInterState),
      prescription: JSON.parse(inv.prescriptionJson || '{}'),
      items: JSON.parse(inv.itemsJson || '[]'),
      taxSlabBreakdowns: JSON.parse(inv.taxSlabBreakdownsJson || '[]'),
    }));

    const vendors = this.db.prepare('SELECT * FROM vendors').all().map(v => ({
      ...v,
      isActive: Boolean(v.isActive),
    }));

    const stockAuditLogs = this.db.prepare('SELECT * FROM stock_audit_logs ORDER BY timestamp DESC').all();
    const dpdpLogs = this.db.prepare('SELECT * FROM dpdp_logs ORDER BY timestamp DESC').all();
    const backupSnapshots = this.db.prepare('SELECT * FROM backup_snapshots ORDER BY timestamp DESC').all().map(s => ({
      ...s,
      isEncrypted: Boolean(s.isEncrypted),
      recordCounts: JSON.parse(s.recordCountsJson || '{}'),
    }));

    const settingsRows = this.db.prepare('SELECT * FROM app_settings').all();
    const settings = {};
    for (const row of settingsRows) {
      try {
        settings[row.key] = JSON.parse(row.valueJson);
      } catch {
        settings[row.key] = null;
      }
    }

    return {
      products,
      batches,
      invoices,
      vendors,
      stockAuditLogs,
      dpdpLogs,
      backupSnapshots,
      settings,
    };
  }

  saveProduct(product) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO products (
        id, name, genericComposition, manufacturer, hsnCode, barcode, stripSize,
        drugSchedule, reorderLevelUnits, defaultGstRate, rackLocation, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        genericComposition = excluded.genericComposition,
        manufacturer = excluded.manufacturer,
        hsnCode = excluded.hsnCode,
        barcode = excluded.barcode,
        stripSize = excluded.stripSize,
        drugSchedule = excluded.drugSchedule,
        reorderLevelUnits = excluded.reorderLevelUnits,
        defaultGstRate = excluded.defaultGstRate,
        rackLocation = excluded.rackLocation,
        isActive = excluded.isActive,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(
      product.id, product.name, product.genericComposition, product.manufacturer,
      product.hsnCode, product.barcode, product.stripSize, product.drugSchedule,
      product.reorderLevelUnits, product.defaultGstRate, product.rackLocation || null,
      product.isActive ? 1 : 0, product.createdAt || now, now
    );
    return { success: true };
  }

  saveBatch(batch) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO batches (
        id, productId, batchNumber, barcode, expiryDate, manufacturingDate,
        costPricePerStrip, mrpPerStrip, sellingPricePerStrip, gstRate, totalTablets,
        vendorId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        productId = excluded.productId,
        batchNumber = excluded.batchNumber,
        barcode = excluded.barcode,
        expiryDate = excluded.expiryDate,
        manufacturingDate = excluded.manufacturingDate,
        costPricePerStrip = excluded.costPricePerStrip,
        mrpPerStrip = excluded.mrpPerStrip,
        sellingPricePerStrip = excluded.sellingPricePerStrip,
        gstRate = excluded.gstRate,
        totalTablets = excluded.totalTablets,
        vendorId = excluded.vendorId,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(
      batch.id, batch.productId, batch.batchNumber, batch.barcode || null,
      batch.expiryDate, batch.manufacturingDate, batch.costPricePerStrip,
      batch.mrpPerStrip, batch.sellingPricePerStrip, batch.gstRate,
      batch.totalTablets, batch.vendorId || null, batch.createdAt || now, now
    );
    return { success: true };
  }

  createInvoice(invoice) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      // 1. Insert invoice
      const invStmt = this.db.prepare(`
        INSERT INTO invoices (
          id, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
          subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
          grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      invStmt.run(
        invoice.id,
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.isInterState ? 1 : 0,
        JSON.stringify(invoice.prescription || {}),
        JSON.stringify(invoice.items || []),
        invoice.subtotal || 0,
        invoice.totalCgst || 0,
        invoice.totalSgst || 0,
        invoice.totalIgst || 0,
        invoice.totalTax || 0,
        invoice.roundOff || 0,
        invoice.grandTotal || 0,
        invoice.paymentMethod || 'CASH',
        invoice.status || 'PAID',
        invoice.cashierName || 'Admin',
        JSON.stringify(invoice.taxSlabBreakdowns || []),
        invoice.createdAt || invoice.invoiceDate || new Date().toISOString()
      );

      // 2. Decrement batch stocks
      const updateBatchStmt = this.db.prepare(`
        UPDATE batches SET totalTablets = MAX(0, totalTablets - ?), updatedAt = ? WHERE id = ?
      `);
      const now = new Date().toISOString();
      for (const item of (invoice.items || [])) {
        const batchId = item.batchId || (item.batch && item.batch.id);
        const tabletsSold =
          item.totalTabletsSold !== undefined
            ? item.totalTabletsSold
            : item.unitType === 'STRIP'
            ? item.quantity * (item.stripSize || 10)
            : item.quantity;
        if (batchId) {
          updateBatchStmt.run(tabletsSold || 0, now, batchId);
        }
      }

      this.db.exec('COMMIT');
      return { success: true };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to create invoice in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  recordStockAdjustment(logEntry) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        logEntry.id, logEntry.timestamp, logEntry.formattedTimestamp, logEntry.productId,
        logEntry.productName, logEntry.genericComposition, logEntry.batchId, logEntry.batchNumber,
        logEntry.expiryDate, logEntry.drugSchedule, logEntry.adjustmentType, logEntry.quantityChangeTablets,
        logEntry.formattedChange, logEntry.previousStockTablets, logEntry.newStockTablets,
        logEntry.formattedPreviousStock, logEntry.formattedNewStock, logEntry.referenceNumber,
        logEntry.operatorName, logEntry.operatorRole, logEntry.reason, logEntry.vendorId || null,
        logEntry.vendorName || null, logEntry.rackLocation || null
      );

      // Update the batch totalTablets
      this.db.prepare('UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?').run(
        logEntry.newStockTablets,
        new Date().toISOString(),
        logEntry.batchId
      );

      this.db.exec('COMMIT');
      return { success: true };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to record stock adjustment in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  saveVendor(vendor) {
    const stmt = this.db.prepare(`
      INSERT INTO vendors (
        id, companyName, contactPerson, phone, email, gstin,
        drugLicenseNumber, state, creditPeriodDays, balanceDue, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        companyName = excluded.companyName,
        contactPerson = excluded.contactPerson,
        phone = excluded.phone,
        email = excluded.email,
        gstin = excluded.gstin,
        drugLicenseNumber = excluded.drugLicenseNumber,
        state = excluded.state,
        creditPeriodDays = excluded.creditPeriodDays,
        balanceDue = excluded.balanceDue,
        isActive = excluded.isActive
    `);
    stmt.run(
      vendor.id, vendor.companyName, vendor.contactPerson, vendor.phone,
      vendor.email || null, vendor.gstin, vendor.drugLicenseNumber,
      vendor.state, vendor.creditPeriodDays, vendor.balanceDue, vendor.isActive ? 1 : 0
    );
    return { success: true };
  }

  logDpdp(entry) {
    const stmt = this.db.prepare(`
      INSERT INTO dpdp_logs (id, timestamp, patientPhoneMasked, action, operatorName, purpose)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(entry.id, entry.timestamp, entry.patientPhoneMasked, entry.action, entry.operatorName, entry.purpose);
    return { success: true };
  }

  saveSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key, valueJson) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson
    `);
    stmt.run(key, JSON.stringify(value));
    return { success: true };
  }

  saveBackupSnapshot(snapshot) {
    const stmt = this.db.prepare(`
      INSERT INTO backup_snapshots (
        id, timestamp, filename, triggerType, recordCountsJson, totalSizeKb, sha256Checksum, isEncrypted, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        notes = excluded.notes
    `);
    stmt.run(
      snapshot.id, snapshot.timestamp, snapshot.filename, snapshot.triggerType,
      JSON.stringify(snapshot.recordCounts || {}), snapshot.totalSizeKb,
      snapshot.sha256Checksum, snapshot.isEncrypted ? 1 : 0, snapshot.notes || null
    );
    return { success: true };
  }

  restoreBackup(backupData) {
    this.db.exec('BEGIN TRANSACTION');
    try {
      if (Array.isArray(backupData.products)) {
        this.db.exec('DELETE FROM products');
        for (const p of backupData.products) {
          this.saveProduct(p);
        }
      }
      if (Array.isArray(backupData.batches)) {
        this.db.exec('DELETE FROM batches');
        for (const b of backupData.batches) {
          this.saveBatch(b);
        }
      }
      if (Array.isArray(backupData.vendors)) {
        this.db.exec('DELETE FROM vendors');
        for (const v of backupData.vendors) {
          this.saveVendor(v);
        }
      }
      if (Array.isArray(backupData.invoices)) {
        this.db.exec('DELETE FROM invoices');
        const invStmt = this.db.prepare(`
          INSERT INTO invoices (
            id, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
            subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
            grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inv of backupData.invoices) {
          invStmt.run(
            inv.id, inv.invoiceNumber, inv.invoiceDate, inv.isInterState ? 1 : 0,
            JSON.stringify(inv.prescription), JSON.stringify(inv.items),
            inv.subtotal, inv.totalCgst, inv.totalSgst, inv.totalIgst, inv.totalTax,
            inv.roundOff, inv.grandTotal, inv.paymentMethod, inv.status, inv.cashierName,
            JSON.stringify(inv.taxSlabBreakdowns), inv.createdAt || inv.invoiceDate
          );
        }
      }
      this.db.exec('COMMIT');
      return { success: true };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to restore backup in SQLite:', e);
      return { success: false, error: e.message };
    }
  }
}

module.exports = PharmacyDatabase;
