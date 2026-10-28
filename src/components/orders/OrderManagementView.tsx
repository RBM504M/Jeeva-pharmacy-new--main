import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  AlertCircle,
  Truck,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, formatDualUnitStock } from '../../types/pharmacy';
import { WantedBookItem, SuggestedOrderItem } from '../../types/shopaid';

export interface OrderManagementViewProps {
  initialTab?: 'WANTED_BOOK' | 'ORDER_BASED_ON_SALES';
}

export const OrderManagementView: React.FC<OrderManagementViewProps> = ({
  initialTab = 'WANTED_BOOK',
}) => {
  const {
    wantedBook,
    addWantedBookItem,
    updateWantedBookItemStatus,
    deleteWantedBookItem,
    products,
    batches,
    invoices,
    vendors,
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'WANTED_BOOK' | 'ORDER_BASED_ON_SALES'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ==========================================
  // 1. WANTED BOOK STATE
  // ==========================================
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [newWanted, setNewWanted] = useState({
    drugName: '',
    genericComposition: '',
    requestedQuantityStrips: 5,
    preferredVendorId: vendors[0]?.id || '',
    doctorName: '',
    patientName: '',
    patientContact: '',
    urgency: 'HIGH' as const,
    notes: '',
  });

  const filteredWantedBook = useMemo(() => {
    if (filterUrgency === 'ALL') return wantedBook;
    return wantedBook.filter((item) => item.urgency === filterUrgency);
  }, [wantedBook, filterUrgency]);

  const handleCreateWantedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWanted.drugName.trim()) {
      alert('Please enter drug or brand name.');
      return;
    }
    addWantedBookItem(newWanted);
    showToast(`✓ Added ${newWanted.drugName} to Wanted Book`);
    setShowAddModal(false);
    setNewWanted({
      drugName: '',
      genericComposition: '',
      requestedQuantityStrips: 5,
      preferredVendorId: vendors[0]?.id || '',
      doctorName: '',
      patientName: '',
      patientContact: '',
      urgency: 'HIGH',
      notes: '',
    });
  };

  // ==========================================
  // 2. ORDER BASED ON SALES REPLENISHMENT PLANNER (Section 6.1)
  // ==========================================
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('ALL');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [bufferSafetyDays, setBufferSafetyDays] = useState<number>(5);

  // Compute sales velocity & suggested order per product
  const suggestedOrders: SuggestedOrderItem[] = useMemo(() => {
    // 1. Calculate sales count in the period
    const productSalesMap = new Map<string, number>();

    invoices
      .filter((inv) => {
        if (inv.status === 'CANCELLED') return false;
        const invDate = inv.invoiceDate.split('T')[0];
        return invDate >= fromDate && invDate <= toDate;
      })
      .forEach((inv) => {
        inv.items.forEach((item) => {
          const current = productSalesMap.get(item.product.id) || 0;
          productSalesMap.set(item.product.id, current + item.totalTabletsSold);
        });
      });

    // Calculate elapsed days
    const diffDays = Math.max(
      1,
      Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))
    );

    return products
      .filter((prod) => {
        if (selectedVendorFilter === 'ALL') return true;
        // Check if any batch belongs to vendor
        const pBatches = batches.filter((b) => b.productId === prod.id);
        return pBatches.some((b) => b.vendorId === selectedVendorFilter);
      })
      .map((prod) => {
        const prodBatches = batches.filter((b) => b.productId === prod.id);
        const totalStockTablets = prodBatches.reduce((acc, b) => acc + b.totalTablets, 0);
        const totalSold = productSalesMap.get(prod.id) || 0;
        const dailyRate = totalSold / diffDays;

        // Suggested replenishment = (Daily Rate * (Lead Time + Safety Days)) - Current Stock
        const targetHoldingTablets = Math.ceil(dailyRate * (leadTimeDays + bufferSafetyDays));
        const neededTablets = Math.max(0, targetHoldingTablets - totalStockTablets);
        const suggestedStrips = Math.ceil(neededTablets / prod.stripSize);

        // Typical cost price
        const latestBatch = prodBatches[0];
        const costPrice = latestBatch?.costPricePerStrip || 25;
        const estimatedCost = Number((suggestedStrips * costPrice).toFixed(2));

        const vendor = vendors.find((v) => v.id === latestBatch?.vendorId) || vendors[0];

        return {
          productId: prod.id,
          productName: prod.name,
          genericComposition: prod.genericComposition,
          manufacturer: prod.manufacturer,
          currentStockTablets: totalStockTablets,
          currentStockStripsFormatted: formatDualUnitStock(totalStockTablets, prod.stripSize).displayString,
          reorderLevelTablets: prod.reorderLevelUnits,
          dailySalesRate: Number(dailyRate.toFixed(2)),
          leadTimeDays,
          suggestedOrderStrips: suggestedStrips,
          estimatedCost,
          preferredVendorName: vendor?.companyName || 'Unassigned Vendor',
          preferredVendorId: vendor?.id,
        };
      })
      .sort((a, b) => b.suggestedOrderStrips - a.suggestedOrderStrips);
  }, [products, batches, invoices, vendors, fromDate, toDate, selectedVendorFilter, leadTimeDays, bufferSafetyDays]);

  // Export Suggested Order to CSV
  const handleExportOrderCsv = () => {
    const headers = [
      'Product Name',
      'Generic Composition',
      'Manufacturer',
      'Preferred Supplier',
      'Current In-Hand Stock',
      'Daily Sales Rate (Tabs/day)',
      'Lead Time (Days)',
      'Suggested Order (Strips)',
      'Estimated Cost (INR)',
    ];

    const rows = suggestedOrders
      .filter((o) => o.suggestedOrderStrips > 0)
      .map((o) => [
        `"${o.productName}"`,
        `"${o.genericComposition}"`,
        `"${o.manufacturer}"`,
        `"${o.preferredVendorName}"`,
        `"${o.currentStockStripsFormatted}"`,
        o.dailySalesRate,
        o.leadTimeDays,
        o.suggestedOrderStrips,
        o.estimatedCost,
      ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Suggested_Purchase_Order_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✓ Exported suggested purchase orders CSV');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
              Replenishment Hub
            </span>
            <h1 className="text-lg font-bold text-slate-900">Order Management & Shortage Planner</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain pharmacy shortage notebook (Wanted Book) and calculate intelligent purchase replenishment.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('WANTED_BOOK')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'WANTED_BOOK' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
            <span>Wanted Book (Shortages)</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full">
              {wantedBook.filter((w) => w.status === 'PENDING').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ORDER_BASED_ON_SALES')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ORDER_BASED_ON_SALES' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Order Based on Sales (Section 6.1)</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: WANTED BOOK (SHORTAGE NOTEBOOK)                   */}
      {/* ======================================================== */}
      {activeTab === 'WANTED_BOOK' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500 uppercase text-[11px]">Filter Priority:</span>
              {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((urg) => (
                <button
                  key={urg}
                  type="button"
                  onClick={() => setFilterUrgency(urg)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    filterUrgency === urg ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {urg}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Wanted Medicine</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWantedBook.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.urgency === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : item.urgency === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.urgency} Priority
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : item.status === 'ORDERED'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2">{item.drugName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.genericComposition}</p>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Qty:</span>
                      <span className="font-bold text-slate-900">{item.requestedQuantityStrips} Strips</span>
                    </div>
                    {item.patientName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Patient:</span>
                        <span className="text-slate-800 font-medium">{item.patientName}</span>
                      </div>
                    )}
                    {item.doctorName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Prescriber:</span>
                        <span className="text-slate-800">{item.doctorName}</span>
                      </div>
                    )}
                    {item.notes && (
                      <div className="pt-1 text-[11px] text-slate-600 italic border-t border-slate-200">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {item.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => {
                          updateWantedBookItemStatus(item.id, 'ORDERED');
                          showToast(`Marked ${item.drugName} as ORDERED`);
                        }}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Mark Ordered
                      </button>
                    )}
                    {item.status === 'ORDERED' && (
                      <button
                        type="button"
                        onClick={() => {
                          updateWantedBookItemStatus(item.id, 'FULFILLED');
                          showToast(`Marked ${item.drugName} as FULFILLED`);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      deleteWantedBookItem(item.id);
                      showToast(`Removed from Wanted Book`);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ORDER BASED ON SALES (Section 6.1)                */}
      {/* ======================================================== */}
      {activeTab === 'ORDER_BASED_ON_SALES' && (
        <div className="space-y-4">
          {/* Controls toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Sales From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Sales To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lead Time (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Buffer Stock (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={bufferSafetyDays}
                  onChange={(e) => setBufferSafetyDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Supplier Filter:</span>
                <select
                  value={selectedVendorFilter}
                  onChange={(e) => setSelectedVendorFilter(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg"
                >
                  <option value="ALL">All Wholesalers</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportOrderCsv}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Suggested PO (CSV)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Suggested Replenishment Table */}
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sales-Velocity Suggested Purchase Reorders
              </span>
              <span className="text-xs text-slate-500">
                Found {suggestedOrders.filter((s) => s.suggestedOrderStrips > 0).length} items needing reorder
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Manufacturer</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-right">In-Hand Stock</th>
                    <th className="p-3 text-right">Daily Velocity</th>
                    <th className="p-3 text-right">Suggested Order</th>
                    <th className="p-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {suggestedOrders.map((ord) => (
                    <tr
                      key={ord.productId}
                      className={`hover:bg-slate-50/50 ${
                        ord.suggestedOrderStrips > 0 ? 'bg-amber-50/30 font-medium' : ''
                      }`}
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{ord.productName}</div>
                        <div className="text-[10px] text-slate-500">{ord.genericComposition}</div>
                      </td>
                      <td className="p-3 text-slate-600">{ord.manufacturer}</td>
                      <td className="p-3 text-slate-700 font-semibold">{ord.preferredVendorName}</td>
                      <td className="p-3 text-right font-mono">{ord.currentStockStripsFormatted}</td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {ord.dailySalesRate} tabs/day
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded font-bold font-mono ${
                            ord.suggestedOrderStrips > 0
                              ? 'bg-emerald-100 text-emerald-800 text-xs'
                              : 'text-slate-400'
                          }`}
                        >
                          {ord.suggestedOrderStrips > 0 ? `+${ord.suggestedOrderStrips} Strips` : 'Adequate'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {ord.estimatedCost > 0 ? formatINR(ord.estimatedCost) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add to Wanted Book */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">
                Add to Wanted Book (Counter Shortage)
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWantedItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Medicine / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clexane 40mg Injection"
                  value={newWanted.drugName}
                  onChange={(e) => setNewWanted({ ...newWanted, drugName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Generic Salt Composition
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enoxaparin Sodium 40mg"
                  value={newWanted.genericComposition}
                  onChange={(e) => setNewWanted({ ...newWanted, genericComposition: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requested Qty (Strips)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newWanted.requestedQuantityStrips}
                    onChange={(e) => setNewWanted({ ...newWanted, requestedQuantityStrips: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority Urgency
                  </label>
                  <select
                    value={newWanted.urgency}
                    onChange={(e) => setNewWanted({ ...newWanted, urgency: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="HIGH">High Priority (Urgent Patient)</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low / Routine Stocking</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. K. Vasanth"
                    value={newWanted.patientName}
                    onChange={(e) => setNewWanted({ ...newWanted, patientName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Patient Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9840182736"
                    value={newWanted.patientContact}
                    onChange={(e) => setNewWanted({ ...newWanted, patientContact: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. A. Swaminathan"
                  value={newWanted.doctorName}
                  onChange={(e) => setNewWanted({ ...newWanted, doctorName: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for shortage, customer commitment time..."
                  value={newWanted.notes}
                  onChange={(e) => setNewWanted({ ...newWanted, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save to Wanted Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
