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
      'CREATE INDEX IF NOT EXISTS idx_stock_audit_pharmacy ON stock_audit_logs(pharmacyId)'
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
    const tables = ['products', 'invoices', 'vendors', 'stock_audit_logs', 'dpdp_logs', 'backup_snapshots', 'users'];
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
      const tables = ['products', 'invoices', 'vendors', 'stock_audit_logs', 'dpdp_logs', 'backup_snapshots'];
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

    if (pharmacyId) {
      productsStmt = 'SELECT * FROM products WHERE pharmacyId = ? OR pharmacyId IS NULL';
      batchesStmt = 'SELECT b.* FROM batches b JOIN products p ON b.productId = p.id WHERE p.pharmacyId = ? OR p.pharmacyId IS NULL';
      invoicesStmt = 'SELECT * FROM invoices WHERE pharmacyId = ? OR pharmacyId IS NULL ORDER BY invoiceDate DESC';
      vendorsStmt = 'SELECT * FROM vendors WHERE pharmacyId = ? OR pharmacyId IS NULL';
      stockAuditLogsStmt = 'SELECT * FROM stock_audit_logs WHERE pharmacyId = ? OR pharmacyId IS NULL ORDER BY timestamp DESC';
      dpdpLogsStmt = 'SELECT * FROM dpdp_logs WHERE pharmacyId = ? OR pharmacyId IS NULL ORDER BY timestamp DESC';
      backupSnapshotsStmt = 'SELECT * FROM backup_snapshots WHERE pharmacyId = ? OR pharmacyId IS NULL ORDER BY timestamp DESC';
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
      settings,
    };
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

  createInvoice(invoice, auditEntries = [], pharmacyId = null) {
    const targetPharmacyId = pharmacyId || invoice.pharmacyId || null;

    // Verify batch ownership for all items in the invoice
    for (const item of (invoice.items || [])) {
      const batchId = item.batchId || (item.batch && item.batch.id);
      if (batchId) {
        const b = this.getBatchWithProduct(batchId);
        if (!b) {
          return { success: false, error: `Batch '${batchId}' not found.` };
        }
        if (targetPharmacyId && b.productPharmacyId && b.productPharmacyId !== targetPharmacyId) {
          return { success: false, error: `Batch '${batchId}' belongs to another pharmacy.` };
        }
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
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.isInterState ? 1 : 0,
        typeof invoice.prescription === 'string' ? invoice.prescription : JSON.stringify(invoice.prescription || {}),
        typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || []),
        invoice.subtotal || 0,
        invoice.totalCgst || 0,
        invoice.totalSgst || 0,
        invoice.totalIgst || 0,
        invoice.totalTax || 0,
        invoice.roundOff || 0,
        invoice.grandTotal || 0,
        invoice.paymentMethod || 'CASH',
        invoice.status || 'PAID',
        invoice.cashierName || 'Staff',
        typeof invoice.taxSlabBreakdowns === 'string' ? invoice.taxSlabBreakdowns : JSON.stringify(invoice.taxSlabBreakdowns || []),
        invoice.createdAt || invoice.invoiceDate || new Date().toISOString()
      );

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

      if (Array.isArray(auditEntries) && auditEntries.length > 0) {
        const auditStmt = this.db.prepare(`
          INSERT INTO stock_audit_logs (
            id, pharmacyId, timestamp, formattedTimestamp, productId, productName, genericComposition,
            batchId, batchNumber, expiryDate, drugSchedule, adjustmentType, quantityChangeTablets,
            formattedChange, previousStockTablets, newStockTablets, formattedPreviousStock,
            formattedNewStock, referenceNumber, operatorName, operatorRole, reason, vendorId, vendorName, rackLocation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const entry of auditEntries) {
          auditStmt.run(
            entry.id,
            targetPharmacyId,
            entry.timestamp,
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
            entry.referenceNumber || invoice.invoiceNumber,
            entry.operatorName || invoice.cashierName || 'Staff',
            entry.operatorRole || 'CASHIER',
            entry.reason || `POS Bill #${invoice.invoiceNumber}`,
            entry.vendorId || null,
            entry.vendorName || null,
            entry.rackLocation || null
          );
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

  saveInvoice(invoice) {
    return this.createInvoice(invoice);
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
    if (!reason || !reason.trim()) {
      return { success: false, error: 'Cancellation reason is required.' };
    }

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

      const now = new Date().toISOString();
      const opName = operator.fullName || operator.username || 'Staff';
      const opRole = operator.role || 'PHARMACIST';
      const targetPharmacy = pharmacyId || inv.pharmacyId || null;

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
          entry.adjustmentType || 'SALE_RETURN',
          qty,
          entry.formattedChange || `+${qty} tablets`,
          prevStock,
          newStock,
          entry.formattedPreviousStock || `${prevStock} tablets`,
          entry.formattedNewStock || `${newStock} tablets`,
          entry.referenceNumber || inv.invoiceNumber,
          opName,
          opRole,
          reason,
          entry.vendorId || null,
          entry.vendorName || null,
          entry.rackLocation || null
        );
      }

      this.db.exec('COMMIT');
      return { success: true };
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
    const validMethods = ['CASH', 'UPI', 'CARD', 'CREDIT'];
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
    const stmt = this.db.prepare(`
      INSERT INTO dpdp_logs (id, pharmacyId, timestamp, patientPhoneMasked, action, operatorName, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.pharmacyId || null,
      entry.timestamp,
      entry.patientPhoneMasked,
      entry.action,
      entry.operatorName,
      entry.purpose
    );
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

  restoreBackup(backupData, pharmacyId = null) {
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
        } else {
          this.db.exec('DELETE FROM invoices');
        }
        const invStmt = this.db.prepare(`
          INSERT INTO invoices (
            id, pharmacyId, invoiceNumber, invoiceDate, isInterState, prescriptionJson, itemsJson,
            subtotal, totalCgst, totalSgst, totalIgst, totalTax, roundOff,
            grandTotal, paymentMethod, status, cashierName, taxSlabBreakdownsJson, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const inv of backupData.invoices) {
          invStmt.run(
            inv.id,
            pharmacyId || inv.pharmacyId || null,
            inv.invoiceNumber,
            inv.invoiceDate,
            inv.isInterState ? 1 : 0,
            typeof inv.prescription === 'string' ? inv.prescription : JSON.stringify(inv.prescription || {}),
            typeof inv.items === 'string' ? inv.items : JSON.stringify(inv.items || []),
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
