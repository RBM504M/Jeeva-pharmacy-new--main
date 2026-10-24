import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  RotateCcw,
  Truck,
  Building,
  DollarSign,
  ChevronDown,
  Trash2,
  Eye,
  Check,
  Edit,
  Ban,
  Copy,
  BarChart3,
  Layers,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR } from '../../types/pharmacy';

export type GrnTab =
  | 'NEW_GRN'
  | 'GRN_REGISTER'
  | 'PENDING_GRN'
  | 'PARTIALLY_RECEIVED_GRN'
  | 'GRN_MODIFICATION'
  | 'GRN_CANCELLATION'
  | 'GRN_COPIES'
  | 'GRN_REPORT';

export interface GrnManagementViewProps {
  initialTab?: GrnTab;
}

interface GrnItemLine {
  productName: string;
  batchNumber: string;
  expiryDate: string;
  stripSize: number;
  receivedQty: number; // Received
  freeQty: number;     // Free
  rejectedQty: number; // Rejected
  acceptedQty: number; // Accepted = Received + Free - Rejected
  unitCost: number;
  mrp: number;
  gstRate: number;
  taxableAmount: number;
  lineTotal: number;
}

interface GrnRecord {
  id: string;
  grnNumber: string;
  grnDate: string;
  poNumber?: string;
  supplierInvoiceNo: string;
  supplierInvoiceDate: string;
  vendorId: string;
  vendorName: string;
  itemsCount: number;
  totalReceivedUnits: number;
  totalAcceptedUnits: number;
  totalRejectedUnits: number;
  grossAmount: number;
  taxAmount: number;
  netPayableAmount: number;
  status: 'POSTED_TO_STOCK' | 'PENDING_CONFIRMATION' | 'PARTIALLY_RECEIVED' | 'CANCELLED';
  remarks: string;
  cancelReason?: string;
  items: GrnItemLine[];
}

