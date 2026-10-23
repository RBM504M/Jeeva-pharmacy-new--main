import React, { useState, useMemo } from 'react';
import {
  Boxes,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Download,
  Printer,
  Layers,
  ArrowRightLeft,
  Calendar,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, formatDualUnitStock, calculateExpiryZone } from '../../types/pharmacy';

type InventoryTab =
  | 'STOCK_REPORT'
  | 'STOCK_VALUE'
  | 'STOCK_MOVEMENT'
  | 'NON_MOVING'
  | 'NIL_STOCK'
  | 'TAX_BREAKUP'
  | 'FREE_STOCK';

export interface InventoryReportsViewProps {
  initialTab?: InventoryTab;
}

export const InventoryReportsView: React.FC<InventoryReportsViewProps> = ({
  initialTab = 'STOCK_REPORT',
}) => {
  const { products, batches, invoices, purchaseInvoices, stockAuditLogs } = usePharmacy();
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchFilter, setSearchFilter] = useState<string>('');

  // 1. Stock Report (Current In-Hand Stock by Batch & Location)
  const stockReportData = useMemo(() => {
    return batches
      .map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        if (!prod) return null;
        const stock = formatDualUnitStock(b.totalTablets, prod.stripSize, prod.reorderLevelUnits);
        const { days, zone } = calculateExpiryZone(b.expiryDate);
        return {
          batch: b,
          product: prod,
          stock,
          days,
          zone,
          costValue: Number(((b.totalTablets / prod.stripSize) * b.costPricePerStrip).toFixed(2)),
          mrpValue: Number(((b.totalTablets / prod.stripSize) * b.mrpPerStrip).toFixed(2)),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
          item.product.name.toLowerCase().includes(q) ||
          item.batch.batchNumber.toLowerCase().includes(q) ||
          (item.product.rackLocation && item.product.rackLocation.toLowerCase().includes(q))
        );
      });
  }, [batches, products, searchFilter]);

  // 2. Stock Value Report (Cost vs MRP Valuation)
  const stockValuationSummary = useMemo(() => {
    let totalCostValuation = 0;
    let totalMrpValuation = 0;
    let totalTabletsCount = 0;

    batches.forEach((b) => {
      const prod = products.find((p) => p.id === b.productId);
      const stripSize = prod?.stripSize || 10;
      const strips = b.totalTablets / stripSize;
      totalCostValuation += strips * b.costPricePerStrip;
      totalMrpValuation += strips * b.mrpPerStrip;
      totalTabletsCount += b.totalTablets;
    });

    const potentialGrossMargin = totalMrpValuation - totalCostValuation;
    const marginPercent = totalMrpValuation > 0 ? (potentialGrossMargin / totalMrpValuation) * 100 : 0;

    return {
      totalCostValuation: Number(totalCostValuation.toFixed(2)),
      totalMrpValuation: Number(totalMrpValuation.toFixed(2)),
      potentialGrossMargin: Number(potentialGrossMargin.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(1)),
      totalTabletsCount,
    };
  }, [batches, products]);

  // 3. Stock Movement / Flow Analysis
  const stockMovementData = useMemo(() => {
    return products.map((prod) => {
      const prodAudit = stockAuditLogs.filter((a) => a.productId === prod.id);

      const inwardTotal = prodAudit
        .filter((a) => a.adjustmentType === 'INWARD_PURCHASE')
        .reduce((acc, a) => acc + Math.max(0, a.quantityChangeTablets), 0);

      const salesTotal = prodAudit
        .filter((a) => a.adjustmentType === 'SALE_DEDUCTION')
        .reduce((acc, a) => acc + Math.abs(a.quantityChangeTablets), 0);

      const returnOrAdjTotal = prodAudit
        .filter((a) => a.adjustmentType !== 'INWARD_PURCHASE' && a.adjustmentType !== 'SALE_DEDUCTION')
        .reduce((acc, a) => acc + a.quantityChangeTablets, 0);

      const currentTablets = batches
        .filter((b) => b.productId === prod.id)
        .reduce((acc, b) => acc + b.totalTablets, 0);

      const openingEst = Math.max(0, currentTablets - inwardTotal + salesTotal - returnOrAdjTotal);

      return {
        product: prod,
        openingTablets: openingEst,
        inwardTablets: inwardTotal,
        salesTablets: salesTotal,
        adjustmentTablets: returnOrAdjTotal,
        closingTablets: currentTablets,
        closingFormatted: formatDualUnitStock(currentTablets, prod.stripSize).displayString,
      };
    });
  }, [products, batches, stockAuditLogs]);

  // 4. Non Moving Stock (Zero sales in last 30 days)
  const nonMovingData = useMemo(() => {
    const soldProductIds = new Set<string>();
    invoices.forEach((inv) => {
      inv.items.forEach((it) => soldProductIds.add(it.product.id));
    });

    return products
      .map((prod) => {
        const prodBatches = batches.filter((b) => b.productId === prod.id && b.totalTablets > 0);
        const totalStock = prodBatches.reduce((acc, b) => acc + b.totalTablets, 0);
        const isSold = soldProductIds.has(prod.id);
        if (totalStock === 0) return null;

        const valCost = prodBatches.reduce((acc, b) => acc + (b.totalTablets / prod.stripSize) * b.costPricePerStrip, 0);

        return {
          product: prod,
          batchesCount: prodBatches.length,
          totalStockTablets: totalStock,
          formattedStock: formatDualUnitStock(totalStock, prod.stripSize).displayString,
          valCost: Number(valCost.toFixed(2)),
          status: isSold ? 'Active Movement' : 'Zero Sales (Slow/Non-Moving)',
          isNonMoving: !isSold,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.isNonMoving);
  }, [products, batches, invoices]);

  // 5. Nil Stock Report (Zero stock)
  const nilStockData = useMemo(() => {
    return products
      .map((prod) => {
        const totalStock = batches
          .filter((b) => b.productId === prod.id)
          .reduce((acc, b) => acc + b.totalTablets, 0);
        if (totalStock > 0) return null;
        return {
          product: prod,
          reorderLevel: prod.reorderLevelUnits,
          rackLocation: prod.rackLocation || 'Dispensary Shelf',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [products, batches]);

  // 6. Tax Descriptionwise Closing Stock Breakup (Section 8)
  const taxBreakupData = useMemo(() => {
    const rateMap = new Map<number, { gstRate: number; batchCount: number; costValuation: number; mrpValuation: number }>();

    batches.forEach((b) => {
      const prod = products.find((p) => p.id === b.productId);
      const stripSize = prod?.stripSize || 10;
      const strips = b.totalTablets / stripSize;
      const cost = strips * b.costPricePerStrip;
      const mrp = strips * b.mrpPerStrip;

      const entry = rateMap.get(b.gstRate) || {
        gstRate: b.gstRate,
        batchCount: 0,
        costValuation: 0,
        mrpValuation: 0,
      };

      entry.batchCount += 1;
      entry.costValuation += cost;
      entry.mrpValuation += mrp;
      rateMap.set(b.gstRate, entry);
    });

    return Array.from(rateMap.values()).sort((a, b) => a.gstRate - b.gstRate);
  }, [batches, products]);

  // 7. Free Stock Value Report (Bonus Free Quantities received via Inward Purchases)
  const freeStockData = useMemo(() => {
    const list: Array<{
      grnNumber: string;
      vendorName: string;
      productName: string;
      freeStrips: number;
      mrpPerStrip: number;
      freeStockValue: number;
      date: string;
    }> = [];

    purchaseInvoices.forEach((po) => {
      po.items.forEach((item) => {
        if (item.freeStrips > 0) {
          list.push({
            grnNumber: po.grnNumber,
            vendorName: po.vendorName,
            productName: item.productName,
            freeStrips: item.freeStrips,
            mrpPerStrip: item.mrpPerStrip,
            freeStockValue: Number((item.freeStrips * item.mrpPerStrip).toFixed(2)),
            date: po.grnDate,
          });
        }
      });
    });

    return list;
  }, [purchaseInvoices]);

  // Download CSV
  const handleExportCsv = () => {
    let content = '';
    const filename = `Inventory_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'STOCK_REPORT') {
      const headers = ['Medicine Name', 'Batch', 'Expiry', 'Rack', 'In-Hand Stock', 'Cost Valuation', 'MRP Valuation'];
      const rows = stockReportData.map((s) => [`"${s.product.name}"`, `"${s.batch.batchNumber}"`, s.batch.expiryDate, `"${s.product.rackLocation}"`, `"${s.stock.displayString}"`, s.costValue, s.mrpValue]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'NON_MOVING') {
      const headers = ['Medicine Name', 'Generic Salt', 'Manufacturer', 'Stock', 'Cost at Risk (INR)'];
      const rows = nonMovingData.map((n) => [`"${n.product.name}"`, `"${n.product.genericComposition}"`, `"${n.product.manufacturer}"`, `"${n.formattedStock}"`, n.valCost]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'NIL_STOCK') {
      const headers = ['Product Name', 'Generic Composition', 'Manufacturer', 'Rack Location', 'Reorder Level (Tabs)'];
      const rows = nilStockData.map((n) => [`"${n.product.name}"`, `"${n.product.genericComposition}"`, `"${n.product.manufacturer}"`, `"${n.rackLocation}"`, n.reorderLevel]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'TAX_BREAKUP') {
      const headers = ['GST Slab (%)', 'Batches Count', 'Wholesale Valuation (INR)', 'Retail MRP Valuation (INR)'];
      const rows = taxBreakupData.map((t) => [t.gstRate, t.batchCount, t.costValuation.toFixed(2), t.mrpValuation.toFixed(2)]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
              Section 8
            </span>
            <h1 className="text-lg font-bold text-slate-900">Inventory & Stock Reports Suite</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ShopAID Inventory Report submenu: Stock valuation, Movement flow, Non-moving analysis, Nil stock, and Tax breakups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Valuation Metric Cards (Section 8 Stock Value Report) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Wholesale Stock Valuation (Cost)</div>
          <div className="text-lg font-mono font-bold text-slate-900 mt-1">
            {formatINR(stockValuationSummary.totalCostValuation)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Acquisition cost of in-hand inventory</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Retail Stock Valuation (MRP)</div>
          <div className="text-lg font-mono font-bold text-emerald-800 mt-1">
            {formatINR(stockValuationSummary.totalMrpValuation)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total retail turnover value at checkout</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Potential Gross Profit</div>
          <div className="text-lg font-mono font-bold text-cyan-800 mt-1">
            +{formatINR(stockValuationSummary.potentialGrossMargin)}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
            Average Margin: {stockValuationSummary.marginPercent}%
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold">Total Atomic Stock Count</div>
          <div className="text-lg font-mono font-bold text-slate-900 mt-1">
            {stockValuationSummary.totalTabletsCount.toLocaleString('en-IN')} Tablets
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across {batches.length} active dispensary batches</div>
        </div>
      </div>

      {/* Submenu Tabs (Section 8) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('STOCK_REPORT')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'STOCK_REPORT' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('STOCK_MOVEMENT')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'STOCK_MOVEMENT' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stock Movement Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NON_MOVING')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'NON_MOVING' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non-Moving Stock ({nonMovingData.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('NIL_STOCK')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'NIL_STOCK' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nil Stock Report ({nilStockData.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TAX_BREAKUP')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'TAX_BREAKUP' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tax Descriptionwise Breakup
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('FREE_STOCK')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'FREE_STOCK' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Free Stock Value Report
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search by medicine, batch, rack..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-64"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. STOCK REPORT (Current stock list with locations)      */}
      {/* ======================================================== */}
      {activeTab === 'STOCK_REPORT' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Medicine / Product Name</th>
                  <th className="p-3">Batch No.</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Storage Rack</th>
                  <th className="p-3 text-right">Cost Price / Strip</th>
                  <th className="p-3 text-right">MRP / Strip</th>
                  <th className="p-3 text-right">In-Hand Balance</th>
                  <th className="p-3 text-right">Valuation (Cost)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {stockReportData.map((item) => (
                  <tr key={item.batch.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.product.name}</div>
                      <div className="text-[10px] text-slate-500">{item.product.genericComposition}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{item.batch.batchNumber}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.zone === 'CRITICAL_30'
                            ? 'bg-rose-100 text-rose-800'
                            : item.zone === 'WARNING_60'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700 font-mono'
                        }`}
                      >
                        {item.batch.expiryDate}
                      </span>
                    </td>
                    <td className="p-3 text-emerald-700 font-medium">{item.product.rackLocation || 'Dispensary Shelf'}</td>
                    <td className="p-3 text-right font-mono">{formatINR(item.batch.costPricePerStrip)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(item.batch.mrpPerStrip)}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 font-mono">
                      {item.stock.displayString}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatINR(item.costValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. STOCK MOVEMENT FLOW ANALYSIS (Section 8)              */}
      {/* ======================================================== */}
      {activeTab === 'STOCK_MOVEMENT' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Stock Inflow & Outflow Movement (Atomic Tablets)
            </span>
            <span className="text-slate-500">
              Opening Stock + Inward GRN - POS Dispensed ± Audits = Closing Balance
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-right">Estimated Opening</th>
                  <th className="p-3 text-right text-emerald-700">Inward Purchases (+)</th>
                  <th className="p-3 text-right text-cyan-800">POS Sales (-)</th>
                  <th className="p-3 text-right text-slate-600">Adjustments / Returns (±)</th>
                  <th className="p-3 text-right font-bold">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {stockMovementData.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{item.product.name}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{item.openingTablets} Tabs</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">+{item.inwardTablets} Tabs</td>
                    <td className="p-3 text-right font-mono font-bold text-cyan-800">-{item.salesTablets} Tabs</td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {item.adjustmentTablets >= 0 ? `+${item.adjustmentTablets}` : item.adjustmentTablets} Tabs
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                      {item.closingFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. NON MOVING STOCK (Section 8)                          */}
      {/* ======================================================== */}
      {activeTab === 'NON_MOVING' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
            <span className="font-bold uppercase tracking-wider">
              Slow / Non-Moving Medicines (Expiry Risk Prevention)
            </span>
            <span className="font-bold">
              Identified {nonMovingData.length} stagnant product lines
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Current In-Hand Stock</th>
                  <th className="p-3 text-right">Cost Capital Blocked</th>
                  <th className="p-3 text-center">Suggested Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {nonMovingData.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.product.name}</div>
                      <div className="text-[10px] text-slate-500">{item.product.genericComposition}</div>
                    </td>
                    <td className="p-3 text-slate-600">{item.product.manufacturer}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{item.formattedStock}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-rose-700">
                      {formatINR(item.valCost)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Initiate Supplier Return (Ctrl+D)
                      </span>
                    </td>
                  </tr>
                ))}
                {nonMovingData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      All products have active customer sales. No dead stock detected!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. NIL STOCK REPORT (Section 8)                          */}
      {/* ======================================================== */}
      {activeTab === 'NIL_STOCK' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-900">
            <span className="font-bold uppercase tracking-wider">
              Nil Stock Report (Stockouts & Depleted Items)
            </span>
            <span className="font-bold font-mono">
              {nilStockData.length} Medicines at 0 Units
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Generic Composition</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Dispensary Rack</th>
                  <th className="p-3 text-right">Reorder Threshold</th>
                  <th className="p-3 text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {nilStockData.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50/60 bg-rose-50/20">
                    <td className="p-3 font-bold text-slate-900">{item.product.name}</td>
                    <td className="p-3 text-slate-600">{item.product.genericComposition}</td>
                    <td className="p-3 text-slate-600">{item.product.manufacturer}</td>
                    <td className="p-3 text-slate-700 font-mono">{item.rackLocation}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">
                      {item.reorderLevel} Tabs
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        Create Reorder in Wanted Book
                      </span>
                    </td>
                  </tr>
                ))}
                {nilStockData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      All catalog medicines currently have positive inventory in stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. TAX DESCRIPTIONWISE BREAKUP (CLOSING STOCK)           */}
      {/* ======================================================== */}
      {activeTab === 'TAX_BREAKUP' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Tax Descriptionwise Breakup of Closing Stock
            </span>
            <span className="text-slate-500 font-mono">
              CBIC Pharmacy Closing Valuation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GST Tax Description / Slab</th>
                  <th className="p-3 text-center">Batches in Hand</th>
                  <th className="p-3 text-right">Wholesale Cost Valuation (₹)</th>
                  <th className="p-3 text-right">Retail MRP Valuation (₹)</th>
                  <th className="p-3 text-right font-bold">Unrealized Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {taxBreakupData.map((slab) => {
                  const margin = slab.mrpValuation - slab.costValuation;
                  return (
                    <tr key={slab.gstRate} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-md font-bold font-mono">
                          {slab.gstRate}% GST Pharmaceuticals
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{slab.batchCount}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {formatINR(slab.costValuation)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-800">
                        {formatINR(slab.mrpValuation)}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-cyan-800">
                        +{formatINR(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. FREE STOCK VALUE REPORT (Section 8)                   */}
      {/* ======================================================== */}
      {activeTab === 'FREE_STOCK' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between text-xs text-purple-900">
            <span className="font-bold uppercase tracking-wider">
              Free Stock Value Report (Bonus & Promotional Goods)
            </span>
            <span className="font-bold">
              Bonus Strips Received: {freeStockData.reduce((acc, f) => acc + f.freeStrips, 0)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GRN Number</th>
                  <th className="p-3">GRN Date</th>
                  <th className="p-3">Wholesaler / Supplier</th>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3 text-right">Free Bonus Strips</th>
                  <th className="p-3 text-right">MRP / Strip</th>
                  <th className="p-3 text-right font-bold">Total Free Stock Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {freeStockData.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-purple-800">{f.grnNumber}</td>
                    <td className="p-3 font-mono text-slate-500">{f.date}</td>
                    <td className="p-3 text-slate-700">{f.vendorName}</td>
                    <td className="p-3 font-bold text-slate-900">{f.productName}</td>
                    <td className="p-3 text-right font-mono font-bold text-purple-700">+{f.freeStrips}</td>
                    <td className="p-3 text-right font-mono">{formatINR(f.mrpPerStrip)}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatINR(f.freeStockValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
