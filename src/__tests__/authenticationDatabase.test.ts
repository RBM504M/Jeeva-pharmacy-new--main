// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Require the actual CommonJS database module used by Electron
const { initDatabase } = require('../../electron/database.cjs');

describe('Production Authentication & SQLite Database Data Flow', () => {
  let tempDir: string;
  let dbPath: string;
  let db: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jeeva-auth-test-'));
    dbPath = path.join(tempDir, 'test_pharmacy.db');
    db = initDatabase(dbPath);
  });

  afterEach(() => {
    try {
      if (db && db.close) {
        db.close();
      }
    } catch {}
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('1. Fresh installation: starts unconfigured and completely empty without silent demo seeding', () => {
    // Must report not configured
    expect(db.isConfigured()).toBe(false);

    // Operational tables must be completely empty
    const allData = db.getAllData('any-tenant');
    expect(allData.products.length).toBe(0);
    expect(allData.invoices.length).toBe(0);
    expect(allData.batches.length).toBe(0);
    expect(allData.vendors.length).toBe(0);
    expect(allData.stockAuditLogs.length).toBe(0);
    expect(allData.dpdpLogs.length).toBe(0);
  });

  it('2. First-run onboarding: creates pharmacy profile and primary admin with modern salted password hash', () => {
    const onboardingPayload = {
      pharmacy: {
        name: 'Apollo Retail Pharmacy',
        dlNumber: 'TN/CHN/20B/12345',
        gstin: '33AAAAA1234A1Z5',
        address: '42 Anna Salai',
        phone: '+91 98401 23456',
        email: 'contact@apollopharmacy.com',
        state: 'Tamil Nadu',
        pincode: '600002',
      },
      admin: {
        fullName: 'Dr. Ramesh Kumar, B.Pharm',
        username: 'ramesh_admin',
        password: 'SecureAdminPassword#2026',
        phone: '+91 98401 23456',
        email: 'ramesh@apollopharmacy.com',
      },
    };

    const setupResult = db.setupInitialPharmacy(onboardingPayload.pharmacy, onboardingPayload.admin);
    expect(setupResult.success).toBe(true);
    expect(setupResult.pharmacy.id).toBeDefined();
    expect(setupResult.admin.id).toBeDefined();
    expect(setupResult.admin.role).toBe('ADMIN');
    expect(setupResult.admin.username).toBe('ramesh_admin');

    // System must now report configured
    expect(db.isConfigured()).toBe(true);

    // Direct database audit: Verify plaintext password is NEVER stored or logged
    const rawUser = db.db.prepare('SELECT * FROM users WHERE id = ?').get(setupResult.admin.id);
    expect(rawUser).toBeDefined();
    const hashVal = rawUser.passwordHash || rawUser.password_hash;
    const saltVal = rawUser.salt || rawUser.password_salt;
    expect(hashVal).toBeDefined();
    expect(saltVal).toBeDefined();
    // SHA-512 hex hash is 128 characters long
    expect(hashVal.length).toBe(128);
    // Salt is 16 bytes = 32 hex chars
    expect(saltVal.length).toBe(32);
    // Plaintext password must NOT appear anywhere in the database row
    expect(hashVal).not.toContain('SecureAdminPassword#2026');
    expect(JSON.stringify(rawUser)).not.toContain('SecureAdminPassword#2026');
  });

  it('3. Authentication: verifies valid credentials and rejects incorrect passwords or unknown users', () => {
    // Setup initial pharmacy
    const setupResult = db.setupInitialPharmacy(
      {
        name: 'City Care Pharmacy',
        dlNumber: 'TN/DL/9988',
        gstin: '33BBBBB5678B1Z2',
        address: '10 Gandhi Road',
        phone: '+91 94440 12345',
        email: 'care@citycare.in',
      },
      {
        fullName: 'K. Balan, Chief Pharmacist',
        username: 'balan_rx',
        password: 'CorrectPassword123!',
      }
    );
    expect(setupResult.success).toBe(true);

    // Case A: Valid credentials
    const validLogin = db.verifyUserCredentials('balan_rx', 'CorrectPassword123!');
    expect(validLogin.success).toBe(true);
    expect(validLogin.user.username).toBe('balan_rx');
    expect(validLogin.user.fullName).toBe('K. Balan, Chief Pharmacist');
    expect(validLogin.user.role).toBe('ADMIN');
    expect(validLogin.pharmacy.name).toBe('City Care Pharmacy');
    // Returned user payload must NEVER include hash or salt
    expect(validLogin.user.password_hash).toBeUndefined();
    expect(validLogin.user.password_salt).toBeUndefined();

    // Case B: Wrong password
    const wrongPassword = db.verifyUserCredentials('balan_rx', 'WrongPassword!');
    expect(wrongPassword.success).toBe(false);
    expect(wrongPassword.error).toMatch(/invalid username or password/i);

    // Case C: Non-existent user
    const nonExistent = db.verifyUserCredentials('ghost_user', 'AnyPassword123');
    expect(nonExistent.success).toBe(false);
    expect(nonExistent.error).toMatch(/invalid username or password/i);
  });

  it('4. Role-based user creation: allows adding staff users with supported roles', () => {
    const setupResult = db.setupInitialPharmacy(
      { name: 'MedPlus Pharmacy', dlNumber: 'DL-1', gstin: '33C', address: 'Main St', phone: '999' },
      { fullName: 'Admin User', username: 'owner_admin', password: 'OwnerPassword#1' }
    );
    const pharmacyId = setupResult.pharmacy.id;

    // Add Pharmacist staff
    const pharmacistRes = db.createUser(pharmacyId, {
      fullName: 'P. Priya, Registered Pharmacist',
      username: 'priya_rx',
      password: 'PriyaPassword#2026',
      role: 'PHARMACIST',
      email: 'priya@medplus.in',
    });
    expect(pharmacistRes.success).toBe(true);
    expect(pharmacistRes.user.role).toBe('PHARMACIST');

    // Add Cashier staff
    const cashierRes = db.createUser(pharmacyId, {
      fullName: 'S. Kumar, Billing Executive',
      username: 'kumar_pos',
      password: 'KumarPassword#2026',
      role: 'CASHIER',
    });
    expect(cashierRes.success).toBe(true);
    expect(cashierRes.user.role).toBe('CASHIER');

    // Add Pharmacy Assistant staff
    const assistantRes = db.createUser(pharmacyId, {
      fullName: 'M. Divya, Assistant',
      username: 'divya_ast',
      password: 'DivyaPassword#2026',
      role: 'PHARMACY_ASSISTANT',
    });
    expect(assistantRes.success).toBe(true);
    expect(assistantRes.user.role).toBe('PHARMACY_ASSISTANT');

    // Disallow duplicate username
    const dupRes = db.createUser(pharmacyId, {
      fullName: 'Duplicate Priya',
      username: 'priya_rx',
      password: 'AnotherPassword#1',
      role: 'PHARMACIST',
    });
    expect(dupRes.success).toBe(false);
    expect(dupRes.error).toMatch(/already taken/i);

    // Verify all created staff can log in
    const cashierLogin = db.verifyUserCredentials('kumar_pos', 'KumarPassword#2026');
    expect(cashierLogin.success).toBe(true);
    expect(cashierLogin.user.role).toBe('CASHIER');
  });

  it('5. User deactivation: deactivating a user blocks sign-in, and last admin cannot be deactivated', () => {
    const setupResult = db.setupInitialPharmacy(
      { name: 'Kavitha Pharmacy', dlNumber: 'DL-2', gstin: '33D', address: 'Cross Rd', phone: '888' },
      { fullName: 'Primary Owner', username: 'kavitha_admin', password: 'AdminPassword#1' }
    );
    const pharmacyId = setupResult.pharmacy.id;
    const adminId = setupResult.admin.id;

    // Attempting to deactivate the only active admin MUST fail to prevent total lockout
    const lockPrevent = db.deactivateUser(pharmacyId, adminId);
    expect(lockPrevent.success).toBe(false);
    expect(lockPrevent.error).toMatch(/cannot deactivate the only active administrator/i);

    // Add a staff member and then deactivate them
    const staffRes = db.createUser(pharmacyId, {
      fullName: 'Temporary Cashier',
      username: 'temp_cashier',
      password: 'TempPassword#2026',
      role: 'CASHIER',
    });
    const staffId = staffRes.user.id;

    // Staff member can initially sign in
    expect(db.verifyUserCredentials('temp_cashier', 'TempPassword#2026').success).toBe(true);

    // Deactivate the staff member
    const deactRes = db.deactivateUser(pharmacyId, staffId);
    expect(deactRes.success).toBe(true);

    // Signing in as deactivated user must fail with explicit inactive status
    const inactiveLogin = db.verifyUserCredentials('temp_cashier', 'TempPassword#2026');
    expect(inactiveLogin.success).toBe(false);
    expect(inactiveLogin.error).toMatch(/account has been deactivated/i);

    // Reactivate user and sign-in should succeed again
    const reactRes = db.activateUser(pharmacyId, staffId);
    expect(reactRes.success).toBe(true);
    expect(db.verifyUserCredentials('temp_cashier', 'TempPassword#2026').success).toBe(true);
  });

  it('6. Tenant isolation: records belonging to Pharmacy A are completely inaccessible to Pharmacy B', () => {
    // Setup Pharmacy A
    const pharmacyA = db.setupInitialPharmacy(
      { name: 'Pharmacy Alpha', dlNumber: 'DL-A', gstin: '33A', address: 'A Street', phone: '111' },
      { fullName: 'Admin Alpha', username: 'admin_a', password: 'PasswordA#1' }
    ).pharmacy;

    // Setup Pharmacy B
    const pharmacyB = db.setupInitialPharmacy(
      { name: 'Pharmacy Beta', dlNumber: 'DL-B', gstin: '33B', address: 'B Street', phone: '222' },
      { fullName: 'Admin Beta', username: 'admin_b', password: 'PasswordB#1' }
    ).pharmacy;

    // Save product under Pharmacy A
    db.saveProduct({
      id: 'prod_a_01',
      name: 'Amoxicillin 500mg (Alpha)',
      genericComposition: 'Amoxicillin',
      stripSize: 10,
      gstRate: 12,
      drugSchedule: 'Schedule H',
      pharmacyId: pharmacyA.id,
    });

    // Save product under Pharmacy B
    db.saveProduct({
      id: 'prod_b_01',
      name: 'Paracetamol 650mg (Beta)',
      genericComposition: 'Paracetamol',
      stripSize: 15,
      gstRate: 12,
      drugSchedule: 'OTC',
      pharmacyId: pharmacyB.id,
    });

    // Save invoice under Pharmacy A
    db.saveInvoice({
      id: 'inv_a_01',
      invoiceNumber: 'SLS-A-001',
      invoiceDate: new Date().toISOString(),
      customerName: 'Customer Alpha',
      grandTotal: 500,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      items: [],
      pharmacyId: pharmacyA.id,
    });

    // Query data for Pharmacy A
    const dataA = db.getAllData(pharmacyA.id);
    expect(dataA.products.length).toBe(1);
    expect(dataA.products[0].name).toBe('Amoxicillin 500mg (Alpha)');
    expect(dataA.invoices.length).toBe(1);
    expect(dataA.invoices[0].invoiceNumber).toBe('SLS-A-001');

    // Query data for Pharmacy B
    const dataB = db.getAllData(pharmacyB.id);
    expect(dataB.products.length).toBe(1);
    expect(dataB.products[0].name).toBe('Paracetamol 650mg (Beta)');
    expect(dataB.invoices.length).toBe(0); // Pharmacy A's invoice is NOT visible in Pharmacy B
  });

  it('7. Upgrade migration: preserves existing customer data and migrates legacy user_profile without data loss', () => {
    // Simulate an existing pre-upgrade installation database by creating legacy tables and records
    db.db.exec(`
      CREATE TABLE IF NOT EXISTS legacy_user_profile (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        role TEXT,
        pharmacy_name TEXT,
        dl_number TEXT,
        gstin TEXT
      );
      INSERT INTO legacy_user_profile VALUES (
        'legacy_1',
        'K. Balasubramanian, B.Pharm',
        'pharmacist@existingcustomer.in',
        '+91 98401 23456',
        'ADMIN',
        'Jeeva Pharmacy (Existing Installation)',
        'TN/TPR/20B/84920',
        '33AAAAJ9921M1Z4'
      );
    `);

    // Existing customer inventory and sales records
    db.saveProduct({
      id: 'existing_prod_1',
      name: 'Dolo 650 Tablets',
      genericComposition: 'Paracetamol 650mg',
      stripSize: 15,
      gstRate: 12,
      drugSchedule: 'OTC',
    });

    db.saveInvoice({
      id: 'existing_inv_1',
      invoiceNumber: 'INV-2025-0089',
      invoiceDate: '2025-11-20T10:00:00Z',
      customerName: 'G. Murugan',
      grandTotal: 420.0,
      paymentMethod: 'UPI',
      status: 'COMPLETED',
      items: [],
    });

    // Close and re-open to trigger database migration logic
    db.close();
    const migratedDb = initDatabase(dbPath);

    // Verify existing inventory and sales records are completely intact
    const rawProds = migratedDb.db.prepare('SELECT * FROM products WHERE id = ?').get('existing_prod_1');
    expect(rawProds).toBeDefined();
    expect(rawProds.name).toBe('Dolo 650 Tablets');

    const rawInvs = migratedDb.db.prepare('SELECT * FROM invoices WHERE id = ?').get('existing_inv_1');
    expect(rawInvs).toBeDefined();
    expect(rawInvs.invoiceNumber || rawInvs.invoice_number).toBe('INV-2025-0089');
    expect(rawInvs.grandTotal ?? rawInvs.grand_total).toBe(420.0);

    // Verify legacy user profile was safely migrated into pharmacy_accounts
    const accounts = migratedDb.db.prepare('SELECT * FROM pharmacy_accounts').all();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0].name).toContain('Jeeva Pharmacy');
    expect(accounts[0].dlNumber || accounts[0].dl_number).toBe('TN/TPR/20B/84920');

    migratedDb.close();
  });

  it('8. Regression test: opening a legacy database missing pharmacyId column does not throw error and creates indexes safely', () => {
    // Create an isolated legacy SQLite database directly with node:sqlite (without pharmacyId)
    const legacyDbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jeeva-legacy-col-test-'));
    const legacyDbFile = path.join(legacyDbDir, 'legacy_v1.db');
    const { DatabaseSync } = require('node:sqlite');
    const directDb = new DatabaseSync(legacyDbFile);

    // Old v1 schema before multi-tenant pharmacyId
    directDb.exec(`
      CREATE TABLE products (
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

      CREATE TABLE invoices (
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

      INSERT INTO products VALUES (
        'legacy_p1', 'Calpol 500mg', 'Paracetamol', 'GSK', '300490', '8901234567890',
        10, 'OTC', 20, 12, 'Rack A-1', 1, '2025-01-01', '2025-01-01'
      );
    `);
    directDb.close();

    // Now initialize with PharmacyDatabase: this must NOT throw 'no such column: pharmacyId'
    let initializedLegacyDb: any;
    expect(() => {
      initializedLegacyDb = initDatabase(legacyDbFile);
    }).not.toThrow();

    expect(initializedLegacyDb).toBeDefined();

    // Verify products table has pharmacyId added now
    const cols = initializedLegacyDb.db.prepare('PRAGMA table_info(products)').all();
    const hasPharmacyId = cols.some((c: any) => c.name === 'pharmacyId');
    expect(hasPharmacyId).toBe(true);

    // Verify legacy product was preserved
    const p1 = initializedLegacyDb.db.prepare('SELECT * FROM products WHERE id = ?').get('legacy_p1');
    expect(p1).toBeDefined();
    expect(p1.name).toBe('Calpol 500mg');

    initializedLegacyDb.close();
    try {
      fs.rmSync(legacyDbDir, { recursive: true, force: true });
    } catch {}
  });

  it('8. POS invoice creation: atomically decrements batch stock, persists stock audit logs, and safely restores backups', () => {
    const onboarding = db.setupInitialPharmacy({
      pharmacy: {
        name: 'Jeeva Test Store',
        dlNumber: 'DL-TN-TEST-01',
        gstin: '33TEST000000Z1',
      },
      adminUser: {
        username: 'testadmin',
        fullName: 'Test Admin',
        password: 'ValidPassword123!',
      },
    });
    expect(onboarding.success).toBe(true);
    const pharmacyId = onboarding.pharmacy.id;

    // 1. Add product and batch
    db.saveProduct({
      id: 'prod_101',
      pharmacyId,
      name: 'Amoxicillin 500mg',
      genericComposition: 'Amoxicillin',
      manufacturer: 'Cipla',
      hsnCode: '300410',
      barcode: 'BAR-AMOX-101',
      stripSize: 10,
      drugSchedule: 'SCHEDULE_H1',
      reorderLevelUnits: 20,
      defaultGstRate: 12,
      rackLocation: 'RACK-B1',
      isActive: true,
    });

    db.saveBatch({
      id: 'batch_101',
      productId: 'prod_101',
      batchNumber: 'AMX-001',
      expiryDate: '2028-12-31',
      manufacturingDate: '2024-01-01',
      costPricePerStrip: 50,
      mrpPerStrip: 90,
      sellingPricePerStrip: 85,
      gstRate: 12,
      totalTablets: 100,
    });

    // 2. Create invoice with audit log
    const auditEntry = {
      id: 'audit_sale_1',
      pharmacyId,
      timestamp: new Date().toISOString(),
      formattedTimestamp: '25 Oct 2026, 03:00 pm',
      productId: 'prod_101',
      productName: 'Amoxicillin 500mg',
      genericComposition: 'Amoxicillin',
      batchId: 'batch_101',
      batchNumber: 'AMX-001',
      expiryDate: '2028-12-31',
      drugSchedule: 'SCHEDULE_H1',
      adjustmentType: 'SALE_DEDUCTION',
      quantityChangeTablets: -20,
      formattedChange: '-2 Strips (-20 Tabs)',
      previousStockTablets: 100,
      newStockTablets: 80,
      formattedPreviousStock: '10 Strips',
      formattedNewStock: '8 Strips',
      referenceNumber: 'JP/2026-27/0001',
      operatorName: 'Test Admin',
      operatorRole: 'ADMIN',
      reason: 'POS Bill #JP/2026-27/0001',
      rackLocation: 'RACK-B1',
    };

    const invoice = {
      id: 'inv_101',
      pharmacyId,
      invoiceNumber: 'JP/2026-27/0001',
      invoiceDate: new Date().toISOString(),
      isInterState: false,
      prescription: { patientName: 'Ravi Kumar', doctorRegNumber: 'TN-MED-9988' },
      items: [
        {
          cartItemId: 'item_1',
          product: { id: 'prod_101', name: 'Amoxicillin 500mg' },
          batch: { id: 'batch_101', batchNumber: 'AMX-001' },
          unitType: 'STRIP',
          quantity: 2,
          totalTabletsSold: 20,
          unitPrice: 85,
          gstRate: 12,
        },
      ],
      subtotal: 151.78,
      totalCgst: 9.11,
      totalSgst: 9.11,
      totalIgst: 0,
      totalTax: 18.22,
      roundOff: 0,
      grandTotal: 170,
      paymentMethod: 'UPI',
      status: 'PAID',
      cashierName: 'Test Admin',
      taxSlabBreakdowns: [],
    };

    const res = db.createInvoice(invoice, [auditEntry]);
    expect(res.success).toBe(true);

    // Verify batch stock decremented from 100 to 80
    const allData = db.getAllData(pharmacyId);
    const updatedBatch = allData.batches.find((b: any) => b.id === 'batch_101');
    expect(updatedBatch.totalTablets).toBe(80);

    // Verify stock audit log persisted to SQLite
    expect(allData.stockAuditLogs.length).toBe(1);
    expect(allData.stockAuditLogs[0].id).toBe('audit_sale_1');
    expect(allData.stockAuditLogs[0].adjustmentType).toBe('SALE_DEDUCTION');
    expect(allData.stockAuditLogs[0].quantityChangeTablets).toBe(-20);

    // Test parameterized backup restore
    const backupData = {
      products: allData.products,
      batches: allData.batches,
      vendors: allData.vendors,
      invoices: allData.invoices,
      stockAuditLogs: allData.stockAuditLogs,
      dpdpLogs: [
        {
          id: 'dpdp_1',
          timestamp: '15:00',
          patientPhoneMasked: 'XXXXXX1234',
          action: 'DISPENSED',
          operatorName: 'Test Admin',
          purpose: 'Testing',
        },
      ],
    };

    const restoreRes = db.restoreBackup(backupData, pharmacyId);
    expect(restoreRes.success).toBe(true);

    const postRestoreData = db.getAllData(pharmacyId);
    expect(postRestoreData.products.length).toBe(1);
    expect(postRestoreData.stockAuditLogs.length).toBe(1);
    expect(postRestoreData.dpdpLogs.length).toBe(1);
  });
});

