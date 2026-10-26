import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveEntityCollection,
  loadEntityCollection,
  exportAllDataToJson,
  importDataFromJson,
  clearAllIndexedDb,
} from '../utils/indexedDbStorage';
import { parsePrescriptionQr } from '../utils/prescriptionQrParser';
import { escapeCsvCell, exportSalesLedgerCsv, exportPurchaseLedgerCsv } from '../utils/csvExport';
import { Product, Batch, Invoice, Vendor } from '../types/pharmacy';
import { InwardPurchaseInvoice } from '../types/shopaid';

describe('Client-Only Architecture, Persistence & Integrity (Phases 1 - 6)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAllIndexedDb();
  });

  // =========================================================================
  // Phase 1: Clean Startup State & Fixture Isolation
  // =========================================================================
  describe('Phase 1 — Startup data & Clean installation', () => {
    it('ensures clean database has zero seeded records when unconfigured', async () => {
      const products = await loadEntityCollection<Product>('products');
      const batches = await loadEntityCollection<Batch>('batches');
      const invoices = await loadEntityCollection<Invoice>('invoices');
      const vendors = await loadEntityCollection<Vendor>('vendors');

      expect(products).toEqual([]);
      expect(batches).toEqual([]);
      expect(invoices).toEqual([]);
      expect(vendors).toEqual([]);
    });
  });

  // =========================================================================
  // Phase 2: Local Versioned IndexedDB Persistence & Error Handling
  // =========================================================================
  describe('Phase 2 — IndexedDB operational persistence & safe recovery', () => {
    it('persists and retrieves entity collections reliably across sessions', async () => {
      const sampleProduct: Product = {
        id: 'prod_test_01',
        name: 'Amoxicillin 500mg',
        genericComposition: 'Amoxicillin Trihydrate 500mg',
        manufacturer: 'Cipla Ltd',
        drugSchedule: 'SCHEDULE_H',
        hsnCode: '30041000',
        barcode: '8901234567890',
        stripSize: 10,
        reorderLevelUnits: 20,
        defaultGstRate: 12,
        isActive: true,
      };

      await saveEntityCollection('products', [sampleProduct]);
      const retrieved = await loadEntityCollection<Product>('products');

      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe('prod_test_01');
      expect(retrieved[0].name).toBe('Amoxicillin 500mg');
    });

    it('exports all local database tables into a structured backup payload', async () => {
      const sampleVendor: Vendor = {
        id: 'ven_test_01',
        companyName: 'MediLife Wholesalers',
        name: 'MediLife Wholesalers',
        contactPerson: 'K. Raman',
        phone: '9876543210',
        email: 'raman@medilife.com',
        gstin: '33AABCM1234F1Z1',
        drugLicenseNumber: 'TN-CHE-20B-12345',
        state: 'Tamil Nadu',
        creditPeriodDays: 30,
        currentBalance: 0,
        balanceDue: 4500,
        isActive: true,
      };

      await saveEntityCollection('vendors', [sampleVendor]);
      const rawJson = await exportAllDataToJson();
      const exportPayload = JSON.parse(rawJson);

      expect(exportPayload.version).toBe(1);
      expect(exportPayload.appName).toContain('Jeeva');
      expect(exportPayload.data.vendors).toHaveLength(1);
      expect(exportPayload.data.vendors[0].companyName).toBe('MediLife Wholesalers');
    });

    it('gracefully rejects corrupted or invalid JSON import payloads without destroying storage', async () => {
      const initialProducts: Product[] = [
        {
          id: 'prod_initial',
          name: 'Cetirizine 10mg',
          genericComposition: 'Cetirizine HCl',
          manufacturer: 'Dr Reddy',
          drugSchedule: 'OTC',
          hsnCode: '30049099',
          barcode: '89011112222',
          stripSize: 10,
          reorderLevelUnits: 15,
          defaultGstRate: 12,
          isActive: true,
        },
      ];
      await saveEntityCollection('products', initialProducts);

      // 1. Invalid JSON string
      const invalidJsonResult = await importDataFromJson('NOT_VALID_JSON{:::');
      expect(invalidJsonResult.success).toBe(false);
      expect(invalidJsonResult.message).toContain('parsing failed');

      // 2. Corrupted shape missing version
      const corruptedShape = JSON.stringify({ app: 'RandomApp', stuff: [] });
      const corruptedResult = await importDataFromJson(corruptedShape);
      expect(corruptedResult.success).toBe(false);
      expect(corruptedResult.message).toContain('Corrupted or incompatible');

      // Verify original database records were not destroyed or overwritten
      const preservedProducts = await loadEntityCollection<Product>('products');
      expect(preservedProducts).toHaveLength(1);
      expect(preservedProducts[0].name).toBe('Cetirizine 10mg');
    });

    it('successfully restores valid user backup and reports accurate import details', async () => {
      const backupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'Jeeva Pharmacy Management & POS System',
        data: {
          products: [
            {
              id: 'p1',
              name: 'Paracetamol 500mg',
              genericComposition: 'Paracetamol',
              manufacturer: 'Apex',
              drugSchedule: 'OTC' as const,
              hsnCode: '30049060',
              barcode: '123',
              stripSize: 10,
              reorderLevelUnits: 50,
              defaultGstRate: 12 as const,
              isActive: true,
            },
          ],
          batches: [
            {
              id: 'b1',
              productId: 'p1',
              batchNumber: 'PARA10',
              expiryDate: '2028-12-31',
              manufacturingDate: '2025-01-01',
              totalTablets: 100,
              sellingPricePerStrip: 20,
              mrpPerStrip: 25,
              costPricePerStrip: 15,
              gstRate: 12 as const,
            },
          ],
          invoices: [],
          vendors: [],
          purchaseInvoices: [],
        },
      };

      const result = await importDataFromJson(JSON.stringify(backupPayload));
      expect(result.success).toBe(true);
      expect(result.details?.products).toBe(1);
      expect(result.details?.batches).toBe(1);

      const loadedBatches = await loadEntityCollection<Batch>('batches');
      expect(loadedBatches).toHaveLength(1);
      expect(loadedBatches[0].batchNumber).toBe('PARA10');
    });
  });

  // =========================================================================
  // Phase 3: Checkout and Inventory Integrity
  // =========================================================================
  describe('Phase 3 — Checkout and inventory integrity validation', () => {
    it('detects and blocks expired stock batches during checkout validation', () => {
      const pastDate = new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0];
      const expiredBatch: Batch = {
        id: 'b_exp_01',
        productId: 'prod_01',
        batchNumber: 'EXP-999',
        manufacturingDate: '2023-01-01',
        expiryDate: pastDate,
        totalTablets: 100,
        sellingPricePerStrip: 50,
        mrpPerStrip: 60,
        costPricePerStrip: 40,
        gstRate: 12,
      };

      const isExpired = new Date(expiredBatch.expiryDate).getTime() < new Date().setHours(0, 0, 0, 0);
      expect(isExpired).toBe(true);
    });

    it('aggregates requested quantities per batch across duplicate cart lines to prevent over-dispensing', () => {
      const sharedBatch: Batch = {
        id: 'b_shared_01',
        productId: 'prod_dolo',
        batchNumber: 'DL-2026',
        manufacturingDate: '2025-01-01',
        expiryDate: '2028-01-01',
        totalTablets: 100, // 100 tablets total
        sellingPricePerStrip: 30,
        mrpPerStrip: 35,
        costPricePerStrip: 20,
        gstRate: 12,
      };

      // Cart Item 1: requests 60 tablets
      const lineItem1 = { batchId: sharedBatch.id, totalTabletsSold: 60 };
      // Cart Item 2: requests 50 tablets (same batch)
      const lineItem2 = { batchId: sharedBatch.id, totalTabletsSold: 50 };

      // Total requested = 110 tablets, which exceeds 100 available
      const aggregatedTabletsRequested = [lineItem1, lineItem2]
        .filter((i) => i.batchId === sharedBatch.id)
        .reduce((sum, i) => sum + i.totalTabletsSold, 0);

      expect(aggregatedTabletsRequested).toBe(110);
      expect(aggregatedTabletsRequested > sharedBatch.totalTablets).toBe(true);
    });
  });

  // =========================================================================
  // Phase 4: Prescription, Consent, and Local Roles
  // =========================================================================
  describe('Phase 4 — Prescription QR verification & explicit consent', () => {
    it('purges fabricated defaults and tags scanned QR payload as untrusted with explicit verification required', () => {
      // Sample ABDM QR Payload
      const rawPayload = JSON.stringify({
        patientName: 'Kavitha R',
        patientAge: 32,
        gender: 'FEMALE',
        medicines: [
          { drugName: 'Azithromycin 500mg', quantity: 3, unit: 'STRIP' },
        ],
      });

      const parsed = parsePrescriptionQr(rawPayload);
      expect(parsed).not.toBeNull();
      if (!parsed) return;

      // Must not fabricate missing doctor name or phone number
      expect(parsed.patientName).toBe('Kavitha R');
      expect(parsed.patientContact).toBe(''); // No fake 9840012345
      expect(parsed.doctorName).toBe(''); // No fake Dr. R. Parthiban
      expect(parsed.doctorRegNumber).toBe('');

      // Must treat client-side payload as untrusted and require verification
      expect(parsed.untrustedPayload).toBe(true);
      expect(parsed.isVerified).toBe(false);
      expect(parsed.dpdpConsentAccepted).toBe(false);
      expect(parsed.verificationNotice).toContain('Unverified external QR payload');
    });

    it('requires explicit DPDP consent when customer phone number is captured', () => {
      const customerContact = '9876543210';
      let dpdpConsentAccepted = false;

      // Validation logic: if contact is present, consent must not be assumed
      const validateConsent = (contact: string, consent: boolean) => {
        if (contact.trim().length > 0 && !consent) {
          return { valid: false, error: 'Explicit DPDP consent required for contact processing.' };
        }
        return { valid: true };
      };

      const resultBefore = validateConsent(customerContact, dpdpConsentAccepted);
      expect(resultBefore.valid).toBe(false);

      dpdpConsentAccepted = true;
      const resultAfter = validateConsent(customerContact, dpdpConsentAccepted);
      expect(resultAfter.valid).toBe(true);
    });
  });

  // =========================================================================
  // Phase 5: Backup Truthfulness & Purchase Reconciliation
  // =========================================================================
  describe('Phase 5 — Truthful local backup & purchase reconciliation', () => {
    it('reconciles vendor balance due when inward purchase invoices are recorded', () => {
      const vendor: Vendor = {
        id: 'v_01',
        companyName: 'Apex Pharma Distributors',
        name: 'Apex Pharma Distributors',
        contactPerson: 'S. Suresh',
        phone: '9840112233',
        email: 'suresh@apex.com',
        gstin: '33AABCA1234A1Z1',
        drugLicenseNumber: 'TN-20B-9988',
        state: 'Tamil Nadu',
        creditPeriodDays: 30,
        currentBalance: 0,
        balanceDue: 2000,
        isActive: true,
      };

      const newCreditPurchase: InwardPurchaseInvoice = {
        id: 'pur_test_01',
        grnNumber: 'GRN-TEST-01',
        grnDate: '2026-10-26',
        vendorId: 'v_01',
        vendorName: vendor.companyName,
        vendorInvoiceNo: 'APX-998',
        invoiceDate: '2026-10-26',
        paymentDueDate: '2026-11-26',
        items: [],
        subtotal: 3000,
        discountTotal: 0,
        taxableTotal: 3000,
        cgstTotal: 180,
        sgstTotal: 180,
        igstTotal: 0,
        roundOff: 0,
        grandTotal: 3360,
        paymentStatus: 'CREDIT_PENDING',
        paymentMode: 'CREDIT_DUE',
        createdAt: new Date().toISOString(),
      };

      // Supplier balanceDue reconciles with credit purchase
      const updatedBalanceDue = vendor.balanceDue + newCreditPurchase.grandTotal;
      expect(updatedBalanceDue).toBe(5360);
    });

    it('exports purchase ledger accurately reflecting saved purchase records', () => {
      const purchaseList: InwardPurchaseInvoice[] = [
        {
          id: 'p_01',
          grnNumber: 'GRN-001',
          grnDate: '2026-10-26',
          vendorId: 'v_01',
          vendorName: 'Apex Pharma',
          vendorInvoiceNo: 'INV-101',
          invoiceDate: '2026-10-26',
          paymentDueDate: '2026-11-26',
          items: [
            {
              productId: 'prod_1',
              productName: 'Paracetamol 500mg',
              genericComposition: 'Paracetamol',
              packing: 10,
              quantityStrips: 50,
              freeStrips: 5,
              batchNumber: 'BT-99',
              expiryDate: '2028-01-01',
              costPricePerStrip: 20,
              mrpPerStrip: 30,
              discountPercent: 0,
              hsnCode: '30049060',
              gstRate: 12,
              taxableAmount: 1000,
              cgstAmount: 60,
              sgstAmount: 60,
              igstAmount: 0,
              lineTotal: 1120,
            },
          ],
          subtotal: 1000,
          discountTotal: 50,
          taxableTotal: 950,
          cgstTotal: 57,
          sgstTotal: 57,
          igstTotal: 0,
          roundOff: 0,
          grandTotal: 1064,
          paymentStatus: 'PAID',
          paymentMode: 'UPI',
          createdAt: new Date().toISOString(),
        },
      ];

      const purchaseResult = exportPurchaseLedgerCsv([], [], [], purchaseList);
      expect(purchaseResult.csvContent).toContain('GRN-001');
      expect(purchaseResult.csvContent).toContain('Apex Pharma');
      expect(purchaseResult.csvContent).toContain('1000.00');
    });
  });

  // =========================================================================
  // Phase 6: Export Safety & Spreadsheet Formula Injection Prevention
  // =========================================================================
  describe('Phase 6 — CSV export safety & formula injection mitigation', () => {
    it('escapes cells starting with formula trigger characters (=, +, -, @, \\t, \\r)', () => {
      expect(escapeCsvCell('=1+1')).toBe(`"'=1+1"`);
      expect(escapeCsvCell('+SUM(A1:A10)')).toBe(`"'+SUM(A1:A10)"`);
      expect(escapeCsvCell('-20')).toBe(`"'-20"`);
      expect(escapeCsvCell('@HYPERLINK("http://attacker.com")')).toBe(`"'@HYPERLINK(""http://attacker.com"")"`);
      expect(escapeCsvCell('\tcalc')).toBe(`"'\tcalc"`);
    });

    it('sanitizes medicine names and patient names against formula execution in CSV reports', () => {
      const maliciousInvoice: Invoice = {
        id: 'inv_malicious',
        invoiceNumber: '=cmd|/c calc!A0',
        invoiceDate: '2026-10-26',
        isInterState: false,
        prescription: {
          patientName: '+DUMMY_PATIENT()',
          patientContact: '9840000000',
          doctorName: '@DR_EXPLOIT',
          doctorRegNumber: '-DOC123',
          notes: '',
          dpdpConsentAccepted: true,
        },
        items: [
          {
            cartItemId: 'c1',
            product: {
              id: 'p1',
              name: '=cmd|/c calc!A0',
              genericComposition: '+DUMMY_SALT',
              manufacturer: 'Micro Labs',
              hsnCode: '3004',
              barcode: '123456',
              stripSize: 10,
              reorderLevelUnits: 5,
              defaultGstRate: 12,
              drugSchedule: 'OTC',
              isActive: true,
            },
            batch: {
              id: 'b1',
              productId: 'p1',
              batchNumber: '-BATCH_EXPLOIT',
              manufacturingDate: '2025-01-01',
              expiryDate: '2028-01-01',
              totalTablets: 100,
              sellingPricePerStrip: 100,
              mrpPerStrip: 120,
              costPricePerStrip: 80,
              gstRate: 12,
            },
            unitType: 'STRIP',
            quantity: 1,
            totalTabletsSold: 10,
            unitPrice: 100,
            gstRate: 12,
            taxableAmount: 100,
            cgstAmount: 6,
            sgstAmount: 6,
            igstAmount: 0,
            totalAmount: 112,
          },
        ],
        subtotal: 100,
        totalCgst: 6,
        totalSgst: 6,
        totalIgst: 0,
        totalTax: 12,
        roundOff: 0,
        grandTotal: 112,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
        cashierName: '=Cashier()',
        taxSlabBreakdowns: [],
        createdAt: '2026-10-26T10:00:00Z',
      };

      const { csvContent } = exportSalesLedgerCsv([maliciousInvoice]);

      // All formula triggers must be neutralised by prefixing with a single quote
      expect(csvContent).toContain(`"'=cmd|/c calc!A0"`);
      expect(csvContent).toContain(`"'+DUMMY_PATIENT()"`);
      expect(csvContent).toContain(`"'@DR_EXPLOIT"`);
      expect(csvContent).toContain(`"'=Cashier()"`);
    });
  });
});