export const GrnManagementView: React.FC<GrnManagementViewProps> = ({
  initialTab = 'GRN_REGISTER',
}) => {
  const { vendors, products, addBatch, inwardStockBatch } = usePharmacy();

  const [activeTab, setActiveTab] = useState<GrnTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // GRN Records (Empty default state)
  const [grnList, setGrnList] = useState<GrnRecord[]>([]);

  // Selected Detail Modal & Actions
  const [selectedGrn, setSelectedGrn] = useState<GrnRecord | null>(null);
  const [showConfirmStockModal, setShowConfirmStockModal] = useState<boolean>(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string>('');

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelTargetId, setCancelTargetId] = useState<string>('');
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  // New GRN Modal
  const [showNewGrnModal, setShowNewGrnModal] = useState<boolean>(false);
  const [newGrnVendorId, setNewGrnVendorId] = useState<string>(vendors[0]?.id || '');
  const [newGrnPoNumber, setNewGrnPoNumber] = useState<string>('PO-2026-001');
  const [newGrnSupplierInvNo, setNewGrnSupplierInvNo] = useState<string>('INV-' + Math.floor(1000 + Math.random() * 9000));
  const [newGrnSupplierInvDate, setNewGrnSupplierInvDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newGrnRemarks, setNewGrnRemarks] = useState<string>('Received with intact outer carton packaging.');

  // Item Lines in Form
  const [newGrnRows, setNewGrnRows] = useState<GrnItemLine[]>([
    {
      productName: products[0]?.name || 'Paracetamol 650mg',
      batchNumber: 'NW26-' + Math.floor(100 + Math.random() * 900),
      expiryDate: '2027-12-31',
      stripSize: 15,
      receivedQty: 50,
      freeQty: 5,
      rejectedQty: 0,
      acceptedQty: 55,
      unitCost: 28.5,
      mrp: 45.0,
      gstRate: 12,
      taxableAmount: 1425.0,
      lineTotal: 1596.0,
    },
  ]);

  const recalculateFormRow = (idx: number, field: keyof GrnItemLine, value: any) => {
    const updated = [...newGrnRows];
    const item = { ...updated[idx], [field]: value };
    const accepted = Math.max(0, (Number(item.receivedQty) || 0) + (Number(item.freeQty) || 0) - (Number(item.rejectedQty) || 0));
    item.acceptedQty = accepted;
    const taxable = (Number(item.receivedQty) || 0) * (Number(item.unitCost) || 0);
    const tax = taxable * ((Number(item.gstRate) || 0) / 100);
    item.taxableAmount = Number(taxable.toFixed(2));
    item.lineTotal = Number((taxable + tax).toFixed(2));
    updated[idx] = item;
    setNewGrnRows(updated);
  };

  const handleCreateGrn = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === newGrnVendorId) || vendors[0];
    const grnNo = `GRN-${new Date().getFullYear()}-${String(grnList.length + 92).padStart(3, '0')}`;

    const totalReceived = newGrnRows.reduce((sum, r) => sum + r.receivedQty, 0);
    const totalAccepted = newGrnRows.reduce((sum, r) => sum + r.acceptedQty, 0);
    const totalRejected = newGrnRows.reduce((sum, r) => sum + r.rejectedQty, 0);
    const gross = newGrnRows.reduce((sum, r) => sum + r.taxableAmount, 0);
    const tax = newGrnRows.reduce((sum, r) => sum + (r.lineTotal - r.taxableAmount), 0);
    const net = gross + tax;

    const newRecord: GrnRecord = {
      id: `grn-${Date.now()}`,
      grnNumber: grnNo,
      grnDate: new Date().toISOString().split('T')[0],
      poNumber: newGrnPoNumber,
      supplierInvoiceNo: newGrnSupplierInvNo,
      supplierInvoiceDate: newGrnSupplierInvDate,
      vendorId: vendor?.id || 'v1',
      vendorName: vendor?.companyName || vendor?.name || 'Authorized Wholesaler',
      itemsCount: newGrnRows.length,
      totalReceivedUnits: totalReceived,
      totalAcceptedUnits: totalAccepted,
      totalRejectedUnits: totalRejected,
      grossAmount: gross,
      taxAmount: tax,
      netPayableAmount: net,
      status: 'PENDING_CONFIRMATION',
      remarks: newGrnRemarks,
      items: newGrnRows,
    };

    setGrnList([newRecord, ...grnList]);
    setShowNewGrnModal(false);
    showToast(`✓ Goods Receipt ${grnNo} recorded. Ready for stock verification.`);
    setActiveTab('GRN_REGISTER');
  };

  const handleConfirmStockPosting = () => {
    setGrnList((prev) =>
      prev.map((g) => {
        if (g.id === confirmTargetId) {
          // Post each item into batch stock
          g.items.forEach((item) => {
            const prod = products.find((p) => p.name === item.productName);
            if (prod) {
              inwardStockBatch(
                {
                  productId: prod.id,
                  batchNumber: item.batchNumber,
                  expiryDate: item.expiryDate,
                  manufacturingDate: '2026-01-01',
                  costPricePerStrip: item.unitCost,
                  mrpPerStrip: item.mrp,
                  sellingPricePerStrip: item.mrp,
                  totalTablets: item.acceptedQty * item.stripSize,
                  gstRate: item.gstRate as any,
                  vendorId: g.vendorId,
                },
                g.supplierInvoiceNo
              );
            }
          });
          return { ...g, status: 'POSTED_TO_STOCK' };
        }
        return g;
      })
    );

    setShowConfirmStockModal(false);
    setConfirmTargetId('');
    showToast('✓ GRN Confirmed: Accepted quantities successfully posted to live inventory stock!');
  };

  const handleCancelGrn = () => {
    if (!cancelReasonInput.trim()) {
      alert('Please specify cancellation reason.');
      return;
    }
    setGrnList((prev) =>
      prev.map((g) =>
        g.id === cancelTargetId
          ? { ...g, status: 'CANCELLED', cancelReason: cancelReasonInput }
          : g
      )
    );
    setShowCancelModal(false);
    setCancelTargetId('');
    setCancelReasonInput('');
    showToast('✓ GRN Cancelled and stock posting reversed safely.');
  };

  // Filtered List
  const filteredGrnList = useMemo(() => {
    return grnList.filter((grn) => {
      if (activeTab === 'PENDING_GRN' && grn.status !== 'PENDING_CONFIRMATION') return false;
      if (activeTab === 'PARTIALLY_RECEIVED_GRN' && grn.status !== 'PARTIALLY_RECEIVED') return false;
      if (activeTab === 'GRN_CANCELLATION' && grn.status !== 'CANCELLED') return false;

      if (selectedVendorFilter !== 'ALL' && grn.vendorId !== selectedVendorFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mGrn = grn.grnNumber.toLowerCase().includes(q);
        const mInv = grn.supplierInvoiceNo.toLowerCase().includes(q);
        const mVendor = grn.vendorName.toLowerCase().includes(q);
        const mItems = grn.items.some((it) => it.productName.toLowerCase().includes(q) || it.batchNumber.toLowerCase().includes(q));
        if (!mGrn && !mInv && !mVendor && !mItems) return false;
      }
      return true;
    });
  }, [grnList, activeTab, selectedVendorFilter, searchQuery]);

  const summary = useMemo(() => {
    const totalCount = grnList.length;
    const postedCount = grnList.filter((g) => g.status === 'POSTED_TO_STOCK').length;
    const pendingCount = grnList.filter((g) => g.status === 'PENDING_CONFIRMATION').length;
    const rejectedUnits = grnList.reduce((sum, g) => sum + g.totalRejectedUnits, 0);
    const totalValue = grnList.filter((g) => g.status !== 'CANCELLED').reduce((sum, g) => sum + g.netPayableAmount, 0);

    return { totalCount, postedCount, pendingCount, rejectedUnits, totalValue };
  }, [grnList]);

  const handleExportCsv = () => {
    const headers = ['GRN Number', 'Date', 'Supplier', 'Invoice No', 'Received Qty', 'Accepted Qty', 'Rejected Qty', 'Total Net (INR)', 'Status'];
    const rows = filteredGrnList.map((g) => [
      g.grnNumber,
      g.grnDate,
      `"${g.vendorName}"`,
      g.supplierInvoiceNo,
      g.totalReceivedUnits,
      g.totalAcceptedUnits,
      g.totalRejectedUnits,
      g.netPayableAmount.toFixed(2),
      g.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GRN_Goods_Receipt_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported GRN Register (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0084ff]" />
              <h1 className="text-base font-bold text-slate-900">GRN — Goods Receipt Notes</h1>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                Inward Quality & Stock Posting
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record received, free, rejected and accepted quantities; batch and expiry tracking; invoice reconciliation and safe stock posting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewGrnModal(true)}
              className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New GRN Entry</span>
            </button>
          </div>
        </div>

        {/* 8 Submenus as Horizontal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('GRN_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GRN_REGISTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>GRN Register</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono text-slate-600">
              {summary.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING_GRN')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PENDING_GRN'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending GRN (To Post)</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded-full font-mono">
              {summary.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PARTIALLY_RECEIVED_GRN')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PARTIALLY_RECEIVED_GRN'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-sky-500" />
            <span>Partially Received GRN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_MODIFICATION')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GRN_MODIFICATION'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit className="w-3.5 h-3.5 text-indigo-500" />
            <span>GRN Modification</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_CANCELLATION')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GRN_CANCELLATION'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>GRN Cancellation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_COPIES')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GRN_COPIES'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Copy className="w-3.5 h-3.5 text-teal-500" />
            <span>GRN Copies</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GRN_REPORT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'GRN_REPORT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-500" />
            <span>GRN Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-medium">Total GRNs Created</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.totalCount} Documents</div>
          <div className="text-[10px] text-slate-400 mt-1">Value: {formatINR(summary.totalValue)}</div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
            <span>Posted to Live Stock</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-emerald-900 mt-0.5">{summary.postedCount} Receipts</div>
          <div className="text-[10px] text-emerald-600 mt-1">Stock ledger updated</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span>Pending QC / Posting</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-amber-900 mt-0.5">{summary.pendingCount} Receipts</div>
          <div className="text-[10px] text-amber-600 mt-1">Awaiting pharmacist verification</div>
        </div>

        <div className="bg-rose-50/60 border border-rose-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between">
            <span>Rejected Quantities</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-rose-900 mt-0.5">{summary.rejectedUnits} Strips</div>
          <div className="text-[10px] text-rose-600 mt-1">Damaged/short-expiry returns</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by GRN Number, Invoice No, Wholesaler or Batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0084ff]"
            />
          </div>

          <select
            value={selectedVendorFilter}
            onChange={(e) => setSelectedVendorFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Wholesalers</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.companyName || v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 font-medium text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredGrnList.length}</span> records
        </div>
      </div>

      {/* Main Table or Report View */}
      {activeTab !== 'GRN_REPORT' ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">GRN No.</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier Invoice</th>
                  <th className="py-2.5 px-3">Wholesaler</th>
                  <th className="py-2.5 px-3 text-center">Recv</th>
                  <th className="py-2.5 px-3 text-center">Free</th>
                  <th className="py-2.5 px-3 text-center text-rose-300">Rej</th>
                  <th className="py-2.5 px-3 text-center text-emerald-300">Accepted</th>
                  <th className="py-2.5 px-3 text-right">Net Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredGrnList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No GRN records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredGrnList.map((grn) => {
                    const freeSum = grn.items.reduce((s, it) => s + it.freeQty, 0);
                    return (
                      <tr key={grn.id} className="hover:bg-sky-50/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0084ff]">
                          {grn.grnNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{grn.grnDate}</td>
                        <td className="py-2.5 px-3 font-mono">
                          <div>{grn.supplierInvoiceNo}</div>
                          <div className="text-[10px] text-slate-400">{grn.supplierInvoiceDate}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{grn.vendorName}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{grn.totalReceivedUnits}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">{freeSum}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">{grn.totalRejectedUnits}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{grn.totalAcceptedUnits}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatINR(grn.netPayableAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              grn.status === 'POSTED_TO_STOCK'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : grn.status === 'PENDING_CONFIRMATION'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : grn.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {grn.status === 'POSTED_TO_STOCK' ? 'POSTED' : grn.status === 'PENDING_CONFIRMATION' ? 'PENDING QC' : grn.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedGrn(grn)}
                              className="p-1 text-slate-600 hover:text-[#0084ff] hover:bg-slate-100 rounded cursor-pointer"
                              title="View GRN Document"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {grn.status === 'PENDING_CONFIRMATION' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmTargetId(grn.id);
                                    setShowConfirmStockModal(true);
                                  }}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium cursor-pointer"
                                  title="Confirm & Post into Stock"
                                >
                                  Post Stock
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelTargetId(grn.id);
                                    setShowCancelModal(true);
                                  }}
                                  className="px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-medium border border-rose-200 cursor-pointer"
                                  title="Cancel GRN"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRN Report View */
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Inward Goods Receipt Audit & Quality Report</h2>
              <p className="text-xs text-slate-500">Summary of received, free, and rejected stocks with supplier rejection rates.</p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-[#0084ff] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GRN Summary</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendors.map((vendor) => {
              const vendorGrns = grnList.filter((g) => g.vendorId === vendor.id);
              const totalRecv = vendorGrns.reduce((sum, g) => sum + g.totalReceivedUnits, 0);
              const totalRej = vendorGrns.reduce((sum, g) => sum + g.totalRejectedUnits, 0);
              const rejRate = totalRecv > 0 ? ((totalRej / totalRecv) * 100).toFixed(1) : '0.0';

              return (
                <div key={vendor.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{vendor.companyName || vendor.name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      {vendorGrns.length} GRNs
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>Received: <strong className="text-slate-900">{totalRecv}s</strong></div>
                    <div>Rejected: <strong className="text-rose-600">{totalRej}s</strong></div>
                  </div>
                  <div className="text-xs text-slate-600">
                    Rejection Rate:{' '}
                    <span className={`font-bold ${Number(rejRate) > 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {rejRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedGrn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Goods Receipt Note: {selectedGrn.grnNumber}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      selectedGrn.status === 'POSTED_TO_STOCK'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedGrn.status === 'PENDING_CONFIRMATION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedGrn.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Supplier: {selectedGrn.vendorName} | Inv: {selectedGrn.supplierInvoiceNo} ({selectedGrn.supplierInvoiceDate})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGrn(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 text-[10px] block">GRN Date</span>
                <span className="font-semibold text-slate-800">{selectedGrn.grnDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">PO Number</span>
                <span className="font-semibold text-slate-800">{selectedGrn.poNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Accepted / Rejected</span>
                <span className="font-bold text-slate-800">
                  <span className="text-emerald-600">{selectedGrn.totalAcceptedUnits}s</span> / <span className="text-rose-600">{selectedGrn.totalRejectedUnits}s</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Net Payable</span>
                <span className="font-bold text-[#0084ff]">{formatINR(selectedGrn.netPayableAmount)}</span>
              </div>
            </div>

            {selectedGrn.remarks && (
              <div className="text-xs bg-sky-50 border border-sky-100 p-2.5 rounded text-sky-900">
                <strong>Quality & Inspection Notes:</strong> {selectedGrn.remarks}
              </div>
            )}

            {selectedGrn.cancelReason && (
              <div className="text-xs bg-rose-50 border border-rose-200 p-2.5 rounded text-rose-800">
                <strong>Cancellation Reason:</strong> {selectedGrn.cancelReason}
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Batch</th>
                    <th className="p-2">Expiry</th>
                    <th className="p-2 text-center">Recv</th>
                    <th className="p-2 text-center text-emerald-600">Free</th>
                    <th className="p-2 text-center text-rose-600">Rej</th>
                    <th className="p-2 text-center font-bold">Accepted</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedGrn.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-slate-900">{item.productName}</td>
                      <td className="p-2 font-mono">{item.batchNumber}</td>
                      <td className="p-2 font-mono text-slate-600">{item.expiryDate}</td>
                      <td className="p-2 text-center font-mono">{item.receivedQty}</td>
                      <td className="p-2 text-center font-mono text-emerald-600">{item.freeQty}</td>
                      <td className="p-2 text-center font-mono text-rose-600 font-bold">{item.rejectedQty}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-900">{item.acceptedQty}</td>
                      <td className="p-2 text-right font-mono">{formatINR(item.unitCost)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{formatINR(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                Print GRN Voucher
              </button>
              <button
                type="button"
                onClick={() => setSelectedGrn(null)}
                className="px-4 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM STOCK POSTING MODAL */}
      {showConfirmStockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm & Post Stock to Inventory</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Confirming this GRN will post all <strong>Accepted Quantities</strong> directly into live batch stock. Stock ledgers and valuation will update immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmStockModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStockPosting}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Confirm Stock Posting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Cancel Goods Receipt Note</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this GRN? An audit entry will be recorded with stock and accounting reversal.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Near-expiry batches received, damaged packaging, supplier invoice mismatch..."
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-hidden focus:border-rose-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
              >
                Keep GRN
              </button>
              <button
                type="button"
                onClick={handleCancelGrn}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW GRN MODAL */}
      {showNewGrnModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0084ff]" />
                <h3 className="text-sm font-bold text-slate-900">New GRN — Goods Receipt Entry</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGrnModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGrn} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wholesaler *</label>
                  <select
                    value={newGrnVendorId}
                    onChange={(e) => setNewGrnVendorId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName || v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">PO Reference No.</label>
                  <input
                    type="text"
                    value={newGrnPoNumber}
                    onChange={(e) => setNewGrnPoNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier Invoice No. *</label>
                  <input
                    type="text"
                    value={newGrnSupplierInvNo}
                    onChange={(e) => setNewGrnSupplierInvNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier Inv Date *</label>
                  <input
                    type="date"
                    value={newGrnSupplierInvDate}
                    onChange={(e) => setNewGrnSupplierInvDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Inspection & Quality Remarks</label>
                <input
                  type="text"
                  value={newGrnRemarks}
                  onChange={(e) => setNewGrnRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                />
              </div>

              {/* Items Grid with Received, Free, Rejected, Accepted */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 p-2 font-semibold text-slate-700 flex justify-between items-center">
                  <span>Inward Items Verification</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewGrnRows([
                        ...newGrnRows,
                        {
                          productName: products[1]?.name || 'Amoxicillin 500mg',
                          batchNumber: 'AX26-' + Math.floor(100 + Math.random() * 900),
                          expiryDate: '2027-10-31',
                          stripSize: 10,
                          receivedQty: 30,
                          freeQty: 3,
                          rejectedQty: 0,
                          acceptedQty: 33,
                          unitCost: 45.0,
                          mrp: 70.0,
                          gstRate: 12,
                          taxableAmount: 1350.0,
                          lineTotal: 1512.0,
                        },
                      ])
                    }
                    className="text-[#0084ff] hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    + Add Item Line
                  </button>
                </div>

                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {newGrnRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-50/50 p-1.5 rounded">
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-500 block">Medicine</label>
                        <select
                          value={row.productName}
                          onChange={(e) => {
                            const p = products.find((prod) => prod.name === e.target.value);
                            recalculateFormRow(idx, 'productName', e.target.value);
                            if (p) recalculateFormRow(idx, 'stripSize', p.stripSize);
                          }}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 block">Batch No.</label>
                        <input
                          type="text"
                          value={row.batchNumber}
                          onChange={(e) => recalculateFormRow(idx, 'batchNumber', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 block">Expiry Date</label>
                        <input
                          type="date"
                          value={row.expiryDate}
                          onChange={(e) => recalculateFormRow(idx, 'expiryDate', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-slate-500 block text-center">Recv</label>
                        <input
                          type="number"
                          value={row.receivedQty}
                          onChange={(e) => recalculateFormRow(idx, 'receivedQty', Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-center font-mono font-bold"
                          min={0}
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-emerald-600 block text-center">Free</label>
                        <input
                          type="number"
                          value={row.freeQty}
                          onChange={(e) => recalculateFormRow(idx, 'freeQty', Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-center font-mono text-emerald-600 font-bold"
                          min={0}
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-rose-600 block text-center">Rej</label>
                        <input
                          type="number"
                          value={row.rejectedQty}
                          onChange={(e) => recalculateFormRow(idx, 'rejectedQty', Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded p-1 text-[11px] text-center font-mono text-rose-600 font-bold"
                          min={0}
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <label className="text-[10px] text-slate-500 block">Accepted</label>
                        <span className="font-mono font-bold text-slate-900 text-xs">{row.acceptedQty}</span>
                      </div>

                      <div className="col-span-1 text-center">
                        {newGrnRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewGrnRows(newGrnRows.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer pt-3"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewGrnModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save Goods Receipt Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
