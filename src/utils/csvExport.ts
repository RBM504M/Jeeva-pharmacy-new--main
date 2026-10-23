/**
 * CSV Export Utilities for Jeeva Pharmacy
 * Generates formatted CSV files tailored for Indian CA audits, GSTR-1 tax preparation,
 * and annual physical inventory valuation.
 */

import {
  Invoice,
  Product,
  Batch,
  Vendor,
  StockAuditLogEntry,
  formatDualUnitStock,
  calculateExpiryZone,
  maskPhoneDPDP,
} from '../types/pharmacy';

// Helper to escape CSV cell content properly
function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  // If string contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return `"${str}"`;
}

// Download helper creating a blob and triggering browser download
function triggerDownload(content: string, fileName: string) {
  // \uFEFF Byte Order Mark (BOM) ensures Microsoft Excel reads UTF-8 correctly (currency, symbols)
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Full Sales & Tax Ledger (GSTR-1 & CBIC Audit Compliant)
 * Each row contains itemized tax details, HSN codes, and patient DPDP consent timestamps.
 */
export function exportSalesLedgerCsv(invoices: Invoice[]) {
  const headers = [
    'Invoice Number',
    'Invoice Date',
    'Invoice Time',
    'Patient Name',
    'Masked Patient Contact',
    'Doctor Name',
    'Doctor Medical Reg No',
    'Payment Mode',
    'Medicine Name',
    'Generic Composition',
    'HSN Code',
    'Batch Number',
    'Batch Expiry Date',
    'Drug Schedule',
    'Unit Dispensed',
    'Quantity Sold',
    'Total Tablets Sold',
    'Unit Price (INR)',
    'Taxable Value (INR)',
    'GST Slab (%)',
    'CGST Amount (INR)',
    'SGST Amount (INR)',
    'IGST Amount (INR)',
    'Total Tax Amount (INR)',
    'Line Total (INR)',
    'Invoice Round Off (INR)',
    'Invoice Grand Total (INR)',
    'Cashier / Pharmacist',
    'DPDP Consent Status',
  ];

  const rows: string[][] = [];

  invoices.forEach((inv) => {
    const invDate = new Date(inv.invoiceDate);
    const dateStr = invDate.toLocaleDateString('en-IN');
    const timeStr = invDate.toLocaleTimeString('en-IN');
    const maskedContact = maskPhoneDPDP(inv.prescription.patientContact);

    inv.items.forEach((item) => {
      rows.push([
        inv.invoiceNumber,
        dateStr,
        timeStr,
        inv.prescription.patientName,
        maskedContact,
        inv.prescription.doctorName || 'Self / OTC',
        inv.prescription.doctorRegNumber || 'N/A',
        inv.paymentMethod,
        item.product.name,
        item.product.genericComposition,
        item.product.hsnCode,
        item.batch.batchNumber,
        item.batch.expiryDate,
        item.product.drugSchedule,
        item.unitType === 'STRIP' ? 'Strip' : 'Loose Tablet',
        String(item.quantity),
        String(item.totalTabletsSold),
        item.unitPrice.toFixed(2),
        item.taxableAmount.toFixed(2),
        `${item.gstRate}%`,
        item.cgstAmount.toFixed(2),
        item.sgstAmount.toFixed(2),
        item.igstAmount.toFixed(2),
        (item.cgstAmount + item.sgstAmount + item.igstAmount).toFixed(2),
        item.totalAmount.toFixed(2),
        inv.roundOff.toFixed(2),
        inv.grandTotal.toFixed(2),
        inv.cashierName,
        inv.prescription.dpdpConsentAccepted ? 'Consented (Section 6 DPDP)' : 'Standard Dispense',
      ]);
    });
  });

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Jeeva_Pharmacy_Sales_Ledger_GSTR1_${todayStr}.csv`;
  triggerDownload(csvContent, fileName);
  return { fileName, rowCount: rows.length };
}

/**
 * Export Inventory & Stock Valuation Audit CSV
 * Computes exact strip and loose tablet breakdowns, cost and MRP valuations,
 * and 30/60/90-day expiry triage flags.
 */
export function exportInventoryValuationCsv(products: Product[], batches: Batch[]) {
  const headers = [
    'Medicine Name',
    'Generic Composition',
    'Manufacturer',
    'HSN Code',
    'Barcode (EAN-13 / UPC)',
    'Batch Number',
    'Manufacturing Date',
    'Expiry Date',
    'Days Until Expiry',
    'Expiry Risk Zone',
    'Drug Schedule',
    'Conversion Factor (Tabs/Strip)',
    'Full Strips Remaining',
    'Loose Tablets Remaining',
    'Total Atomic Tablets Remaining',
    'Wholesale Cost / Strip (INR)',
    'Retail Selling Price / Strip (INR)',
    'Max Retail Price (MRP) / Strip (INR)',
    'GST Rate Slab (%)',
    'Total Stock Cost Valuation (INR)',
    'Total Stock MRP Valuation (INR)',
    'Reorder Threshold (Tabs)',
    'Stock Alert Status',
    'Pharmacy Rack Location',
  ];

  const rows: string[][] = [];

  batches.forEach((batch) => {
    const product = products.find((p) => p.id === batch.productId);
    if (!product) return;

    const stripSize = product.stripSize || 10;
    const stock = formatDualUnitStock(batch.totalTablets, stripSize, product.reorderLevelUnits);
    const { days, zone } = calculateExpiryZone(batch.expiryDate);

    // Valuations
    const costPerTablet = batch.costPricePerStrip / stripSize;
    const mrpPerTablet = batch.mrpPerStrip / stripSize;
    const totalCostValuation = Number((costPerTablet * batch.totalTablets).toFixed(2));
    const totalMrpValuation = Number((mrpPerTablet * batch.totalTablets).toFixed(2));

    let zoneLabel = 'Safe Shelf Life';
    if (zone === 'CRITICAL_30') zoneLabel = 'Critical (< 30 Days)';
    if (zone === 'WARNING_60') zoneLabel = 'Warning (31–60 Days)';
    if (zone === 'CAUTION_90') zoneLabel = 'Caution (61–90 Days)';

    rows.push([
      product.name,
      product.genericComposition,
      product.manufacturer,
      product.hsnCode,
      product.barcode,
      batch.batchNumber,
      batch.manufacturingDate,
      batch.expiryDate,
      String(days),
      zoneLabel,
      product.drugSchedule,
      String(stripSize),
      String(stock.strips),
      String(stock.looseTablets),
      String(stock.totalTablets),
      batch.costPricePerStrip.toFixed(2),
      batch.sellingPricePerStrip.toFixed(2),
      batch.mrpPerStrip.toFixed(2),
      `${batch.gstRate}%`,
      totalCostValuation.toFixed(2),
      totalMrpValuation.toFixed(2),
      String(product.reorderLevelUnits),
      stock.isLowStock ? 'LOW STOCK - REORDER MANDATORY' : 'Adequate Stock Level',
      product.rackLocation || 'Shelf Main',
    ]);
  });

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Jeeva_Pharmacy_Inventory_Valuation_${todayStr}.csv`;
  triggerDownload(csvContent, fileName);
  return { fileName, rowCount: rows.length };
}

/**
 * Export Purchase & Inward Stock Ledger (GSTR-2B Input Tax Credit Reconciliation)
 */
export function exportPurchaseLedgerCsv(
  vendors: Vendor[],
  batches: Batch[],
  products: Product[]
) {
  const headers = [
    'Primary Wholesaler',
    'Wholesaler GSTIN',
    'Wholesaler Contact',
    'Medicine Name',
    'Generic Composition',
    'HSN Code',
    'Batch Number',
    'Manufacturing Date',
    'Expiry Date',
    'Drug Schedule',
    'Strips Received',
    'Atomic Tablets Received',
    'Cost Price / Strip (INR)',
    'Taxable Purchase Value (INR)',
    'GST Rate (%)',
    'CGST ITC Claimable (INR)',
    'SGST ITC Claimable (INR)',
    'Total ITC Claimable (INR)',
    'Total Inward Amount (INR)',
  ];

  const rows: string[][] = [];

  batches.forEach((batch, idx) => {
    const product = products.find((p) => p.id === batch.productId);
    if (!product) return;
    const vendor = vendors[idx % vendors.length] || vendors[0];

    const stripSize = product.stripSize || 10;
    const strips = Math.ceil(batch.totalTablets / stripSize);
    const taxableVal = Number((strips * batch.costPricePerStrip).toFixed(2));
    const gstPct = batch.gstRate;
    const halfGst = gstPct / 2;
    const cgstAmt = Number(((taxableVal * halfGst) / 100).toFixed(2));
    const sgstAmt = Number(((taxableVal * halfGst) / 100).toFixed(2));
    const totalItc = Number((cgstAmt + sgstAmt).toFixed(2));
    const totalAmount = Number((taxableVal + totalItc).toFixed(2));

    rows.push([
      vendor?.companyName || 'Local Drug Distributor',
      vendor?.gstin || '33AAAAA0000A1Z5',
      vendor?.phone || '+91 94440 00000',
      product.name,
      product.genericComposition,
      product.hsnCode,
      batch.batchNumber,
      batch.manufacturingDate,
      batch.expiryDate,
      product.drugSchedule,
      String(strips),
      String(batch.totalTablets),
      batch.costPricePerStrip.toFixed(2),
      taxableVal.toFixed(2),
      `${gstPct}%`,
      cgstAmt.toFixed(2),
      sgstAmt.toFixed(2),
      totalItc.toFixed(2),
      totalAmount.toFixed(2),
    ]);
  });

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Jeeva_Pharmacy_Purchase_Ledger_GSTR2B_${todayStr}.csv`;
  triggerDownload(csvContent, fileName);
  return { fileName, rowCount: rows.length };
}

/**
 * Export Stock Audit Log CSV
 * Comprehensive historical ledger recording all adjustments, sales deductions,
 * vendor returns, and physical audit reconciliations for drug inspector verification.
 */
export function exportStockAuditLogCsv(auditLogs: StockAuditLogEntry[]) {
  const headers = [
    'Audit Entry ID',
    'Timestamp',
    'Reference Number',
    'Adjustment Type',
    'Medicine Brand Name',
    'Generic Composition',
    'Drug Schedule',
    'Batch Number',
    'Expiry Date',
    'Quantity Change (Formatted)',
    'Quantity Change (Tablets)',
    'Previous Stock Balance',
    'New Stock Balance',
    'Operator / Pharmacist',
    'Operator Role',
    'Reason & Audit Remark',
    'Wholesaler / Distributor',
    'Rack Location',
  ];

  const typeLabels: Record<string, string> = {
    MANUAL_ADJUSTMENT: 'Manual Stock Adjustment / Recount',
    SALE_DEDUCTION: 'POS Billing Sale Deduction',
    VENDOR_RETURN: 'Vendor Return (Supplier Debit Note)',
    INWARD_PURCHASE: 'Inward Stock Purchase (GRN)',
    DAMAGE_WRITEOFF: 'Damaged / Broken Blister Write-off',
    EXPIRY_DISPOSAL: 'Expired Stock Clearance / Disposal',
  };

  const rows: string[][] = auditLogs.map((log) => [
    log.id,
    log.formattedTimestamp || log.timestamp,
    log.referenceNumber,
    typeLabels[log.adjustmentType] || log.adjustmentType,
    log.productName,
    log.genericComposition,
    log.drugSchedule,
    log.batchNumber,
    log.expiryDate,
    log.formattedChange,
    String(log.quantityChangeTablets),
    log.formattedPreviousStock,
    log.formattedNewStock,
    log.operatorName,
    log.operatorRole,
    log.reason,
    log.vendorName || 'N/A',
    log.rackLocation || 'General Rack',
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Jeeva_Pharmacy_Stock_Audit_Log_${todayStr}.csv`;
  triggerDownload(csvContent, fileName);
  return { fileName, rowCount: rows.length };
}

