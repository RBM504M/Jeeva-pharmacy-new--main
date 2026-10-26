import React, { useState, useMemo } from 'react';
import {
  FileCheck,
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
  Building,
  DollarSign,
  ChevronDown,
  Trash2,
  Eye,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR } from '../../types/pharmacy';

export type PurchaseOrderTab =
  | 'NEW_PO'
  | 'PO_REGISTER'
  | 'PENDING'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PO_REPORT';

export interface PurchaseOrderViewProps {
  initialTab?: PurchaseOrderTab | string;
  onNavigateToGrn?: (poNumber?: string) => void;
  onOpenNewPo?: () => void;
}

interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  poDate: string;
  expectedDate: string;
  vendorId: string;
  vendorName: string;
  itemsCount: number;
  totalAmount: number;
  status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes: string;
  cancelReason?: string;
  items: Array<{
    productName: string;
    stripSize: number;
    orderQtyStrips: number;
    receivedQtyStrips: number;
    unitCost: number;
    gstRate: number;
    lineTotal: number;
  }>;
}

const normalizePoTab = (tab?: string): PurchaseOrderTab => {
  if (!tab) return 'PO_REGISTER';
  if (tab === 'REGISTER' || tab === 'PO_REGISTER') return 'PO_REGISTER';
  if (tab === 'NEW' || tab === 'NEW_PO') return 'NEW_PO';
  if (tab === 'PARTIAL' || tab === 'PARTIALLY_RECEIVED') return 'PARTIALLY_RECEIVED';
  if (tab === 'REPORT' || tab === 'PO_REPORT') return 'PO_REPORT';
  if (tab === 'PENDING') return 'PENDING';
  if (tab === 'COMPLETED') return 'COMPLETED';
  if (tab === 'CANCELLED') return 'CANCELLED';
  return 'PO_REGISTER';
};

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({
  initialTab = 'PO_REGISTER',
  onNavigateToGrn,
  onOpenNewPo,
}) => {
  const { vendors, products } = usePharmacy();

  const [activeTab, setActiveTab] = useState<PurchaseOrderTab>(normalizePoTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      const normalized = normalizePoTab(initialTab);
      setActiveTab(normalized);
      if (initialTab === 'NEW' || initialTab === 'NEW_PO') {
        setShowNewPoModal(true);
      }
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Purchase Orders collection (starts empty on clean installation)
  const [orders, setOrders] = useState<PurchaseOrderItem[]>([]);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderItem | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelTargetId, setCancelTargetId] = useState<string>('');
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  // New PO Modal State
  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [newPoVendorId, setNewPoVendorId] = useState(vendors[0]?.id || '');
  const [newPoExpectedDate, setNewPoExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [newPoNotes, setNewPoNotes] = useState('Standard 30-day credit delivery terms.');
  const [newPoRows, setNewPoRows] = useState([
    {
      productName: products[0]?.name || 'Paracetamol 650mg',
      stripSize: 10,
      orderQtyStrips: 50,
      unitCost: 25.0,
      gstRate: 12,
    },
  ]);

  // Filtering
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      // Tab filter
      if (activeTab === 'PENDING' && po.status !== 'PENDING') return false;
      if (activeTab === 'PARTIALLY_RECEIVED' && po.status !== 'PARTIALLY_RECEIVED') return false;
      if (activeTab === 'COMPLETED' && po.status !== 'COMPLETED') return false;
      if (activeTab === 'CANCELLED' && po.status !== 'CANCELLED') return false;

      // Vendor filter
      if (selectedVendorFilter !== 'ALL' && po.vendorId !== selectedVendorFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPo = po.poNumber.toLowerCase().includes(q);
        const matchesVendor = po.vendorName.toLowerCase().includes(q);
        const matchesItems = po.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesPo && !matchesVendor && !matchesItems) return false;
      }
      return true;
    });
  }, [orders, activeTab, selectedVendorFilter, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
    const partialCount = orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length;
    const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;
    const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
    const totalValue = orders.reduce((acc, o) => acc + o.totalAmount, 0);

    return { totalCount, pendingCount, partialCount, completedCount, cancelledCount, totalValue };
  }, [orders]);

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find((v) => v.id === newPoVendorId) || vendors[0];
    const generatedPoNumber = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;

    const calculatedItems = newPoRows.map((row) => {
      const gross = row.orderQtyStrips * row.unitCost;
      const tax = gross * (row.gstRate / 100);
      return {
        productName: row.productName,
        stripSize: row.stripSize,
        orderQtyStrips: row.orderQtyStrips,
        receivedQtyStrips: 0,
        unitCost: row.unitCost,
        gstRate: row.gstRate,
        lineTotal: Number((gross + tax).toFixed(2)),
      };
    });

    const totalAmount = calculatedItems.reduce((acc, it) => acc + it.lineTotal, 0);

    const newOrder: PurchaseOrderItem = {
      id: `po-${Date.now()}`,
      poNumber: generatedPoNumber,
      poDate: new Date().toISOString().split('T')[0],
      expectedDate: newPoExpectedDate,
      vendorId: vendor?.id || 'v1',
      vendorName: vendor?.companyName || (vendor as any)?.name || 'Authorized Wholesaler',
      itemsCount: calculatedItems.length,
      totalAmount,
      status: 'PENDING',
      notes: newPoNotes,
      items: calculatedItems,
    };

    setOrders([newOrder, ...orders]);
    setShowNewPoModal(false);
    showToast(`✓ Purchase Order ${generatedPoNumber} created successfully!`);
    setActiveTab('PO_REGISTER');
  };

  const handleCancelPo = () => {
    if (!cancelReasonInput.trim()) {
      alert('Please specify a valid cancellation reason.');
      return;
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.id === cancelTargetId
          ? { ...o, status: 'CANCELLED', cancelReason: cancelReasonInput }
          : o
      )
    );
    setShowCancelModal(false);
    setCancelTargetId('');
    setCancelReasonInput('');
    showToast('✓ Purchase Order marked as Cancelled with audit record.');
  };

  const handleExportCsv = () => {
    const headers = ['PO Number', 'Date', 'Supplier', 'Items', 'Total Value', 'Status', 'Notes'];
    const rows = filteredOrders.map((o) => [
      o.poNumber,
      o.poDate,
      `"${o.vendorName}"`,
      o.itemsCount,
      o.totalAmount.toFixed(2),
      o.status,
      `"${o.notes || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Purchase_Orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported Purchase Order Register (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#0084ff]" />
              <h1 className="text-base font-bold text-slate-900">Purchase Order Management</h1>
              <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold border border-sky-200">
                Supply Chain & Replenishment
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create supplier purchase orders, track order fulfillment, pending shipments and vendor reconciliation.
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
              onClick={() => setShowNewPoModal(true)}
              className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* 7 Submenus as Horizontal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('PO_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PO_REGISTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Purchase Order Register</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full text-slate-600 font-mono">
              {summaryMetrics.totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pending Orders</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded-full font-mono">
              {summaryMetrics.pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PARTIALLY_RECEIVED')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PARTIALLY_RECEIVED'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-sky-500" />
            <span>Partially Received</span>
            <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded-full font-mono">
              {summaryMetrics.partialCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'COMPLETED'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed Orders</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-mono">
              {summaryMetrics.completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CANCELLED')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CANCELLED'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancelled Orders</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-mono">
              {summaryMetrics.cancelledCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PO_REPORT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PO_REPORT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-purple-500" />
            <span>Purchase Order Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Orders Placed</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summaryMetrics.totalCount} Orders</div>
          <div className="text-[10px] text-slate-400 mt-1">Value: {formatINR(summaryMetrics.totalValue)}</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span>Pending Dispatch</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-amber-900 mt-0.5">{summaryMetrics.pendingCount} Orders</div>
          <div className="text-[10px] text-amber-600 mt-1">Awaiting wholesaler dispatch</div>
        </div>

        <div className="bg-sky-50/60 border border-sky-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-sky-700 font-medium flex items-center justify-between">
            <span>Partially Inwarded</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-sky-900 mt-0.5">{summaryMetrics.partialCount} Orders</div>
          <div className="text-[10px] text-sky-600 mt-1">Split delivery in progress</div>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
            <span>Completed & Reconciled</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-emerald-900 mt-0.5">{summaryMetrics.completedCount} Orders</div>
          <div className="text-[10px] text-emerald-600 mt-1">Fully stocked into inventory</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by PO Number, Supplier or Medicine..."
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
                {v.companyName || (v as any).name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 font-medium text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredOrders.length}</span> records
        </div>
      </div>

      {/* Main Table or Report View */}
      {activeTab !== 'PO_REPORT' ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">PO Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Expected Date</th>
                  <th className="py-2.5 px-3">Wholesaler / Supplier</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Order Value (INR)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No purchase orders match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0084ff]">
                        {po.poNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{po.poDate}</td>
                      <td className="py-2.5 px-3 text-slate-600">{po.expectedDate}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{po.vendorName}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{po.itemsCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatINR(po.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            po.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : po.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(po)}
                            className="p-1 text-slate-600 hover:text-[#0084ff] hover:bg-slate-100 rounded cursor-pointer"
                            title="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {po.status === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToGrn) {
                                    onNavigateToGrn(po.poNumber);
                                  } else {
                                    showToast(`Navigating to GRN for ${po.poNumber}`);
                                  }
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium cursor-pointer"
                                title="Generate GRN"
                              >
                                Create GRN
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelTargetId(po.id);
                                  setShowCancelModal(true);
                                }}
                                className="px-1.5 py-0.5 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-medium border border-rose-200 cursor-pointer"
                                title="Cancel Purchase Order"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Purchase Order Report view */
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Purchase Order Analysis & Fulfillment Report</h2>
              <p className="text-xs text-slate-500">Breakdown of orders by supplier, fulfillment percentage and turnaround time.</p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-[#0084ff] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Supplier Summary</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendors.map((vendor) => {
              const vendorOrders = orders.filter((o) => o.vendorId === vendor.id);
              const totalVal = vendorOrders.reduce((sum, o) => sum + o.totalAmount, 0);
              const fulfilled = vendorOrders.filter((o) => o.status === 'COMPLETED').length;
              const rate = vendorOrders.length > 0 ? Math.round((fulfilled / vendorOrders.length) * 100) : 0;

              return (
                <div key={vendor.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">{vendor.companyName || (vendor as any).name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      {vendorOrders.length} POs
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">Total Ordered: <strong className="text-slate-900">{formatINR(totalVal)}</strong></div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Fulfillment Ratio</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Order Specification: {selectedOrder.poNumber}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      selectedOrder.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedOrder.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Supplier: {selectedOrder.vendorName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 text-[10px] block">Order Date</span>
                <span className="font-semibold text-slate-800">{selectedOrder.poDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Expected Delivery</span>
                <span className="font-semibold text-slate-800">{selectedOrder.expectedDate}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Total Amount</span>
                <span className="font-bold text-[#0084ff]">{formatINR(selectedOrder.totalAmount)}</span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="text-xs bg-sky-50 border border-sky-100 p-2.5 rounded text-sky-900">
                <strong>Notes / Terms:</strong> {selectedOrder.notes}
              </div>
            )}

            {selectedOrder.cancelReason && (
              <div className="text-xs bg-rose-50 border border-rose-200 p-2.5 rounded text-rose-800">
                <strong>Cancellation Reason:</strong> {selectedOrder.cancelReason}
              </div>
            )}

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-center">Pack</th>
                    <th className="p-2 text-center">Ordered</th>
                    <th className="p-2 text-center">Received</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-medium text-slate-900">{item.productName}</td>
                      <td className="p-2 text-center font-mono">{item.stripSize}s</td>
                      <td className="p-2 text-center font-mono font-bold">{item.orderQtyStrips}</td>
                      <td className="p-2 text-center font-mono text-emerald-700 font-bold">{item.receivedQtyStrips}</td>
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
                Print PO Copy
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
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
              <span>Cancel Purchase Order</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this purchase order? An audit entry will be recorded with your authorized credentials.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Wholesaler out-of-stock, commercial rate disagreement..."
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
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelPo}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PO MODAL */}
      {showNewPoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#0084ff]" />
                <h3 className="text-sm font-bold text-slate-900">Create New Purchase Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPoModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Wholesaler / Supplier *</label>
                  <select
                    value={newPoVendorId}
                    onChange={(e) => setNewPoVendorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-hidden focus:border-[#0084ff]"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName || (v as any).name} ({v.state || (v as any).city || 'India'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expected Delivery Date *</label>
                  <input
                    type="date"
                    value={newPoExpectedDate}
                    onChange={(e) => setNewPoExpectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-hidden focus:border-[#0084ff]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Order Notes / Terms</label>
                <input
                  type="text"
                  value={newPoNotes}
                  onChange={(e) => setNewPoNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs focus:outline-hidden focus:border-[#0084ff]"
                />
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 p-2 font-semibold text-slate-700 flex justify-between items-center">
                  <span>Order Items List</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPoRows([
                        ...newPoRows,
                        {
                          productName: products[1]?.name || 'Amoxicillin 500mg',
                          stripSize: 10,
                          orderQtyStrips: 20,
                          unitCost: 35.0,
                          gstRate: 12,
                        },
                      ])
                    }
                    className="text-[#0084ff] hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    + Add Item Row
                  </button>
                </div>
                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {newPoRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={row.productName}
                          onChange={(e) => {
                            const selectedProd = products.find((p) => p.name === e.target.value);
                            const updated = [...newPoRows];
                            updated[idx].productName = e.target.value;
                            if (selectedProd) {
                              updated[idx].stripSize = selectedProd.stripSize;
                              updated[idx].gstRate = selectedProd.defaultGstRate;
                            }
                            setNewPoRows(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty (Strips)"
                          value={row.orderQtyStrips}
                          onChange={(e) => {
                            const updated = [...newPoRows];
                            updated[idx].orderQtyStrips = Number(e.target.value) || 0;
                            setNewPoRows(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-center font-mono"
                          min={1}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Cost"
                          value={row.unitCost}
                          onChange={(e) => {
                            const updated = [...newPoRows];
                            updated[idx].unitCost = Number(e.target.value) || 0;
                            setNewPoRows(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-right font-mono"
                        />
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-slate-800">
                        {formatINR(row.orderQtyStrips * row.unitCost * (1 + row.gstRate / 100))}
                      </div>
                      <div className="col-span-1 text-center">
                        {newPoRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewPoRows(newPoRows.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
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
                  onClick={() => setShowNewPoModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Generate Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
