import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  History,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  Product,
  Batch,
  GSTRate,
  DrugSchedule,
  formatINR,
  formatDualUnitStock,
  calculateExpiryZone,
} from '../../types/pharmacy';
import { exportInventoryValuationCsv } from '../../utils/csvExport';

export interface InventoryManagementProps {
  initialTab?: string;
  onNavigateToStockAudit?: (batchId?: string, mode?: 'ADJUSTMENT' | 'VENDOR_RETURN') => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  initialTab = 'OVERVIEW',
  onNavigateToStockAudit,
}) => {
  const { products, batches, addProduct, addBatch, currentUser } = usePharmacy();

  const [activeInventoryTab, setActiveInventoryTab] = useState<string>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveInventoryTab(initialTab);
    }
  }, [initialTab]);

  const [search, setSearch] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('ALL');
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [batchTargetProductId, setBatchTargetProductId] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const [newProductForm, setNewProductForm] = useState<{
    name: string;
    genericComposition: string;
    manufacturer: string;
    hsnCode: string;
    barcode: string;
    stripSize: number;
    drugSchedule: DrugSchedule;
    reorderLevelUnits: number;
    defaultGstRate: GSTRate;
    rackLocation: string;
  }>({
    name: '',
    genericComposition: '',
    manufacturer: '',
    hsnCode: '3004',
    barcode: '',
    stripSize: 10,
    drugSchedule: 'OTC',
    reorderLevelUnits: 50,
    defaultGstRate: 12,
    rackLocation: 'Rack A - Shelf 01',
  });

  const [newBatchForm, setNewBatchForm] = useState<{
    batchNumber: string;
    expiryDate: string;
    manufacturingDate: string;
    costPricePerStrip: number;
    mrpPerStrip: number;
    sellingPricePerStrip: number;
    totalStrips: number;
    looseTablets: number;
    gstRate: GSTRate;
  }>({
    batchNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    costPricePerStrip: 30,
    mrpPerStrip: 50,
    sellingPricePerStrip: 48,
    totalStrips: 10,
    looseTablets: 0,
    gstRate: 12,
  });

  const inventoryRows = useMemo(() => {
    const list: Array<{
      product: Product;
      batch: Batch;
      stock: ReturnType<typeof formatDualUnitStock>;
      expiry: ReturnType<typeof calculateExpiryZone>;
    }> = [];

    batches.forEach((b) => {
      const p = products.find((prod) => prod.id === b.productId);
      if (!p) return;
      const stock = formatDualUnitStock(b.totalTablets, p.stripSize, p.reorderLevelUnits);
      const expiry = calculateExpiryZone(b.expiryDate);
      list.push({ product: p, batch: b, stock, expiry });
    });

    return list.filter((item) => {
      if (selectedSchedule !== 'ALL' && item.product.drugSchedule !== selectedSchedule) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.product.name.toLowerCase().includes(q) ||
        item.product.genericComposition.toLowerCase().includes(q) ||
        item.product.barcode.includes(q) ||
        item.product.hsnCode.includes(q) ||
        item.batch.batchNumber.toLowerCase().includes(q)
      );
    });
  }, [products, batches, search, selectedSchedule]);

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name || !newProductForm.barcode || !newProductForm.hsnCode) {
      alert('Product Name, Barcode, and HSN Code are mandatory.');
      return;
    }

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      ...newProductForm,
      isActive: true,
    };
    addProduct(newProd);

    setBatchTargetProductId(newProd.id);
    setShowAddMedicineModal(false);
    setShowAddBatchModal(true);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === batchTargetProductId);
    if (!prod) {
      alert('Please select a valid medicine for this batch.');
      return;
    }

    const atomicUnits = newBatchForm.totalStrips * prod.stripSize + newBatchForm.looseTablets;

    const newBatch: Batch = {
      id: `batch_${Date.now()}`,
      productId: prod.id,
      batchNumber: newBatchForm.batchNumber.toUpperCase().trim(),
      expiryDate: newBatchForm.expiryDate,
      manufacturingDate: newBatchForm.manufacturingDate || new Date().toISOString().split('T')[0],
      costPricePerStrip: Number(newBatchForm.costPricePerStrip),
      mrpPerStrip: Number(newBatchForm.mrpPerStrip),
      sellingPricePerStrip: Number(newBatchForm.sellingPricePerStrip),
      gstRate: newBatchForm.gstRate,
      totalTablets: atomicUnits,
    };

    addBatch(newBatch);
    setShowAddBatchModal(false);
    setNewBatchForm({
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
      costPricePerStrip: 30,
      mrpPerStrip: 50,
      sellingPricePerStrip: 48,
      totalStrips: 10,
      looseTablets: 0,
      gstRate: 12,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-slate-800">
            Medicine Inventory & Batches
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Products / Medicine List</p>
        </div>

        <div className="flex items-center gap-2">
          {exportNotice && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded animate-in fade-in">
              {exportNotice}
            </span>
          )}

          {onNavigateToStockAudit && (
            <button
              type="button"
              onClick={() => onNavigateToStockAudit()}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Open Stock Audit Log to view all adjustments and historical logs"
            >
              <History className="w-4 h-4 text-sky-600" />
              <span>Stock Audit Log</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const res = exportInventoryValuationCsv(products, batches);
              setExportNotice(`✓ Downloaded ${res.fileName} (${res.rowCount} batches)`);
              setTimeout(() => setExportNotice(null), 3500);
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download full batch inventory and stock valuation in CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Stock CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddMedicineModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Medicine Master
          </button>
        </div>
      </div>

      {/* 12 Submenus as Horizontal Tabs */}
      <div className="bg-white border border-slate-200 rounded-md p-1.5 shadow-2xs overflow-x-auto flex items-center gap-1 text-xs">
        {[
          { id: 'OVERVIEW', label: 'Stock Overview' },
          { id: 'PRODUCT_STOCK', label: 'Product Stock' },
          { id: 'BATCH_STOCK', label: 'Batch-wise Stock' },
          { id: 'STOCK_LEDGER', label: 'Stock Ledger' },
          { id: 'OPENING_STOCK', label: 'Opening Stock' },
          { id: 'STOCK_ADJUSTMENT', label: 'Stock Adjustment' },
          { id: 'STOCK_TRANSFER', label: 'Stock Transfer' },
          { id: 'PHYSICAL_VERIFICATION', label: 'Physical Verification' },
          { id: 'STOCK_VALUATION', label: 'Stock Valuation' },
          { id: 'LOW_STOCK', label: 'Low Stock / Reorder' },
          { id: 'OUT_OF_STOCK', label: 'Out-of-Stock' },
          { id: 'ADJUSTMENT_REPORT', label: 'Adjustment Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveInventoryTab(tab.id);
              if (tab.id === 'STOCK_ADJUSTMENT' && onNavigateToStockAudit) {
                onNavigateToStockAudit(undefined, 'ADJUSTMENT');
              }
            }}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeInventoryTab === tab.id
                ? 'bg-[#0084ff] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white border border-slate-200/90 p-3.5 rounded-md shadow-xs">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Medicine Name, HSN code (3004), Barcode (EAN-13), or Batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-xs text-slate-800 focus:outline-hidden focus:border-slate-500"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-md text-xs bg-white text-slate-700"
          >
            <option value="ALL">All Drug Schedules</option>
            <option value="OTC">OTC (Over-The-Counter)</option>
            <option value="SCHEDULE_H">Schedule H (Prescription)</option>
            <option value="SCHEDULE_H1">Schedule H1 (Antibiotics)</option>
          </select>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3">Medicine & Manufacturer</th>
                <th className="p-3 text-center">HSN Code</th>
                <th className="p-3 text-center">Barcode / UPC</th>
                <th className="p-3 text-center">Batch No</th>
                <th className="p-3 text-center">Expiry Date</th>
                <th className="p-3 text-center">Strip Ratio</th>
                <th className="p-3 text-right">Cost / St</th>
                <th className="p-3 text-right">Selling / St</th>
                <th className="p-3 text-center">GST</th>
                <th className="p-3 text-right">Stock (Dual-Unit)</th>
                <th className="p-3 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inventoryRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    No matching medicine batches found.
                  </td>
                </tr>
              ) : (
                inventoryRows.map(({ product, batch, stock, expiry }) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-[11px] text-slate-500">{product.genericComposition}</div>
                      <div className="text-[10px] text-slate-400">Mfg: {product.manufacturer}</div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-700">
                      {product.hsnCode}
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                      {product.barcode}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-900">
                      {batch.batchNumber}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <div>
                        {new Date(batch.expiryDate).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] mt-0.5">
                        {expiry.zone === 'CRITICAL_30' && (
                          <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded font-bold">
                            {expiry.days}d (Critical)
                          </span>
                        )}
                        {expiry.zone === 'WARNING_60' && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-600 border border-amber-200 rounded font-bold">
                            {expiry.days}d (Warning)
                          </span>
                        )}
                        {expiry.zone === 'CAUTION_90' && (
                          <span className="px-1.5 py-0.2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded font-medium">
                            {expiry.days}d (Caution)
                          </span>
                        )}
                        {expiry.zone === 'SAFE' && (
                          <span className="text-slate-400 font-mono text-[10px]">Safe</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">
                      1 St = {product.stripSize} Tabs
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-600">
                      {currentUser.role === 'ADMIN' ? `₹${batch.costPricePerStrip.toFixed(2)}` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-slate-900">
                      ₹{batch.sellingPricePerStrip.toFixed(2)}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                        {batch.gstRate}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-semibold text-slate-900">{stock.displayString}</div>
                      <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                        ({stock.totalTablets} atomic units)
                      </div>
                      {stock.isLowStock && (
                        <span className="text-[9px] text-orange-700 font-bold bg-orange-50 border border-orange-200 px-1 py-0.2 rounded inline-block mt-0.5">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBatchTargetProductId(product.id);
                            setShowAddBatchModal(true);
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors text-[11px] font-medium border border-slate-200 cursor-pointer"
                          title="Add new batch"
                        >
                          + Batch
                        </button>
                        {onNavigateToStockAudit && (
                          <button
                            type="button"
                            onClick={() => onNavigateToStockAudit(batch.id, 'ADJUSTMENT')}
                            className="px-2 py-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors text-[11px] font-medium border border-amber-200 cursor-pointer"
                            title="Record manual stock recount or damage write-off"
                          >
                            Adjust
                          </button>
                        )}
                        {onNavigateToStockAudit && (
                          <button
                            type="button"
                            onClick={() => onNavigateToStockAudit(batch.id, 'VENDOR_RETURN')}
                            className="px-2 py-1 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors text-[11px] font-medium border border-purple-200 cursor-pointer"
                            title="Return stock to supplier (debit note)"
                          >
                            Return
                          </button>
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

      {/* Add Product Modal */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add New Medicine to Catalogue</h3>
              <button
                type="button"
                onClick={() => setShowAddMedicineModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Commercial Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dolo 650 Tablets"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Generic Salt Composition *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol IP 650mg"
                  value={newProductForm.genericComposition}
                  onChange={(e) =>
                    setNewProductForm({ ...newProductForm, genericComposition: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Micro Labs Ltd"
                    value={newProductForm.manufacturer}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, manufacturer: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">HSN Code * (India)</label>
                  <input
                    type="text"
                    required
                    placeholder="30049060"
                    value={newProductForm.hsnCode}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, hsnCode: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Barcode (EAN-13 / UPC) *</label>
                  <input
                    type="text"
                    required
                    placeholder="8901117009999"
                    value={newProductForm.barcode}
                    onChange={(e) =>
                      setNewProductForm({ ...newProductForm, barcode: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Strip Size (Tablets/Strip)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newProductForm.stripSize}
                    onChange={(e) =>
                      setNewProductForm({
                        ...newProductForm,
                        stripSize: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Schedule</label>
                  <select
                    value={newProductForm.drugSchedule}
                    onChange={(e) =>
                      setNewProductForm({
                        ...newProductForm,
                        drugSchedule: e.target.value as DrugSchedule,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  >
                    <option value="OTC">OTC</option>
                    <option value="SCHEDULE_H">Schedule H</option>
                    <option value="SCHEDULE_H1">Schedule H1</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Default GST Rate</label>
                  <select
                    value={newProductForm.defaultGstRate}
                    onChange={(e) =>
                      setNewProductForm({
                        ...newProductForm,
                        defaultGstRate: parseInt(e.target.value) as GSTRate,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min={5}
                    value={newProductForm.reorderLevelUnits}
                    onChange={(e) =>
                      setNewProductForm({
                        ...newProductForm,
                        reorderLevelUnits: parseInt(e.target.value) || 50,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold cursor-pointer"
                >
                  Save & Next: Add Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Stock Batch</h3>
                <p className="text-xs text-slate-500">
                  For: {products.find((p) => p.id === batchTargetProductId)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL26M19"
                  value={newBatchForm.batchNumber}
                  onChange={(e) =>
                    setNewBatchForm({ ...newBatchForm, batchNumber: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newBatchForm.expiryDate}
                    onChange={(e) =>
                      setNewBatchForm({ ...newBatchForm, expiryDate: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mfg Date</label>
                  <input
                    type="date"
                    value={newBatchForm.manufacturingDate}
                    onChange={(e) =>
                      setNewBatchForm({ ...newBatchForm, manufacturingDate: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cost / St (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    required
                    value={newBatchForm.costPricePerStrip}
                    onChange={(e) =>
                      setNewBatchForm({
                        ...newBatchForm,
                        costPricePerStrip: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">MRP / St (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    required
                    value={newBatchForm.mrpPerStrip}
                    onChange={(e) =>
                      setNewBatchForm({
                        ...newBatchForm,
                        mrpPerStrip: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sell / St (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    required
                    value={newBatchForm.sellingPricePerStrip}
                    onChange={(e) =>
                      setNewBatchForm({
                        ...newBatchForm,
                        sellingPricePerStrip: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-700 block text-[11px]">
                  Dual-Unit Intake Quantity
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Full Strips</label>
                    <input
                      type="number"
                      min={0}
                      value={newBatchForm.totalStrips}
                      onChange={(e) =>
                        setNewBatchForm({
                          ...newBatchForm,
                          totalStrips: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Loose Tablets</label>
                    <input
                      type="number"
                      min={0}
                      value={newBatchForm.looseTablets}
                      onChange={(e) =>
                        setNewBatchForm({
                          ...newBatchForm,
                          looseTablets: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer"
                >
                  Commit Inward Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
