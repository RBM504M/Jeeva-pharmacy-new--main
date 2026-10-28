import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
const { PharmacyDatabase } = require('../../electron/database.cjs');
const {
  PERMISSION_MATRIX,
  assertPermission,
  assertAuthenticated,
} = require('../../electron/main.cjs');

describe('Phases 4, 5, 6, 7 Hardening: Statutory Registers, DPDP, Encrypted Backup/Restore & Multi-Tenant Isolation', () => {
  let db: any;
  let tempDbPath: string;

  const PHARMACY_A = 'pharmacy_alpha';
  const PHARMACY_B = 'pharmacy_beta';

  const ADMIN_USER_A = {
    id: 'usr_admin_a',
    username: 'admin_alpha',
    fullName: 'Dr. Alpha Administrator',
    role: 'ADMIN',
    pharmacyId: PHARMACY_A,
  };

  const PHARMACIST_USER_A = {
    id: 'usr_pharm_a',
    username: 'pharmacist_alpha',
    fullName: 'Pharm. Alpha Dispenser',
    role: 'PHARMACIST',
    pharmacyId: PHARMACY_A,
  };

  const CASHIER_USER_A = {
    id: 'usr_cashier_a',
    username: 'cashier_alpha',
    fullName: 'Cashier Alpha',
    role: 'CASHIER',
    pharmacyId: PHARMACY_A,
  };

  beforeEach(() => {
    tempDbPath = path.join(os.tmpdir(), `test_jeeva_phase47_${Date.now()}_${Math.random().toString(36).substring(2)}.db`);
    db = new PharmacyDatabase(tempDbPath);

    // Setup Pharmacy A & B accounts
    db.savePharmacyAccount({
      id: PHARMACY_A,
      name: 'Alpha Care Pharmacy',
      dlNumber: 'DL-TN-01-ALPHA',
      gstin: '33AAAAA0000A1Z5',
      address: '10 Mount Road, Chennai',
      state: 'Tamil Nadu',
      pincode: '600002',
    });

    db.savePharmacyAccount({
      id: PHARMACY_B,
      name: 'Beta Lifecare Pharmacy',
      dlNumber: 'DL-TN-02-BETA',
      gstin: '33BBBBB0000B1Z6',
      address: '25 Gandhi Street, Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  });

  // =========================================================================
  // Phase 4: Statutory Compliance & Drug Schedule Registers (Schedule H, H1, X) & DPDP
  // =========================================================================
  describe('Phase 4: Statutory Compliance & Drug Schedule Registers (Rule 65 & DPDP Act 2023)', () => {
    beforeEach(() => {
      // Seed products of different schedules for Pharmacy A
      db.saveProduct({
        id: 'prod_sched_h',
        pharmacyId: PHARMACY_A,
        name: 'Amoxicillin & Clavulanate 625mg',
        genericComposition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
        manufacturer: 'Cipla Ltd',
        hsnCode: '30041010',
        barcode: '890123450001',
        stripSize: 10,
        drugSchedule: 'SCHEDULE_H',
        defaultGstRate: 12,
      });

      db.saveBatch({
        id: 'b_sched_h',
        productId: 'prod_sched_h',
        batchNumber: 'AMX-2026-01',
        expiryDate: '2027-12-31',
        manufacturingDate: '2026-01-01',
        costPricePerStrip: 90,
        mrpPerStrip: 150,
        sellingPricePerStrip: 140,
        gstRate: 12,
        totalTablets: 500,
      });

      db.saveProduct({
        id: 'prod_sched_h1',
        pharmacyId: PHARMACY_A,
        name: 'Alprazolam 0.5mg Tablets',
        genericComposition: 'Alprazolam IP 0.5mg',
        manufacturer: 'Torrent Pharma',
        hsnCode: '30049099',
        barcode: '890123450002',
        stripSize: 15,
        drugSchedule: 'SCHEDULE_H1',
        defaultGstRate: 12,
      });

      db.saveBatch({
        id: 'b_sched_h1',
        productId: 'prod_sched_h1',
        batchNumber: 'ALP-9021',
        expiryDate: '2028-06-30',
        manufacturingDate: '2026-02-01',
        costPricePerStrip: 30,
        mrpPerStrip: 65,
        sellingPricePerStrip: 60,
        gstRate: 12,
        totalTablets: 300,
      });

      db.saveProduct({
        id: 'prod_sched_x',
        pharmacyId: PHARMACY_A,
        name: 'Methylphenidate 10mg Tablets',
        genericComposition: 'Methylphenidate Hydrochloride IP 10mg',
        manufacturer: 'Novartis Healthcare',
        hsnCode: '30049099',
        barcode: '890123450003',
        stripSize: 10,
        drugSchedule: 'SCHEDULE_X',
        defaultGstRate: 12,
      });

      db.saveBatch({
        id: 'b_sched_x',
        productId: 'prod_sched_x',
        batchNumber: 'MPH-X-77',
        expiryDate: '2027-09-30',
        manufacturingDate: '2025-10-01',
        costPricePerStrip: 120,
        mrpPerStrip: 220,
        sellingPricePerStrip: 210,
        gstRate: 12,
        totalTablets: 100,
      });

      db.saveProduct({
        id: 'prod_otc',
        pharmacyId: PHARMACY_A,
        name: 'Paracetamol 500mg',
        genericComposition: 'Paracetamol IP 500mg',
        manufacturer: 'Apex Labs',
        hsnCode: '30049060',
        barcode: '890123450004',
        stripSize: 10,
        drugSchedule: 'OTC',
        defaultGstRate: 12,
      });

      db.saveBatch({
        id: 'b_otc',
        productId: 'prod_otc',
        batchNumber: 'PCM-001',
        expiryDate: '2028-12-31',
        manufacturingDate: '2026-01-01',
        costPricePerStrip: 10,
        mrpPerStrip: 20,
        sellingPricePerStrip: 18,
        gstRate: 12,
        totalTablets: 1000,
      });

      // Create invoices with various schedules
      // 1. Schedule H sale
      db.createInvoice({
        id: 'inv_stat_01',
        invoiceNumber: 'INV-A-001',
        invoiceDate: '2026-10-25T10:30:00.000Z',
        items: [
          {
            cartItemId: 'item_1',
            productId: 'prod_sched_h',
            productName: 'Amoxicillin & Clavulanate 625mg',
            batchId: 'b_sched_h',
            batchNumber: 'AMX-2026-01',
            quantity: 2,
            unitType: 'STRIP',
            unitPrice: 140,
            mrp: 150,
            totalAmount: 280,
          },
        ],
        prescription: {
          patientName: 'Ramesh Sundaram',
          patientContact: '+91 98401 23456',
          patientAddress: '14 Anna Salai, Chennai',
          doctorName: 'Dr. V. Kalyanam, MD',
          doctorRegNumber: 'TNMC-44582',
        },
        grandTotal: 280,
        paymentMethod: 'CASH',
        cashierName: 'Pharm. Alpha',
      }, [], PHARMACY_A, PHARMACIST_USER_A);

      // 2. Schedule H1 sale
      db.createInvoice({
        id: 'inv_stat_02',
        invoiceNumber: 'INV-A-002',
        invoiceDate: '2026-10-26T14:15:00.000Z',
        items: [
          {
            cartItemId: 'item_2',
            productId: 'prod_sched_h1',
            productName: 'Alprazolam 0.5mg Tablets',
            batchId: 'b_sched_h1',
            batchNumber: 'ALP-9021',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 60,
            mrp: 65,
            totalAmount: 60,
          },
        ],
        prescription: {
          patientName: 'Priya Narayanan',
          patientContact: '9884011223',
          patientAddress: 'Flat 3B, Lakeview Apts, Nungambakkam',
          doctorName: 'Dr. S. Sundaresan, DPM',
          doctorRegNumber: 'TNMC-21890',
        },
        grandTotal: 60,
        paymentMethod: 'UPI',
        cashierName: 'Pharm. Alpha',
      }, [], PHARMACY_A, PHARMACIST_USER_A);

      // 3. Schedule X sale
      db.createInvoice({
        id: 'inv_stat_03',
        invoiceNumber: 'INV-A-003',
        invoiceDate: '2026-10-27T16:00:00.000Z',
        items: [
          {
            cartItemId: 'item_3',
            productId: 'prod_sched_x',
            productName: 'Methylphenidate 10mg Tablets',
            batchId: 'b_sched_x',
            batchNumber: 'MPH-X-77',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 210,
            mrp: 220,
            totalAmount: 210,
          },
        ],
        prescription: {
          patientName: 'Anand Chandrasekar',
          patientContact: '9444123456',
          patientAddress: 'No. 8 Cathedral Road, Chennai',
          doctorName: 'Dr. M. Srinivasan, MD Psychiatry',
          doctorRegNumber: 'TNMC-11005',
        },
        grandTotal: 210,
        paymentMethod: 'CARD',
        cashierName: 'Pharm. Alpha',
      }, [], PHARMACY_A, PHARMACIST_USER_A);

      // 4. OTC sale
      db.createInvoice({
        id: 'inv_stat_04',
        invoiceNumber: 'INV-A-004',
        invoiceDate: '2026-10-28T11:00:00.000Z',
        items: [
          {
            cartItemId: 'item_4',
            productId: 'prod_otc',
            productName: 'Paracetamol 500mg',
            batchId: 'b_otc',
            batchNumber: 'PCM-001',
            quantity: 2,
            unitType: 'STRIP',
            unitPrice: 18,
            mrp: 20,
            totalAmount: 36,
          },
        ],
        prescription: {
          patientName: 'Walk-in Customer',
          patientContact: '',
        },
        grandTotal: 36,
        paymentMethod: 'CASH',
        cashierName: 'Cashier Alpha',
      }, [], PHARMACY_A, CASHIER_USER_A);
    });

    it('1. Authoritative Schedule H register query returns Rule 65 compliant statutory records', () => {
      const result = db.getScheduleRegister({
        drugSchedule: 'SCHEDULE_H',
        pharmacyId: PHARMACY_A,
      });

      expect(result.totalCount).toBe(1);
      const entry = result.rows[0];
      expect(entry.invoiceNumber).toBe('INV-A-001');
      expect(entry.drugName).toBe('Amoxicillin & Clavulanate 625mg');
      expect(entry.genericComposition).toBe('Amoxicillin 500mg + Clavulanic Acid 125mg');
      expect(entry.schedule).toBe('SCHEDULE_H');
      expect(entry.batchNumber).toBe('AMX-2026-01');
      expect(entry.expiryDate).toBe('2027-12-31');
      expect(entry.manufacturer).toBe('Cipla Ltd');
      expect(entry.doctorName).toBe('Dr. V. Kalyanam, MD');
      expect(entry.doctorRegNo).toBe('TNMC-44582');
      expect(entry.patientName).toBe('Ramesh Sundaram');
      expect(entry.patientAddress).toBe('14 Anna Salai, Chennai');
      // DPDP masking applied to customer contact
      expect(entry.patientContactMasked).toBe('XXXXXX3456');
    });

    it('2. Schedule H1 and Schedule X registers strictly isolate statutory formulations', () => {
      // Schedule H1
      const h1Result = db.getScheduleRegister({
        drugSchedule: 'SCHEDULE_H1',
        pharmacyId: PHARMACY_A,
      });
      expect(h1Result.totalCount).toBe(1);
      expect(h1Result.rows[0].drugName).toBe('Alprazolam 0.5mg Tablets');
      expect(h1Result.rows[0].doctorRegNo).toBe('TNMC-21890');
      expect(h1Result.rows[0].patientContactMasked).toBe('XXXXXX1223');

      // Schedule X
      const xResult = db.getScheduleRegister({
        drugSchedule: 'SCHEDULE_X',
        pharmacyId: PHARMACY_A,
      });
      expect(xResult.totalCount).toBe(1);
      expect(xResult.rows[0].drugName).toBe('Methylphenidate 10mg Tablets');
      expect(xResult.rows[0].doctorRegNo).toBe('TNMC-11005');
      expect(xResult.rows[0].patientContactMasked).toBe('XXXXXX3456');
    });

    it('3. Schedule register ALL includes H, H1, X and strictly excludes OTC items', () => {
      const allResult = db.getScheduleRegister({
        drugSchedule: 'ALL',
        pharmacyId: PHARMACY_A,
      });

      expect(allResult.totalCount).toBe(3);
      const names = allResult.rows.map((r: any) => r.drugName);
      expect(names).toContain('Amoxicillin & Clavulanate 625mg');
      expect(names).toContain('Alprazolam 0.5mg Tablets');
      expect(names).toContain('Methylphenidate 10mg Tablets');
      expect(names).not.toContain('Paracetamol 500mg'); // OTC excluded
    });

    it('4. Cancelled invoices are automatically excluded from statutory inspection registers', () => {
      // Cancel invoice 1
      const cancelRes = db.cancelInvoice('inv_stat_01', 'Dispensing error', [], PHARMACY_A, ADMIN_USER_A);
      expect(cancelRes.success).toBe(true);

      const hResult = db.getScheduleRegister({
        drugSchedule: 'SCHEDULE_H',
        pharmacyId: PHARMACY_A,
      });
      expect(hResult.totalCount).toBe(0);
    });

    it('5. DPDP Act 2023 audit logging and log retrieval', () => {
      const logRes = db.logDpdp({
        pharmacyId: PHARMACY_A,
        patientPhoneMasked: '+91 98401 99999',
        action: 'CONSENT_GRANTED',
        operatorName: 'Dr. Alpha Administrator',
        purpose: 'Customer opted-in for SMS bill dispatch under Section 6 DPDP',
      });

      expect(logRes.success).toBe(true);
      expect(logRes.patientPhoneMasked).toBe('XXXXXX9999');

      const logs = db.getDpdpLogs(PHARMACY_A);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      const match = logs.find((l: any) => l.id === logRes.id);
      expect(match).toBeDefined();
      expect(match.patientPhoneMasked).toBe('XXXXXX9999');
      expect(match.action).toBe('CONSENT_GRANTED');
      expect(match.operatorName).toBe('Dr. Alpha Administrator');
    });

    it('6. Statutory CSV export neutralizes OWASP spreadsheet formula injection', () => {
      // Create an invoice with potential formula injection in doctor reg / name
      db.createInvoice({
        id: 'inv_malicious_csv',
        invoiceNumber: 'INV-A-005',
        invoiceDate: '2026-10-28T12:00:00.000Z',
        items: [
          {
            cartItemId: 'item_inj',
            productId: 'prod_sched_h',
            productName: 'Amoxicillin & Clavulanate 625mg',
            batchId: 'b_sched_h',
            batchNumber: 'AMX-2026-01',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 140,
            mrp: 150,
            totalAmount: 140,
          },
        ],
        prescription: {
          patientName: '=cmd|/c calc!A0',
          patientContact: '+91 99999 00000',
          patientAddress: '@SUM(1+1)',
          doctorName: '+Dr. Formula',
          doctorRegNumber: '-TNMC-9999',
        },
        grandTotal: 140,
        paymentMethod: 'CASH',
        cashierName: 'Pharm. Alpha',
      }, [], PHARMACY_A, PHARMACIST_USER_A);

      const csv = db.exportScheduleRegisterCsv({
        drugSchedule: 'SCHEDULE_H',
        pharmacyId: PHARMACY_A,
      });

      expect(typeof csv).toBe('string');
      // Formula characters must be neutralized with leading single-quote
      expect(csv).toContain("\"'=cmd|/c calc!A0\"");
      expect(csv).toContain("\"'@SUM(1+1)\"");
      expect(csv).toContain("\"'+Dr. Formula\"");
      expect(csv).toContain("\"'-TNMC-9999\"");
    });
  });

  // =========================================================================
  // Phase 5: Automated & Manual Encrypted Backup / Restore with Tamper Evidence
  // =========================================================================
  describe('Phase 5: Automated & Manual Encrypted Backup / Restore with Tamper Evidence', () => {
    const BACKUP_PASSPHRASE = 'SecureSuperKey@2026#JeevaPharmacy!';

    it('1. createEncryptedBackup creates valid JEEVA_ENCRYPTED_BACKUP_V1 envelope with AES-256-GCM', () => {
      const res = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE, 'Monthly statutory backup');
      expect(res.success).toBe(true);
      expect(res.envelope).toBeDefined();

      const { envelope } = res;
      expect(envelope.format).toBe('JEEVA_ENCRYPTED_BACKUP_V1');
      expect(envelope.version).toBe(1);
      expect(envelope.algorithm).toBe('aes-256-gcm');
      expect(envelope.pharmacyId).toBe(PHARMACY_A);
      expect(envelope.salt).toBeDefined();
      expect(envelope.iv).toBeDefined();
      expect(envelope.authTag).toBeDefined();
      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.sha256Checksum).toBe(res.sha256Checksum);
      expect(envelope.metadata).toBeDefined();
      expect(envelope.metadata.recordCounts).toBeDefined();

      // Check snapshot logged in SQLite backup_snapshots table
      const snapshots = db.getBackupSnapshots(PHARMACY_A);
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
      const snap = snapshots.find((s: any) => s.id === res.snapshotId);
      expect(snap).toBeDefined();
      expect(snap.triggerType).toBe('MANUAL_ENCRYPTED');
      expect(snap.isEncrypted).toBe(true);
    });

    it('2. Tamper-evidence: Corrupting ciphertext aborts restore with SHA-256 mismatch', () => {
      const backupRes = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE);
      const tamperedEnvelope = JSON.parse(JSON.stringify(backupRes.envelope));

      // Flip characters in ciphertext
      tamperedEnvelope.ciphertext = 'ff' + tamperedEnvelope.ciphertext.slice(2);

      const restoreRes = db.restoreEncryptedBackup(tamperedEnvelope, BACKUP_PASSPHRASE, PHARMACY_A);
      expect(restoreRes.success).toBe(false);
      expect(restoreRes.error).toMatch(/Tamper detected: SHA-256 checksum mismatch/i);
    });

    it('3. Tamper-evidence: Tampering with ciphertext AND SHA-256 triggers AES-GCM tag mismatch', () => {
      const backupRes = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE);
      const tamperedEnvelope = JSON.parse(JSON.stringify(backupRes.envelope));

      // Invert first byte to guarantee alteration
      const firstByte = tamperedEnvelope.ciphertext.slice(0, 2);
      const newFirst = firstByte === 'aa' ? 'bb' : 'aa';
      tamperedEnvelope.ciphertext = newFirst + tamperedEnvelope.ciphertext.slice(2);
      tamperedEnvelope.sha256Checksum = crypto.createHash('sha256').update(Buffer.from(tamperedEnvelope.ciphertext, 'hex')).digest('hex');

      const restoreRes = db.restoreEncryptedBackup(tamperedEnvelope, BACKUP_PASSPHRASE, PHARMACY_A);
      expect(restoreRes.success).toBe(false);
      expect(restoreRes.error).toMatch(/Decryption failed/i);
    });

    it('4. Incorrect decryption password aborts restore cleanly with authentication failure', () => {
      const backupRes = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE);
      const restoreRes = db.restoreEncryptedBackup(backupRes.envelope, 'WrongPassword123!', PHARMACY_A);
      expect(restoreRes.success).toBe(false);
      expect(restoreRes.error).toMatch(/Decryption failed/i);
    });

    it('5. Pre-restore safety snapshot is automatically captured in backup_snapshots table before restore', () => {
      // Ensure initial records exist
      db.saveProduct({
        id: 'prod_pre_restore',
        pharmacyId: PHARMACY_A,
        name: 'Pre-Restore Product',
        genericComposition: 'Pre-Restore Salt',
        manufacturer: 'Safety Labs',
        hsnCode: '30041000',
        barcode: '111222333',
      });

      const backupRes = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE);
      expect(backupRes.success).toBe(true);

      const restoreRes = db.restoreEncryptedBackup(backupRes.envelope, BACKUP_PASSPHRASE, PHARMACY_A);
      expect(restoreRes.success).toBe(true);

      const snapshots = db.getBackupSnapshots(PHARMACY_A);
      const safetySnap = snapshots.find((s: any) => s.triggerType === 'PRE_RESTORE_SAFETY');
      expect(safetySnap).toBeDefined();
      expect(safetySnap.notes).toMatch(/safety snapshot/i);

      const appliedSnap = snapshots.find((s: any) => s.triggerType === 'RESTORE_APPLIED');
      expect(appliedSnap).toBeDefined();
    });

    it('6. Full round-trip encrypted backup and restore preserves all entities and relations', () => {
      // Add product
      db.saveProduct({
        id: 'prod_sched_h',
        pharmacyId: PHARMACY_A,
        name: 'Amoxicillin & Clavulanate 625mg',
        genericComposition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
        manufacturer: 'Cipla Ltd',
        hsnCode: '30041010',
        barcode: '890123450001',
      });

      // Add vendor and purchase receipt
      db.saveVendor({
        id: 'vend_alpha_1',
        pharmacyId: PHARMACY_A,
        companyName: 'Alpha Med Distributors',
        contactPerson: 'K. Rajan',
        phone: '9840011111',
        gstin: '33ABCDE1234F1Z5',
        drugLicenseNumber: 'DL-DIST-01',
        state: 'Tamil Nadu',
      });

      db.createPurchaseReceipt({
        id: 'pr_alpha_1',
        pharmacyId: PHARMACY_A,
        grnNumber: 'GRN-ALPHA-001',
        grnDate: '2026-10-20',
        vendorId: 'vend_alpha_1',
        vendorName: 'Alpha Med Distributors',
        vendorInvoiceNo: 'INV-DIST-999',
        invoiceDate: '2026-10-20',
        grandTotal: 5000,
        items: [
          {
            productId: 'prod_sched_h',
            productName: 'Amoxicillin & Clavulanate 625mg',
            batchNumber: 'AMX-NEW',
            expiryDate: '2028-12-31',
            quantityStrips: 50,
            costPricePerStrip: 90,
            mrpPerStrip: 150,
            lineTotal: 4500,
          },
        ],
      }, PHARMACY_A);

      // Create encrypted backup
      const backupRes = db.createEncryptedBackup(PHARMACY_A, BACKUP_PASSPHRASE);
      expect(backupRes.success).toBe(true);

      // Delete a product in database
      db.db.prepare('DELETE FROM products WHERE id = ?').run('prod_sched_h');
      expect(db.getProduct('prod_sched_h')).toBeNull();

      // Restore encrypted backup
      const restoreRes = db.restoreEncryptedBackup(backupRes.envelope, BACKUP_PASSPHRASE, PHARMACY_A);
      expect(restoreRes.success).toBe(true);

      // Verify restored product exists
      const restoredProd = db.getProduct('prod_sched_h');
      expect(restoredProd).toBeDefined();
      expect(restoredProd.name).toBe('Amoxicillin & Clavulanate 625mg');

      // Verify vendor and purchase receipts exist
      const allData = db.getAllData(PHARMACY_A);
      expect(allData.vendors.some((v: any) => v.id === 'vend_alpha_1')).toBe(true);
      expect(allData.purchaseReceipts.some((p: any) => p.id === 'pr_alpha_1')).toBe(true);
    });
  });

  // =========================================================================
  // Phase 6: Multi-Tenant Pharmacy Isolation & Session Security
  // =========================================================================
  describe('Phase 6: Multi-Tenant Pharmacy Isolation & Session Boundary Enforcement', () => {
    beforeEach(() => {
      // Pharmacy A product & invoice
      db.saveProduct({
        id: 'prod_tenant_a',
        pharmacyId: PHARMACY_A,
        name: 'Alpha Product',
        genericComposition: 'Alpha Salt',
        manufacturer: 'Alpha Pharma',
        hsnCode: '30041000',
        barcode: '1001',
      });

      db.saveBatch({
        id: 'batch_tenant_a',
        productId: 'prod_tenant_a',
        batchNumber: 'B-A-01',
        expiryDate: '2028-01-01',
        costPricePerStrip: 50,
        mrpPerStrip: 100,
        sellingPricePerStrip: 90,
        totalTablets: 200,
      });

      db.createInvoice({
        id: 'inv_tenant_a',
        invoiceNumber: 'INV-ALPHA-999',
        invoiceDate: '2026-10-28T10:00:00.000Z',
        items: [
          {
            cartItemId: 'item_ta_1',
            productId: 'prod_tenant_a',
            productName: 'Alpha Product',
            batchId: 'batch_tenant_a',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 90,
            mrp: 100,
            totalAmount: 90,
          },
        ],
        prescription: { patientName: 'Alpha Customer' },
        grandTotal: 90,
        paymentMethod: 'CASH',
      }, [], PHARMACY_A, ADMIN_USER_A);

      // Pharmacy B product & invoice
      db.saveProduct({
        id: 'prod_tenant_b',
        pharmacyId: PHARMACY_B,
        name: 'Beta Product',
        genericComposition: 'Beta Salt',
        manufacturer: 'Beta Pharma',
        hsnCode: '30042000',
        barcode: '2001',
      });

      db.saveBatch({
        id: 'batch_tenant_b',
        productId: 'prod_tenant_b',
        batchNumber: 'B-B-01',
        expiryDate: '2028-01-01',
        costPricePerStrip: 60,
        mrpPerStrip: 120,
        sellingPricePerStrip: 110,
        totalTablets: 300,
      });

      db.createInvoice({
        id: 'inv_tenant_b',
        invoiceNumber: 'INV-BETA-888',
        invoiceDate: '2026-10-28T11:00:00.000Z',
        items: [
          {
            cartItemId: 'item_tb_1',
            productId: 'prod_tenant_b',
            productName: 'Beta Product',
            batchId: 'batch_tenant_b',
            quantity: 1,
            unitType: 'STRIP',
            unitPrice: 110,
            mrp: 120,
            totalAmount: 110,
          },
        ],
        prescription: { patientName: 'Beta Customer' },
        grandTotal: 110,
        paymentMethod: 'UPI',
      }, [], PHARMACY_B, { id: 'usr_beta', username: 'admin_beta', role: 'ADMIN', pharmacyId: PHARMACY_B });
    });

    it('1. getAllData strictly isolates invoices, audit logs, DPDP logs, and receipts between tenants', () => {
      const dataA = db.getAllData(PHARMACY_A);
      const dataB = db.getAllData(PHARMACY_B);

      // Invoices isolation
      expect(dataA.invoices.some((i: any) => i.id === 'inv_tenant_a')).toBe(true);
      expect(dataA.invoices.some((i: any) => i.id === 'inv_tenant_b')).toBe(false);

      expect(dataB.invoices.some((i: any) => i.id === 'inv_tenant_b')).toBe(true);
      expect(dataB.invoices.some((i: any) => i.id === 'inv_tenant_a')).toBe(false);

      // Sales Returns isolation
      const returnsA = db.getAllSalesReturns(PHARMACY_A);
      const returnsB = db.getAllSalesReturns(PHARMACY_B);
      expect(returnsA.length).toBe(0);
      expect(returnsB.length).toBe(0);
    });

    it('2. Cross-tenant invoice cancellation is strictly blocked', () => {
      // Pharmacy B attempts to cancel Pharmacy A's invoice
      const res = db.cancelInvoice('inv_tenant_a', 'Malicious cancellation', [], PHARMACY_B, {
        fullName: 'Attacker',
        role: 'ADMIN',
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/belongs to another pharmacy/i);

      // Verify invoice in Pharmacy A remains COMPLETED
      const inv = db.getInvoice('inv_tenant_a');
      expect(inv.status).toBe('COMPLETED');
    });

    it('3. Cross-tenant sales return is strictly blocked', () => {
      // Pharmacy B attempts to process a sales return on Pharmacy A's invoice
      const res = db.postSalesReturn({
        invoiceId: 'inv_tenant_a',
        returnedItems: [{ cartItemId: 'item_ta_1', returnQuantity: 1 }],
      }, { fullName: 'Attacker' }, PHARMACY_B);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/belongs to another pharmacy/i);
    });

    it('4. Cross-tenant GRN cancellation and debit notes are strictly blocked', () => {
      // Save vendor for GRN
      db.saveVendor({
        id: 'v1',
        pharmacyId: PHARMACY_A,
        companyName: 'Vendor 1',
        contactPerson: 'Contact 1',
        phone: '1234567890',
        gstin: '33AAAAA1234A1Z1',
        drugLicenseNumber: 'DL-01',
        state: 'Tamil Nadu',
      });

      // Pharmacy A creates GRN
      const grnRes = db.createPurchaseReceipt({
        id: 'grn_isolated_a',
        pharmacyId: PHARMACY_A,
        grnNumber: 'GRN-A-100',
        grnDate: '2026-10-28',
        vendorId: 'v1',
        vendorName: 'Vendor 1',
        vendorInvoiceNo: 'INV-V-1',
        invoiceDate: '2026-10-28',
        grandTotal: 500,
        items: [
          {
            productId: 'prod_tenant_a',
            productName: 'Alpha Product',
            batchNumber: 'B-NEW-A',
            expiryDate: '2028-12-31',
            quantityStrips: 10,
            costPricePerStrip: 50,
            mrpPerStrip: 100,
            lineTotal: 500,
          },
        ],
      }, PHARMACY_A);
      expect(grnRes.success).toBe(true);

      // Pharmacy B attempts to cancel Pharmacy A's GRN
      const cancelRes = db.cancelGrn('grn_isolated_a', 'Cancel GRN', PHARMACY_B, { fullName: 'Attacker' });
      expect(cancelRes.success).toBe(false);
      expect(cancelRes.error).toMatch(/GRN not found/i);
    });

    it('5. IPC Permission Matrix blocks unauthorized roles from backup and statutory administrative operations', () => {
      const adminSession = { user: { role: 'ADMIN' }, pharmacy: { id: PHARMACY_A } };
      const pharmacistSession = { user: { role: 'PHARMACIST' }, pharmacy: { id: PHARMACY_A } };
      const cashierSession = { user: { role: 'CASHIER' }, pharmacy: { id: PHARMACY_A } };

      // Backup snapshots: ADMIN only
      expect(() => assertPermission('db:createEncryptedBackup', adminSession)).not.toThrow();
      expect(() => assertPermission('db:createEncryptedBackup', pharmacistSession)).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:createEncryptedBackup', cashierSession)).toThrow(/Unauthorized/);

      expect(() => assertPermission('db:restoreEncryptedBackup', adminSession)).not.toThrow();
      expect(() => assertPermission('db:restoreEncryptedBackup', pharmacistSession)).toThrow(/Unauthorized/);
      expect(() => assertPermission('db:restoreEncryptedBackup', cashierSession)).toThrow(/Unauthorized/);

      expect(() => assertPermission('db:getBackupSnapshots', adminSession)).not.toThrow();
      expect(() => assertPermission('db:getBackupSnapshots', cashierSession)).toThrow(/Unauthorized/);

      // Statutory Registers: ADMIN and PHARMACIST allowed; CASHIER blocked
      expect(() => assertPermission('db:getScheduleRegister', adminSession)).not.toThrow();
      expect(() => assertPermission('db:getScheduleRegister', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:getScheduleRegister', cashierSession)).toThrow(/Unauthorized/);

      expect(() => assertPermission('db:exportScheduleRegisterCsv', adminSession)).not.toThrow();
      expect(() => assertPermission('db:exportScheduleRegisterCsv', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:exportScheduleRegisterCsv', cashierSession)).toThrow(/Unauthorized/);

      // DPDP logs: ADMIN and PHARMACIST allowed; CASHIER blocked
      expect(() => assertPermission('db:getDpdpLogs', adminSession)).not.toThrow();
      expect(() => assertPermission('db:getDpdpLogs', pharmacistSession)).not.toThrow();
      expect(() => assertPermission('db:getDpdpLogs', cashierSession)).toThrow(/Unauthorized/);
    });

    it('6. assertAuthenticated rejects unauthenticated requests cleanly', () => {
      expect(() => assertAuthenticated(null)).toThrow(/authenticated session is required/i);
      expect(() => assertAuthenticated(undefined)).toThrow(/authenticated session is required/i);
      expect(() => assertAuthenticated({ user: null })).toThrow(/authenticated session is required/i);
    });
  });
});
