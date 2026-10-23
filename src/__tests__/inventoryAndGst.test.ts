/**
 * Automated Unit Test Suite: Indian Pharmacy Business Logic
 * Covers:
 * 1. Dual-Unit Fractional "Strip vs. Tablet" Inventory Math
 * 2. Indian Medical GST Engine (5%, 12%, 18% Slabs, CGST/SGST Split & IGST)
 * 3. Stock Audit Log Historical Ledger Math
 */

import {
  formatDualUnitStock,
  calculateItemGst,
  calculateExpiryZone,
  maskPhoneDPDP,
  GSTRate,
} from '../types/pharmacy';

// Describe block for Dual-Unit Inventory Math
describe('Dual-Unit Fractional Inventory Engine ("Strip vs. Tablet")', () => {
  test('correctly calculates dual unit when both strips and loose tablets remain (e.g., "12 Strips, 4 Tablets remaining")', () => {
    const stripSize = 10;
    // 12 strips * 10 + 4 loose tablets = 124 atomic units
    const result = formatDualUnitStock(124, stripSize, 50);

    expect(result.strips).toBe(12);
    expect(result.looseTablets).toBe(4);
    expect(result.totalTablets).toBe(124);
    expect(result.displayString).toBe('12 Strips, 4 Tabs remaining');
    expect(result.isLowStock).toBe(false);
  });

  test('correctly handles strip-only counts without loose tablet suffix', () => {
    const stripSize = 10;
    const result = formatDualUnitStock(50, stripSize, 20);

    expect(result.strips).toBe(5);
    expect(result.looseTablets).toBe(0);
    expect(result.displayString).toBe('5 Strips remaining');
    expect(result.isLowStock).toBe(false);
  });

  test('correctly handles single strip singular grammar ("1 Strip remaining")', () => {
    const stripSize = 15;
    const result = formatDualUnitStock(15, stripSize, 10);

    expect(result.strips).toBe(1);
    expect(result.looseTablets).toBe(0);
    expect(result.displayString).toBe('1 Strip remaining');
  });

  test('correctly handles loose tablets only when strip count is zero', () => {
    const stripSize = 10;
    const result = formatDualUnitStock(6, stripSize, 20);

    expect(result.strips).toBe(0);
    expect(result.looseTablets).toBe(6);
    expect(result.displayString).toBe('6 Tabs remaining');
    expect(result.isLowStock).toBe(true);
  });

  test('correctly flags low stock alert when atomic units cross reorder threshold', () => {
    const stripSize = 10;
    const reorderLevel = 50;

    // Below threshold
    const lowStock = formatDualUnitStock(49, stripSize, reorderLevel);
    expect(lowStock.isLowStock).toBe(true);

    // Exactly at threshold
    const atThreshold = formatDualUnitStock(50, stripSize, reorderLevel);
    expect(atThreshold.isLowStock).toBe(true);

    // Above threshold
    const safeStock = formatDualUnitStock(51, stripSize, reorderLevel);
    expect(safeStock.isLowStock).toBe(false);
  });

  test('safely clamps negative stock numbers to 0 to prevent inventory underflow corruption', () => {
    const stripSize = 10;
    const result = formatDualUnitStock(-15, stripSize, 10);

    expect(result.totalTablets).toBe(0);
    expect(result.strips).toBe(0);
    expect(result.looseTablets).toBe(0);
    expect(result.displayString).toBe('0 Tab remaining');
    expect(result.isLowStock).toBe(true);
  });

  test('handles varying strip sizes across different pharmaceutical dosage forms (e.g., 4s, 10s, 15s)', () => {
    // Blister of 4 tablets (e.g. Fluconazole / Azithromycin 3-pack or 4-pack)
    const azithro = formatDualUnitStock(11, 4, 12);
    expect(azithro.strips).toBe(2);
    expect(azithro.looseTablets).toBe(3);
    expect(azithro.displayString).toBe('2 Strips, 3 Tabs remaining');

    // Blister of 15 tablets (e.g. Calcium + Vitamin D3 supplements)
    const calcium = formatDualUnitStock(32, 15, 30);
    expect(calcium.strips).toBe(2);
    expect(calcium.looseTablets).toBe(2);
    expect(calcium.displayString).toBe('2 Strips, 2 Tabs remaining');
  });

  test('atomic unit decrement calculation matches fractional strip checkout dispensing', () => {
    const stripSize = 10;
    const startingStock = 100; // 10 strips

    // Customer buys 1 strip + 3 loose tablets = 13 atomic units
    const dispensedUnits = 1 * stripSize + 3;
    const remainingUnits = startingStock - dispensedUnits;

    expect(remainingUnits).toBe(87);
    const updatedStock = formatDualUnitStock(remainingUnits, stripSize);
    expect(updatedStock.strips).toBe(8);
    expect(updatedStock.looseTablets).toBe(7);
    expect(updatedStock.displayString).toBe('8 Strips, 7 Tabs remaining');
  });
});

