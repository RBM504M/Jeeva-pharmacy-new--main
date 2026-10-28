const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

function safeJsonParse(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function maskPhoneDPDP(phone) {
  if (!phone) return 'XXXXXX';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length > 10) {
    clean = clean.slice(-10);
  } else if (clean.startsWith('0') && clean.length === 11) {
    clean = clean.slice(-10);
  }
  if (clean.length <= 4) return 'XXXXXX';
  return `XXXXXX${clean.slice(-4)}`;
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Neutralize Spreadsheet Formula Injection (OWASP CSV Injection)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, actualSalt, iterations, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt, iterations };
}

function verifyPassword(password, storedHash, salt, iterations = 100000) {
  if (!password || !storedHash || !salt) return false;
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    pharmacyId: u.pharmacyId,
    username: u.username,
    fullName: u.fullName,
    email: u.email || '',
    phone: u.phone || '',
    role: u.role,
    isActive: Boolean(u.isActive),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLoginAt: u.lastLoginAt || null,
  };
}

class PharmacyDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
    this.runMigrations();
    this.createIndexes();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pharmacy_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dlNumber TEXT NOT NULL,
        gstin TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        state TEXT,
        pincode TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        salt TEXT NOT NULL,
        iterations INTEGER NOT NULL DEFAULT 100000,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastLoginAt TEXT,
        FOREIGN KEY (pharmacyId) REFERENCES pharmacy_accounts(id)
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        pharmacyId TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT,
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
        pharmacyId TEXT,
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
        cancelReason TEXT,
        cashierName TEXT NOT NULL,
        taxSlabBreakdownsJson TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT,
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
        pharmacyId TEXT,
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
        pharmacyId TEXT,
        timestamp TEXT NOT NULL,
        patientPhoneMasked TEXT NOT NULL,
        action TEXT NOT NULL,
        operatorName TEXT NOT NULL,
        purpose TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS backup_snapshots (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT,
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

      CREATE TABLE IF NOT EXISTS purchase_receipts (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT,
        grnNumber TEXT NOT NULL,
        grnDate TEXT NOT NULL,
        poNumber TEXT,
        vendorId TEXT NOT NULL,
        vendorName TEXT NOT NULL,
        vendorInvoiceNo TEXT NOT NULL,
        invoiceDate TEXT NOT NULL,
        paymentDueDate TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        discountTotal REAL NOT NULL DEFAULT 0,
        taxableTotal REAL NOT NULL DEFAULT 0,
        cgstTotal REAL NOT NULL DEFAULT 0,
        sgstTotal REAL NOT NULL DEFAULT 0,
        igstTotal REAL NOT NULL DEFAULT 0,
        roundOff REAL NOT NULL DEFAULT 0,
        grandTotal REAL NOT NULL DEFAULT 0,
        paymentStatus TEXT NOT NULL DEFAULT 'CREDIT_PENDING',
        paymentMode TEXT NOT NULL DEFAULT 'CREDIT_DUE',
        status TEXT NOT NULL DEFAULT 'POSTED_TO_STOCK',
        notes TEXT,
        cancelReason TEXT,
        itemsJson TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchase_receipt_items (
        id TEXT PRIMARY KEY,
        receiptId TEXT NOT NULL,
        pharmacyId TEXT,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        expiryDate TEXT NOT NULL,
        manufacturingDate TEXT,
        packing INTEGER NOT NULL DEFAULT 10,
        quantityStrips REAL NOT NULL DEFAULT 0,
        freeStrips REAL NOT NULL DEFAULT 0,
        rejectedStrips REAL NOT NULL DEFAULT 0,
        acceptedStrips REAL NOT NULL DEFAULT 0,
        costPricePerStrip REAL NOT NULL DEFAULT 0,
        mrpPerStrip REAL NOT NULL DEFAULT 0,
        discountPercent REAL NOT NULL DEFAULT 0,
        gstRate REAL NOT NULL DEFAULT 0,
        taxableAmount REAL NOT NULL DEFAULT 0,
        cgstAmount REAL NOT NULL DEFAULT 0,
        sgstAmount REAL NOT NULL DEFAULT 0,
        igstAmount REAL NOT NULL DEFAULT 0,
        lineTotal REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (receiptId) REFERENCES purchase_receipts(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        pharmacyId TEXT,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        batchId TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        unitType TEXT NOT NULL,
        quantity REAL NOT NULL,
        stripSize INTEGER NOT NULL DEFAULT 10,
        totalTabletsSold INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        costPrice REAL NOT NULL DEFAULT 0,
        mrp REAL NOT NULL DEFAULT 0,
        gstRate REAL NOT NULL DEFAULT 12,
        taxableAmount REAL NOT NULL DEFAULT 0,
        cgstAmount REAL NOT NULL DEFAULT 0,
        sgstAmount REAL NOT NULL DEFAULT 0,
        igstAmount REAL NOT NULL DEFAULT 0,
        totalAmount REAL NOT NULL,
        FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sales_returns (
        id TEXT PRIMARY KEY,
        pharmacyId TEXT,
        returnNumber TEXT UNIQUE NOT NULL,
        invoiceId TEXT NOT NULL,
        invoiceNumber TEXT NOT NULL,
        customerName TEXT NOT NULL,
        date TEXT NOT NULL,
        itemsJson TEXT NOT NULL,
        totalRefundAmount REAL NOT NULL,
        refundMode TEXT NOT NULL,
        processedBy TEXT NOT NULL,
        reason TEXT NOT NULL,
        isRestocked INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(productId);
      CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiryDate);
      CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoiceDate);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
  }

  createIndexes() {
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(productId)',
      'CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiryDate)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoiceDate)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_products_pharmacy ON products(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_pharmacy ON invoices(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_users_pharmacy ON users(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_vendors_pharmacy ON vendors(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_stock_audit_pharmacy ON stock_audit_logs(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_receipts_pharmacy ON purchase_receipts(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_receipts_vendor ON purchase_receipts(vendorId)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_receipts_grn ON purchase_receipts(grnNumber)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_receipt ON purchase_receipt_items(receiptId)',
      'CREATE INDEX IF NOT EXISTS idx_purchase_receipt_items_product ON purchase_receipt_items(productId)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoiceId)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(productId)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_batch ON invoice_items(batchId)',
      'CREATE INDEX IF NOT EXISTS idx_sales_returns_pharmacy ON sales_returns(pharmacyId)',
      'CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(invoiceId)'
    ];

    for (const query of indexQueries) {
      try {
        this.db.exec(query);
      } catch (err) {
        console.warn('[SQLite] Non-critical index creation warning:', err.message);
      }
    }
  }

  runMigrations() {
    const tables = ['products', 'invoices', 'vendors', 'stock_audit_logs', 'dpdp_logs', 'backup_snapshots', 'users', 'purchase_receipts', 'purchase_receipt_items', 'invoice_items', 'sales_returns'];
    for (const table of tables) {
      try {
        const cols = this.db.prepare(`PRAGMA table_info(${table})`).all();
        if (cols && cols.length > 0) {
          const hasCol = cols.some(c => c.name === 'pharmacyId');
          if (!hasCol) {
            this.db.exec(`ALTER TABLE ${table} ADD COLUMN pharmacyId TEXT`);
          }
        }
      } catch (err) {
        console.warn(`[SQLite Migration] Column check on ${table}:`, err.message);
      }
    }

    try {
      const invCols = this.db.prepare('PRAGMA table_info(invoices)').all();
      if (invCols && invCols.length > 0 && !invCols.some(c => c.name === 'cancelReason')) {
        this.db.exec('ALTER TABLE invoices ADD COLUMN cancelReason TEXT');
      }
    } catch (err) {
      console.warn('[SQLite Migration] cancelReason column check:', err.message);
    }

    // Migrate legacy app_settings purchase_invoices into purchase_receipts if empty
    try {
      const receiptCount = this.db.prepare('SELECT COUNT(*) as cnt FROM purchase_receipts').get();
      if (receiptCount && receiptCount.cnt === 0) {
        const legacySetting = this.db.prepare("SELECT valueJson FROM app_settings WHERE key = 'purchase_invoices'").get();
        if (legacySetting && legacySetting.valueJson) {
          const legacyPurchases = safeJsonParse(legacySetting.valueJson, []);
          if (Array.isArray(legacyPurchases) && legacyPurchases.length > 0) {
            const insStmt = this.db.prepare(`
              INSERT OR IGNORE INTO purchase_receipts (
                id, pharmacyId, grnNumber, grnDate, poNumber, vendorId, vendorName, vendorInvoiceNo,
                invoiceDate, paymentDueDate, subtotal, discountTotal, taxableTotal, cgstTotal,
                sgstTotal, igstTotal, roundOff, grandTotal, paymentStatus, paymentMode, status,
                notes, itemsJson, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const now = new Date().toISOString();
            for (const p of legacyPurchases) {
              insStmt.run(
                p.id || `grn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                p.pharmacyId || null,
                p.grnNumber || 'GRN-LEGACY',
                p.grnDate || now.split('T')[0],
                p.poNumber || null,
                p.vendorId || 'legacy_vendor',
                p.vendorName || 'Supplier',
                p.vendorInvoiceNo || 'INV-LEGACY',
                p.invoiceDate || now.split('T')[0],
                p.paymentDueDate || now.split('T')[0],
                p.subtotal || 0,
                p.discountTotal || 0,
                p.taxableTotal || 0,
                p.cgstTotal || 0,
                p.sgstTotal || 0,
                p.igstTotal || 0,
                p.roundOff || 0,
                p.grandTotal || 0,
                p.paymentStatus || 'CREDIT_PENDING',
                p.paymentMode || 'CREDIT_DUE',
                p.status || 'POSTED_TO_STOCK',
                p.notes || '',
                JSON.stringify(p.items || []),
                p.createdAt || now,
                now
              );
            }
            console.log(`[SQLite Migration] Migrated ${legacyPurchases.length} legacy purchase invoices into purchase_receipts table.`);
          }
        }
      }
    } catch (err) {
      console.warn('[SQLite Migration] Legacy purchase invoices migration notice:', err.message);
    }

    // Migrate legacy app_settings sales_returns into sales_returns table if empty
    try {
      const returnCount = this.db.prepare('SELECT COUNT(*) as cnt FROM sales_returns').get();
      if (returnCount && returnCount.cnt === 0) {
        const legacySetting = this.db.prepare("SELECT valueJson FROM app_settings WHERE key = 'sales_returns'").get();
        if (legacySetting && legacySetting.valueJson) {
          const legacyReturns = safeJsonParse(legacySetting.valueJson, []);
          if (Array.isArray(legacyReturns) && legacyReturns.length > 0) {
            const insStmt = this.db.prepare(`
              INSERT OR IGNORE INTO sales_returns (
                id, pharmacyId, returnNumber, invoiceId, invoiceNumber, customerName,
                date, itemsJson, totalRefundAmount, refundMode, processedBy, reason,
                isRestocked, createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const now = new Date().toISOString();
            for (const r of legacyReturns) {
              insStmt.run(
                r.id || `sr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                r.pharmacyId || null,
                r.returnNumber || `SR-${Date.now()}`,
                r.invoiceId || '',
                r.invoiceNumber || '',
                r.customerName || 'Customer',
                r.date || now,
                typeof r.items === 'string' ? r.items : JSON.stringify(r.items || []),
                Number(r.totalRefundAmount) || 0,
                r.refundMode || 'CASH',
                r.processedBy || 'Staff',
                r.reason || 'Sales return',
                r.isRestocked ? 1 : 0,
                r.createdAt || now
              );
            }
            console.log(`[SQLite Migration] Migrated ${legacyReturns.length} legacy sales returns into sales_returns table.`);
          }
        }
      }
    } catch (err) {
      console.warn('[SQLite Migration] Legacy sales returns migration notice:', err.message);
    }

    // Upgrade migration: if existing records exist without pharmacy_accounts
    try {
      const pharmCount = this.db.prepare('SELECT COUNT(*) as cnt FROM pharmacy_accounts').get();
      if (pharmCount && pharmCount.cnt === 0) {
        let prof = null;
        const userProfileRow = this.db.prepare("SELECT valueJson FROM app_settings WHERE key = 'user_profile'").get();
        if (userProfileRow && userProfileRow.valueJson) {
          try {
            prof = JSON.parse(userProfileRow.valueJson);
          } catch {}
        }
        if (!prof) {
          const hasLegacyTbl = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('legacy_user_profile', 'user_profile')").get();
          if (hasLegacyTbl) {
            const legacyRow = this.db.prepare(`SELECT * FROM ${hasLegacyTbl.name} LIMIT 1`).get();
            if (legacyRow) {
              prof = {
                storeName: legacyRow.pharmacy_name || legacyRow.storeName || legacyRow.name,
                dlNumber: legacyRow.dl_number || legacyRow.dlNumber,
                gstin: legacyRow.gstin,
                phone: legacyRow.phone,
                email: legacyRow.email,
              };
            }
          }
        }

        if (prof && prof.storeName) {
          const pharmId = 'pharm_legacy_01';
          const now = new Date().toISOString();
          this.db.prepare(`
            INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, phone, email, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            pharmId,
            prof.storeName,
            prof.dlNumber || 'DL-TN-PENDING',
            prof.gstin || '33AAAAA0000A1Z5',
            prof.phone || '',
            prof.email || '',
            now,
            now
          );

          // Preserve existing customer data by linking to migrated pharmacy account
          for (const table of tables) {
            this.db.prepare(`UPDATE ${table} SET pharmacyId = ? WHERE pharmacyId IS NULL`).run(pharmId);
          }
          console.log('[SQLite Migration] Migrated existing store profile and customer records safely.');
        }
      }
    } catch (e) {
      console.warn('[SQLite Migration] Legacy store migration check:', e.message);
    }
  }

  isDatabaseEmpty() {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM products').get();
    return !row || row.cnt === 0;
  }

  isConfigured() {
    try {
      const pharm = this.db.prepare('SELECT COUNT(*) as cnt FROM pharmacy_accounts').get();
      if (!pharm || pharm.cnt === 0) return false;
      const admin = this.db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'ADMIN' AND isActive = 1").get();
      return Boolean(admin && admin.cnt > 0);
    } catch {
      return false;
    }
  }

  getPharmacyAccount(pharmacyId = null) {
    if (pharmacyId) {
      return this.db.prepare('SELECT * FROM pharmacy_accounts WHERE id = ?').get(pharmacyId) || null;
    }
    return this.db.prepare('SELECT * FROM pharmacy_accounts ORDER BY createdAt ASC LIMIT 1').get() || null;
  }

  savePharmacyAccount(account) {
    if (!account || !account.id || !account.name) {
      return { success: false, error: 'Pharmacy id and name are required.' };
    }
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        dlNumber = excluded.dlNumber,
        gstin = excluded.gstin,
        address = excluded.address,
        phone = excluded.phone,
        email = excluded.email,
        state = excluded.state,
        pincode = excluded.pincode,
        updatedAt = excluded.updatedAt
    `);
    stmt.run(
      account.id,
      account.name.trim(),
      (account.dlNumber || '').trim(),
      (account.gstin || '').trim(),
      account.address || '',
      account.phone || '',
      account.email || '',
      account.state || 'Tamil Nadu',
      account.pincode || '',
      account.createdAt || now,
      now
    );
    return { success: true };
  }

  getUserById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
  }

  getUserByUsername(username) {
    return this.db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username.trim()) || null;
  }

  setupInitialPharmacy(arg1, arg2) {
    const payload = (arg2 || !arg1?.pharmacy)
      ? { pharmacy: arg1, adminUser: arg2 }
      : arg1;
    const { pharmacy, adminUser } = payload;
    if (!pharmacy || !pharmacy.name || !pharmacy.dlNumber || !pharmacy.gstin) {
      return { success: false, error: 'Pharmacy Name, Drug License Number, and GSTIN are required.' };
    }
    if (!adminUser || !adminUser.username || !adminUser.password || !adminUser.fullName) {
      return { success: false, error: 'Administrator Name, Username, and Password are required.' };
    }
    if (adminUser.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const cleanUsername = adminUser.username.trim();
    const existing = this.db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (existing) {
      return { success: false, error: 'Username already in use.' };
    }

    this.db.exec('BEGIN TRANSACTION');
    try {
      const now = new Date().toISOString();
      const pharmacyId = 'pharm_' + crypto.randomUUID();
      const userId = 'usr_' + crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO pharmacy_accounts (id, name, dlNumber, gstin, address, phone, email, state, pincode, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pharmacyId,
        pharmacy.name.trim(),
        pharmacy.dlNumber.trim(),
        pharmacy.gstin.trim(),
        pharmacy.address || '',
        pharmacy.phone || '',
        pharmacy.email || '',
        pharmacy.state || 'Tamil Nadu',
        pharmacy.pincode || '',
        now,
        now
      );

      const { hash, salt, iterations } = hashPassword(adminUser.password);

      this.db.prepare(`
        INSERT INTO users (
          id, pharmacyId, username, fullName, email, phone, role, passwordHash, salt, iterations, isActive, createdAt, updatedAt, lastLoginAt
        ) VALUES (?, ?, ?, ?, ?, ?, 'ADMIN', ?, ?, ?, 1, ?, ?, ?)
      `).run(
        userId,
        pharmacyId,
        cleanUsername,
        adminUser.fullName.trim(),
        adminUser.email || '',
        adminUser.phone || '',
        hash,
        salt,
        iterations,
        now,
        now,
        now
      );

      // Backfill any unassigned existing records to this newly configured pharmacy
      const tables = ['products', 'invoices', 'vendors', 'stock_audit_logs', 'dpdp_logs', 'backup_snapshots', 'purchase_receipts', 'purchase_receipt_items', 'invoice_items', 'sales_returns'];
      for (const table of tables) {
        this.db.prepare(`UPDATE ${table} SET pharmacyId = ? WHERE pharmacyId IS NULL`).run(pharmacyId);
      }

      this.db.exec('COMMIT');

      const savedPharm = this.getPharmacyAccount(pharmacyId);
      const savedUser = sanitizeUser(this.getUserById(userId));
      const session = this.createSession(userId, pharmacyId, 'ADMIN');

      return {
        success: true,
        pharmacy: savedPharm,
        user: savedUser,
        admin: savedUser,
        session,
      };
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[SQLite] setupInitialPharmacy failed:', err);
      return { success: false, error: err.message };
    }
  }

  verifyUserCredentials(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required.' };
    }
    const cleanUsername = username.trim();
    const user = this.db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (!user) {
      return { success: false, error: 'Invalid username or password.' };
    }
    if (!user.isActive) {
      return { success: false, error: 'User account has been deactivated. Please contact your pharmacy administrator.' };
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt, user.iterations);
    if (!isValid) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET lastLoginAt = ?, updatedAt = ? WHERE id = ?').run(now, now, user.id);

    const pharmacy = this.getPharmacyAccount(user.pharmacyId);
    return {
      success: true,
      user: sanitizeUser(user),
      pharmacy,
    };
  }

  createSession(userId, pharmacyId, role, durationMs = 24 * 60 * 60 * 1000) {
    const token = 'sess_' + crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMs).toISOString();
    this.db.prepare(`
      INSERT INTO auth_sessions (token, userId, pharmacyId, role, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(token, userId, pharmacyId, role, now.toISOString(), expiresAt);
    return { token, userId, pharmacyId, role, expiresAt };
  }

  validateSession(token) {
    if (!token) return { valid: false };
    const now = new Date().toISOString();
    const sess = this.db.prepare('SELECT * FROM auth_sessions WHERE token = ? AND expiresAt > ?').get(token, now);
    if (!sess) return { valid: false };

    const user = this.db.prepare('SELECT * FROM users WHERE id = ? AND isActive = 1').get(sess.userId);
    if (!user) {
      this.deleteSession(token);
      return { valid: false };
    }
    const pharmacy = this.getPharmacyAccount(sess.pharmacyId);
    return {
      valid: true,
      user: sanitizeUser(user),
      pharmacy,
      token,
    };
  }

  deleteSession(token) {
    if (token) {
      this.db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    }
    return { success: true };
  }

  getUsers(pharmacyId) {
    const rows = this.db.prepare(
      'SELECT id, pharmacyId, username, fullName, email, phone, role, isActive, createdAt, updatedAt, lastLoginAt FROM users WHERE pharmacyId = ? ORDER BY createdAt ASC'
    ).all(pharmacyId);
    return rows.map(sanitizeUser);
  }

  createUser(arg1, arg2) {
    const data = typeof arg1 === 'string' ? { ...arg2, pharmacyId: arg1 } : arg1;
    const { pharmacyId, username, fullName, email, phone, role, password } = data || {};
    if (!pharmacyId || !username || !fullName || !password || !role) {
      return { success: false, error: 'Missing required fields for new user account.' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }
    const cleanUsername = username.trim();
    const existing = this.db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (existing) {
      return { success: false, error: 'Username is already taken / already in use.' };
    }

    const validRoles = ['ADMIN', 'PHARMACIST', 'CASHIER', 'PHARMACY_ASSISTANT'];
    if (!validRoles.includes(role)) {
      return { success: false, error: `Invalid role specified: ${role}` };
    }

    const userId = 'usr_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const { hash, salt, iterations } = hashPassword(password);

    this.db.prepare(`
      INSERT INTO users (id, pharmacyId, username, fullName, email, phone, role, passwordHash, salt, iterations, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      userId,
      pharmacyId,
      cleanUsername,
      fullName.trim(),
      email || '',
      phone || '',
      role,
      hash,
      salt,
      iterations,
      now,
      now
    );

    const created = this.getUserById(userId);
    return { success: true, user: sanitizeUser(created) };
  }

  deactivateUser(arg1, arg2) {
    let user = this.getUserById(arg1);
    let targetUserId = arg1;
    let targetPharmacyId = arg2;
    if (!user && arg2) {
      user = this.getUserById(arg2);
      targetUserId = arg2;
      targetPharmacyId = arg1;
    }
    if (!user) {
      return { success: false, error: 'User not found.' };
    }
    const pharmacyId = targetPharmacyId || user.pharmacyId;
    if (user.role === 'ADMIN') {
      const activeAdmins = this.db.prepare(
        "SELECT COUNT(*) as cnt FROM users WHERE pharmacyId = ? AND role = 'ADMIN' AND isActive = 1"
      ).get(pharmacyId);
      if (activeAdmins && activeAdmins.cnt <= 1) {
        return { success: false, error: 'Cannot deactivate the only active administrator account.' };
      }
    }
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET isActive = 0, updatedAt = ? WHERE id = ?').run(now, targetUserId);
    this.db.prepare('DELETE FROM auth_sessions WHERE userId = ?').run(targetUserId);
    return { success: true };
  }

  activateUser(arg1, arg2) {
    let user = this.getUserById(arg1);
    let targetUserId = arg1;
    if (!user && arg2) {
      user = this.getUserById(arg2);
      targetUserId = arg2;
    }
    if (!user) return { success: false, error: 'User not found.' };
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET isActive = 1, updatedAt = ? WHERE id = ?').run(now, targetUserId);
    return { success: true };
  }

  resetPassword(userId, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    const { hash, salt, iterations } = hashPassword(newPassword);
    const now = new Date().toISOString();
    this.db.prepare('UPDATE users SET passwordHash = ?, salt = ?, iterations = ?, updatedAt = ? WHERE id = ?')
      .run(hash, salt, iterations, now, userId);

    this.db.prepare('DELETE FROM auth_sessions WHERE userId = ?').run(userId);
    return { success: true };
  }

  updatePharmacyProfile(pharmacyId, data) {
    const existing = this.getPharmacyAccount(pharmacyId);
    if (!existing) return { success: false, error: 'Pharmacy account not found.' };

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE pharmacy_accounts SET
        name = COALESCE(?, name),
        dlNumber = COALESCE(?, dlNumber),
        gstin = COALESCE(?, gstin),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        updatedAt = ?
      WHERE id = ?
    `).run(
      data.name || null,
      data.dlNumber || null,
      data.gstin || null,
      data.address || null,
      data.phone || null,
      data.email || null,
      data.state || null,
      data.pincode || null,
      now,
      pharmacyId
    );

    return { success: true, pharmacy: this.getPharmacyAccount(pharmacyId) };
  }

  getAllData(pharmacyId = null) {
    let productsStmt = 'SELECT * FROM products';
    let batchesStmt = 'SELECT * FROM batches';
    let invoicesStmt = 'SELECT * FROM invoices ORDER BY invoiceDate DESC';
    let vendorsStmt = 'SELECT * FROM vendors';
    let stockAuditLogsStmt = 'SELECT * FROM stock_audit_logs ORDER BY timestamp DESC';
    let dpdpLogsStmt = 'SELECT * FROM dpdp_logs ORDER BY timestamp DESC';
    let backupSnapshotsStmt = 'SELECT * FROM backup_snapshots ORDER BY timestamp DESC';
    let purchaseReceiptsStmt = 'SELECT * FROM purchase_receipts ORDER BY grnDate DESC, createdAt DESC';
    let salesReturnsStmt = 'SELECT * FROM sales_returns ORDER BY date DESC, createdAt DESC';

    if (pharmacyId) {
      productsStmt = 'SELECT * FROM products WHERE pharmacyId = ? OR pharmacyId IS NULL';
      batchesStmt = 'SELECT b.* FROM batches b JOIN products p ON b.productId = p.id WHERE p.pharmacyId = ? OR p.pharmacyId IS NULL';
      invoicesStmt = 'SELECT * FROM invoices WHERE pharmacyId = ? ORDER BY invoiceDate DESC';
      vendorsStmt = 'SELECT * FROM vendors WHERE pharmacyId = ? OR pharmacyId IS NULL';
      stockAuditLogsStmt = 'SELECT * FROM stock_audit_logs WHERE pharmacyId = ? ORDER BY timestamp DESC';
      dpdpLogsStmt = 'SELECT * FROM dpdp_logs WHERE pharmacyId = ? ORDER BY timestamp DESC';
      backupSnapshotsStmt = 'SELECT * FROM backup_snapshots WHERE pharmacyId = ? ORDER BY timestamp DESC';
      purchaseReceiptsStmt = 'SELECT * FROM purchase_receipts WHERE pharmacyId = ? ORDER BY grnDate DESC, createdAt DESC';
      salesReturnsStmt = 'SELECT * FROM sales_returns WHERE pharmacyId = ? ORDER BY date DESC, createdAt DESC';
    }

    const products = (pharmacyId ? this.db.prepare(productsStmt).all(pharmacyId) : this.db.prepare(productsStmt).all()).map(p => ({
      ...p,
      isActive: Boolean(p.isActive),
    }));

    const batches = pharmacyId ? this.db.prepare(batchesStmt).all(pharmacyId) : this.db.prepare(batchesStmt).all();

    const invoices = (pharmacyId ? this.db.prepare(invoicesStmt).all(pharmacyId) : this.db.prepare(invoicesStmt).all()).map(inv => ({
      ...inv,
      isInterState: Boolean(inv.isInterState),
      prescription: safeJsonParse(inv.prescriptionJson, {}),
      items: safeJsonParse(inv.itemsJson, []),
      taxSlabBreakdowns: safeJsonParse(inv.taxSlabBreakdownsJson, []),
    }));

    const vendors = (pharmacyId ? this.db.prepare(vendorsStmt).all(pharmacyId) : this.db.prepare(vendorsStmt).all()).map(v => ({
      ...v,
      isActive: Boolean(v.isActive),
    }));

    const stockAuditLogs = pharmacyId ? this.db.prepare(stockAuditLogsStmt).all(pharmacyId) : this.db.prepare(stockAuditLogsStmt).all();
    const dpdpLogs = pharmacyId ? this.db.prepare(dpdpLogsStmt).all(pharmacyId) : this.db.prepare(dpdpLogsStmt).all();
    const backupSnapshots = (pharmacyId ? this.db.prepare(backupSnapshotsStmt).all(pharmacyId) : this.db.prepare(backupSnapshotsStmt).all()).map(s => ({
      ...s,
      isEncrypted: Boolean(s.isEncrypted),
      recordCounts: safeJsonParse(s.recordCountsJson, {}),
    }));

    const purchaseReceipts = (pharmacyId ? this.db.prepare(purchaseReceiptsStmt).all(pharmacyId) : this.db.prepare(purchaseReceiptsStmt).all()).map(r => ({
      ...r,
      items: safeJsonParse(r.itemsJson, []),
    }));

    const salesReturns = (pharmacyId ? this.db.prepare(salesReturnsStmt).all(pharmacyId) : this.db.prepare(salesReturnsStmt).all()).map(r => ({
      ...r,
      items: safeJsonParse(r.itemsJson, []),
    }));

    const settingsRows = this.db.prepare('SELECT * FROM app_settings').all();
    const settings = {};
    for (const row of settingsRows) {
      settings[row.key] = safeJsonParse(row.valueJson, null);
    }

    return {
      products,
      batches,
      invoices,
      vendors,
      stockAuditLogs,
      dpdpLogs,
      backupSnapshots,
      purchaseInvoices: purchaseReceipts,
      purchaseReceipts,
      salesReturns,
      settings,
    };
  }

  getAllSalesReturns(pharmacyId = null) {
    let stmt = 'SELECT * FROM sales_returns ORDER BY date DESC, createdAt DESC';
    if (pharmacyId) {
      stmt = 'SELECT * FROM sales_returns WHERE pharmacyId = ? ORDER BY date DESC, createdAt DESC';
    }
    return (pharmacyId ? this.db.prepare(stmt).all(pharmacyId) : this.db.prepare(stmt).all()).map(r => ({
      ...r,
      items: safeJsonParse(r.itemsJson, []),
    }));
  }

  saveProduct(product, pharmacyId = null) {
    const targetPharmacyId = pharmacyId || product.pharmacyId || null;
    if (product.id) {
      const existing = this.db.prepare('SELECT pharmacyId FROM products WHERE id = ?').get(product.id);
      if (existing && targetPharmacyId && existing.pharmacyId && existing.pharmacyId !== targetPharmacyId) {
        return { success: false, error: 'Product belongs to another pharmacy.' };
      }
    }
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO products (
        id, pharmacyId, name, genericComposition, manufacturer, hsnCode, barcode, stripSize,
        drugSchedule, reorderLevelUnits, defaultGstRate, rackLocation, isActive, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      product.id,
      targetPharmacyId,
      product.name || 'Unnamed Product',
      product.genericComposition || 'Generic Formulation',
      product.manufacturer || 'General Pharma',
      product.hsnCode || '30049099',
      product.barcode || (product.id ? `BAR-${product.id}` : `BAR-${Date.now()}`),
      Number(product.stripSize) || 10,
      product.drugSchedule || 'OTC',
      Number(product.reorderLevelUnits) || 0,
      Number(product.defaultGstRate) || 0,
      product.rackLocation || null,
      product.isActive ? 1 : 0,
      product.createdAt || now,
      now
    );
    return { success: true };
  }

  getProduct(id) {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      isActive: Boolean(row.isActive),
    };
  }

  getInvoice(id) {
    const row = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...row,
      isInterState: Boolean(row.isInterState),
      prescription: safeJsonParse(row.prescriptionJson, {}),
      items: safeJsonParse(row.itemsJson, []),
      taxSlabBreakdowns: safeJsonParse(row.taxSlabBreakdownsJson, []),
    };
  }

  createPurchaseReceipt(payload, pharmacyId = null) {
    return this.postPurchaseReceipt(payload, {}, pharmacyId);
  }

  getBatchWithProduct(batchId) {
    return this.db.prepare(`
      SELECT b.*, p.pharmacyId as productPharmacyId, p.name as productName,
             p.genericComposition, p.drugSchedule, p.rackLocation as productRackLocation
      FROM batches b
      JOIN products p ON b.productId = p.id
      WHERE b.id = ?
    `).get(batchId);
  }

  createBatch(batch, pharmacyId = null) {
    if (!batch || !batch.id || !batch.productId) {
      return { success: false, error: 'Missing batch id or productId.' };
    }
    const product = this.db.prepare('SELECT id, pharmacyId, name, genericComposition, drugSchedule, rackLocation FROM products WHERE id = ?').get(batch.productId);
    if (!product && pharmacyId) {
      return { success: false, error: `Product with ID '${batch.productId}' not found.` };
    }
    if (pharmacyId && product && product.pharmacyId && product.pharmacyId !== pharmacyId) {
      return { success: false, error: 'Product belongs to another pharmacy.' };
    }

    const existing = this.db.prepare('SELECT id FROM batches WHERE id = ?').get(batch.id);
    if (existing) {
      return { success: false, error: `Batch with ID '${batch.id}' already exists.` };
    }

    const now = new Date().toISOString();
    const initialStock = Math.max(0, parseInt(batch.totalTablets, 10) || 0);

    this.db.prepare(`
      INSERT INTO batches (
        id, productId, batchNumber, barcode, expiryDate, manufacturingDate,
        costPricePerStrip, mrpPerStrip, sellingPricePerStrip, gstRate, totalTablets,
        vendorId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batch.id,
      batch.productId,
      batch.batchNumber || 'UNKNOWN',
      batch.barcode || null,
      batch.expiryDate || '2099-12-31',
      batch.manufacturingDate || now.split('T')[0],
      Number(batch.costPricePerStrip) || 0,
      Number(batch.mrpPerStrip) || 0,
      Number(batch.sellingPricePerStrip) || 0,
      Number(batch.gstRate) || 0,
      initialStock,
      batch.vendorId || null,
      batch.createdAt || now,
      now
    );

    return { success: true, batchId: batch.id };
  }

  updateBatchMetadata(batch, pharmacyId = null) {
    if (!batch || !batch.id) {
      return { success: false, error: 'Batch id is required.' };
    }
    const existing = this.getBatchWithProduct(batch.id);
    if (!existing) {
      return { success: false, error: `Batch with ID '${batch.id}' not found.` };
    }
    if (pharmacyId && existing.productPharmacyId && existing.productPharmacyId !== pharmacyId) {
      return { success: false, error: 'Batch belongs to another pharmacy.' };
    }

    const now = new Date().toISOString();
    // CRITICAL: totalTablets is NOT updated; preserved from database
    this.db.prepare(`
      UPDATE batches SET
        batchNumber = ?,
        barcode = ?,
        expiryDate = ?,
        manufacturingDate = ?,
        costPricePerStrip = ?,
        mrpPerStrip = ?,
        sellingPricePerStrip = ?,
        gstRate = ?,
        vendorId = ?,
        updatedAt = ?
      WHERE id = ?
    `).run(
      batch.batchNumber !== undefined ? batch.batchNumber : existing.batchNumber,
      batch.barcode !== undefined ? batch.barcode : existing.barcode,
      batch.expiryDate !== undefined ? batch.expiryDate : existing.expiryDate,
      batch.manufacturingDate !== undefined ? batch.manufacturingDate : existing.manufacturingDate,
      batch.costPricePerStrip !== undefined ? Number(batch.costPricePerStrip) : existing.costPricePerStrip,
      batch.mrpPerStrip !== undefined ? Number(batch.mrpPerStrip) : existing.mrpPerStrip,
      batch.sellingPricePerStrip !== undefined ? Number(batch.sellingPricePerStrip) : existing.sellingPricePerStrip,
      batch.gstRate !== undefined ? Number(batch.gstRate) : existing.gstRate,
      batch.vendorId !== undefined ? batch.vendorId : existing.vendorId,
      now,
      batch.id
    );

    return { success: true };
  }

  saveBatch(batch, pharmacyId = null) {
    if (!batch || !batch.id) {
      return { success: false, error: 'Batch id is required.' };
    }
    const existing = this.db.prepare('SELECT id FROM batches WHERE id = ?').get(batch.id);
    if (existing) {
      return this.updateBatchMetadata(batch, pharmacyId);
    }
    return this.createBatch(batch, pharmacyId);
  }

  adjustStock(params, operator = {}, pharmacyId = null) {
    if (!params || !params.batchId) {
      return { success: false, error: 'Batch ID is required for stock adjustment.' };
    }
    this.db.exec('BEGIN TRANSACTION');
    try {
      const { batchId, adjustmentType, quantityChangeTablets, newStockTablets, reason, referenceNumber, rackLocation } = params;
      const existing = this.getBatchWithProduct(batchId);

      if (!existing) {
        this.db.exec('ROLLBACK');
        return { success: false, error: `Batch with ID '${batchId}' not found.` };
      }
      if (pharmacyId && existing.productPharmacyId && existing.productPharmacyId !== pharmacyId) {
        this.db.exec('ROLLBACK');
        return { success: false, error: 'Batch belongs to another pharmacy.' };
      }

      const previousStockTablets = existing.totalTablets;
      let finalNewStock = previousStockTablets;
      let delta = 0;

      if (newStockTablets !== undefined && newStockTablets !== null) {
        finalNewStock = Math.max(0, parseInt(newStockTablets, 10));
        delta = finalNewStock - previousStockTablets;
      } else if (quantityChangeTablets !== undefined && quantityChangeTablets !== null) {
        delta = parseInt(quantityChangeTablets, 10);
        finalNewStock = previousStockTablets + delta;
        if (finalNewStock < 0) {
          this.db.exec('ROLLBACK');
          return {
            success: false,
            error: `Insufficient stock on hand for adjustment. Available: ${previousStockTablets}, requested deduction: ${Math.abs(delta)}`
          };
        }
      } else {
        this.db.exec('ROLLBACK');
        return { success: false, error: 'Either newStockTablets or quantityChangeTablets must be provided.' };
      }

      const now = new Date().toISOString();
      this.db.prepare('UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?').run(finalNewStock, now, batchId);

      const opName = operator.fullName || operator.username || operator.name || 'Staff';
      const opRole = operator.role || 'PHARMACIST';
      const logId = 'aud_' + crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        pharmacyId || existing.productPharmacyId || null,
        now,
        null,
        existing.productId,
        existing.productName,
        existing.genericComposition || null,
        existing.id,
        existing.batchNumber,
        existing.expiryDate,
        existing.drugSchedule || null,
        adjustmentType || (delta >= 0 ? 'STOCK_ADDED' : 'STOCK_DEDUCTED'),
        delta,
        `${delta >= 0 ? '+' : ''}${delta} tablets`,
        previousStockTablets,
        finalNewStock,
        `${previousStockTablets} tablets`,
        `${finalNewStock} tablets`,
        referenceNumber || `ADJ-${Date.now()}`,
        opName,
        opRole,
        reason || 'Manual inventory adjustment',
        existing.vendorId || null,
        null,
        rackLocation || existing.productRackLocation || null
      );

      this.db.exec('COMMIT');
      return { success: true, newStockTablets: finalNewStock, previousStockTablets, change: delta };
    } catch (err) {
      this.db.exec('ROLLBACK');
      return { success: false, error: err.message };
    }
  }

  receiveStock(params, operator = {}, pharmacyId = null) {
    if (!params || !params.batchId) {
      return { success: false, error: 'Batch ID is required for stock receipt.' };
    }
    const qty = Math.max(0, parseInt(params.quantityChangeTablets, 10) || 0);
    if (qty <= 0) {
      return { success: false, error: 'Received quantity must be greater than zero.' };
    }
    return this.adjustStock(
      {
        batchId: params.batchId,
        adjustmentType: 'PURCHASE_INWARD',
        quantityChangeTablets: qty,
        reason: params.reason || 'Inward stock receipt',
        referenceNumber: params.referenceNumber || `GRN-${Date.now()}`,
        rackLocation: params.rackLocation,
      },
      operator,
      pharmacyId
    );
  }

  createInvoice(invoice, auditEntries = [], pharmacyId = null, operator = {}) {
    if (!invoice || !invoice.id || !invoice.invoiceNumber) {
      return { success: false, error: 'Invoice ID and invoice number are required.' };
    }
    const cleanInvNo = String(invoice.invoiceNumber).trim();
    if (!cleanInvNo) {
      return { success: false, error: 'Invoice number is required.' };
    }

    const targetPharmacyId = pharmacyId || invoice.pharmacyId || null;

    // Check duplicate invoice ID
    const dupId = this.db.prepare('SELECT id FROM invoices WHERE id = ?').get(invoice.id);
    if (dupId) {
      return { success: false, error: `An invoice with ID '${invoice.id}' already exists.` };
    }

    // Check duplicate invoice number
    let dupQuery = 'SELECT id FROM invoices WHERE LOWER(TRIM(invoiceNumber)) = LOWER(?)';
    let dupParams = [cleanInvNo];
    if (targetPharmacyId) {
      dupQuery = 'SELECT id FROM invoices WHERE (pharmacyId = ? OR pharmacyId IS NULL) AND LOWER(TRIM(invoiceNumber)) = LOWER(?)';
      dupParams = [targetPharmacyId, cleanInvNo];
    }
    const dup = this.db.prepare(dupQuery).get(...dupParams);
    if (dup) {
      return { success: false, error: `Duplicate invoice number: Invoice "${cleanInvNo}" already exists.` };
    }

    if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
      return { success: false, error: 'At least one line item is required for invoice creation.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const requestedPerBatch = {};
    const validatedItems = [];

    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i];
      const batchId = item.batchId || (item.batch && item.batch.id);
      if (!batchId) {
        return { success: false, error: `Line ${i + 1}: Batch is required.` };
      }
      const b = this.getBatchWithProduct(batchId);
      if (!b) {
        return { success: false, error: `Line ${i + 1}: Batch '${batchId}' not found.` };
      }
      if (targetPharmacyId && b.productPharmacyId && b.productPharmacyId !== targetPharmacyId) {
        return { success: false, error: `Line ${i + 1}: Batch '${batchId}' belongs to another pharmacy.` };
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        return { success: false, error: `Line ${i + 1}: Quantity must be greater than zero.` };
      }

      // Check expired batch
      if (b.expiryDate && b.expiryDate < todayStr) {
        return {
          success: false,
          error: `Line ${i + 1}: Cannot dispense expired batch "${b.batchNumber}" (expired on ${b.expiryDate}).`,
        };
      }

      const stripSize = Number(item.stripSize) || Number(b.stripSize) || 10;
      const unitType = item.unitType || 'STRIP';
      const tabletsSold = item.totalTabletsSold !== undefined
        ? Number(item.totalTabletsSold)
        : (unitType === 'STRIP' ? Math.round(qty * stripSize) : Math.round(qty));

      if (tabletsSold <= 0) {
        return { success: false, error: `Line ${i + 1}: Dispensed tablet count must be greater than zero.` };
      }

      // Check price against MRP
      const unitPrice = Number(item.unitPrice) || 0;
      const mrpPerUnit = unitType === 'TABLET' ? (b.mrpPerStrip / stripSize) : b.mrpPerStrip;
      if (unitPrice > mrpPerUnit + 0.05) {
        return {
          success: false,
          error: `Line ${i + 1}: Selling price (₹${unitPrice.toFixed(2)}) cannot exceed MRP (₹${mrpPerUnit.toFixed(2)}).`,
        };
      }

      if (!requestedPerBatch[batchId]) {
        requestedPerBatch[batchId] = {
          batch: b,
          totalTabsRequested: 0,
        };
      }
      requestedPerBatch[batchId].totalTabsRequested += tabletsSold;

      const taxable = Number(item.taxableAmount) || 0;
      const cgst = Number(item.cgstAmount) || 0;
      const sgst = Number(item.sgstAmount) || 0;
      const igst = Number(item.igstAmount) || 0;
      const totalAmount = Number(item.totalAmount) || Number((taxable + cgst + sgst + igst).toFixed(2));

      validatedItems.push({
        ...item,
        productId: b.productId,
        productName: b.productName,
        batchId: b.id,
        batchNumber: b.batchNumber,
        unitType,
        quantity: qty,
        stripSize,
        totalTabletsSold: tabletsSold,
        unitPrice,
        costPrice: Number(((b.costPricePerStrip / stripSize) * (unitType === 'STRIP' ? stripSize : 1)).toFixed(2)),
        mrp: Number(mrpPerUnit.toFixed(2)),
        gstRate: Number(item.gstRate) || b.gstRate || 12,
        taxableAmount: taxable,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount,
      });
    }

    // Enforce stock availability
    for (const [batchId, req] of Object.entries(requestedPerBatch)) {
      if (req.batch.totalTablets < req.totalTabsRequested) {
        return {
          success: false,
          error: `Insufficient stock for batch "${req.batch.batchNumber}" (${req.batch.productName}): available ${req.batch.totalTablets} tablets, requested ${req.totalTabsRequested} tablets.`,
        };
      }
    }

    this.db.exec('BEGIN TRANSACTION');
    try {
      const invStmt = this.db.prepare(`
        INSERT INTO invoices (
          id, pharmacyId, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
          subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
          grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      invStmt.run(
        invoice.id,
        targetPharmacyId,
        cleanInvNo,
        invoice.invoiceDate || now.split('T')[0],
        invoice.isInterState ? 1 : 0,
        typeof invoice.prescription === 'string' ? invoice.prescription : JSON.stringify(invoice.prescription || {}),
        JSON.stringify(validatedItems),
        invoice.subtotal || 0,
        invoice.totalCgst || 0,
        invoice.totalSgst || 0,
        invoice.totalIgst || 0,
        invoice.totalTax || 0,
        invoice.roundOff || 0,
        invoice.grandTotal || 0,
        (invoice.paymentMethod || 'CASH').toUpperCase(),
        invoice.status || 'COMPLETED',
        operator.fullName || operator.username || invoice.cashierName || 'Staff',
        typeof invoice.taxSlabBreakdowns === 'string' ? invoice.taxSlabBreakdowns : JSON.stringify(invoice.taxSlabBreakdowns || []),
        invoice.createdAt || now
      );

      // Normalized invoice_items
      const itemStmt = this.db.prepare(`
        INSERT INTO invoice_items (
          id, invoiceId, pharmacyId, productId, productName, batchId, batchNumber,
          unitType, quantity, stripSize, totalTabletsSold, unitPrice, costPrice,
          mrp, gstRate, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const it of validatedItems) {
        itemStmt.run(
          it.id || `invitem_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
          invoice.id,
          targetPharmacyId,
          it.productId,
          it.productName,
          it.batchId,
          it.batchNumber,
          it.unitType,
          it.quantity,
          it.stripSize,
          it.totalTabletsSold,
          it.unitPrice,
          it.costPrice,
          it.mrp,
          it.gstRate,
          it.taxableAmount,
          it.cgstAmount,
          it.sgstAmount,
          it.igstAmount,
          it.totalAmount
        );
      }

      // Update batches stock
      const updatedBatches = [];
      const updateBatchStmt = this.db.prepare(
        'UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?'
      );
      for (const [batchId, req] of Object.entries(requestedPerBatch)) {
        const prevStock = req.batch.totalTablets;
        const newStock = prevStock - req.totalTabsRequested;
        updateBatchStmt.run(newStock, now, batchId);
        updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
      }

      // Authoritative stock audit logs
      const createdLogs = [];
      const auditStmt = this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (Array.isArray(auditEntries) && auditEntries.length > 0) {
        for (const entry of auditEntries) {
          auditStmt.run(
            entry.id || ('aud_' + crypto.randomUUID()),
            targetPharmacyId,
            entry.timestamp || now,
            entry.formattedTimestamp || null,
            entry.productId,
            entry.productName,
            entry.genericComposition || null,
            entry.batchId,
            entry.batchNumber,
            entry.expiryDate || null,
            entry.drugSchedule || null,
            entry.adjustmentType || 'SALE_DEDUCTION',
            entry.quantityChangeTablets,
            entry.formattedChange || null,
            entry.previousStockTablets || 0,
            entry.newStockTablets || 0,
            entry.formattedPreviousStock || null,
            entry.formattedNewStock || null,
            entry.referenceNumber || cleanInvNo,
            operator.fullName || operator.username || entry.operatorName || invoice.cashierName || 'Staff',
            operator.role || entry.operatorRole || 'CASHIER',
            entry.reason || `POS Bill #${cleanInvNo}`,
            entry.vendorId || null,
            entry.vendorName || null,
            entry.rackLocation || null
          );
          createdLogs.push(entry);
        }
      } else {
        for (const it of validatedItems) {
          const req = requestedPerBatch[it.batchId];
          const prevStock = req.batch.totalTablets;
          const newStock = prevStock - req.totalTabsRequested;
          const stripSize = it.stripSize;
          const prevFormatted = `${Math.floor(prevStock / stripSize)} Strips, ${prevStock % stripSize} Tabs`;
          const newFormatted = `${Math.floor(newStock / stripSize)} Strips, ${newStock % stripSize} Tabs`;
          const formattedChange = it.unitType === 'STRIP'
            ? `-${it.quantity} Strip${it.quantity > 1 ? 's' : ''} (-${it.totalTabletsSold} Tabs)`
            : `-${it.quantity} Tab${it.quantity > 1 ? 's' : ''}`;

          const entry = {
            id: `audit_sale_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
            pharmacyId: targetPharmacyId,
            timestamp: now,
            formattedTimestamp: new Date().toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            productId: it.productId,
            productName: it.productName,
            genericComposition: it.genericComposition || req.batch.genericComposition || '',
            batchId: it.batchId,
            batchNumber: it.batchNumber,
            expiryDate: req.batch.expiryDate,
            drugSchedule: req.batch.drugSchedule || 'OTC',
            adjustmentType: 'SALE_DEDUCTION',
            quantityChangeTablets: -it.totalTabletsSold,
            formattedChange,
            previousStockTablets: prevStock,
            newStockTablets: newStock,
            formattedPreviousStock: prevFormatted,
            formattedNewStock: newFormatted,
            referenceNumber: cleanInvNo,
            operatorName: operator.fullName || operator.username || invoice.cashierName || 'Staff',
            operatorRole: operator.role || 'CASHIER',
            reason: `POS Bill #${cleanInvNo} dispensed`,
            vendorId: req.batch.vendorId || null,
            vendorName: null,
            rackLocation: req.batch.productRackLocation || null,
          };
          auditStmt.run(
            entry.id, entry.pharmacyId, entry.timestamp, entry.formattedTimestamp,
            entry.productId, entry.productName, entry.genericComposition,
            entry.batchId, entry.batchNumber, entry.expiryDate, entry.drugSchedule,
            entry.adjustmentType, entry.quantityChangeTablets, entry.formattedChange,
            entry.previousStockTablets, entry.newStockTablets, entry.formattedPreviousStock,
            entry.formattedNewStock, entry.referenceNumber, entry.operatorName,
            entry.operatorRole, entry.reason, entry.vendorId, entry.vendorName, entry.rackLocation
          );
          createdLogs.push(entry);
        }
      }

      this.db.exec('COMMIT');

      const savedInvRow = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoice.id);
      const savedInv = {
        ...savedInvRow,
        prescription: safeJsonParse(savedInvRow.prescriptionJson, {}),
        items: validatedItems,
        taxSlabBreakdowns: safeJsonParse(savedInvRow.taxSlabBreakdownsJson, []),
      };

      return {
        success: true,
        invoice: savedInv,
        batches: updatedBatches,
        auditLogs: createdLogs,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to create invoice in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  saveInvoice(invoice) {
    if (Array.isArray(invoice.items) && invoice.items.length > 0) {
      return this.createInvoice(invoice);
    }
    const now = new Date().toISOString();
    const prescription = invoice.prescription || { patientName: invoice.customerName || 'Walk-in' };
    const stmt = this.db.prepare(`
      INSERT INTO invoices (
        id, pharmacyId, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
        subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
        grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        invoiceNumber = excluded.invoiceNumber,
        status = excluded.status,
        grandTotal = excluded.grandTotal
    `);
    stmt.run(
      invoice.id,
      invoice.pharmacyId || null,
      invoice.invoiceNumber,
      invoice.invoiceDate || now,
      invoice.isInterState ? 1 : 0,
      typeof prescription === 'string' ? prescription : JSON.stringify(prescription),
      typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || []),
      Number(invoice.subtotal) || 0,
      Number(invoice.totalCgst) || 0,
      Number(invoice.totalSgst) || 0,
      Number(invoice.totalIgst) || 0,
      Number(invoice.totalTax) || 0,
      Number(invoice.roundOff) || 0,
      Number(invoice.grandTotal) || 0,
      invoice.paymentMethod || 'CASH',
      invoice.status || 'COMPLETED',
      invoice.cashierName || 'Staff',
      typeof invoice.taxSlabBreakdowns === 'string' ? invoice.taxSlabBreakdowns : JSON.stringify(invoice.taxSlabBreakdowns || []),
      invoice.createdAt || invoice.invoiceDate || now
    );
    return { success: true };
  }

  cancelInvoice(invoiceId, reason, rollbackEntries = [], pharmacyId = null, operator = {}) {
    if (!invoiceId) {
      return { success: false, error: 'Invoice ID is required for cancellation.' };
    }
    const inv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!inv) {
      return { success: false, error: `Invoice with ID '${invoiceId}' not found.` };
    }
    if (pharmacyId && inv.pharmacyId && inv.pharmacyId !== pharmacyId) {
      return { success: false, error: 'Invoice belongs to another pharmacy.' };
    }
    if (inv.status === 'CANCELLED') {
      return { success: false, error: 'Invoice is already cancelled.' };
    }
    if (inv.status === 'RETURNED') {
      return { success: false, error: 'Cannot cancel an invoice that has already been returned.' };
    }
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Cancellation reason is required.' };
    }

    const items = safeJsonParse(inv.itemsJson, []);
    const now = new Date().toISOString();
    const opName = operator.fullName || operator.username || 'Staff';
    const opRole = operator.role || 'PHARMACIST';
    const targetPharmacy = pharmacyId || inv.pharmacyId || null;

    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.prepare("UPDATE invoices SET status = 'CANCELLED' WHERE id = ?").run(invoiceId);

      const updateBatchStmt = this.db.prepare(
        'UPDATE batches SET totalTablets = totalTablets + ?, updatedAt = ? WHERE id = ?'
      );
      const auditStmt = this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updatedBatches = [];

      if (Array.isArray(rollbackEntries) && rollbackEntries.length > 0) {
        for (const entry of rollbackEntries) {
          const currentBatch = this.getBatchWithProduct(entry.batchId);
          const prevStock = currentBatch ? currentBatch.totalTablets : (entry.previousStockTablets || 0);
          const qty = entry.quantityChangeTablets || 0;
          const newStock = prevStock + qty;

          updateBatchStmt.run(qty, now, entry.batchId);
          auditStmt.run(
            entry.id || ('aud_' + crypto.randomUUID()),
            targetPharmacy,
            entry.timestamp || now,
            entry.formattedTimestamp || null,
            entry.productId,
            entry.productName,
            entry.genericComposition || null,
            entry.batchId,
            entry.batchNumber,
            entry.expiryDate || null,
            entry.drugSchedule || null,
            entry.adjustmentType || 'SALE_CANCEL',
            qty,
            entry.formattedChange || `+${qty} tablets`,
            prevStock,
            newStock,
            entry.formattedPreviousStock || `${prevStock} tablets`,
            entry.formattedNewStock || `${newStock} tablets`,
            entry.referenceNumber || inv.invoiceNumber,
            opName,
            opRole,
            `Cancelled Bill #${inv.invoiceNumber}: ${reason.trim()}`,
            entry.vendorId || null,
            entry.vendorName || null,
            entry.rackLocation || null
          );
          if (currentBatch) {
            updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(entry.batchId));
          }
        }
      } else {
        // Authoritatively reconstruct rollback from inv.itemsJson
        for (const item of items) {
          const batchId = item.batchId || (item.batch && item.batch.id);
          if (batchId) {
            const currentBatch = this.getBatchWithProduct(batchId);
            const prevStock = currentBatch ? currentBatch.totalTablets : 0;
            const stripSize = item.stripSize || currentBatch?.stripSize || 10;
            const tabsSold = item.totalTabletsSold !== undefined
              ? Number(item.totalTabletsSold)
              : (item.unitType === 'STRIP' ? Math.round(Number(item.quantity) * stripSize) : Math.round(Number(item.quantity)));
            const newStock = prevStock + tabsSold;

            updateBatchStmt.run(tabsSold, now, batchId);
            auditStmt.run(
              `aud_cnl_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
              targetPharmacy,
              now,
              new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              item.productId || currentBatch?.productId,
              item.productName || currentBatch?.productName,
              item.genericComposition || currentBatch?.genericComposition || null,
              batchId,
              item.batchNumber || currentBatch?.batchNumber,
              currentBatch?.expiryDate || null,
              currentBatch?.drugSchedule || null,
              'SALE_CANCEL',
              tabsSold,
              `+${tabsSold} tablets`,
              prevStock,
              newStock,
              `${prevStock} tablets`,
              `${newStock} tablets`,
              inv.invoiceNumber,
              opName,
              opRole,
              `Cancelled Bill #${inv.invoiceNumber}: ${reason.trim()}`,
              currentBatch?.vendorId || null,
              null,
              currentBatch?.productRackLocation || null
            );
            if (currentBatch) {
              updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
            }
          }
        }
      }

      this.db.prepare('UPDATE invoices SET status = ?, cancelReason = ? WHERE id = ?').run(
        'CANCELLED',
        reason.trim(),
        invoiceId
      );

      this.db.exec('COMMIT');
      const updatedInv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
      return {
        success: true,
        invoice: {
          ...updatedInv,
          prescription: safeJsonParse(updatedInv.prescriptionJson, {}),
          items: safeJsonParse(updatedInv.itemsJson, []),
        },
        batches: updatedBatches,
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to cancel invoice in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  updateInvoicePaymentMethod(invoiceId, newPaymentMethod, pharmacyId = null) {
    if (!invoiceId || !newPaymentMethod) {
      return { success: false, error: 'Invoice ID and new payment method are required.' };
    }
    const inv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!inv) {
      return { success: false, error: `Invoice with ID '${invoiceId}' not found.` };
    }
    if (pharmacyId && inv.pharmacyId && inv.pharmacyId !== pharmacyId) {
      return { success: false, error: 'Invoice belongs to another pharmacy.' };
    }
    if (inv.status === 'CANCELLED') {
      return { success: false, error: 'Cannot update payment method of a cancelled invoice.' };
    }
    const validMethods = ['CASH', 'UPI', 'CARD', 'CREDIT', 'CHEQUE', 'BANK_TRANSFER'];
    if (!validMethods.includes(newPaymentMethod.toUpperCase())) {
      return { success: false, error: `Invalid payment method: ${newPaymentMethod}` };
    }
    try {
      this.db.prepare('UPDATE invoices SET paymentMethod = ? WHERE id = ?').run(newPaymentMethod.toUpperCase(), invoiceId);
      return { success: true };
    } catch (e) {
      console.error('Failed to update invoice payment method in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  postSalesReturn(payload, operator = {}, pharmacyId = null) {
    if (!payload || !payload.invoiceId) {
      return { success: false, error: 'Invoice ID is required for sales return.' };
    }
    const targetPharmacyId = pharmacyId || null;
    const inv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(payload.invoiceId);
    if (!inv) {
      return { success: false, error: 'Original invoice not found.' };
    }
    if (targetPharmacyId && inv.pharmacyId && inv.pharmacyId !== targetPharmacyId) {
      return { success: false, error: 'Invoice belongs to another pharmacy.' };
    }
    if (inv.status === 'CANCELLED') {
      return { success: false, error: 'Cannot process sales return on a cancelled invoice.' };
    }

    if (!Array.isArray(payload.returnedItems) || payload.returnedItems.length === 0) {
      return { success: false, error: 'At least one returned item is required.' };
    }

    const originalItems = safeJsonParse(inv.itemsJson, []);
    const prescription = safeJsonParse(inv.prescriptionJson, {});
    const now = new Date().toISOString();
    const returnNumber = payload.returnNumber || `SR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalRefund = 0;
    const validatedReturns = [];
    const updatedBatches = [];

    for (let i = 0; i < payload.returnedItems.length; i++) {
      const ret = payload.returnedItems[i];
      const orig = originalItems.find(it => it.cartItemId === ret.cartItemId || it.batchId === ret.batchId);
      if (!orig) {
        return { success: false, error: `Line ${i + 1}: Item was not part of original invoice.` };
      }
      const retQty = Number(ret.returnQuantity);
      if (isNaN(retQty) || retQty <= 0) {
        return { success: false, error: `Line ${i + 1}: Return quantity must be greater than zero.` };
      }
      if (retQty > Number(orig.quantity)) {
        return { success: false, error: `Line ${i + 1}: Return quantity (${retQty}) cannot exceed billed quantity (${orig.quantity}).` };
      }

      const stripSize = orig.stripSize || 10;
      const tabsToReturn = orig.unitType === 'STRIP' ? Math.round(retQty * stripSize) : Math.round(retQty);
      const refundForLine = Number((Number(orig.unitPrice) * retQty).toFixed(2));
      totalRefund += refundForLine;

      validatedReturns.push({
        cartItemId: orig.cartItemId || orig.id,
        productId: orig.productId,
        productName: orig.productName,
        batchId: orig.batchId,
        batchNumber: orig.batchNumber,
        unitType: orig.unitType,
        quantitySold: orig.quantity,
        returnQuantity: retQty,
        totalTabletsReturned: tabsToReturn,
        refundAmount: refundForLine,
        reason: ret.reason || payload.reason || 'Customer return',
      });
    }

    this.db.exec('BEGIN TRANSACTION');
    try {
      const updateBatchStmt = this.db.prepare(
        'UPDATE batches SET totalTablets = totalTablets + ?, updatedAt = ? WHERE id = ?'
      );
      const auditStmt = this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of validatedReturns) {
        const batch = this.getBatchWithProduct(item.batchId);
        const prevStock = batch ? batch.totalTablets : 0;
        const newStock = prevStock + item.totalTabletsReturned;

        updateBatchStmt.run(item.totalTabletsReturned, now, item.batchId);
        auditStmt.run(
          `aud_sr_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
          targetPharmacyId,
          now,
          new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          item.productId,
          item.productName,
          batch?.genericComposition || null,
          item.batchId,
          item.batchNumber,
          batch?.expiryDate || null,
          batch?.drugSchedule || null,
          'SALE_RETURN',
          item.totalTabletsReturned,
          `+${item.totalTabletsReturned} tablets (Sales Return)`,
          prevStock,
          newStock,
          `${prevStock} tablets`,
          `${newStock} tablets`,
          returnNumber,
          operator.fullName || operator.username || 'Staff',
          operator.role || 'PHARMACIST',
          `Sales Return for Bill #${inv.invoiceNumber}: ${item.reason}`,
          batch?.vendorId || null,
          null,
          batch?.productRackLocation || null
        );

        if (batch) {
          updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(item.batchId));
        }
      }

      // Record in sales_returns table
      const srId = payload.id || `sr_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
      this.db.prepare(`
        INSERT INTO sales_returns (
          id, pharmacyId, returnNumber, invoiceId, invoiceNumber, customerName,
          date, itemsJson, totalRefundAmount, refundMode, processedBy, reason,
          isRestocked, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        srId,
        targetPharmacyId,
        returnNumber,
        inv.id,
        inv.invoiceNumber,
        prescription.patientName || 'Customer',
        now,
        JSON.stringify(validatedReturns),
        Number(totalRefund.toFixed(2)),
        payload.refundMode || 'CASH',
        operator.fullName || operator.username || 'Staff',
        payload.reason || 'Customer return',
        1,
        now
      );

      // Check if all items in invoice are fully returned
      const allReturned = originalItems.every(orig => {
        const ret = validatedReturns.find(r => r.cartItemId === orig.cartItemId || r.batchId === orig.batchId);
        return ret && ret.returnQuantity >= Number(orig.quantity);
      });

      const newInvStatus = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';
      this.db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(newInvStatus, inv.id);

      // Also sync app_settings for sales_returns backward compatibility
      const existingSettingsRow = this.db.prepare("SELECT valueJson FROM app_settings WHERE key = 'sales_returns'").get();
      const existingList = existingSettingsRow ? safeJsonParse(existingSettingsRow.valueJson, []) : [];
      const returnRecord = {
        id: srId,
        pharmacyId: targetPharmacyId,
        returnNumber,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: prescription.patientName || 'Customer',
        date: now,
        items: validatedReturns,
        totalRefundAmount: Number(totalRefund.toFixed(2)),
        refundMode: payload.refundMode || 'CASH',
        processedBy: operator.fullName || operator.username || 'Staff',
        reason: payload.reason || 'Customer return',
        isRestocked: true,
        createdAt: now,
      };
      const updatedList = [returnRecord, ...existingList];
      this.db.prepare(`
        INSERT INTO app_settings (key, valueJson) VALUES ('sales_returns', ?)
        ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson
      `).run(JSON.stringify(updatedList));

      this.db.exec('COMMIT');

      const updatedInv = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(inv.id);
      return {
        success: true,
        returnRecord,
        batches: updatedBatches,
        invoice: {
          ...updatedInv,
          prescription,
          items: originalItems,
        },
      };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to post sales return in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  recordStockAdjustment(logEntry, pharmacyId = null, operator = {}) {
    if (!logEntry || !logEntry.batchId) {
      return { success: false, error: 'Batch ID is required for stock adjustment.' };
    }
    const existing = this.getBatchWithProduct(logEntry.batchId);
    if (!existing && pharmacyId) {
      return { success: false, error: `Batch with ID '${logEntry.batchId}' not found.` };
    }
    if (pharmacyId && existing && existing.productPharmacyId && existing.productPharmacyId !== pharmacyId) {
      return { success: false, error: 'Batch belongs to another pharmacy.' };
    }

    const previousStockTablets = existing ? existing.totalTablets : (logEntry.previousStockTablets || 0);
    const finalNewStock = logEntry.newStockTablets !== undefined
      ? Math.max(0, parseInt(logEntry.newStockTablets, 10))
      : previousStockTablets + (parseInt(logEntry.quantityChangeTablets, 10) || 0);

    const delta = logEntry.quantityChangeTablets !== undefined
      ? parseInt(logEntry.quantityChangeTablets, 10)
      : (finalNewStock - previousStockTablets);

    this.db.exec('BEGIN TRANSACTION');
    try {
      const now = new Date().toISOString();
      const opName = operator.fullName || operator.username || logEntry.operatorName || 'Staff';
      const opRole = operator.role || logEntry.operatorRole || 'PHARMACIST';
      const targetPharmacy = pharmacyId || (existing ? existing.productPharmacyId : null) || logEntry.pharmacyId || null;

      const stmt = this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        logEntry.id || ('aud_' + crypto.randomUUID()),
        targetPharmacy,
        logEntry.timestamp || now,
        logEntry.formattedTimestamp || null,
        existing ? existing.productId : (logEntry.productId || 'UNKNOWN_PROD'),
        existing ? existing.productName : (logEntry.productName || 'Unknown Product'),
        existing ? existing.genericComposition : (logEntry.genericComposition || null),
        existing ? existing.id : logEntry.batchId,
        existing ? existing.batchNumber : (logEntry.batchNumber || 'UNKNOWN_BATCH'),
        existing ? existing.expiryDate : (logEntry.expiryDate || null),
        existing ? existing.drugSchedule : (logEntry.drugSchedule || null),
        logEntry.adjustmentType || 'MANUAL_ADJUSTMENT',
        delta,
        logEntry.formattedChange || `${delta >= 0 ? '+' : ''}${delta} tablets`,
        previousStockTablets,
        finalNewStock,
        logEntry.formattedPreviousStock || `${previousStockTablets} tablets`,
        logEntry.formattedNewStock || `${finalNewStock} tablets`,
        logEntry.referenceNumber || `ADJ-${Date.now()}`,
        opName,
        opRole,
        logEntry.reason || 'Manual stock adjustment',
        logEntry.vendorId || (existing ? existing.vendorId : null) || null,
        logEntry.vendorName || null,
        logEntry.rackLocation || (existing ? existing.productRackLocation : null) || null
      );

      if (existing) {
        const updateBatchStmt = this.db.prepare(
          'UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?'
        );
        updateBatchStmt.run(finalNewStock, now, logEntry.batchId);
      }

      this.db.exec('COMMIT');
      return { success: true, previousStockTablets, newStockTablets: finalNewStock };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to record stock adjustment in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  getPurchaseReceipts(pharmacyId = null) {
    let stmt = 'SELECT * FROM purchase_receipts ORDER BY grnDate DESC, createdAt DESC';
    let params = [];
    if (pharmacyId) {
      stmt = 'SELECT * FROM purchase_receipts WHERE pharmacyId = ? ORDER BY grnDate DESC, createdAt DESC';
      params = [pharmacyId];
    }
    const rows = this.db.prepare(stmt).all(...params);
    return rows.map(r => ({
      ...r,
      items: safeJsonParse(r.itemsJson, []),
    }));
  }

  postPurchaseReceipt(payload, operator = {}, pharmacyId = null) {
    if (!payload) {
      return { success: false, error: 'Purchase receipt payload is required.' };
    }
    const targetPharmacyId = pharmacyId || payload.pharmacyId || null;

    if (!payload.vendorId) {
      return { success: false, error: 'Vendor is required for inward purchase receipt.' };
    }
    const vendor = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(payload.vendorId);
    if (!vendor) {
      return { success: false, error: 'Specified vendor not found.' };
    }
    if (targetPharmacyId && vendor.pharmacyId && vendor.pharmacyId !== targetPharmacyId) {
      return { success: false, error: 'Vendor belongs to another pharmacy.' };
    }

    if (!payload.vendorInvoiceNo || !String(payload.vendorInvoiceNo).trim()) {
      return { success: false, error: 'Supplier Invoice Number is required.' };
    }
    const cleanVendorInvoiceNo = String(payload.vendorInvoiceNo).trim();

    if (!payload.grnNumber || !String(payload.grnNumber).trim()) {
      return { success: false, error: 'GRN Number is required.' };
    }
    const cleanGrnNumber = String(payload.grnNumber).trim();

    // Check duplicate supplier invoice
    let dupInvQuery = "SELECT id, grnNumber FROM purchase_receipts WHERE vendorId = ? AND LOWER(TRIM(vendorInvoiceNo)) = LOWER(?) AND status != 'CANCELLED'";
    let dupInvParams = [payload.vendorId, cleanVendorInvoiceNo];
    if (targetPharmacyId) {
      dupInvQuery = "SELECT id, grnNumber FROM purchase_receipts WHERE (pharmacyId = ? OR pharmacyId IS NULL) AND vendorId = ? AND LOWER(TRIM(vendorInvoiceNo)) = LOWER(?) AND status != 'CANCELLED'";
      dupInvParams = [targetPharmacyId, payload.vendorId, cleanVendorInvoiceNo];
    }
    const dupInv = this.db.prepare(dupInvQuery).get(...dupInvParams);
    if (dupInv) {
      return {
        success: false,
        error: `Duplicate supplier invoice: Invoice "${cleanVendorInvoiceNo}" from this vendor has already been received under GRN #${dupInv.grnNumber}.`,
      };
    }

    // Check duplicate GRN number
    let dupGrnQuery = 'SELECT id FROM purchase_receipts WHERE LOWER(TRIM(grnNumber)) = LOWER(?)';
    let dupGrnParams = [cleanGrnNumber];
    if (targetPharmacyId) {
      dupGrnQuery = 'SELECT id FROM purchase_receipts WHERE (pharmacyId = ? OR pharmacyId IS NULL) AND LOWER(TRIM(grnNumber)) = LOWER(?)';
      dupGrnParams = [targetPharmacyId, cleanGrnNumber];
    }
    const dupGrn = this.db.prepare(dupGrnQuery).get(...dupGrnParams);
    if (dupGrn) {
      return {
        success: false,
        error: `GRN number "${cleanGrnNumber}" already exists.`,
      };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, error: 'At least one line item is required for purchase entry.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const validatedItems = [];
    const now = new Date().toISOString();

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      if (!item.productId) {
        return { success: false, error: `Line ${i + 1}: Product ID is required.` };
      }
      const product = this.db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        return { success: false, error: `Line ${i + 1}: Product not found.` };
      }
      if (targetPharmacyId && product.pharmacyId && product.pharmacyId !== targetPharmacyId) {
        return { success: false, error: `Line ${i + 1}: Product belongs to another pharmacy.` };
      }

      if (!item.batchNumber || !String(item.batchNumber).trim()) {
        return { success: false, error: `Line ${i + 1}: Batch number is required.` };
      }
      const cleanBatchNo = String(item.batchNumber).trim();

      const qty = Number(item.quantityStrips) || 0;
      const free = Number(item.freeStrips) || 0;
      const rej = Number(item.rejectedStrips) || 0;
      if (qty < 0 || free < 0 || rej < 0) {
        return { success: false, error: `Line ${i + 1}: Quantities cannot be negative.` };
      }
      const accepted = qty + free - rej;
      if (accepted < 0) {
        return { success: false, error: `Line ${i + 1}: Rejected quantity cannot exceed received plus free quantity.` };
      }
      if (qty === 0 && free === 0) {
        return { success: false, error: `Line ${i + 1}: Received quantity must be greater than zero.` };
      }

      const cost = Number(item.costPricePerStrip) || 0;
      const mrp = Number(item.mrpPerStrip) || 0;
      if (cost < 0 || mrp < 0) {
        return { success: false, error: `Line ${i + 1}: Pricing cannot be negative.` };
      }
      if (mrp < cost) {
        return { success: false, error: `Line ${i + 1}: MRP (₹${mrp}) cannot be less than cost price (₹${cost}).` };
      }

      if (!item.expiryDate || isNaN(new Date(item.expiryDate).getTime())) {
        return { success: false, error: `Line ${i + 1}: Valid expiry date is required.` };
      }
      const expDate = item.expiryDate;
      if (expDate <= todayStr) {
        return { success: false, error: `Line ${i + 1}: Batch "${cleanBatchNo}" is already expired (${expDate}). Expired stock cannot be received.` };
      }

      // Check existing batch for conflict
      const existingBatch = this.db.prepare(
        'SELECT * FROM batches WHERE productId = ? AND LOWER(TRIM(batchNumber)) = LOWER(TRIM(?))'
      ).get(item.productId, cleanBatchNo);

      if (existingBatch) {
        if (existingBatch.vendorId && existingBatch.vendorId !== payload.vendorId) {
          return {
            success: false,
            error: `Conflicting batch details: Batch "${cleanBatchNo}" already exists under a different vendor.`,
          };
        }
        const existingExp = new Date(existingBatch.expiryDate).getTime();
        const itemExp = new Date(expDate).getTime();
        const diffDays = Math.abs((existingExp - itemExp) / (1000 * 3600 * 24));
        if (diffDays > 30) {
          return {
            success: false,
            error: `Conflicting batch details: Batch "${cleanBatchNo}" already exists with expiry date ${existingBatch.expiryDate}, which conflicts with supplied expiry ${expDate}.`,
          };
        }
      }

      const packing = Number(item.packing) || product.stripSize || 10;
      const discountPercent = Number(item.discountPercent) || 0;
      const gstRate = (item.gstRate !== undefined && item.gstRate !== null && !isNaN(Number(item.gstRate)))
        ? Number(item.gstRate)
        : (product.defaultGstRate !== undefined ? Number(product.defaultGstRate) : 12);

      const grossCost = Number((qty * cost).toFixed(2));
      const discountAmount = Number((grossCost * (discountPercent / 100)).toFixed(2));
      const taxableAmount = Number((grossCost - discountAmount).toFixed(2));
      const taxAmount = Number((taxableAmount * (gstRate / 100)).toFixed(2));
      const halfTax = Number((taxAmount / 2).toFixed(2));
      const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

      validatedItems.push({
        ...item,
        productId: product.id,
        productName: product.name,
        genericComposition: product.genericComposition || '',
        batchNumber: cleanBatchNo,
        expiryDate: expDate,
        manufacturingDate: item.manufacturingDate || todayStr,
        packing,
        quantityStrips: qty,
        freeStrips: free,
        rejectedStrips: rej,
        acceptedStrips: accepted,
        costPricePerStrip: cost,
        mrpPerStrip: mrp,
        discountPercent,
        gstRate,
        taxableAmount,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        igstAmount: 0,
        lineTotal,
        hsnCode: item.hsnCode || product.hsnCode || '',
        existingBatch,
        product,
      });
    }

    // Authoritative totals
    const subtotal = Number(validatedItems.reduce((acc, it) => acc + (it.quantityStrips * it.costPricePerStrip), 0).toFixed(2));
    const discountTotal = Number(validatedItems.reduce((acc, it) => acc + (it.quantityStrips * it.costPricePerStrip * (it.discountPercent / 100)), 0).toFixed(2));
    const taxableTotal = Number(validatedItems.reduce((acc, it) => acc + it.taxableAmount, 0).toFixed(2));
    const cgstTotal = Number(validatedItems.reduce((acc, it) => acc + it.cgstAmount, 0).toFixed(2));
    const sgstTotal = Number(validatedItems.reduce((acc, it) => acc + it.sgstAmount, 0).toFixed(2));
    const calculatedNet = taxableTotal + cgstTotal + sgstTotal;
    const grandTotal = Number(calculatedNet.toFixed(2));
    const roundOff = Number((grandTotal - calculatedNet).toFixed(2));

    const status = payload.status || 'POSTED_TO_STOCK';
    const paymentStatus = payload.paymentStatus || 'CREDIT_PENDING';
    const paymentMode = payload.paymentMode || 'CREDIT_DUE';
    const receiptId = payload.id || `grn_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;

    this.db.exec('BEGIN TRANSACTION');
    try {
      const updatedBatches = [];
      const createdLogs = [];

      if (status === 'POSTED_TO_STOCK') {
        for (const it of validatedItems) {
          const totalTabletsToAdd = Math.round(it.acceptedStrips * it.packing);
          let batchId;
          let prevStock = 0;
          let newStock = totalTabletsToAdd;

          if (it.existingBatch) {
            batchId = it.existingBatch.id;
            prevStock = it.existingBatch.totalTablets;
            newStock = prevStock + totalTabletsToAdd;

            this.db.prepare(`
              UPDATE batches
              SET totalTablets = ?, costPricePerStrip = ?, mrpPerStrip = ?, expiryDate = ?, updatedAt = ?
              WHERE id = ?
            `).run(newStock, it.costPricePerStrip, it.mrpPerStrip, it.expiryDate, now, batchId);

            updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
          } else {
            batchId = `batch_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
            this.db.prepare(`
              INSERT INTO batches (
                id, productId, batchNumber, barcode, expiryDate, manufacturingDate,
                costPricePerStrip, mrpPerStrip, sellingPricePerStrip, gstRate,
                totalTablets, vendorId, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              batchId,
              it.productId,
              it.batchNumber,
              it.barcode || '',
              it.expiryDate,
              it.manufacturingDate,
              it.costPricePerStrip,
              it.mrpPerStrip,
              Number((it.mrpPerStrip * 0.95).toFixed(2)),
              it.gstRate,
              totalTabletsToAdd,
              payload.vendorId,
              now,
              now
            );

            updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
          }

          // Stock audit log
          const auditId = `audit_grn_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
          const stripSize = it.packing;
          const strips = Math.floor(totalTabletsToAdd / stripSize);
          const loose = totalTabletsToAdd % stripSize;
          let formattedChange = `+${strips} Strips (+${totalTabletsToAdd} Tabs)`;
          if (loose > 0) formattedChange = `+${strips} Strips, ${loose} Tabs (+${totalTabletsToAdd} Tabs)`;

          const prevStrips = Math.floor(prevStock / stripSize);
          const prevLoose = prevStock % stripSize;
          const newStrips = Math.floor(newStock / stripSize);
          const newLoose = newStock % stripSize;

          const auditRow = {
            id: auditId,
            pharmacyId: targetPharmacyId,
            timestamp: now,
            formattedTimestamp: new Date().toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            productId: it.productId,
            productName: it.productName,
            genericComposition: it.genericComposition,
            batchId,
            batchNumber: it.batchNumber,
            expiryDate: it.expiryDate,
            drugSchedule: it.product.drugSchedule || 'OTC',
            adjustmentType: 'INWARD_PURCHASE',
            quantityChangeTablets: totalTabletsToAdd,
            formattedChange,
            previousStockTablets: prevStock,
            newStockTablets: newStock,
            formattedPreviousStock: `${prevStrips} Strips, ${prevLoose} Tabs`,
            formattedNewStock: `${newStrips} Strips, ${newLoose} Tabs`,
            referenceNumber: cleanGrnNumber,
            operatorName: operator.fullName || operator.name || 'Pharmacist',
            operatorRole: operator.role || 'PHARMACIST',
            reason: `Inward GRN #${cleanGrnNumber} from ${vendor.companyName} (Inv: ${cleanVendorInvoiceNo})`,
            vendorId: payload.vendorId,
            vendorName: vendor.companyName,
            rackLocation: it.product.rackLocation || '',
          };

          this.db.prepare(`
            INSERT INTO stock_audit_logs (
              id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
              batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
              formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
              formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            auditRow.id, auditRow.pharmacyId, auditRow.timestamp, auditRow.formattedTimestamp,
            auditRow.productId, auditRow.productName, auditRow.genericComposition,
            auditRow.batchId, auditRow.batchNumber, auditRow.expiryDate, auditRow.drugSchedule,
            auditRow.adjustmentType, auditRow.quantityChangeTablets, auditRow.formattedChange,
            auditRow.previousStockTablets, auditRow.newStockTablets, auditRow.formattedPreviousStock,
            auditRow.formattedNewStock, auditRow.referenceNumber, auditRow.operatorName,
            auditRow.operatorRole, auditRow.reason, auditRow.vendorId, auditRow.vendorName, auditRow.rackLocation
          );

          createdLogs.push(auditRow);
        }

        // Update vendor balance due if credit pending
        if (paymentStatus === 'CREDIT_PENDING' || paymentMode === 'CREDIT_DUE') {
          const currentBal = Number(vendor.balanceDue) || 0;
          const newBal = Number((currentBal + grandTotal).toFixed(2));
          this.db.prepare('UPDATE vendors SET balanceDue = ? WHERE id = ?').run(newBal, payload.vendorId);
        }
      }

      // Save purchase_receipts header
      const itemsToStore = validatedItems.map(it => {
        const { existingBatch, product, ...cleanItem } = it;
        return cleanItem;
      });

      this.db.prepare(`
        INSERT INTO purchase_receipts (
          id, pharmacyId, grnNumber, grnDate, poNumber, vendorId, vendorName, vendorInvoiceNo,
          invoiceDate, paymentDueDate, subtotal, discountTotal, taxableTotal, cgstTotal,
          sgstTotal, igstTotal, roundOff, grandTotal, paymentStatus, paymentMode, status,
          notes, itemsJson, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiptId,
        targetPharmacyId,
        cleanGrnNumber,
        payload.grnDate || todayStr,
        payload.poNumber || null,
        payload.vendorId,
        vendor.companyName,
        cleanVendorInvoiceNo,
        payload.invoiceDate || todayStr,
        payload.paymentDueDate || todayStr,
        subtotal,
        discountTotal,
        taxableTotal,
        cgstTotal,
        sgstTotal,
        0,
        roundOff,
        grandTotal,
        paymentStatus,
        paymentMode,
        status,
        payload.notes || '',
        JSON.stringify(itemsToStore),
        payload.createdAt || now,
        now
      );

      // Save normalized purchase_receipt_items
      const itemStmt = this.db.prepare(`
        INSERT INTO purchase_receipt_items (
          id, receiptId, pharmacyId, productId, productName, batchNumber, expiryDate,
          manufacturingDate, packing, quantityStrips, freeStrips, rejectedStrips, acceptedStrips,
          costPricePerStrip, mrpPerStrip, discountPercent, gstRate, taxableAmount,
          cgstAmount, sgstAmount, igstAmount, lineTotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of itemsToStore) {
        itemStmt.run(
          `gritm_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
          receiptId,
          targetPharmacyId,
          it.productId,
          it.productName,
          it.batchNumber,
          it.expiryDate,
          it.manufacturingDate || null,
          it.packing,
          it.quantityStrips,
          it.freeStrips,
          it.rejectedStrips || 0,
          it.acceptedStrips,
          it.costPricePerStrip,
          it.mrpPerStrip,
          it.discountPercent,
          it.gstRate,
          it.taxableAmount,
          it.cgstAmount,
          it.sgstAmount,
          it.igstAmount || 0,
          it.lineTotal
        );
      }

      this.db.exec('COMMIT');

      const savedVendor = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(payload.vendorId);
      const savedReceiptRow = this.db.prepare('SELECT * FROM purchase_receipts WHERE id = ?').get(receiptId);
      const savedReceipt = {
        ...savedReceiptRow,
        items: itemsToStore,
      };

      return {
        success: true,
        receipt: savedReceipt,
        batches: updatedBatches,
        vendor: savedVendor,
        auditLogs: createdLogs,
      };
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[SQLite] postPurchaseReceipt failed:', err);
      return { success: false, error: err.message };
    }
  }

  confirmGrn(grnId, pharmacyId = null, operator = {}) {
    if (!grnId) return { success: false, error: 'GRN ID is required.' };
    const targetPharmacyId = pharmacyId || null;

    let stmt = 'SELECT * FROM purchase_receipts WHERE id = ?';
    let params = [grnId];
    if (targetPharmacyId) {
      stmt = 'SELECT * FROM purchase_receipts WHERE id = ? AND (pharmacyId = ? OR pharmacyId IS NULL)';
      params = [grnId, targetPharmacyId];
    }
    const receipt = this.db.prepare(stmt).get(...params);
    if (!receipt) {
      return { success: false, error: 'GRN record not found.' };
    }

    // Idempotency: if already posted, return success without double-posting!
    if (receipt.status === 'POSTED_TO_STOCK') {
      return {
        success: true,
        message: 'GRN has already been confirmed and posted to stock.',
        receipt: { ...receipt, items: safeJsonParse(receipt.itemsJson, []) },
      };
    }
    if (receipt.status === 'CANCELLED') {
      return { success: false, error: 'Cannot confirm a cancelled GRN.' };
    }

    const items = safeJsonParse(receipt.itemsJson, []);
    const vendor = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(receipt.vendorId);
    const now = new Date().toISOString();

    this.db.exec('BEGIN TRANSACTION');
    try {
      const updatedBatches = [];
      const createdLogs = [];

      for (const it of items) {
        const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
        const stripSize = it.packing || prod?.stripSize || 10;
        const accepted = Number(it.acceptedStrips) || (Number(it.quantityStrips) + Number(it.freeStrips) - (Number(it.rejectedStrips) || 0));
        const totalTabletsToAdd = Math.round(accepted * stripSize);

        const existingBatch = this.db.prepare(
          'SELECT * FROM batches WHERE productId = ? AND LOWER(TRIM(batchNumber)) = LOWER(TRIM(?))'
        ).get(it.productId, it.batchNumber.trim());

        let batchId;
        let prevStock = 0;
        let newStock = totalTabletsToAdd;

        if (existingBatch) {
          batchId = existingBatch.id;
          prevStock = existingBatch.totalTablets;
          newStock = prevStock + totalTabletsToAdd;

          this.db.prepare(`
            UPDATE batches
            SET totalTablets = ?, costPricePerStrip = ?, mrpPerStrip = ?, expiryDate = ?, updatedAt = ?
            WHERE id = ?
          `).run(newStock, it.costPricePerStrip, it.mrpPerStrip, it.expiryDate, now, batchId);

          updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
        } else {
          batchId = `batch_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
          this.db.prepare(`
            INSERT INTO batches (
              id, productId, batchNumber, barcode, expiryDate, manufacturingDate,
              costPricePerStrip, mrpPerStrip, sellingPricePerStrip, gstRate,
              totalTablets, vendorId, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            batchId,
            it.productId,
            it.batchNumber,
            it.barcode || '',
            it.expiryDate,
            it.manufacturingDate || now.split('T')[0],
            it.costPricePerStrip,
            it.mrpPerStrip,
            Number((it.mrpPerStrip * 0.95).toFixed(2)),
            (it.gstRate !== undefined && it.gstRate !== null && !isNaN(Number(it.gstRate))) ? Number(it.gstRate) : 12,
            totalTabletsToAdd,
            receipt.vendorId,
            now,
            now
          );

          updatedBatches.push(this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId));
        }

        // Audit log
        const auditId = `audit_grn_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
        const strips = Math.floor(totalTabletsToAdd / stripSize);
        const loose = totalTabletsToAdd % stripSize;
        let formattedChange = `+${strips} Strips (+${totalTabletsToAdd} Tabs)`;
        if (loose > 0) formattedChange = `+${strips} Strips, ${loose} Tabs (+${totalTabletsToAdd} Tabs)`;

        const prevStrips = Math.floor(prevStock / stripSize);
        const prevLoose = prevStock % stripSize;
        const newStrips = Math.floor(newStock / stripSize);
        const newLoose = newStock % stripSize;

        const auditRow = {
          id: auditId,
          pharmacyId: targetPharmacyId,
          timestamp: now,
          formattedTimestamp: new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }),
          productId: it.productId,
          productName: it.productName,
          genericComposition: it.genericComposition || prod?.genericComposition || '',
          batchId,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          drugSchedule: prod?.drugSchedule || 'OTC',
          adjustmentType: 'INWARD_PURCHASE',
          quantityChangeTablets: totalTabletsToAdd,
          formattedChange,
          previousStockTablets: prevStock,
          newStockTablets: newStock,
          formattedPreviousStock: `${prevStrips} Strips, ${prevLoose} Tabs`,
          formattedNewStock: `${newStrips} Strips, ${newLoose} Tabs`,
          referenceNumber: receipt.grnNumber,
          operatorName: operator.fullName || operator.name || 'Pharmacist',
          operatorRole: operator.role || 'PHARMACIST',
          reason: `Confirmed GRN #${receipt.grnNumber} from ${vendor?.companyName || receipt.vendorName} (Inv: ${receipt.vendorInvoiceNo})`,
          vendorId: receipt.vendorId,
          vendorName: vendor?.companyName || receipt.vendorName,
          rackLocation: prod?.rackLocation || '',
        };

        this.db.prepare(`
          INSERT INTO stock_audit_logs (
            id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
            batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
            formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
            formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          auditRow.id, auditRow.pharmacyId, auditRow.timestamp, auditRow.formattedTimestamp,
          auditRow.productId, auditRow.productName, auditRow.genericComposition,
          auditRow.batchId, auditRow.batchNumber, auditRow.expiryDate, auditRow.drugSchedule,
          auditRow.adjustmentType, auditRow.quantityChangeTablets, auditRow.formattedChange,
          auditRow.previousStockTablets, auditRow.newStockTablets, auditRow.formattedPreviousStock,
          auditRow.formattedNewStock, auditRow.referenceNumber, auditRow.operatorName,
          auditRow.operatorRole, auditRow.reason, auditRow.vendorId, auditRow.vendorName, auditRow.rackLocation
        );

        createdLogs.push(auditRow);
      }

      // Update vendor balance due if credit pending
      if (vendor && (receipt.paymentStatus === 'CREDIT_PENDING' || receipt.paymentMode === 'CREDIT_DUE')) {
        const currentBal = Number(vendor.balanceDue) || 0;
        const newBal = Number((currentBal + receipt.grandTotal).toFixed(2));
        this.db.prepare('UPDATE vendors SET balanceDue = ? WHERE id = ?').run(newBal, receipt.vendorId);
      }

      this.db.prepare('UPDATE purchase_receipts SET status = ?, updatedAt = ? WHERE id = ?').run('POSTED_TO_STOCK', now, grnId);

      this.db.exec('COMMIT');

      const updatedReceipt = {
        ...receipt,
        status: 'POSTED_TO_STOCK',
        updatedAt: now,
        items,
      };

      const updatedVendor = vendor ? this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendor.id) : null;

      return {
        success: true,
        receipt: updatedReceipt,
        batches: updatedBatches,
        vendor: updatedVendor,
        auditLogs: createdLogs,
      };
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[SQLite] confirmGrn failed:', err);
      return { success: false, error: err.message };
    }
  }

  cancelGrn(grnId, reason, pharmacyId = null, operator = {}) {
    if (!grnId) return { success: false, error: 'GRN ID is required.' };
    if (!reason || !String(reason).trim()) {
      return { success: false, error: 'Cancellation reason is required.' };
    }
    const targetPharmacyId = pharmacyId || null;

    let stmt = 'SELECT * FROM purchase_receipts WHERE id = ?';
    let params = [grnId];
    if (targetPharmacyId) {
      stmt = 'SELECT * FROM purchase_receipts WHERE id = ? AND (pharmacyId = ? OR pharmacyId IS NULL)';
      params = [grnId, targetPharmacyId];
    }
    const receipt = this.db.prepare(stmt).get(...params);
    if (!receipt) return { success: false, error: 'GRN not found.' };

    if (receipt.status === 'CANCELLED') {
      return { success: false, error: 'GRN is already cancelled.' };
    }

    const now = new Date().toISOString();
    const items = safeJsonParse(receipt.itemsJson, []);

    this.db.exec('BEGIN TRANSACTION');
    try {
      if (receipt.status === 'POSTED_TO_STOCK') {
        // Validate that current stock hasn't already been consumed
        for (const it of items) {
          const accepted = Number(it.acceptedStrips) || (Number(it.quantityStrips) + Number(it.freeStrips) - (Number(it.rejectedStrips) || 0));
          const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
          const stripSize = it.packing || prod?.stripSize || 10;
          const tabsToDeduct = Math.round(accepted * stripSize);

          const batch = this.db.prepare(
            'SELECT * FROM batches WHERE productId = ? AND LOWER(TRIM(batchNumber)) = LOWER(TRIM(?))'
          ).get(it.productId, it.batchNumber.trim());

          if (!batch || batch.totalTablets < tabsToDeduct) {
            this.db.exec('ROLLBACK');
            return {
              success: false,
              error: `Cannot cancel GRN: Stock for batch "${it.batchNumber}" has already been dispensed/sold (available: ${batch?.totalTablets || 0}, required: ${tabsToDeduct}).`,
            };
          }
        }

        // Deduct stock and log audit
        for (const it of items) {
          const accepted = Number(it.acceptedStrips) || (Number(it.quantityStrips) + Number(it.freeStrips) - (Number(it.rejectedStrips) || 0));
          const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(it.productId);
          const stripSize = it.packing || prod?.stripSize || 10;
          const tabsToDeduct = Math.round(accepted * stripSize);

          const batch = this.db.prepare(
            'SELECT * FROM batches WHERE productId = ? AND LOWER(TRIM(batchNumber)) = LOWER(TRIM(?))'
          ).get(it.productId, it.batchNumber.trim());

          const prevStock = batch.totalTablets;
          const newStock = prevStock - tabsToDeduct;

          this.db.prepare('UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?').run(newStock, now, batch.id);

          this.db.prepare(`
            INSERT INTO stock_audit_logs (
              id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
              batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
              formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
              formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `audit_cnl_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
            targetPharmacyId,
            now,
            new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            prod.id,
            prod.name,
            prod.genericComposition,
            batch.id,
            batch.batchNumber,
            batch.expiryDate,
            prod.drugSchedule || 'OTC',
            'ADJUSTMENT_OUT',
            -tabsToDeduct,
            `-${tabsToDeduct} Tabs`,
            prevStock,
            newStock,
            `${Math.floor(prevStock / stripSize)} Strips`,
            `${Math.floor(newStock / stripSize)} Strips`,
            receipt.grnNumber,
            operator.fullName || operator.name || 'Pharmacist',
            operator.role || 'PHARMACIST',
            `Cancelled GRN #${receipt.grnNumber}: ${reason}`,
            receipt.vendorId,
            receipt.vendorName,
            prod.rackLocation || ''
          );
        }

        // Reverse vendor balance if it was credit pending
        if (receipt.paymentStatus === 'CREDIT_PENDING' || receipt.paymentMode === 'CREDIT_DUE') {
          const vendor = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(receipt.vendorId);
          if (vendor) {
            const currentBal = Number(vendor.balanceDue) || 0;
            const newBal = Math.max(0, Number((currentBal - receipt.grandTotal).toFixed(2)));
            this.db.prepare('UPDATE vendors SET balanceDue = ? WHERE id = ?').run(newBal, receipt.vendorId);
          }
        }
      }

      this.db.prepare('UPDATE purchase_receipts SET status = ?, cancelReason = ?, updatedAt = ? WHERE id = ?')
        .run('CANCELLED', reason.trim(), now, grnId);

      this.db.exec('COMMIT');
      return { success: true };
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[SQLite] cancelGrn failed:', err);
      return { success: false, error: err.message };
    }
  }

  postPurchaseReturn(params, operator = {}, pharmacyId = null) {
    if (!params) return { success: false, error: 'Return params required.' };
    const { productId, batchId, vendorId, returnTablets, reason, debitNoteNumber } = params;

    if (!productId || !batchId) {
      return { success: false, error: 'Product and Batch IDs are required.' };
    }
    const targetPharmacyId = pharmacyId || null;

    const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!prod) return { success: false, error: 'Product not found.' };
    if (targetPharmacyId && prod.pharmacyId && prod.pharmacyId !== targetPharmacyId) {
      return { success: false, error: 'Product belongs to another pharmacy.' };
    }

    const batch = this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
    if (!batch) return { success: false, error: 'Batch not found.' };

    const returnQty = Number(returnTablets);
    if (isNaN(returnQty) || returnQty <= 0) {
      return { success: false, error: 'Return quantity must be greater than zero.' };
    }
    if (batch.totalTablets < returnQty) {
      return {
        success: false,
        error: `Cannot return ${returnQty} tablets. Available batch stock is ${batch.totalTablets} tablets.`,
      };
    }

    const vendor = vendorId ? this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId) : null;
    const now = new Date().toISOString();
    const prevStock = batch.totalTablets;
    const newStock = prevStock - returnQty;
    const dnNo = debitNoteNumber || `DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    this.db.exec('BEGIN TRANSACTION');
    try {
      this.db.prepare('UPDATE batches SET totalTablets = ?, updatedAt = ? WHERE id = ?').run(newStock, now, batchId);

      let updatedVendor = null;
      if (vendor) {
        const stripSize = prod.stripSize || 10;
        const costPerTab = batch.costPricePerStrip / stripSize;
        const creditAmount = Number((costPerTab * returnQty).toFixed(2));
        const currentBal = Number(vendor.balanceDue) || 0;
        const newBal = Math.max(0, Number((currentBal - creditAmount).toFixed(2)));
        this.db.prepare('UPDATE vendors SET balanceDue = ? WHERE id = ?').run(newBal, vendor.id);
        updatedVendor = this.db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendor.id);
      }

      const stripSize = prod.stripSize || 10;
      const strips = Math.floor(returnQty / stripSize);
      const loose = returnQty % stripSize;
      let formattedChange = `-${strips} Strips (-${returnQty} Tabs)`;
      if (loose > 0) formattedChange = `-${strips} Strips, ${loose} Tabs (-${returnQty} Tabs)`;

      const prevStrips = Math.floor(prevStock / stripSize);
      const prevLoose = prevStock % stripSize;
      const newStrips = Math.floor(newStock / stripSize);
      const newLoose = newStock % stripSize;

      const auditRow = {
        id: `audit_dn_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
        pharmacyId: targetPharmacyId,
        timestamp: now,
        formattedTimestamp: new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        productId: prod.id,
        productName: prod.name,
        genericComposition: prod.genericComposition,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        drugSchedule: prod.drugSchedule || 'OTC',
        adjustmentType: 'VENDOR_RETURN',
        quantityChangeTablets: -returnQty,
        formattedChange,
        previousStockTablets: prevStock,
        newStockTablets: newStock,
        formattedPreviousStock: `${prevStrips} Strips, ${prevLoose} Tabs`,
        formattedNewStock: `${newStrips} Strips, ${newLoose} Tabs`,
        referenceNumber: dnNo,
        operatorName: operator.fullName || operator.name || 'Pharmacist',
        operatorRole: operator.role || 'PHARMACIST',
        reason: reason || 'Vendor Return / Debit Note',
        vendorId: vendor?.id || batch.vendorId,
        vendorName: vendor?.companyName || 'Distributor',
        rackLocation: prod.rackLocation || '',
      };

      this.db.prepare(`
        INSERT INTO stock_audit_logs (
          id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
          batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
          formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
          formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditRow.id, auditRow.pharmacyId, auditRow.timestamp, auditRow.formattedTimestamp,
        auditRow.productId, auditRow.productName, auditRow.genericComposition,
        auditRow.batchId, auditRow.batchNumber, auditRow.expiryDate, auditRow.drugSchedule,
        auditRow.adjustmentType, auditRow.quantityChangeTablets, auditRow.formattedChange,
        auditRow.previousStockTablets, auditRow.newStockTablets, auditRow.formattedPreviousStock,
        auditRow.formattedNewStock, auditRow.referenceNumber, auditRow.operatorName,
        auditRow.operatorRole, auditRow.reason, auditRow.vendorId, auditRow.vendorName, auditRow.rackLocation
      );

      this.db.exec('COMMIT');

      const updatedBatch = this.db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId);
      return {
        success: true,
        batch: updatedBatch,
        vendor: updatedVendor,
        auditEntry: auditRow,
      };
    } catch (err) {
      this.db.exec('ROLLBACK');
      console.error('[SQLite] postPurchaseReturn failed:', err);
      return { success: false, error: err.message };
    }
  }

  saveVendor(vendor, pharmacyId = null) {
    const targetPharmacyId = pharmacyId || vendor.pharmacyId || null;
    if (vendor.id) {
      const existing = this.db.prepare('SELECT pharmacyId FROM vendors WHERE id = ?').get(vendor.id);
      if (existing && targetPharmacyId && existing.pharmacyId && existing.pharmacyId !== targetPharmacyId) {
        return { success: false, error: 'Vendor belongs to another pharmacy.' };
      }
    }
    const stmt = this.db.prepare(`
      INSERT INTO vendors (
        id, pharmacyId, companyName, contactPerson, phone, email, gstin, drugLicenseNumber, state, creditPeriodDays, balanceDue, isActive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      vendor.id,
      targetPharmacyId,
      vendor.companyName || vendor.name || '',
      vendor.contactPerson || '',
      vendor.phone || '',
      vendor.email || null,
      vendor.gstin || '',
      vendor.drugLicenseNumber || '',
      vendor.state || 'Tamil Nadu',
      Number(vendor.creditPeriodDays) || 30,
      Number(vendor.balanceDue) || 0,
      vendor.isActive ? 1 : 0
    );
    return { success: true };
  }

  logDpdp(entry) {
    if (!entry) return { success: false, error: 'DPDP entry payload is required.' };
    const id = entry.id || `dpdp_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
    const now = entry.timestamp || new Date().toISOString();
    const masked = maskPhoneDPDP(entry.patientPhoneMasked || entry.patientPhone || '');
    const stmt = this.db.prepare(`
      INSERT INTO dpdp_logs (id, pharmacyId, timestamp, patientPhoneMasked, action, operatorName, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      entry.pharmacyId || null,
      now,
      masked,
      entry.action || 'CONSENT_GRANTED',
      entry.operatorName || 'System',
      entry.purpose || 'Customer contact processing for statutory invoice generation'
    );
    return { success: true, id, patientPhoneMasked: masked };
  }

  getDpdpLogs(pharmacyId = null, fromDate = null, toDate = null, limit = 500) {
    let query = 'SELECT * FROM dpdp_logs';
    const conditions = [];
    const params = [];

    if (pharmacyId) {
      conditions.push('pharmacyId = ?');
      params.push(pharmacyId);
    }
    if (fromDate) {
      conditions.push('timestamp >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push('timestamp <= ?');
      params.push(toDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit) || 500);

    return this.db.prepare(query).all(...params);
  }

  getScheduleRegister({ drugSchedule = 'ALL', pharmacyId = null, fromDate = null, toDate = null, limit = 500, offset = 0 } = {}) {
    let invoicesQuery = 'SELECT * FROM invoices WHERE status != ?';
    const invParams = ['CANCELLED'];

    if (pharmacyId) {
      invoicesQuery += ' AND pharmacyId = ?';
      invParams.push(pharmacyId);
    }
    if (fromDate) {
      invoicesQuery += ' AND invoiceDate >= ?';
      invParams.push(fromDate);
    }
    if (toDate) {
      invoicesQuery += ' AND invoiceDate <= ?';
      invParams.push(toDate);
    }
    invoicesQuery += ' ORDER BY invoiceDate DESC, invoiceNumber DESC';

    const invRows = this.db.prepare(invoicesQuery).all(...invParams);
    const scheduleRows = [];
    let serialCounter = 1;

    for (const inv of invRows) {
      const prescription = safeJsonParse(inv.prescriptionJson, {});
      const items = safeJsonParse(inv.itemsJson, []);

      for (const item of items) {
        const prod = this.db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
        const sched = prod?.drugSchedule || item.product?.drugSchedule || 'OTC';

        if (sched === 'OTC') continue;
        if (drugSchedule !== 'ALL' && sched !== drugSchedule) continue;

        let patientAddress = prescription.patientAddress || '';
        if (!patientAddress && prescription.notes && prescription.notes.includes('Address:')) {
          patientAddress = prescription.notes.replace('Address:', '').trim();
        }
        if (!patientAddress) {
          patientAddress = 'Prescription on record';
        }

        const batch = this.db.prepare('SELECT * FROM batches WHERE id = ?').get(item.batchId);
        const expiry = batch?.expiryDate || item.batch?.expiryDate || 'N/A';
        const batchNum = batch?.batchNumber || item.batchNumber || item.batch?.batchNumber || 'N/A';

        scheduleRows.push({
          serialNo: serialCounter++,
          itemId: item.id || item.cartItemId,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          patientName: prescription.patientName || 'Customer',
          patientAddress,
          patientContactMasked: maskPhoneDPDP(prescription.patientContact),
          doctorName: prescription.doctorName || 'Self / Unspecified RMP',
          doctorRegNo: prescription.doctorRegNumber || prescription.doctorRegNo || 'N/A',
          drugName: prod?.name || item.productName || item.product?.name,
          genericComposition: prod?.genericComposition || item.product?.genericComposition || 'N/A',
          schedule: sched,
          quantitySold: Number(item.quantity) || 0,
          unitType: item.unitType || 'STRIP',
          totalTabletsSold: Number(item.totalTabletsSold) || (Number(item.quantity) * (Number(item.stripSize) || 10)),
          batchNumber: batchNum,
          expiryDate: expiry,
          manufacturer: prod?.manufacturer || item.product?.manufacturer || 'N/A',
          dispensingPharmacist: inv.cashierName || 'Staff',
          paymentMode: inv.paymentMethod || 'CASH',
        });
      }
    }

    const startIndex = Number(offset) || 0;
    const maxLimit = Number(limit) || 500;
    const paginated = scheduleRows.slice(startIndex, startIndex + maxLimit);

    return {
      totalCount: scheduleRows.length,
      page: Math.floor(startIndex / maxLimit) + 1,
      rows: paginated,
    };
  }

  exportScheduleRegisterCsv(options = {}) {
    const { rows } = this.getScheduleRegister({ ...options, limit: 100000, offset: 0 });
    const headers = [
      'S.No.',
      'Bill Number',
      'Bill Date',
      'Patient Name',
      'Patient Residential Address',
      'Patient Phone (DPDP Masked)',
      'Prescribing Doctor (RMP)',
      'Doctor Council Reg. No.',
      'Drug Name & Strength',
      'Generic Salt Composition',
      'Schedule Category',
      'Quantity Dispensed',
      'Unit',
      'Batch Number',
      'Date of Expiry',
      'Manufacturer',
      'Dispensing Pharmacist / Cashier',
      'Payment Mode',
    ];

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        r.serialNo,
        escapeCsvCell(r.invoiceNumber),
        escapeCsvCell(r.invoiceDate ? r.invoiceDate.split('T')[0] : ''),
        escapeCsvCell(r.patientName),
        escapeCsvCell(r.patientAddress),
        escapeCsvCell(r.patientContactMasked),
        escapeCsvCell(r.doctorName),
        escapeCsvCell(r.doctorRegNo),
        escapeCsvCell(r.drugName),
        escapeCsvCell(r.genericComposition),
        escapeCsvCell(r.schedule),
        r.quantitySold,
        escapeCsvCell(r.unitType),
        escapeCsvCell(r.batchNumber),
        escapeCsvCell(r.expiryDate),
        escapeCsvCell(r.manufacturer),
        escapeCsvCell(r.dispensingPharmacist),
        escapeCsvCell(r.paymentMode),
      ].join(','));
    }
    return lines.join('\n');
  }

  saveSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO app_settings (key, valueJson) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson
    `);
    stmt.run(key, JSON.stringify(value));
    return { success: true };
  }

  getSetting(key) {
    const row = this.db.prepare('SELECT valueJson FROM app_settings WHERE key = ?').get(key);
    if (!row) return null;
    return safeJsonParse(row.valueJson, null);
  }

  saveBackupSnapshot(snapshot) {
    const stmt = this.db.prepare(`
      INSERT INTO backup_snapshots (
        id, pharmacyId, timestamp, filename, triggerType, recordCountsJson, totalSizeKb, sha256Checksum, isEncrypted, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        notes = excluded.notes
    `);
    stmt.run(
      snapshot.id,
      snapshot.pharmacyId || null,
      snapshot.timestamp,
      snapshot.filename,
      snapshot.triggerType,
      JSON.stringify(snapshot.recordCounts || {}),
      snapshot.totalSizeKb,
      snapshot.sha256Checksum,
      snapshot.isEncrypted ? 1 : 0,
      snapshot.notes || null
    );
    return { success: true };
  }

  getBackupSnapshots(pharmacyId = null) {
    let stmt = 'SELECT * FROM backup_snapshots ORDER BY timestamp DESC';
    let params = [];
    if (pharmacyId) {
      stmt = 'SELECT * FROM backup_snapshots WHERE pharmacyId = ? ORDER BY timestamp DESC';
      params = [pharmacyId];
    }
    return this.db.prepare(stmt).all(...params).map(s => ({
      ...s,
      isEncrypted: Boolean(s.isEncrypted),
      recordCounts: safeJsonParse(s.recordCountsJson, {}),
    }));
  }

  createBackup(pharmacyId = null) {
    const data = this.getAllData(pharmacyId);
    const dataJson = JSON.stringify(data);
    const sha256 = crypto.createHash('sha256').update(dataJson).digest('hex');
    const totalSizeKb = Number((Buffer.byteLength(dataJson) / 1024).toFixed(2));
    const recordCounts = {
      products: data.products?.length || 0,
      batches: data.batches?.length || 0,
      vendors: data.vendors?.length || 0,
      invoices: data.invoices?.length || 0,
      stockAuditLogs: data.stockAuditLogs?.length || 0,
      dpdpLogs: data.dpdpLogs?.length || 0,
      backupSnapshots: data.backupSnapshots?.length || 0,
      purchaseReceipts: data.purchaseReceipts?.length || 0,
      salesReturns: data.salesReturns?.length || 0,
    };
    return {
      version: 1,
      pharmacyId,
      timestamp: new Date().toISOString(),
      sha256,
      data,
      metadata: {
        recordCounts,
        totalSizeKb,
      },
    };
  }

  createEncryptedBackup(pharmacyId = null, password = '', notes = '') {
    if (!password || typeof password !== 'string' || !password.trim()) {
      return { success: false, error: 'Password is required to generate an encrypted backup archive.' };
    }
    const backupPayload = this.createBackup(pharmacyId);
    const plaintext = JSON.stringify(backupPayload);

    const salt = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const sha256Checksum = crypto.createHash('sha256').update(ciphertext).digest('hex');

    const envelope = {
      format: 'JEEVA_ENCRYPTED_BACKUP_V1',
      version: 1,
      pharmacyId,
      timestamp: new Date().toISOString(),
      algorithm: 'aes-256-gcm',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: ciphertext.toString('hex'),
      sha256Checksum,
      metadata: backupPayload.metadata,
      notes: notes || 'Encrypted database archive',
    };

    const snapId = `snap_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
    this.saveBackupSnapshot({
      id: snapId,
      pharmacyId,
      timestamp: envelope.timestamp,
      filename: `backup_${pharmacyId || 'all'}_${Date.now()}.jeeva.enc`,
      triggerType: 'MANUAL_ENCRYPTED',
      recordCounts: backupPayload.metadata.recordCounts,
      totalSizeKb: Number((Buffer.byteLength(ciphertext) / 1024).toFixed(2)),
      sha256Checksum,
      isEncrypted: true,
      notes: notes || 'Encrypted with AES-256-GCM',
    });

    return {
      success: true,
      envelope,
      snapshotId: snapId,
      sha256Checksum,
    };
  }

  restoreEncryptedBackup(envelope, password = '', pharmacyId = null) {
    if (!envelope || envelope.format !== 'JEEVA_ENCRYPTED_BACKUP_V1') {
      return { success: false, error: 'Invalid backup envelope format. Expected JEEVA_ENCRYPTED_BACKUP_V1.' };
    }
    if (!password || typeof password !== 'string') {
      return { success: false, error: 'Decryption passphrase is required to restore an encrypted backup.' };
    }

    const ciphertextBuf = Buffer.from(envelope.ciphertext, 'hex');
    const computedSha = crypto.createHash('sha256').update(ciphertextBuf).digest('hex');
    if (computedSha !== envelope.sha256Checksum) {
      return { success: false, error: 'Tamper detected: SHA-256 checksum mismatch on backup ciphertext.' };
    }

    try {
      const saltBuf = Buffer.from(envelope.salt, 'hex');
      const key = crypto.pbkdf2Sync(password, saltBuf, 100000, 32, 'sha256');
      const ivBuf = Buffer.from(envelope.iv, 'hex');
      const authTagBuf = Buffer.from(envelope.authTag, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
      decipher.setAuthTag(authTagBuf);

      const plaintext = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]).toString('utf8');
      const parsed = JSON.parse(plaintext);
      const backupData = parsed.data || parsed;

      return this.restoreBackup(backupData, pharmacyId || envelope.pharmacyId);
    } catch (err) {
      return {
        success: false,
        error: `Decryption failed: ${err.message}. Authentication tag mismatch or incorrect password.`,
      };
    }
  }

  restoreBackup(backupData, pharmacyId = null) {
    if (!backupData || typeof backupData !== 'object') {
      return { success: false, error: 'Invalid backup data provided.' };
    }

    // Phase 5: Automatic Pre-Restore Safety Snapshot
    try {
      const preRestoreData = this.getAllData(pharmacyId);
      const preJson = JSON.stringify(preRestoreData);
      const preSha = crypto.createHash('sha256').update(preJson).digest('hex');
      const safetySnapId = `safety_snap_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`;
      this.saveBackupSnapshot({
        id: safetySnapId,
        pharmacyId,
        timestamp: new Date().toISOString(),
        filename: `pre_restore_safety_${pharmacyId || 'all'}_${Date.now()}.json`,
        triggerType: 'PRE_RESTORE_SAFETY',
        recordCounts: {
          products: preRestoreData.products?.length || 0,
          batches: preRestoreData.batches?.length || 0,
          invoices: preRestoreData.invoices?.length || 0,
          vendors: preRestoreData.vendors?.length || 0,
          purchaseReceipts: preRestoreData.purchaseReceipts?.length || 0,
          salesReturns: preRestoreData.salesReturns?.length || 0,
          stockAuditLogs: preRestoreData.stockAuditLogs?.length || 0,
          dpdpLogs: preRestoreData.dpdpLogs?.length || 0,
        },
        totalSizeKb: Number((Buffer.byteLength(preJson) / 1024).toFixed(2)),
        sha256Checksum: preSha,
        isEncrypted: false,
        notes: 'Automatic safety snapshot captured prior to database restore',
      });
    } catch (snapErr) {
      console.warn('[SQLite Backup] Pre-restore safety snapshot warning:', snapErr.message);
    }

    this.db.exec('BEGIN TRANSACTION');
    try {
      if (Array.isArray(backupData.products)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM products WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM products');
        }
        for (const p of backupData.products) {
          this.saveProduct({ ...p, pharmacyId: pharmacyId || p.pharmacyId });
        }
      }

      if (Array.isArray(backupData.batches)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM batches WHERE productId IN (SELECT id FROM products WHERE pharmacyId = ?)').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM batches');
        }
        for (const b of backupData.batches) {
          this.saveBatch(b);
        }
      }

      if (Array.isArray(backupData.vendors)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM vendors WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM vendors');
        }
        for (const v of backupData.vendors) {
          this.saveVendor({ ...v, pharmacyId: pharmacyId || v.pharmacyId });
        }
      }

      if (Array.isArray(backupData.invoices)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM invoices WHERE pharmacyId = ?').run(pharmacyId);
          this.db.prepare('DELETE FROM invoice_items WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM invoices');
          this.db.exec('DELETE FROM invoice_items');
        }

        const invStmt = this.db.prepare(`
          INSERT INTO invoices (
            id, pharmacyId, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
            subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
            grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const invItemStmt = this.db.prepare(`
          INSERT OR REPLACE INTO invoice_items (
            id, invoiceId, pharmacyId, productId, productName, batchId, batchNumber,
            unitType, quantity, stripSize, totalTabletsSold, unitPrice, costPrice,
            mrp, gstRate, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const inv of backupData.invoices) {
          const items = Array.isArray(inv.items) ? inv.items : safeJsonParse(inv.itemsJson, []);
          invStmt.run(
            inv.id,
            pharmacyId || inv.pharmacyId || null,
            inv.invoiceNumber,
            inv.invoiceDate,
            inv.isInterState ? 1 : 0,
            typeof inv.prescription === 'string' ? inv.prescription : JSON.stringify(inv.prescription || {}),
            typeof inv.items === 'string' ? inv.items : JSON.stringify(items),
            inv.subtotal || 0,
            inv.totalCgst || 0,
            inv.totalSgst || 0,
            inv.totalIgst || 0,
            inv.totalTax || 0,
            inv.roundOff || 0,
            inv.grandTotal || 0,
            inv.paymentMethod || 'CASH',
            inv.status || 'COMPLETED',
            inv.cashierName || 'Staff',
            typeof inv.taxSlabBreakdowns === 'string' ? inv.taxSlabBreakdowns : JSON.stringify(inv.taxSlabBreakdowns || []),
            inv.createdAt || inv.invoiceDate || new Date().toISOString()
          );

          for (const it of items) {
            invItemStmt.run(
              it.id || `invitem_${inv.id}_${it.batchId || Math.random()}`,
              inv.id,
              pharmacyId || inv.pharmacyId || null,
              it.productId || it.product?.id || '',
              it.productName || it.product?.name || '',
              it.batchId || it.batch?.id || '',
              it.batchNumber || it.batch?.batchNumber || '',
              it.unitType || 'STRIP',
              Number(it.quantity) || 0,
              Number(it.stripSize) || 10,
              Number(it.totalTabletsSold) || (Number(it.quantity) * (Number(it.stripSize) || 10)),
              Number(it.unitPrice) || 0,
              Number(it.costPrice) || 0,
              Number(it.mrp) || 0,
              Number(it.gstRate) || 0,
              Number(it.taxableAmount) || 0,
              Number(it.cgstAmount) || 0,
              Number(it.sgstAmount) || 0,
              Number(it.igstAmount) || 0,
              Number(it.totalAmount) || 0
            );
          }
        }
      }

      if (Array.isArray(backupData.purchaseReceipts) || Array.isArray(backupData.purchaseInvoices)) {
        const receipts = backupData.purchaseReceipts || backupData.purchaseInvoices;
        if (pharmacyId) {
          this.db.prepare('DELETE FROM purchase_receipts WHERE pharmacyId = ?').run(pharmacyId);
          this.db.prepare('DELETE FROM purchase_receipt_items WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM purchase_receipts');
          this.db.exec('DELETE FROM purchase_receipt_items');
        }
        const prStmt = this.db.prepare(`
          INSERT INTO purchase_receipts (
            id, pharmacyId, grnNumber, grnDate, poNumber, vendorId, vendorName, vendorInvoiceNo,
            invoiceDate, paymentDueDate, subtotal, discountTotal, taxableTotal, cgstTotal, sgstTotal,
            igstTotal, roundOff, grandTotal, paymentStatus, paymentMode, status, notes, cancelReason,
            itemsJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const itemStmt = this.db.prepare(`
          INSERT INTO purchase_receipt_items (
            id, receiptId, pharmacyId, productId, productName, batchNumber, expiryDate, manufacturingDate,
            packing, quantityStrips, freeStrips, rejectedStrips, acceptedStrips, costPricePerStrip,
            mrpPerStrip, discountPercent, gstRate, taxableAmount, cgstAmount, sgstAmount, igstAmount, lineTotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const pr of receipts) {
          const items = Array.isArray(pr.items) ? pr.items : safeJsonParse(pr.itemsJson, []);
          prStmt.run(
            pr.id,
            pharmacyId || pr.pharmacyId || null,
            pr.grnNumber || `GRN-${Date.now()}`,
            pr.grnDate || pr.invoiceDate || new Date().toISOString(),
            pr.poNumber || null,
            pr.vendorId || '',
            pr.vendorName || '',
            pr.vendorInvoiceNo || pr.invoiceNumber || '',
            pr.invoiceDate || new Date().toISOString(),
            pr.paymentDueDate || null,
            pr.subtotal || 0,
            pr.discountTotal || 0,
            pr.taxableTotal || 0,
            pr.cgstTotal || 0,
            pr.sgstTotal || 0,
            pr.igstTotal || 0,
            pr.roundOff || 0,
            pr.grandTotal || 0,
            pr.paymentStatus || 'PAID',
            pr.paymentMode || 'CREDIT_DUE',
            pr.status || 'POSTED_TO_STOCK',
            pr.notes || null,
            pr.cancelReason || null,
            JSON.stringify(items),
            pr.createdAt || new Date().toISOString(),
            pr.updatedAt || new Date().toISOString()
          );
          for (const it of items) {
            itemStmt.run(
              it.id || `pritem_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
              pr.id,
              pharmacyId || pr.pharmacyId || null,
              it.productId || '',
              it.productName || '',
              it.batchNumber || '',
              it.expiryDate || '',
              it.manufacturingDate || null,
              it.packing || 10,
              it.quantityStrips || 0,
              it.freeStrips || 0,
              it.rejectedStrips || 0,
              it.acceptedStrips || 0,
              it.costPricePerStrip || 0,
              it.mrpPerStrip || 0,
              it.discountPercent || 0,
              it.gstRate || 0,
              it.taxableAmount || 0,
              it.cgstAmount || 0,
              it.sgstAmount || 0,
              it.igstAmount || 0,
              it.lineTotal || 0
            );
          }
        }
      }

      if (Array.isArray(backupData.salesReturns)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM sales_returns WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM sales_returns');
        }
        const srStmt = this.db.prepare(`
          INSERT INTO sales_returns (
            id, pharmacyId, returnNumber, invoiceId, invoiceNumber, customerName,
            date, itemsJson, totalRefundAmount, refundMode, processedBy, reason,
            isRestocked, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const sr of backupData.salesReturns) {
          const items = Array.isArray(sr.items) ? sr.items : safeJsonParse(sr.itemsJson, []);
          srStmt.run(
            sr.id,
            pharmacyId || sr.pharmacyId || null,
            sr.returnNumber,
            sr.invoiceId,
            sr.invoiceNumber,
            sr.customerName || 'Customer',
            sr.date || new Date().toISOString(),
            JSON.stringify(items),
            sr.totalRefundAmount || 0,
            sr.refundMode || 'CASH',
            sr.processedBy || 'Staff',
            sr.reason || 'Customer return',
            sr.isRestocked ? 1 : 0,
            sr.createdAt || new Date().toISOString()
          );
        }
      }

      if (Array.isArray(backupData.stockAuditLogs)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM stock_audit_logs WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM stock_audit_logs');
        }
        const auditStmt = this.db.prepare(`
          INSERT INTO stock_audit_logs (
            id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
            batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
            formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
            formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of backupData.stockAuditLogs) {
          auditStmt.run(
            s.id,
            pharmacyId || s.pharmacyId || null,
            s.timestamp,
            s.formattedTimestamp || null,
            s.productId,
            s.productName,
            s.genericComposition || null,
            s.batchId,
            s.batchNumber,
            s.expiryDate || null,
            s.drugSchedule || null,
            s.adjustmentType || 'MANUAL_ADJUSTMENT',
            s.quantityChangeTablets,
            s.formattedChange || null,
            s.previousStockTablets || 0,
            s.newStockTablets || 0,
            s.formattedPreviousStock || null,
            s.formattedNewStock || null,
            s.referenceNumber || 'BACKUP-RESTORE',
            s.operatorName || 'System',
            s.operatorRole || 'ADMIN',
            s.reason || 'Restored from backup archive',
            s.vendorId || null,
            s.vendorName || null,
            s.rackLocation || null
          );
        }
      }

      if (Array.isArray(backupData.dpdpLogs)) {
        if (pharmacyId) {
          this.db.prepare('DELETE FROM dpdp_logs WHERE pharmacyId = ?').run(pharmacyId);
        } else {
          this.db.exec('DELETE FROM dpdp_logs');
        }
        const dpdpStmt = this.db.prepare(`
          INSERT INTO dpdp_logs (id, pharmacyId, timestamp, patientPhoneMasked, action, operatorName, purpose)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const d of backupData.dpdpLogs) {
          dpdpStmt.run(
            d.id,
            pharmacyId || d.pharmacyId || null,
            d.timestamp,
            d.patientPhoneMasked || 'XXXXXX',
            d.action || 'RESTORE',
            d.operatorName || 'System',
            d.purpose || 'Restored from backup archive'
          );
        }
      }

      this.db.exec('COMMIT');

      // Record RESTORE_APPLIED snapshot
      try {
        const postData = this.getAllData(pharmacyId);
        const postJson = JSON.stringify(postData);
        const postSha = crypto.createHash('sha256').update(postJson).digest('hex');
        this.saveBackupSnapshot({
          id: `applied_snap_${Date.now()}_${crypto.randomUUID().substring(0, 6)}`,
          pharmacyId,
          timestamp: new Date().toISOString(),
          filename: `restore_applied_${pharmacyId || 'all'}_${Date.now()}.json`,
          triggerType: 'RESTORE_APPLIED',
          recordCounts: {
            products: postData.products?.length || 0,
            batches: postData.batches?.length || 0,
            invoices: postData.invoices?.length || 0,
            vendors: postData.vendors?.length || 0,
            purchaseReceipts: postData.purchaseReceipts?.length || 0,
            salesReturns: postData.salesReturns?.length || 0,
          },
          totalSizeKb: Number((Buffer.byteLength(postJson) / 1024).toFixed(2)),
          sha256Checksum: postSha,
          isEncrypted: false,
          notes: 'Backup archive successfully restored into local database ledger',
        });
      } catch (err) {
        // Non-critical audit record
      }

      return { success: true };
    } catch (e) {
      this.db.exec('ROLLBACK');
      console.error('Failed to restore backup in SQLite:', e);
      return { success: false, error: e.message };
    }
  }

  close() {
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        console.warn('Error closing SQLite database:', e.message);
      }
    }
  }
}

PharmacyDatabase.initDatabase = (dbPath) => new PharmacyDatabase(dbPath);
module.exports = PharmacyDatabase;
module.exports.PharmacyDatabase = PharmacyDatabase;
module.exports.initDatabase = (dbPath) => new PharmacyDatabase(dbPath);
