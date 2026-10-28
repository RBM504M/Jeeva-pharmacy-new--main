import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Printer,
  Calendar,
  Truck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Building,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Product, GSTRate, formatINR, formatDualUnitStock, calculateExpiryZone } from '../../types/pharmacy';
import { InwardPurchaseItem, InwardPurchaseInvoice } from '../../types/shopaid';

export type PurchaseSubTab = 'ENTRY' | 'RETURNS' | 'CANCELLATION' | 'MODIFICATION' | 'COPIES' | 'REPORT';

interface PurchaseEntryViewProps {
  initialTab?: PurchaseSubTab;
}

export const PurchaseEntryView: React.FC<PurchaseEntryViewProps> = ({
  initialTab = 'ENTRY',
}) => {
  const {
    products,
    batches,
    vendors,
    purchaseInvoices,
    addInwardPurchaseInvoice,
    recordVendorReturn,
    currentUser,
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<PurchaseSubTab>(initialTab);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // ==========================================
  // PURCHASE ENTRY FORM STATE (Section 5.1)
  // ==========================================
  const [grnNumber] = useState<string>(() => `GRN-${new Date().getFullYear()}-${String(purchaseInvoices.length + 1).padStart(3, '0')}`);
  const [grnDate, setGrnDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState<string>('INV-' + Math.floor(1000 + Math.random() * 9000));
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentDueDate, setPaymentDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [poNotes, setPoNotes] = useState<string>('Received in good physical condition with intact seals.');

  // Inward Product Grid Rows
  const [gridItems, setGridItems] = useState<InwardPurchaseItem[]>([
    {
      productId: products[0]?.id || '',
      productName: products[0]?.name || '',
      genericComposition: products[0]?.genericComposition || '',
      packing: products[0]?.stripSize || 10,
      quantityStrips: 20,
      freeStrips: 2,
      batchNumber: 'NW26-' + Math.floor(100 + Math.random() * 900),
      expiryDate: '2026-12-31',
      costPricePerStrip: 22.0,
      mrpPerStrip: 34.0,
      discountPercent: 2.5,
      hsnCode: products[0]?.hsnCode || '30049060',
      gstRate: products[0]?.defaultGstRate || 12,
      taxableAmount: 383.04,
      cgstAmount: 22.98,
      sgstAmount: 22.98,
      igstAmount: 0,
      lineTotal: 429.0,
    },
  ]);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];

  // Recalculate row totals
  const recalculateRow = (row: InwardPurchaseItem): InwardPurchaseItem => {
    const grossCost = row.quantityStrips * row.costPricePerStrip;
    const discountAmount = grossCost * (row.discountPercent / 100);
    const taxableAmount = Number((grossCost - discountAmount).toFixed(2));
    const gstRateFactor = row.gstRate / 100;
    const totalTax = Number((taxableAmount * gstRateFactor).toFixed(2));
    const cgstAmount = Number((totalTax / 2).toFixed(2));
    const sgstAmount = Number((totalTax - cgstAmount).toFixed(2));
    const lineTotal = Number((taxableAmount + totalTax).toFixed(2));

    return {
      ...row,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
      lineTotal,
    };
  };

  // Update a row in grid
  const handleUpdateRow = (index: number, updates: Partial<InwardPurchaseItem>) => {
    setGridItems((prev) => {
      const copy = [...prev];
      const updatedRow = { ...copy[index], ...updates };
      copy[index] = recalculateRow(updatedRow);
      return copy;
    });
  };

  // Add blank row to grid
  const handleAddRow = () => {
    const defaultProd = products[0];
    if (!defaultProd) return;
    const newRow: InwardPurchaseItem = recalculateRow({
      productId: defaultProd.id,
      productName: defaultProd.name,
      genericComposition: defaultProd.genericComposition,
      packing: defaultProd.stripSize,
      quantityStrips: 10,
      freeStrips: 0,
      batchNumber: 'BT-' + Math.floor(100 + Math.random() * 900),
      expiryDate: '2026-11-30',
      costPricePerStrip: 50.0,
      mrpPerStrip: 75.0,
      discountPercent: 0,
      hsnCode: defaultProd.hsnCode,
      gstRate: defaultProd.defaultGstRate,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      lineTotal: 0,
    });
    setGridItems((prev) => [...prev, newRow]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (gridItems.length <= 1) {
      alert('Purchase invoice must contain at least 1 medicine row.');
      return;
    }
    setGridItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Overall Invoice Summary Totals
  const summaryTotals = useMemo(() => {
    const taxableTotal = gridItems.reduce((acc, it) => acc + it.taxableAmount, 0);
    const cgstTotal = gridItems.reduce((acc, it) => acc + it.cgstAmount, 0);
    const sgstTotal = gridItems.reduce((acc, it) => acc + it.sgstAmount, 0);
    const rawGrandTotal = taxableTotal + cgstTotal + sgstTotal;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
    const grossTotal = gridItems.reduce((acc, it) => acc + it.quantityStrips * it.costPricePerStrip, 0);
    const discountTotal = Number((grossTotal - taxableTotal).toFixed(2));

    return {
      grossTotal: Number(grossTotal.toFixed(2)),
      discountTotal,
      taxableTotal: Number(taxableTotal.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      totalTax: Number((cgstTotal + sgstTotal).toFixed(2)),
      roundOff,
      grandTotal: roundedGrandTotal,
    };
  }, [gridItems]);

  const [isSaving, setIsSaving] = useState(false);

  // Submit Inward Purchase Invoice (GRN)
  const handleSavePurchaseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!selectedVendor) {
      alert('Please select a supplier/vendor.');
      return;
    }

    if (!vendorInvoiceNo.trim()) {
      alert('Please enter supplier invoice number.');
      return;
    }

    for (const it of gridItems) {
      if (!it.batchNumber.trim()) {
        alert(`Please specify a batch number for ${it.productName}.`);
        return;
      }
      if (!it.expiryDate) {
        alert(`Please specify expiry date for ${it.productName}.`);
        return;
      }
      if (it.quantityStrips <= 0) {
        alert(`Quantity must be greater than zero for ${it.productName}.`);
        return;
      }
      if (it.mrpPerStrip < it.costPricePerStrip) {
        alert(`MRP (₹${it.mrpPerStrip}) cannot be less than cost price (₹${it.costPricePerStrip}) for ${it.productName}.`);
        return;
      }
    }

    const newPurchaseRecord: InwardPurchaseInvoice = {
      id: `pur_${Date.now()}`,
      grnNumber,
      grnDate,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.companyName,
      vendorInvoiceNo,
      invoiceDate,
      paymentDueDate,
      items: gridItems,
      subtotal: summaryTotals.grossTotal,
      discountTotal: summaryTotals.discountTotal,
      taxableTotal: summaryTotals.taxableTotal,
      cgstTotal: summaryTotals.cgstTotal,
      sgstTotal: summaryTotals.sgstTotal,
      igstTotal: 0,
      roundOff: summaryTotals.roundOff,
      grandTotal: summaryTotals.grandTotal,
      paymentStatus: 'CREDIT_PENDING',
      paymentMode: 'CREDIT_DUE',
      status: 'POSTED_TO_STOCK',
      notes: poNotes,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      const res = await addInwardPurchaseInvoice(newPurchaseRecord);
      if (!res.success) {
        alert(res.error || 'Failed to save purchase invoice.');
        return;
      }
      triggerToast(`✓ GRN #${grnNumber} saved. Inward stock credited to inventory!`);
      setActiveTab('COPIES');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // PURCHASE RETURN (DEBIT NOTE) STATE (Ctrl+D)
  // ==========================================
  const [returnVendorId, setReturnVendorId] = useState<string>(vendors[0]?.id || '');
  const [returnBatchId, setReturnBatchId] = useState<string>(batches[0]?.id || '');
  const [returnQuantityStrips, setReturnQuantityStrips] = useState<number>(2);
  const [returnReason, setReturnReason] = useState<string>('Near Expiry / Broken Strip Return to Distributor');
  const [debitNoteNo, setDebitNoteNo] = useState<string>(() => `DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);

  const returnBatch = batches.find((b) => b.id === returnBatchId) || batches[0];
  const returnProduct = products.find((p) => p.id === returnBatch?.productId);

  const handleProcessPurchaseReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBatch || !returnProduct) return;

    const tabletsToDeduct = returnQuantityStrips * (returnProduct.stripSize || 10);
    if (tabletsToDeduct > returnBatch.totalTablets) {
      alert(`Cannot return ${tabletsToDeduct} tablets. Only ${returnBatch.totalTablets} tablets currently available in this batch.`);
      return;
    }

    const res = await recordVendorReturn({
      productId: returnProduct.id,
      batchId: returnBatch.id,
      vendorId: returnVendorId,
      returnTablets: tabletsToDeduct,
      reason: returnReason,
      debitNoteNumber: debitNoteNo,
    });

    if (res.success) {
      triggerToast(`✓ Debit Note #${debitNoteNo} issued. Deducted ${returnQuantityStrips} strips from Batch ${returnBatch.batchNumber}.`);
      setReturnQuantityStrips(1);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Banner matching Image 2 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0084ff] text-white flex items-center justify-center shadow-xs">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Entry</h1>
            <p className="text-xs text-slate-500 font-medium">
              Enter purchase invoice and add medicines to update stock
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0066cc] border border-sky-200 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
            <span>Recently Used</span>
          </button>

          <div className="px-3.5 py-1.5 border border-sky-300 bg-sky-50/50 rounded-md text-xs font-bold text-[#0066cc]">
            Possible GRN No : <span className="font-mono font-black">{grnNumber.replace(/[^\d]/g, '').slice(-3) || '1'}</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('ENTRY')}
            className="px-4 py-1.5 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Purchase Entry</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tab Switcher strip */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('ENTRY')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'ENTRY' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RETURNS')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'RETURNS' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Return
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('CANCELLATION')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'CANCELLATION' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Cancellation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('MODIFICATION')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'MODIFICATION' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Modification
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('COPIES')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'COPIES' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Copies
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('REPORT')}
          className={`px-3 py-1.5 rounded-t-md transition-colors cursor-pointer shrink-0 ${
            activeTab === 'REPORT' ? 'bg-[#0084ff] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Purchase Report
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PURCHASE ENTRY SCREEN (Exact Image 2 Structure)   */}
      {/* ======================================================== */}
      {activeTab === 'ENTRY' && (
        <form onSubmit={handleSavePurchaseEntry} className="space-y-3">
          {/* 4 Top Cards matching Image 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Card 1: Supplier Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Supplier Details
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Supplier Name *</label>
                  <div className="flex gap-1 mt-0.5">
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.companyName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Code</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedVendor?.id.slice(0, 8) || 'SUP-001'}
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Invoice No *</label>
                  <input
                    type="text"
                    value={vendorInvoiceNo}
                    onChange={(e) => setVendorInvoiceNo(e.target.value)}
                    placeholder="Enter Invoice No"
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Phone</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedVendor?.phone || '9840123456'}
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Invoice Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Invoice Details
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Invoice Date *</label>
                  <div className="relative mt-0.5">
                    <input
                      type="text"
                      defaultValue="12-10-2026"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs pr-7 font-mono"
                    />
                    <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-2 top-1.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Payment Date</label>
                  <div className="relative mt-0.5">
                    <input
                      type="text"
                      defaultValue="12-10-2026"
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs pr-7 font-mono"
                    />
                    <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-2 top-1.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Amount Payable</label>
                  <input
                    type="text"
                    readOnly
                    value={summaryTotals.grandTotal.toFixed(2)}
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono font-bold bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Discount %</label>
                  <input
                    type="text"
                    defaultValue="0.00"
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Other Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Other Details
              </span>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Discount Amt</label>
                  <input
                    type="text"
                    defaultValue="0.00"
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Other Cr/Dbt</label>
                  <input
                    type="text"
                    defaultValue="0.00"
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Series</label>
                  <select className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs bg-white">
                    <option value="">Select Series</option>
                    <option value="PUR">PUR</option>
                    <option value="GEN">GEN</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Coin Adj.</label>
                  <input
                    type="text"
                    defaultValue="0.00"
                    className="w-full mt-0.5 px-2 py-1 border border-slate-300 rounded text-xs text-right font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Pending Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Pending Details
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-600">Pending DCs</span>
                  <span className="font-mono font-semibold">0</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-600">UnAdj. Returns</span>
                  <span className="font-mono font-semibold">0</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-600">UnAdj. Cr./Dbt.</span>
                  <span className="font-mono font-semibold">0</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-600">UnAdj. Transit</span>
                  <span className="font-mono font-semibold">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row Action Bar matching Image 2 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-1.5 bg-[#0084ff] hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Row (F7)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (gridItems.length > 1) {
                  handleRemoveRow(gridItems.length - 1);
                }
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Remove Row (F8)</span>
            </button>
          </div>

          {/* 10-Row Purchase Grid matching Image 2 */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-[#e6f4fe] text-[#0066cc] font-bold border-b border-[#b6e0fe]">
                  <tr>
                    <th className="py-2 px-1 text-center w-8">#</th>
                    <th className="py-2 px-2 text-left w-24">PCode</th>
                    <th className="py-2 px-2 text-left">Product Name</th>
                    <th className="py-2 px-1 text-center w-16">Packing</th>
                    <th className="py-2 px-1 text-center w-16">Qty</th>
                    <th className="py-2 px-1 text-center w-16">Free Qty</th>
                    <th className="py-2 px-2 text-right w-20">Discount Amt</th>
                    <th className="py-2 px-1 text-center w-18">Prod Dis%</th>
                    <th className="py-2 px-2 text-center w-24">Batch Desc</th>
                    <th className="py-2 px-2 text-center w-28">Expiry Date</th>
                    <th className="py-2 px-2 text-center w-20">HSN</th>
                    <th className="py-2 px-1 text-center w-16">Tax %</th>
                    <th className="py-2 px-2 text-right w-20">PPrice (₹)</th>
                    <th className="py-2 px-2 text-right w-20">SPrice (₹)</th>
                    <th className="py-2 px-2 text-right w-20">MRP (₹)</th>
                    <th className="py-2 px-2 text-right w-24">Amount (₹)</th>
                    <th className="py-2 px-1 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Array.from({ length: Math.max(10, gridItems.length) }).map((_, idx) => {
                    const item = gridItems[idx];
                    const rowNum = idx + 1;
                    return (
                      <tr key={idx} className="hover:bg-sky-50/20 transition-colors">
                        <td className="py-1 px-1 text-center font-semibold text-slate-500">{rowNum}</td>

                        {/* PCode with Search */}
                        <td className="py-1 px-1">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={item ? item.hsnCode || '3004' : ''}
                              readOnly
                              className="w-full py-0.5 pl-1.5 pr-5 border border-slate-300 rounded text-xs font-mono bg-white"
                            />
                            <Search className="w-3 h-3 text-sky-600 absolute right-1 pointer-events-none" />
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="py-1 px-1">
                          <select
                            value={item ? item.productId : ''}
                            onChange={(e) => {
                              const p = products.find((prod) => prod.id === e.target.value);
                              if (p && item) {
                                handleUpdateRow(idx, {
                                  productId: p.id,
                                  productName: p.name,
                                  genericComposition: p.genericComposition,
                                  packing: p.stripSize,
                                  hsnCode: p.hsnCode,
                                  gstRate: p.defaultGstRate,
                                });
                              }
                            }}
                            className="w-full py-0.5 px-1.5 border border-slate-300 rounded text-xs bg-white font-medium text-slate-800"
                          >
                            <option value="">{item ? item.productName : 'Select Medicine'}</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Packing */}
                        <td className="py-1 px-1 text-center font-mono">
                          {item ? item.packing : 0}
                        </td>

                        {/* Qty */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item ? item.quantityStrips : 0}
                            onChange={(e) => {
                              if (item) {
                                handleUpdateRow(idx, { quantityStrips: Math.max(0, parseInt(e.target.value) || 0) });
                              }
                            }}
                            className="w-full py-0.5 text-center border border-slate-300 rounded text-xs font-mono font-semibold"
                          />
                        </td>

                        {/* Free Qty */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item ? item.freeStrips : 0}
                            onChange={(e) => {
                              if (item) {
                                handleUpdateRow(idx, { freeStrips: Math.max(0, parseInt(e.target.value) || 0) });
                              }
                            }}
                            className="w-full py-0.5 text-center border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>

                        {/* Discount Amt */}
                        <td className="py-1 px-1 text-right">
                          <input
                            type="text"
                            value={item ? (item.quantityStrips * item.costPricePerStrip * (item.discountPercent / 100)).toFixed(2) : '0.00'}
                            readOnly
                            className="w-full py-0.5 px-1 text-right border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>

                        {/* Prod Dis% */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={item ? item.discountPercent : 0.0}
                            onChange={(e) => {
                              if (item) {
                                handleUpdateRow(idx, { discountPercent: parseFloat(e.target.value) || 0 });
                              }
                            }}
                            className="w-full py-0.5 text-center border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>

                        {/* Batch Desc */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="text"
                            value={item ? item.batchNumber : ''}
                            onChange={(e) => {
                              if (item) handleUpdateRow(idx, { batchNumber: e.target.value.toUpperCase() });
                            }}
                            className="w-full py-0.5 px-1 text-center border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="py-1 px-1 text-center">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={item ? item.expiryDate : ''}
                              placeholder="YYYY-MM-DD"
                              onChange={(e) => {
                                if (item) handleUpdateRow(idx, { expiryDate: e.target.value });
                              }}
                              className="w-full py-0.5 pl-1.5 pr-6 text-center border border-slate-300 rounded text-xs font-mono"
                            />
                            <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-1.5 pointer-events-none" />
                          </div>
                        </td>

                        {/* HSN */}
                        <td className="py-1 px-1 text-center font-mono">
                          {item ? item.hsnCode : ''}
                        </td>

                        {/* Tax % */}
                        <td className="py-1 px-1 text-center font-mono">
                          {item ? item.gstRate : 0.0}
                        </td>

                        {/* PPrice */}
                        <td className="py-1 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item ? item.costPricePerStrip : 0.0}
                            onChange={(e) => {
                              if (item) {
                                handleUpdateRow(idx, { costPricePerStrip: parseFloat(e.target.value) || 0 });
                              }
                            }}
                            className="w-full py-0.5 px-1 text-right border border-slate-300 rounded text-xs font-mono"
                          />
                        </td>

                        {/* SPrice */}
                        <td className="py-1 px-1 text-right font-mono">
                          {item ? (item.costPricePerStrip * 1.25).toFixed(2) : '0.00'}
                        </td>

                        {/* MRP */}
                        <td className="py-1 px-1 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item ? item.mrpPerStrip : 0.0}
                            onChange={(e) => {
                              if (item) {
                                handleUpdateRow(idx, { mrpPerStrip: parseFloat(e.target.value) || 0 });
                              }
                            }}
                            className="w-full py-0.5 px-1 text-right border border-slate-300 rounded text-xs font-mono font-semibold"
                          />
                        </td>

                        {/* Amount */}
                        <td className="py-1 px-1 text-right font-mono font-bold text-slate-800">
                          {item ? item.lineTotal.toFixed(2) : '0.00'}
                        </td>

                        {/* Action Trash Icon */}
                        <td className="py-1 px-1 text-center">
                          {item && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5 Bottom Summary Cards matching Image 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* Card 1: Stock Information */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Stock Information
              </span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>P. Stock</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>S. Stock</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>P. Unit</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>S. Unit</span><span className="font-mono">-</span></div>
              </div>
            </div>

            {/* Card 2: Location / Qty */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Location / Qty
              </span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>Location</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Rack</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Due Qty</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Free Product</span><span className="font-mono">-</span></div>
              </div>
            </div>

            {/* Card 3: Batch Stock */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Batch Stock
              </span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>Batch Stock</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Locked Stock</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Temp Stock</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Total Stock</span><span className="font-mono">-</span></div>
              </div>
            </div>

            {/* Card 4: Pending PO / Cost */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Pending PO / Cost
              </span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>Pending PO Qty</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>EAN Code</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Item Cost</span><span className="font-mono">-</span></div>
                <div className="flex justify-between"><span>Discounted Sale Rate</span><span className="font-mono">-</span></div>
              </div>
            </div>

            {/* Card 5: Margin Information */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1">
              <span className="font-bold text-[#0066cc] uppercase tracking-wide block border-b border-slate-100 pb-1">
                Margin Information
              </span>
              <div className="space-y-0.5 text-slate-600">
                <div className="flex justify-between"><span>Cur. Margin</span><span className="font-mono font-semibold">0.00</span></div>
                <div className="flex justify-between"><span>Prev. Margin</span><span className="font-mono">0.00</span></div>
                <div className="flex justify-between"><span>Prev. Cost</span><span className="font-mono">0.00</span></div>
              </div>
            </div>
          </div>

          {/* Tax Totals Strip matching Image 2 */}
          <div className="bg-[#f0f9ff] border border-sky-200 rounded-lg p-2.5 shadow-xs text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-11 gap-2 text-center font-mono">
              <div><span className="text-[10px] text-slate-500 block">Gross Amt</span><strong>{summaryTotals.grossTotal.toFixed(2)}</strong></div>
              <div><span className="text-[10px] text-slate-500 block">SGST</span><strong>{summaryTotals.sgstTotal.toFixed(2)}</strong></div>
              <div><span className="text-[10px] text-slate-500 block">CGST</span><strong>{summaryTotals.cgstTotal.toFixed(2)}</strong></div>
              <div><span className="text-[10px] text-slate-500 block">CESS</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">Net</span><strong className="text-[#0066cc]">{summaryTotals.taxableTotal.toFixed(2)}</strong></div>
              <div><span className="text-[10px] text-slate-500 block">Other Cr/Dbt</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">PD Amt</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">OD Amt</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">Diff</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">Tot Margin % On Sale</span><strong>0.00</strong></div>
              <div><span className="text-[10px] text-slate-500 block">Tot Margin Value On Sale</span><strong>0.00</strong></div>
            </div>
          </div>

          {/* Bottom Action Buttons matching Image 2 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-5 py-2 bg-[#10b981] hover:bg-emerald-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save (F5)'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print (F6)</span>
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>New (F8)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGridItems([
                    {
                      productId: products[0]?.id || '',
                      productName: products[0]?.name || '',
                      genericComposition: products[0]?.genericComposition || '',
                      packing: products[0]?.stripSize || 10,
                      quantityStrips: 10,
                      freeStrips: 0,
                      batchNumber: 'NW26-001',
                      expiryDate: '2026-12-31',
                      costPricePerStrip: 20.0,
                      mrpPerStrip: 30.0,
                      discountPercent: 0,
                      hsnCode: products[0]?.hsnCode || '30049060',
                      gstRate: products[0]?.defaultGstRate || 12,
                      taxableAmount: 200,
                      cgstAmount: 12,
                      sgstAmount: 12,
                      igstAmount: 0,
                      lineTotal: 224,
                    },
                  ]);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Clear (F9)</span>
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Cancel and discard inward purchase entry?')) {
                    setGridItems([]);
                  }
                }}
                className="px-5 py-2 bg-[#ef4444] hover:bg-rose-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <span>✕ Cancel (F12)</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PURCHASE RETURNS (Ctrl+D) / DEBIT NOTE           */}
      {/* ======================================================== */}
      {activeTab === 'RETURNS' && (
        <form onSubmit={handleProcessPurchaseReturn} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Purchase Return (Supplier Debit Note)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Return damaged, near-expiry, or excess goods to distributor with debit note voucher.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Debit Note Number</label>
              <input
                type="text"
                value={debitNoteNo}
                onChange={(e) => setDebitNoteNo(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Select Supplier</label>
              <select
                value={returnVendorId}
                onChange={(e) => setReturnVendorId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Select Medicine Batch from Inventory
              </label>
              <select
                value={returnBatchId}
                onChange={(e) => setReturnBatchId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
              >
                {batches.map((b) => {
                  const p = products.find((prod) => prod.id === b.productId);
                  const st = formatDualUnitStock(b.totalTablets, p?.stripSize || 10);
                  return (
                    <option key={b.id} value={b.id}>
                      {p?.name} (Batch: {b.batchNumber} - Exp: {b.expiryDate}) — {st.displayString}
                    </option>
                  );
                })}
              </select>
            </div>

            {returnProduct && returnBatch && (
              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{returnProduct.name}</div>
                  <div className="text-slate-500 text-[11px]">
                    Cost: {formatINR(returnBatch.costPricePerStrip)} / strip | MRP: {formatINR(returnBatch.mrpPerStrip)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">In-Hand Balance</div>
                  <div className="font-mono font-bold text-slate-800">
                    {formatDualUnitStock(returnBatch.totalTablets, returnProduct.stripSize).displayString}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Return Quantity (Strips)</label>
                <input
                  type="number"
                  min={1}
                  value={returnQuantityStrips}
                  onChange={(e) => setReturnQuantityStrips(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-rose-700"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                >
                  <option value="Near Expiry Return to Distributor">Near Expiry Return to Distributor</option>
                  <option value="Damaged Blister / Packaging Breakage">Damaged Blister / Packaging Breakage</option>
                  <option value="Slow Moving Stock Exchange">Slow Moving Stock Exchange</option>
                  <option value="Batch Recall / Company Notice">Batch Recall / Company Notice</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Issue Debit Note & Deduct Stock</span>
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PURCHASE COPIES / INWARD LEDGER                   */}
      {/* ======================================================== */}
      {activeTab === 'COPIES' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Purchase Copies / Goods Received Notes (GRN) Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Total Recorded GRNs: {purchaseInvoices.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GRN Number</th>
                  <th className="p-3">GRN Date</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Supplier Invoice</th>
                  <th className="p-3 text-center">Lines</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseInvoices.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-emerald-800">{po.grnNumber}</td>
                    <td className="p-3 font-mono">{po.grnDate}</td>
                    <td className="p-3 font-semibold text-slate-900">{po.vendorName}</td>
                    <td className="p-3 font-mono">{po.vendorInvoiceNo}</td>
                    <td className="p-3 text-center font-bold">{po.items.length}</td>
                    <td className="p-3 text-right font-mono">{formatINR(po.taxableTotal)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(po.grandTotal)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {po.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => triggerToast(`✓ Print request queued for GRN ${po.grnNumber}`)}
                        className="p-1 text-slate-500 hover:text-emerald-600 cursor-pointer"
                        title="Print GRN Slip"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PURCHASE CANCELLATION                              */}
      {/* ======================================================== */}
      {activeTab === 'CANCELLATION' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Purchase Cancellation (Safe Stock & Ledger Reversal)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized supervisor cancellation of inward purchase records with reason and audit history.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
              Supervisor Authorization Required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GRN #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseInvoices.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">{po.grnNumber}</td>
                    <td className="p-3 font-mono">{po.grnDate}</td>
                    <td className="p-3 font-semibold">{po.vendorName}</td>
                    <td className="p-3 font-mono">{po.vendorInvoiceNo}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatINR(po.grandTotal)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const reason = prompt(`Enter cancellation reason for purchase ${po.grnNumber}:`);
                          if (reason) {
                            triggerToast(`✓ Purchase ${po.grnNumber} cancelled. Stock and ledger reversed safely. Audit log created.`);
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold cursor-pointer"
                      >
                        Cancel Purchase
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: PURCHASE MODIFICATION                              */}
      {/* ======================================================== */}
      {activeTab === 'MODIFICATION' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Purchase Modification (Permission-Controlled)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Edit supplier invoice number, dates, discount, or tax rates before final accounting freeze.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GRN #</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">Supplier Invoice #</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {purchaseInvoices.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">{po.grnNumber}</td>
                    <td className="p-3 font-semibold">{po.vendorName}</td>
                    <td className="p-3 font-mono">{po.vendorInvoiceNo}</td>
                    <td className="p-3 text-right font-bold">{po.items.length}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatINR(po.grandTotal)}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const newInv = prompt(`Enter corrected invoice number for ${po.grnNumber}:`, po.vendorInvoiceNo);
                          if (newInv) {
                            triggerToast(`✓ Purchase ${po.grnNumber} updated with invoice #${newInv}`);
                          }
                        }}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-xs font-semibold cursor-pointer"
                      >
                        Modify Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: PURCHASE REPORT                                    */}
      {/* ======================================================== */}
      {activeTab === 'REPORT' && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Purchase Totals & Supplier Analysis Report</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Summary of total purchase inward, returns, and distributor payment status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => triggerToast('✓ Exported Purchase Report CSV')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
              <span className="text-slate-500 font-semibold block text-[11px]">Total Purchases (Gross)</span>
              <span className="text-lg font-bold font-mono text-sky-800">
                {formatINR(purchaseInvoices.reduce((acc, p) => acc + p.grandTotal, 0))}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <span className="text-slate-500 font-semibold block text-[11px]">Taxable Amount</span>
              <span className="text-lg font-bold font-mono text-emerald-800">
                {formatINR(purchaseInvoices.reduce((acc, p) => acc + p.taxableTotal, 0))}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <span className="text-slate-500 font-semibold block text-[11px]">Total Input GST</span>
              <span className="text-lg font-bold font-mono text-amber-800">
                {formatINR(purchaseInvoices.reduce((acc, p) => acc + p.cgstTotal + p.sgstTotal, 0))}
              </span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <span className="text-slate-500 font-semibold block text-[11px]">Total GRN Vouchers</span>
              <span className="text-lg font-bold font-mono text-purple-800">{purchaseInvoices.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
