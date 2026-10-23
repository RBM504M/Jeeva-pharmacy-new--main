import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Pill, AlertTriangle, ShieldCheck, Layers, MapPin, Building, Tag } from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Product, Batch, formatDualUnitStock, calculateExpiryZone, formatINR } from '../../types/pharmacy';

interface ProductBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string;
}

export const ProductBriefModal: React.FC<ProductBriefModalProps> = ({
  isOpen,
  onClose,
  preselectedProductId,
}) => {
  const { products, batches } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId || products[0]?.id || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedProductId) {
        setSelectedProductId(preselectedProductId);
      }
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, preselectedProductId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.genericComposition.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.manufacturer.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || filteredProducts[0];

  const productBatches = useMemo(() => {
    if (!selectedProduct) return [];
    return batches.filter((b) => b.productId === selectedProduct.id);
  }, [batches, selectedProduct]);

  const totalTablets = productBatches.reduce((acc, b) => acc + b.totalTablets, 0);
  const formattedStock = selectedProduct
    ? formatDualUnitStock(totalTablets, selectedProduct.stripSize, selectedProduct.reorderLevelUnits)
    : null;

  // Find therapeutic substitutes (same active generic salt)
  const substitutes = useMemo(() => {
    if (!selectedProduct) return [];
    const mainSalt = selectedProduct.genericComposition.toLowerCase().split(' ')[0];
    return products.filter(
      (p) =>
        p.id !== selectedProduct.id &&
        p.genericComposition.toLowerCase().includes(mainSalt)
    );
  }, [products, selectedProduct]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              F9
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Product Brief & Clinical Details</h2>
              <p className="text-xs text-slate-400">ShopAID Master Drug Inquiry & Batch Status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left search & list panel */}
          <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search medicine (F9)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
              {filteredProducts.map((prod) => {
                const isSelected = selectedProduct?.id === prod.id;
                const prodTotalTabs = batches
                  .filter((b) => b.productId === prod.id)
                  .reduce((acc, b) => acc + b.totalTablets, 0);
                const isLow = prodTotalTabs <= prod.reorderLevelUnits;

                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-medium shadow-xs'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight">{prod.name}</div>
                    <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {prod.genericComposition}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className={`font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        {prod.manufacturer.slice(0, 18)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isSelected
                            ? 'bg-emerald-700/60 text-white'
                            : isLow
                            ? 'bg-rose-100 text-rose-700 font-bold'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {prodTotalTabs} Tabs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Product Details Pane */}
          {selectedProduct ? (
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              {/* Top Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                        HSN: {selectedProduct.hsnCode}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold ${
                          selectedProduct.drugSchedule === 'OTC'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedProduct.drugSchedule === 'SCHEDULE_H1'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {selectedProduct.drugSchedule.replace('_', ' ')}
                      </span>
                      <span className="text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded font-medium">
                        GST: {selectedProduct.defaultGstRate}%
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-2">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{selectedProduct.genericComposition}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Current In-Hand Stock</div>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {formattedStock?.displayString}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Strip size: {selectedProduct.stripSize} tabs/strip
                    </div>
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Manufacturer</div>
                      <div className="font-semibold text-slate-800">{selectedProduct.manufacturer}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Storage Location / Rack</div>
                      <div className="font-semibold text-emerald-700">{selectedProduct.rackLocation || 'Dispensary Shelf'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Barcode</div>
                      <div className="font-mono font-medium text-slate-800">{selectedProduct.barcode}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batches Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Available Batches & Pricing Breakdown</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {productBatches.length} batch(es) in dispensary
                  </span>
                </h4>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">Batch Number</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Cost Price / Strip</th>
                        <th className="p-3">MRP / Strip</th>
                        <th className="p-3">Selling Price</th>
                        <th className="p-3 text-right">Available Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {productBatches.map((batch) => {
                        const { days, zone } = calculateExpiryZone(batch.expiryDate);
                        const bStock = formatDualUnitStock(batch.totalTablets, selectedProduct.stripSize);
                        return (
                          <tr key={batch.id} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono font-bold text-slate-900">{batch.batchNumber}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                  zone === 'CRITICAL_30'
                                    ? 'bg-rose-100 text-rose-700 font-bold'
                                    : zone === 'WARNING_60'
                                    ? 'bg-amber-100 text-amber-800 font-semibold'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {batch.expiryDate} ({days > 0 ? `${days}d left` : 'Expired'})
                              </span>
                            </td>
                            <td className="p-3 font-mono">{formatINR(batch.costPricePerStrip)}</td>
                            <td className="p-3 font-mono font-medium">{formatINR(batch.mrpPerStrip)}</td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {formatINR(batch.sellingPricePerStrip)}
                            </td>
                            <td className="p-3 text-right font-medium">
                              <span className="font-semibold text-slate-900">{bStock.strips} Strips</span>
                              {bStock.looseTablets > 0 && (
                                <span className="text-[10px] text-slate-500 ml-1">+{bStock.looseTablets} tabs</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {productBatches.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            No batches currently recorded in inventory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Therapeutic Substitutes Section */}
              {substitutes.length > 0 && (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Therapeutic Equivalents & Generic Substitutes Available</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {substitutes.map((sub) => {
                      const subStock = batches
                        .filter((b) => b.productId === sub.id)
                        .reduce((acc, b) => acc + b.totalTablets, 0);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedProductId(sub.id)}
                          className="bg-white border border-emerald-100 rounded-lg p-2.5 hover:border-emerald-300 transition-colors cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{sub.name}</div>
                            <div className="text-[10px] text-slate-500">{sub.manufacturer}</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                            {subStock} Tabs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a medicine to view clinical details
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Esc</kbd> to close</div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