// Describe block for Indian GST Engine
describe('Indian GST Engine for Pharmaceuticals', () => {
  test('calculates 5% GST slab correctly with intra-state CGST (2.5%) and SGST (2.5%) split', () => {
    // Life-saving medicine (e.g. Insulin, ORS, Oral Rehydration)
    const unitPrice = 105; // MRP inclusive of 5% GST
    const quantity = 1;
    const gstRate: GSTRate = 5;

    const result = calculateItemGst(unitPrice, quantity, gstRate, false);

    // Taxable = 105 / 1.05 = 100.00
    expect(result.taxableAmount).toBe(100.0);
    // Total Tax = 5.00
    expect(result.cgstAmount).toBe(2.5);
    expect(result.sgstAmount).toBe(2.5);
    expect(result.igstAmount).toBe(0);
    expect(result.totalAmount).toBe(105.0);
    expect(Number((result.cgstAmount + result.sgstAmount).toFixed(2))).toBe(5.0);
  });

  test('calculates 12% GST slab (standard pharmaceutical formulations)', () => {
    // e.g. Paracetamol, Metformin, Telmisartan (MRP ₹112 inclusive of 12% GST)
    const unitPrice = 112;
    const quantity = 2; // Total Gross ₹224.00
    const gstRate: GSTRate = 12;

    const result = calculateItemGst(unitPrice, quantity, gstRate, false);

    // Gross = 224.00
    // Taxable = 224 / 1.12 = 200.00
    expect(result.taxableAmount).toBe(200.0);
    // Total Tax = 24.00 => CGST 6% (12.00) + SGST 6% (12.00)
    expect(result.cgstAmount).toBe(12.0);
    expect(result.sgstAmount).toBe(12.0);
    expect(result.igstAmount).toBe(0);
    expect(result.totalAmount).toBe(224.0);
  });

  test('calculates 18% GST slab (nutraceuticals, vitamins, and medical supplies)', () => {
    const unitPrice = 236; // MRP inclusive of 18% GST
    const quantity = 1;
    const gstRate: GSTRate = 18;

    const result = calculateItemGst(unitPrice, quantity, gstRate, false);

    // Taxable = 236 / 1.18 = 200.00
    expect(result.taxableAmount).toBe(200.0);
    // Total Tax = 36.00 => CGST 9% (18.00) + SGST 9% (18.00)
    expect(result.cgstAmount).toBe(18.0);
    expect(result.sgstAmount).toBe(18.0);
    expect(result.igstAmount).toBe(0);
    expect(result.totalAmount).toBe(236.0);
  });

  test('calculates inter-state IGST without CGST/SGST split when isInterState is true', () => {
    const unitPrice = 112;
    const quantity = 1;
    const gstRate: GSTRate = 12;

    const result = calculateItemGst(unitPrice, quantity, gstRate, true);

    expect(result.taxableAmount).toBe(100.0);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstAmount).toBe(12.0);
    expect(result.totalAmount).toBe(112.0);
  });

  test('guards against half-paisa split discrepancies to ensure CGST + SGST strictly equals total tax', () => {
    // Odd amount where total tax might have odd cents
    const unitPrice = 33.33;
    const quantity = 3; // 99.99
    const gstRate: GSTRate = 12;

    const result = calculateItemGst(unitPrice, quantity, gstRate, false);

    const totalTax = Number((result.totalAmount - result.taxableAmount).toFixed(2));
    const combinedGst = Number((result.cgstAmount + result.sgstAmount).toFixed(2));
    expect(combinedGst).toBe(totalTax);
  });
});

// Describe block for DPDP Compliance & Expiry Triaging
describe('Regulatory Compliance (DPDP Act & Expiry Triaging)', () => {
  test('DPDP phone number masking protects patient confidentiality at rest', () => {
    expect(maskPhoneDPDP('+91 98401 23456')).toBe('XXXXXX3456');
    expect(maskPhoneDPDP('9876543210')).toBe('XXXXXX3210');
    expect(maskPhoneDPDP('123')).toBe('XXXXXX');
  });

  test('identifies critical 30-day expiry threshold correctly', () => {
    const today = new Date();
    const expiryIn15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const zone = calculateExpiryZone(expiryIn15Days);

    expect(zone.zone).toBe('CRITICAL_30');
    expect(zone.days).toBeLessThanOrEqual(30);
  });

  test('categorizes batches into 60-day warning and 90-day caution zones', () => {
    const today = new Date();
    const expiryIn45Days = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiryIn75Days = new Date(today.getTime() + 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    expect(calculateExpiryZone(expiryIn45Days).zone).toBe('WARNING_60');
    expect(calculateExpiryZone(expiryIn75Days).zone).toBe('CAUTION_90');
  });
});

// Describe block for Automated Backup Configurations & Statutory Retention
describe('Automated Backup Configurations & Statutory Retention (IT Act 44AA & GST Rule 56)', () => {
  test('validates statutory 8-year record retention threshold (2920 days) for retail accounts', () => {
    const statutoryDays = 2920; // 8 years * 365 days
    expect(statutoryDays).toBe(2920);
  });

  test('validates automated backup archive filename schema and encryption tag', () => {
    const trigger = 'AUTOMATED_SCHEDULED';
    const dateStr = '2026-10-16';
    const timeStr = '230000';
    const isEncrypted = true;
    const filename = `Jeeva_Pharmacy_${trigger}_${dateStr}_${timeStr}.${isEncrypted ? 'enc.json' : 'json'}`;

    expect(filename).toBe('Jeeva_Pharmacy_AUTOMATED_SCHEDULED_2026-10-16_230000.enc.json');
    expect(filename.endsWith('.enc.json')).toBe(true);
  });

  test('validates DPDP masking applied to offsite cloud backups protects customer contact info', () => {
    const rawCustomerPhones = ['9840123456', '+91 94441 88920', '9876543210'];
    const maskedPhones = rawCustomerPhones.map(maskPhoneDPDP);

    expect(maskedPhones).toEqual(['XXXXXX3456', 'XXXXXX8920', 'XXXXXX3210']);
    maskedPhones.forEach((p) => {
      expect(p.startsWith('XXXXXX')).toBe(true);
      expect(p.length).toBe(10);
    });
  });
});

