import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Lock,
  ArrowRight,
  ShieldCheck,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  formatINR,
  calculateExpiryZone,
  formatDualUnitStock,
  ExpiryAlertItem,
} from '../../types/pharmacy';
import {
  exportSalesLedgerCsv,
  exportInventoryValuationCsv,
  exportPurchaseLedgerCsv,
} from '../../utils/csvExport';

export const AnalyticsDashboard: React.FC = () => {
  const { analytics, batches, products, vendors, currentUser, switchUserRole, invoices } = usePharmacy();
  const [activeExpiryZoneFilter, setActiveExpiryZoneFilter] = useState<
    'ALL' | 'CRITICAL_30' | 'WARNING_60' | 'CAUTION_90'
  >('ALL');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (currentUser.role === 'PHARMACY_ASSISTANT') {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          Financial Analytics Restricted (RBAC)
        </h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
          As a <strong>Pharmacy Assistant</strong>, your role permits POS Counter Billing, stock lookup,
          and prescription logging. Profit margins, wholesaler purchase costs, and revenue analytics are
          restricted to <strong>Chief Pharmacist / Store Admin</strong>.
        </p>
        <button
          type="button"
          onClick={() => switchUserRole('ADMIN')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Switch to Admin Mode for Demonstration</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const expiryAlerts: ExpiryAlertItem[] = batches
    .map((batch) => {
      const product = products.find((p) => p.id === batch.productId);
      if (!product || batch.totalTablets <= 0) return null;
      const { days, zone } = calculateExpiryZone(batch.expiryDate);
      const stock = formatDualUnitStock(batch.totalTablets, product.stripSize);
      const mrpValue = (batch.totalTablets / product.stripSize) * batch.mrpPerStrip;

      return {
        product,
        batch,
        daysRemaining: days,
        zone,
        formattedStock: stock.displayString,
        mrpValue: Number(mrpValue.toFixed(2)),
      };
    })
    .filter((item): item is ExpiryAlertItem => item !== null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const filteredExpiries = expiryAlerts.filter((item) => {
    if (activeExpiryZoneFilter === 'ALL') return item.zone !== 'SAFE';
    return item.zone === activeExpiryZoneFilter;
  });

  const lowStockBatches = batches
    .map((batch) => {
      const product = products.find((p) => p.id === batch.productId);
      if (!product) return null;
      const stock = formatDualUnitStock(batch.totalTablets, product.stripSize, product.reorderLevelUnits);
      if (!stock.isLowStock) return null;
      return {
        product,
        batch,
        stock,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-slate-800">
            Executive Financial & Expiry Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Reports / Financial Summary</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {exportNotice && (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded animate-in fade-in">
              {exportNotice}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              const res = exportSalesLedgerCsv(invoices);
              setExportNotice(`✓ Downloaded ${res.fileName} (${res.rowCount} line items)`);
              setTimeout(() => setExportNotice(null), 3500);
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download full sales and tax ledger CSV for GSTR-1 filing"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>GSTR-1 Sales (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const res = exportInventoryValuationCsv(products, batches);
              setExportNotice(`✓ Downloaded ${res.fileName} (${res.rowCount} batches)`);
              setTimeout(() => setExportNotice(null), 3500);
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download full inventory valuation and shelf-life audit CSV"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Stock Valuation (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const res = exportPurchaseLedgerCsv(vendors, batches, products);
              setExportNotice(`✓ Downloaded ${res.fileName} (${res.rowCount} records)`);
              setTimeout(() => setExportNotice(null), 3500);
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Download wholesaler inward purchases and Input Tax Credit ledger CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            <span>GSTR-2B Purchases (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500">Today's Revenue</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Active Counter
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-sans text-slate-900 tabular-nums">
            {formatINR(analytics.dailyRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {analytics.totalTransactionsToday} counter bills finalized
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500">Today's Gross Margin</span>
            <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
              {analytics.averageMarginPercentage}% Avg
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-sans text-emerald-600 tabular-nums">
            {formatINR(analytics.dailyProfit)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Realized profit over wholesale cost
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500">Monthly Run-Rate</span>
            <span className="text-[10px] text-slate-400 font-mono">OCT 2026</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-sans text-slate-900 tabular-nums">
            {formatINR(analytics.monthlyRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Net Margin: {formatINR(analytics.monthlyProfit)}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-slate-500">GST Tax Liability (Today)</span>
            <span className="text-[10px] font-mono text-slate-500">CGST + SGST</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-sans text-slate-900 tabular-nums">
            {formatINR(analytics.gstLiability.grossTax)}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 font-mono">
            <span>CGST: ₹{analytics.gstLiability.cgstTotal.toFixed(2)}</span>
            <span>SGST: ₹{analytics.gstLiability.sgstTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Fastest Moving Medicines Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Fastest-Moving Medicines (By Volume)</h3>
              <p className="text-xs text-slate-500 mt-0.5">High-velocity dispense count for reorder planning</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="mt-4 space-y-3.5">
            {analytics.fastestMovingByVolume.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded yet.</p>
            ) : (
              analytics.fastestMovingByVolume.map((item, idx) => {
                const maxVol = analytics.fastestMovingByVolume[0].totalTabletsSold || 1;
                const pct = Math.min(100, (item.totalTabletsSold / maxVol) * 100);

                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {idx + 1}. {item.productName}
                      </span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {item.totalTabletsSold} Tabs ({item.stripsEquivalent})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Top Revenue Contributing SKUs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Medicines generating highest checkout value</p>
            </div>
            <DollarSign className="w-4 h-4 text-sky-600" />
          </div>

          <div className="mt-4 space-y-3.5">
            {analytics.fastestMovingByRevenue.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded yet.</p>
            ) : (
              analytics.fastestMovingByRevenue.map((item, idx) => {
                const maxRev = analytics.fastestMovingByRevenue[0].revenue || 1;
                const pct = Math.min(100, (item.revenue / maxRev) * 100);

                return (
                  <div key={item.productId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {idx + 1}. {item.productName}
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatINR(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Operational Streams: 30/60/90 Days Expiries & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-md p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Batch Expiration Monitoring Zones
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sorted by closest expiry date for clearance and supplier return window
              </p>
            </div>

            <div className="flex p-0.5 bg-slate-100 rounded-md text-xs border border-slate-200">
              {(
                [
                  { id: 'ALL', label: 'All Near Expiries' },
                  { id: 'CRITICAL_30', label: '< 30d' },
                  { id: 'WARNING_60', label: '31–60d' },
                  { id: 'CAUTION_90', label: '61–90d' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveExpiryZoneFilter(tab.id)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    activeExpiryZoneFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredExpiries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No batches currently falling in this expiration range. Stock is within safe shelf life.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5 text-center">Batch No</th>
                    <th className="p-2.5 text-center">Expiry Date</th>
                    <th className="p-2.5 text-center">Days Left</th>
                    <th className="p-2.5 text-center">Zone</th>
                    <th className="p-2.5 text-right">Stock Remaining</th>
                    <th className="p-2.5 text-right">At-Risk Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredExpiries.map((item) => (
                    <tr key={item.batch.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{item.product.name}</div>
                        <div className="text-[10px] text-slate-400">{item.product.manufacturer}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono font-medium text-slate-900">{item.batch.batchNumber}</td>
                      <td className="p-2.5 text-center font-mono">
                        {new Date(item.batch.expiryDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold tabular-nums">
                        {item.daysRemaining} days
                      </td>
                      <td className="p-2.5 text-center">
                        {item.zone === 'CRITICAL_30' && (
                          <span className="px-1.5 py-0.2 bg-rose-50 text-rose-600 border border-rose-200 rounded font-bold text-[10px]">
                            Critical (&lt;30d)
                          </span>
                        )}
                        {item.zone === 'WARNING_60' && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-600 border border-amber-200 rounded font-bold text-[10px]">
                            Warning (60d)
                          </span>
                        )}
                        {item.zone === 'CAUTION_90' && (
                          <span className="px-1.5 py-0.2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded font-medium text-[10px]">
                            Caution (90d)
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-medium text-slate-900">
                        {item.formattedStock}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-slate-900 font-semibold">
                        {formatINR(item.mrpValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low-Stock Stream */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-md p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-800">Low-Stock Alerts</h3>
            </div>
            <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
              {lowStockBatches.length} SKUs
            </span>
          </div>

          <div className="space-y-3">
            {lowStockBatches.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                All inventory lines above safe reorder thresholds.
              </p>
            ) : (
              lowStockBatches.map((item) => (
                <div
                  key={item.batch.id}
                  className="p-3 rounded border border-orange-200 bg-orange-50/50 space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-900">{item.product.name}</span>
                    <span className="text-[9px] font-mono text-orange-700 bg-orange-100 px-1 py-0.2 rounded font-semibold">
                      Reorder Alert
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>Batch: {item.batch.batchNumber}</span>
                    <span className="font-semibold text-rose-600 font-mono">{item.stock.displayString}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>Threshold: {item.product.reorderLevelUnits} Tabs</span>
                    <span>Loc: {item.product.rackLocation || 'Shelf A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
