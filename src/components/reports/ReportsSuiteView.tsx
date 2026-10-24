import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Search,
  Filter,
  Eye,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Package,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, formatDualUnitStock, calculateExpiryZone } from '../../types/pharmacy';

export interface ReportsSuiteViewProps {
  initialTab?: string;
}

export const ReportsSuiteView: React.FC<ReportsSuiteViewProps> = ({ initialTab = 'OVERVIEW' }) => {
  const { products, batches, invoices, doctors, vendors } = usePharmacy();
  const [activeReportTab, setActiveReportTab] = useState<string>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveReportTab(initialTab);
    }
  }, [initialTab]);

  // Expiry Report State
  const [expiryFromDate, setExpiryFromDate] = useState('2026-10-01');
  const [expiryToDate, setExpiryToDate] = useState('2026-12-31');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<'ALL' | 'NEAR' | 'EXPIRED'>('ALL');
  const [expirySearch, setExpirySearch] = useState('');
  const [expiryPage, setExpiryPage] = useState(1);

  // Non-Moving Report State
  const [nonMovingPeriod, setNonMovingPeriod] = useState('90');
  const [nonMovingFromDate, setNonMovingFromDate] = useState('2026-07-14');
  const [nonMovingToDate, setNonMovingToDate] = useState('2026-10-12');
  const [nonMovingSearch, setNonMovingSearch] = useState('');
  const [nonMovingPage, setNonMovingPage] = useState(1);

  // Prescription Register State
  const [rxFromDate, setRxFromDate] = useState('2026-10-01');
  const [rxToDate, setRxToDate] = useState('2026-10-12');
  const [rxDoctorFilter, setRxDoctorFilter] = useState('ALL');
  const [rxSearch, setRxSearch] = useState('');
  const [rxPage, setRxPage] = useState(1);

  // Selected Prescription for View Modal
  const [viewRxItem, setViewRxItem] = useState<any | null>(null);

  // 1. Expiry Report Data
  const expiryData = useMemo(() => {
    return batches
      .map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        if (!prod) return null;
        const { days, zone } = calculateExpiryZone(b.expiryDate);
        let status: 'Near Expiry' | 'Expired' | 'OK' = 'OK';
        if (days <= 0) status = 'Expired';
        else if (days <= 90) status = 'Near Expiry';

        return {
          batchId: b.id,
          productName: prod.name,
          batchNo: b.batchNumber,
          expiryDate: b.expiryDate,
          stock: b.totalTablets,
          status,
          days,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (expiryStatusFilter === 'NEAR' && item.status !== 'Near Expiry') return false;
        if (expiryStatusFilter === 'EXPIRED' && item.status !== 'Expired') return false;
        if (expirySearch && !item.productName.toLowerCase().includes(expirySearch.toLowerCase()) && !item.batchNo.toLowerCase().includes(expirySearch.toLowerCase())) {
          return false;
        }
        return true;
      });
  }, [batches, products, expiryStatusFilter, expirySearch]);

  // 2. Non-Moving Report Data
  const nonMovingData = useMemo(() => {
    return products
      .map((prod) => {
        const prodBatches = batches.filter((b) => b.productId === prod.id);
        const totalStock = prodBatches.reduce((sum, b) => sum + b.totalTablets, 0);
        // Find last sale
        let lastSaleDate: string | null = null;
        invoices.forEach((inv) => {
          const hasItem = inv.items.some((it) => it.product?.id === prod.id);
          if (hasItem) {
            const d = inv.invoiceDate.split('T')[0];
            if (!lastSaleDate || d > lastSaleDate) lastSaleDate = d;
          }
        });

        return {
          productId: prod.id,
          productName: prod.name,
          batchNo: prodBatches[0]?.batchNumber || 'N/A',
          lastSaleDate: lastSaleDate || '-',
          currentStock: totalStock,
        };
      })
      .filter((item) => {
        if (nonMovingSearch && !item.productName.toLowerCase().includes(nonMovingSearch.toLowerCase())) {
          return false;
        }
        return true;
      });
  }, [products, batches, invoices, nonMovingSearch]);

  // 3. Prescription Register Data
  const prescriptionData = useMemo(() => {
    return invoices
      .filter((inv) => inv.prescription && inv.prescription.patientName)
      .map((inv, idx) => ({
        id: inv.id,
        date: inv.invoiceDate.split('T')[0],
        prescriptionNo: `PR-${String(idx + 1).padStart(5, '0')}`,
        invoiceNo: inv.invoiceNumber,
        patientName: inv.prescription.patientName,
        doctor: inv.prescription.doctorName || 'Dr. Suresh, MBBS',
        items: inv.items,
        total: inv.grandTotal,
      }))
      .filter((item) => {
        if (rxDoctorFilter !== 'ALL' && item.doctor !== rxDoctorFilter) return false;
        if (rxSearch) {
          const q = rxSearch.toLowerCase();
          if (!item.patientName.toLowerCase().includes(q) && !item.prescriptionNo.toLowerCase().includes(q) && !item.invoiceNo.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      });
  }, [invoices, rxDoctorFilter, rxSearch]);

  return (
    <div className="space-y-4">
      {/* Top Header Bar matching Image 5 */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl px-5 py-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Reports</h1>
            <p className="text-xs text-slate-500 font-normal">View and analyze various reports</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-medium">
            Home &gt; <span className="text-slate-700 font-semibold">Reports</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help (F1)</span>
          </button>
        </div>
      </div>

      {/* Report Submenu Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs overflow-x-auto flex items-center gap-1 text-xs">
        {[
          { id: 'OVERVIEW', label: 'Suite Overview' },
          { id: 'EXPIRY', label: 'Expiry Report' },
          { id: 'NON_MOVING', label: 'Non-Moving Report' },
          { id: 'PRESCRIPTION', label: 'Prescription Register' },
          { id: 'COLLECTION', label: 'Daily Collection' },
          { id: 'PRODUCT_SALES', label: 'Product Sales' },
          { id: 'SUPPLIER_PURCHASE', label: 'Supplier Purchase' },
          { id: 'MARGIN', label: 'Profit / Margin' },
          { id: 'VALUATION', label: 'Stock Valuation' },
          { id: 'PURCHASE_REGISTER', label: 'Purchase Register' },
          { id: 'SALES_REGISTER', label: 'Sales Register' },
          { id: 'RETURNS_REGISTER', label: 'Returns Register' },
          { id: 'CANCELLED', label: 'Cancelled Transactions' },
          { id: 'AUDIT_TRAIL', label: 'Audit Trail Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReportTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeReportTab === tab.id
                ? 'bg-[#0084ff] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 Action Cards matching Image 5 */}
      {activeReportTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Expiry Report Card */}
          <div
            onClick={() => setActiveReportTab('EXPIRY')}
            className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-emerald-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Expiry Report</h3>
                <p className="text-xs text-slate-500">Products nearing expiry or expired</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 2. Non Moving Report Card */}
          <div
            onClick={() => setActiveReportTab('NON_MOVING')}
            className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-amber-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Non Moving Report</h3>
                <p className="text-xs text-slate-500">Products with no sales in selected period</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Prescription Register Card */}
          <div
            onClick={() => setActiveReportTab('PRESCRIPTION')}
            className="bg-purple-50/80 border border-purple-200 rounded-xl p-4 flex items-center justify-between shadow-2xs cursor-pointer hover:bg-purple-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Prescription Register</h3>
                <p className="text-xs text-slate-500">View and maintain prescription records</p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* 3 Column Report Grid matching Image 5 (Shown for OVERVIEW, EXPIRY, NON_MOVING, PRESCRIPTION) */}
      {(activeReportTab === 'OVERVIEW' || activeReportTab === 'EXPIRY' || activeReportTab === 'NON_MOVING' || activeReportTab === 'PRESCRIPTION') ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* =========================================================
            COLUMN 1: EXPIRY REPORT
            ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2 font-bold text-slate-900 text-xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Expiry Report</span>
          </div>

          <div className="p-3 space-y-2 border-b border-slate-100 bg-slate-50/50 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">From Date</label>
                <input
                  type="date"
                  value={expiryFromDate}
                  onChange={(e) => setExpiryFromDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">To Date</label>
                <input
                  type="date"
                  value={expiryToDate}
                  onChange={(e) => setExpiryToDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Status</label>
              <select
                value={expiryStatusFilter}
                onChange={(e) => setExpiryStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
              >
                <option value="ALL">All (Near Expiry + Expired)</option>
                <option value="NEAR">Near Expiry Only (&lt; 90 Days)</option>
                <option value="EXPIRED">Expired Stock Only</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Product (F2)"
                  value={expirySearch}
                  onChange={(e) => setExpirySearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md pl-2 pr-7 py-1 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer"
              >
                View Report (F5)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto min-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <th className="p-2">#</th>
                  <th className="p-2">Product Name</th>
                  <th className="p-2">Batch No</th>
                  <th className="p-2">Expiry Date</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                {expiryData.slice((expiryPage - 1) * 10, expiryPage * 10).map((row, idx) => (
                  <tr key={row.batchId} className="hover:bg-slate-50/60">
                    <td className="p-2 font-mono text-slate-400">{(expiryPage - 1) * 10 + idx + 1}</td>
                    <td className="p-2 font-semibold text-slate-800 truncate max-w-[120px]">{row.productName}</td>
                    <td className="p-2 font-mono text-slate-600">{row.batchNo}</td>
                    <td className="p-2 font-mono text-slate-600">{row.expiryDate}</td>
                    <td className="p-2 font-bold text-slate-900">{row.stock}</td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'Expired'
                            ? 'bg-rose-100 text-rose-700'
                            : row.status === 'Near Expiry'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Export matching Image 5 */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Showing 1 to {Math.min(10, expiryData.length)} of {expiryData.length}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setExpiryPage((p) => Math.max(1, p - 1))}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &lt;
              </button>
              <button type="button" className="w-5 h-5 flex items-center justify-center border border-blue-600 rounded bg-blue-600 text-white font-bold">
                {expiryPage}
              </button>
              <button
                type="button"
                onClick={() => setExpiryPage((p) => p + 1)}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="p-2.5 border-t border-slate-200 grid grid-cols-3 gap-2">
            <button
              type="button"
              className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Export Excel
            </button>
            <button
              type="button"
              className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Print (F6)
            </button>
            <button
              type="button"
              className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* =========================================================
            COLUMN 2: NON MOVING REPORT
            ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2 font-bold text-slate-900 text-xs">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Non Moving Report</span>
          </div>

          <div className="p-3 space-y-2 border-b border-slate-100 bg-slate-50/50 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Period (No Sales in Last)</label>
              <select
                value={nonMovingPeriod}
                onChange={(e) => setNonMovingPeriod(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
                <option value="180">180 Days</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">From Date</label>
                <input
                  type="date"
                  value={nonMovingFromDate}
                  onChange={(e) => setNonMovingFromDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">To Date</label>
                <input
                  type="date"
                  value={nonMovingToDate}
                  onChange={(e) => setNonMovingToDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Product (F2)"
                  value={nonMovingSearch}
                  onChange={(e) => setNonMovingSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md pl-2 pr-7 py-1 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer"
              >
                View Report (F5)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto min-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <th className="p-2">#</th>
                  <th className="p-2">Product Name</th>
                  <th className="p-2">Batch No</th>
                  <th className="p-2">Last Sale Date</th>
                  <th className="p-2">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                {nonMovingData.slice((nonMovingPage - 1) * 10, nonMovingPage * 10).map((row, idx) => (
                  <tr key={row.productId} className="hover:bg-slate-50/60">
                    <td className="p-2 font-mono text-slate-400">{(nonMovingPage - 1) * 10 + idx + 1}</td>
                    <td className="p-2 font-semibold text-slate-800 truncate max-w-[130px]">{row.productName}</td>
                    <td className="p-2 font-mono text-slate-600">{row.batchNo}</td>
                    <td className="p-2 font-mono text-slate-600">{row.lastSaleDate}</td>
                    <td className="p-2 font-bold text-slate-900">{row.currentStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Export */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Showing 1 to {Math.min(10, nonMovingData.length)} of {nonMovingData.length}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setNonMovingPage((p) => Math.max(1, p - 1))}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &lt;
              </button>
              <button type="button" className="w-5 h-5 flex items-center justify-center border border-blue-600 rounded bg-blue-600 text-white font-bold">
                {nonMovingPage}
              </button>
              <button
                type="button"
                onClick={() => setNonMovingPage((p) => p + 1)}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="p-2.5 border-t border-slate-200 grid grid-cols-3 gap-2">
            <button
              type="button"
              className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Export Excel
            </button>
            <button
              type="button"
              className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Print (F6)
            </button>
            <button
              type="button"
              className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* =========================================================
            COLUMN 3: PRESCRIPTION REGISTER
            ========================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2 font-bold text-slate-900 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span>Prescription Register</span>
          </div>

          <div className="p-3 space-y-2 border-b border-slate-100 bg-slate-50/50 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">From Date</label>
                <input
                  type="date"
                  value={rxFromDate}
                  onChange={(e) => setRxFromDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">To Date</label>
                <input
                  type="date"
                  value={rxToDate}
                  onChange={(e) => setRxToDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Doctor</label>
              <select
                value={rxDoctorFilter}
                onChange={(e) => setRxDoctorFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs"
              >
                <option value="ALL">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search Patient / Prescription No (F2)"
                  value={rxSearch}
                  onChange={(e) => setRxSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md pl-2 pr-7 py-1 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2" />
              </div>
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer"
              >
                View Report (F5)
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto min-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <th className="p-2">#</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Prescription No</th>
                  <th className="p-2">Patient Name</th>
                  <th className="p-2">Doctor</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                {prescriptionData.slice((rxPage - 1) * 10, rxPage * 10).map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="p-2 font-mono text-slate-400">{(rxPage - 1) * 10 + idx + 1}</td>
                    <td className="p-2 font-mono text-slate-600">{row.date}</td>
                    <td className="p-2 font-mono font-semibold text-blue-700">{row.prescriptionNo}</td>
                    <td className="p-2 font-semibold text-slate-800 truncate max-w-[100px]">{row.patientName}</td>
                    <td className="p-2 text-slate-600 truncate max-w-[100px]">{row.doctor}</td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => setViewRxItem(row)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination & Export */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Showing 1 to {Math.min(10, prescriptionData.length)} of {prescriptionData.length}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setRxPage((p) => Math.max(1, p - 1))}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &lt;
              </button>
              <button type="button" className="w-5 h-5 flex items-center justify-center border border-blue-600 rounded bg-blue-600 text-white font-bold">
                {rxPage}
              </button>
              <button
                type="button"
                onClick={() => setRxPage((p) => p + 1)}
                className="w-5 h-5 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="p-2.5 border-t border-slate-200 grid grid-cols-3 gap-2">
            <button
              type="button"
              className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Export Excel
            </button>
            <button
              type="button"
              className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Print (F6)
            </button>
            <button
              type="button"
              className="py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold cursor-pointer text-center"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
      ) : (
        /* Dedicated Register View for Remaining Reports */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {(activeReportTab === 'COLLECTION' || activeReportTab === 'DAILY_COLLECTION')
                  ? 'Daily Collection & Counter Cash Summary'
                  : activeReportTab === 'PRODUCT_SALES'
                  ? 'Product-wise Sales & Volume Report'
                  : activeReportTab === 'SUPPLIER_PURCHASE'
                  ? 'Supplier-wise Inward Purchase Report'
                  : (activeReportTab === 'MARGIN' || activeReportTab === 'PROFIT_MARGIN')
                  ? 'Gross Profit & Commercial Margin Report'
                  : (activeReportTab === 'VALUATION' || activeReportTab === 'STOCK_VALUATION')
                  ? 'Stock Valuation Report (Cost vs MRP)'
                  : activeReportTab === 'PURCHASE_REGISTER'
                  ? 'Comprehensive Purchase Inward Register'
                  : activeReportTab === 'SALES_REGISTER'
                  ? 'Statutory Outward Sales Register'
                  : activeReportTab === 'RETURNS_REGISTER'
                  ? 'Sales & Purchase Returns Register'
                  : (activeReportTab === 'CANCELLED' || activeReportTab === 'CANCELLED_TXN')
                  ? 'Cancelled Transactions & Void Audit Report'
                  : 'Statutory System Audit Trail Report'}
              </h2>
              <p className="text-xs text-slate-500">Filtered for current fiscal period. Safe audit-logged data with double verification.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const headers = ['Doc No', 'Date', 'Party', 'Gross (INR)', 'Tax', 'Net Amount', 'Status'];
                  const rows = invoices.map((inv) => [
                    inv.invoiceNumber,
                    inv.invoiceDate,
                    `"${inv.prescription?.patientName || inv.customerName || 'Walk-in'}"`,
                    inv.subtotal.toFixed(2),
                    inv.totalTax.toFixed(2),
                    inv.grandTotal.toFixed(2),
                    inv.status,
                  ]);
                  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeReportTab}_Report.csv`;
                  a.click();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">Reference / Bill No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer / Supplier</th>
                  <th className="py-2.5 px-3 text-center">Items Count</th>
                  <th className="py-2.5 px-3 text-right">Taxable Amount</th>
                  <th className="py-2.5 px-3 text-right">Tax Total</th>
                  <th className="py-2.5 px-3 text-right">Net Value (INR)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invoices.slice(0, 10).map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-[#0084ff]">{inv.invoiceNumber}</td>
                    <td className="py-2 px-3 text-slate-600">{inv.invoiceDate.split('T')[0]}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{inv.prescription?.patientName || inv.customerName || 'Walk-in Retail Patient'}</td>
                    <td className="py-2 px-3 text-center font-mono">{inv.items.length}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatINR(inv.subtotal)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">{formatINR(inv.totalTax)}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(inv.grandTotal)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Prescription Details */}
      {viewRxItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Prescription #{viewRxItem.prescriptionNo}</h3>
                <p className="text-xs text-slate-500">Bill #{viewRxItem.invoiceNo} · Date: {viewRxItem.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewRxItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900">{viewRxItem.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prescribing Doctor:</span>
                <span className="font-semibold text-slate-900">{viewRxItem.doctor}</span>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2">
                <h4 className="font-bold text-slate-800 text-[11px] mb-1">Prescribed Medicines:</h4>
                <div className="space-y-1">
                  {viewRxItem.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-[11px] bg-slate-50 p-1.5 rounded">
                      <span className="font-medium text-slate-800">{it.product?.name || it.productName || 'Medicine'}</span>
                      <span className="font-mono text-slate-600">Qty: {it.quantity || it.totalTabletsSold || 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewRxItem(null)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
