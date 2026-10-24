import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  RotateCcw,
  Trash2,
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  Building,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, calculateExpiryZone, formatDualUnitStock, Product, Batch } from '../../types/pharmacy';

export type ExpiryTab =
  | 'DASHBOARD'
  | 'EXPIRED'
  | 'EXPIRING_30'
  | 'EXPIRING_60'
  | 'EXPIRING_90'
  | 'BATCH_REGISTER'
  | 'NEAR_EXPIRY_RETURN'
  | 'DISPOSAL_REGISTER'
  | 'EXPIRY_REPORT';

export interface ExpiryManagementViewProps {
  initialTab?: ExpiryTab | string;
  onNavigateToPurchaseReturn?: () => void;
}

const normalizeExpiryTab = (tab?: string): ExpiryTab => {
  if (!tab) return 'DASHBOARD';
  if (tab === 'DASHBOARD') return 'DASHBOARD';
  if (tab === 'EXPIRED') return 'EXPIRED';
  if (tab === '30_DAYS' || tab === 'EXPIRING_30') return 'EXPIRING_30';
  if (tab === '60_DAYS' || tab === 'EXPIRING_60') return 'EXPIRING_60';
  if (tab === '90_DAYS' || tab === 'EXPIRING_90') return 'EXPIRING_90';
  if (tab === 'BATCH_REGISTER') return 'BATCH_REGISTER';
  if (tab === 'VENDOR_RETURN' || tab === 'NEAR_EXPIRY_RETURN') return 'NEAR_EXPIRY_RETURN';
  if (tab === 'DISPOSAL' || tab === 'DISPOSAL_REGISTER') return 'DISPOSAL_REGISTER';
  if (tab === 'REPORT' || tab === 'EXPIRY_REPORT') return 'EXPIRY_REPORT';
  return 'DASHBOARD';
};

interface DisposalRecord {
  id: string;
  disposalDate: string;
  batchNumber: string;
  productName: string;
  stripsDisposed: number;
  costLoss: number;
  authorizedPharmacist: string;
  incinerationMethod: string;
  disposalCertificateNo: string;
}

export const ExpiryManagementView: React.FC<ExpiryManagementViewProps> = ({
  initialTab = 'DASHBOARD',
  onNavigateToPurchaseReturn,
}) => {
  const { batches, products, vendors, currentUser } = usePharmacy();

  const [activeTab, setActiveTab] = useState<ExpiryTab>(normalizeExpiryTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeExpiryTab(initialTab));
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Disposal Register records (Empty default state)
  const [disposalLogs, setDisposalLogs] = useState<DisposalRecord[]>([]);

  // Modals
  const [showDisposalModal, setShowDisposalModal] = useState<boolean>(false);
  const [disposalTargetBatch, setDisposalTargetBatch] = useState<any>(null);
  const [disposalQuantity, setDisposalQuantity] = useState<number>(5);
  const [disposalMethod, setDisposalMethod] = useState<string>('Biomedical Waste Autoclaving & Neutralization');

  // Compute calculated expiry info for all batches
  const computedBatches = useMemo(() => {
    return batches
      .map((batch) => {
        const product = products.find((p) => p.id === batch.productId);
        if (!product || batch.totalTablets <= 0) return null;
        const { days, zone } = calculateExpiryZone(batch.expiryDate);
        const stock = formatDualUnitStock(batch.totalTablets, product.stripSize);
        const costValue = (batch.totalTablets / product.stripSize) * batch.costPricePerStrip;
        const mrpValue = (batch.totalTablets / product.stripSize) * batch.mrpPerStrip;

        return {
          batch,
          product,
          daysRemaining: days,
          zone,
          stock,
          costValue: Number(costValue.toFixed(2)),
          mrpValue: Number(mrpValue.toFixed(2)),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [batches, products]);

  // Tab filtering
  const filteredBatches = useMemo(() => {
    return computedBatches.filter((item) => {
      if (activeTab === 'EXPIRED' && item.daysRemaining > 0) return false;
      if (activeTab === 'EXPIRING_30' && (item.daysRemaining <= 0 || item.daysRemaining > 30)) return false;
      if (activeTab === 'EXPIRING_60' && (item.daysRemaining <= 30 || item.daysRemaining > 60)) return false;
      if (activeTab === 'EXPIRING_90' && (item.daysRemaining <= 60 || item.daysRemaining > 90)) return false;
      if (activeTab === 'NEAR_EXPIRY_RETURN' && (item.daysRemaining <= 0 || item.daysRemaining > 90)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mProd = item.product.name.toLowerCase().includes(q);
        const mBatch = item.batch.batchNumber.toLowerCase().includes(q);
        const mComp = item.product.genericComposition.toLowerCase().includes(q);
        if (!mProd && !mBatch && !mComp) return false;
      }
      return true;
    });
  }, [computedBatches, activeTab, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const expired = computedBatches.filter((b) => b.daysRemaining <= 0);
    const in30 = computedBatches.filter((b) => b.daysRemaining > 0 && b.daysRemaining <= 30);
    const in60 = computedBatches.filter((b) => b.daysRemaining > 30 && b.daysRemaining <= 60);
    const in90 = computedBatches.filter((b) => b.daysRemaining > 60 && b.daysRemaining <= 90);

    const totalAtRiskMrp = [...expired, ...in30, ...in60, ...in90].reduce((s, b) => s + b.mrpValue, 0);

    return {
      expiredCount: expired.length,
      in30Count: in30.length,
      in60Count: in60.length,
      in90Count: in90.length,
      totalAtRiskMrp,
    };
  }, [computedBatches]);

  const handleRecordDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposalTargetBatch) return;

    const newRecord: DisposalRecord = {
      id: `disp-${Date.now()}`,
      disposalDate: new Date().toISOString().split('T')[0],
      batchNumber: disposalTargetBatch.batch.batchNumber,
      productName: disposalTargetBatch.product.name,
      stripsDisposed: disposalQuantity,
      costLoss: Number((disposalQuantity * disposalTargetBatch.batch.costPricePerStrip).toFixed(2)),
      authorizedPharmacist: `${currentUser.name} (${currentUser.role})`,
      incinerationMethod: disposalMethod,
      disposalCertificateNo: `PCB-DISP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };

    setDisposalLogs([newRecord, ...disposalLogs]);
    setShowDisposalModal(false);
    setDisposalTargetBatch(null);
    showToast(`✓ Recorded safe disposal certificate ${newRecord.disposalCertificateNo}`);
    setActiveTab('DISPOSAL_REGISTER');
  };

  const handleExportCsv = () => {
    const headers = ['Medicine Name', 'Batch', 'Expiry Date', 'Days Left', 'Stock On Hand', 'Cost Price', 'MRP Value', 'Zone'];
    const rows = filteredBatches.map((b) => [
      `"${b.product.name}"`,
      b.batch.batchNumber,
      b.batch.expiryDate,
      b.daysRemaining,
      `"${b.stock.displayString}"`,
      b.batch.costPricePerStrip.toFixed(2),
      b.mrpValue.toFixed(2),
      b.zone,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expiry_Register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported Expiry Register (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" />
              <h1 className="text-base font-bold text-slate-900">Expiry Management & Control</h1>
              <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-semibold border border-rose-200">
                Patient Safety & Regulatory Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Proactive tracking of expired stock, near-expiry alert zones (30/60/90 days), vendor returns, and statutory biomedical disposal logs.
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
          </div>
        </div>

        {/* 9 Submenus as Horizontal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DASHBOARD'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Expiry Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRED')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRED'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Expired Products</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {metrics.expiredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRING_30')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRING_30'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <span>Expiring in 30 Days</span>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.in30Count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRING_60')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRING_60'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Expiring in 60 Days</span>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.in60Count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRING_90')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRING_90'
                ? 'border-yellow-500 text-yellow-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-yellow-500" />
            <span>Expiring in 90 Days</span>
            <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.2 rounded-full font-mono">
              {metrics.in90Count}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BATCH_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'BATCH_REGISTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Batch-wise Expiry Register</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEAR_EXPIRY_RETURN')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'NEAR_EXPIRY_RETURN'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Near-Expiry Return</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DISPOSAL_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DISPOSAL_REGISTER'
                ? 'border-purple-600 text-purple-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Expiry Disposal Register</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-full font-mono">
              {disposalLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRY_REPORT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPIRY_REPORT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Expiry Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-rose-50/70 border border-rose-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between">
            <span>Expired Products</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-900 mt-0.5">{metrics.expiredCount} Batches</div>
          <div className="text-[10px] text-rose-600 mt-1">Sale locked automatically (Drug Act)</div>
        </div>

        <div className="bg-orange-50/70 border border-orange-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-orange-700 font-medium flex items-center justify-between">
            <span>Critical (≤ 30 Days)</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-xl font-bold text-orange-900 mt-0.5">{metrics.in30Count} Batches</div>
          <div className="text-[10px] text-orange-600 mt-1">Requires immediate return / clearance</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span>Caution (31-90 Days)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{metrics.in60Count + metrics.in90Count} Batches</div>
          <div className="text-[10px] text-amber-600 mt-1">Monitor turnover & wholesaler claims</div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-purple-700 font-medium flex items-center justify-between">
            <span>Total Value at Risk</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-900 mt-0.5">{formatINR(metrics.totalAtRiskMrp)}</div>
          <div className="text-[10px] text-purple-600 mt-1">Retail MRP valuation</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search medicine, composition or batch number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
          />
        </div>
        <div className="text-slate-500 font-medium text-[11px]">
          Showing <span className="font-bold text-slate-800">{filteredBatches.length}</span> batches
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'DISPOSAL_REGISTER' ? (
        /* Statutory Disposal Register Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-purple-900">Statutory Biomedical Waste & Expired Medicine Disposal Register</h2>
              <p className="text-[11px] text-purple-700">Drugs & Cosmetics Rules (Form 35/TNPCB) audit certification logs.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = computedBatches.find((b) => b.daysRemaining <= 0) || computedBatches[0];
                if (target) {
                  setDisposalTargetBatch(target);
                  setShowDisposalModal(true);
                } else {
                  showToast('No expired batches pending disposal.');
                }
              }}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Log New Disposal
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Certificate No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Medicine Description</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3 text-center">Strips Disposed</th>
                <th className="py-2.5 px-3 text-right">Cost Loss</th>
                <th className="py-2.5 px-3">Authorized Pharmacist</th>
                <th className="py-2.5 px-3">Disposal Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {disposalLogs.map((log) => (
                <tr key={log.id} className="hover:bg-purple-50/30">
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{log.disposalCertificateNo}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.disposalDate}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{log.productName}</td>
                  <td className="py-2.5 px-3 font-mono">{log.batchNumber}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-600">{log.stripsDisposed}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(log.costLoss)}</td>
                  <td className="py-2.5 px-3 text-slate-700">{log.authorizedPharmacist}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500">{log.incinerationMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Batches Expiry Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Composition</th>
                  <th className="py-2.5 px-3">Batch No.</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-center">Days Remaining</th>
                  <th className="py-2.5 px-3 text-center">Stock On Hand</th>
                  <th className="py-2.5 px-3 text-right">Cost Value</th>
                  <th className="py-2.5 px-3 text-right">MRP Value</th>
                  <th className="py-2.5 px-3 text-center">Zone</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No batch records match the selected expiry criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((item) => (
                    <tr key={item.batch.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.product.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{item.product.genericComposition}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{item.batch.batchNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{item.batch.expiryDate}</td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${
                            item.daysRemaining <= 0
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : item.daysRemaining <= 30
                              ? 'bg-orange-100 text-orange-800 font-bold'
                              : item.daysRemaining <= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-yellow-50 text-yellow-800'
                          }`}
                        >
                          {item.daysRemaining <= 0 ? 'EXPIRED' : `${item.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {item.stock.displayString}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(item.costValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(item.mrpValue)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.daysRemaining <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : item.zone === 'CRITICAL_30'
                              ? 'bg-orange-100 text-orange-800'
                              : item.zone === 'WARNING_60'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.daysRemaining <= 0 ? 'EXPIRED' : item.zone}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.daysRemaining <= 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDisposalTargetBatch(item);
                                setDisposalQuantity(item.stock.strips);
                                setShowDisposalModal(true);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-medium cursor-pointer"
                            >
                              Dispose
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateToPurchaseReturn) {
                                  onNavigateToPurchaseReturn();
                                } else {
                                  showToast(`Initiating wholesaler debit note for batch ${item.batch.batchNumber}`);
                                }
                              }}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Return</span>
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
      )}

      {/* DISPOSAL MODAL */}
      {showDisposalModal && disposalTargetBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>Biomedical Waste Disposal Certificate</span>
            </div>
            <p className="text-xs text-slate-600">
              Formally decommission expired medicine batch from pharmacy premises per TNPCB / Drugs Control Administration protocols.
            </p>

            <form onSubmit={handleRecordDisposal} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="font-bold text-slate-900">{disposalTargetBatch.product.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Batch: {disposalTargetBatch.batch.batchNumber} | Expiry: {disposalTargetBatch.batch.expiryDate}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Strips to be Decommissioned *</label>
                <input
                  type="number"
                  value={disposalQuantity}
                  onChange={(e) => setDisposalQuantity(Number(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                  min={1}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Incineration & Neutralization Method *</label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                >
                  <option value="Biomedical Waste Autoclaving & Neutralization">Biomedical Waste Autoclaving & Neutralization</option>
                  <option value="High-Temperature Incineration (1100°C) via CPCB Authorized Facility">High-Temperature Incineration (1100°C) via CPCB Facility</option>
                  <option value="Chemical Encapsulation & Secure Landfill">Chemical Encapsulation & Secure Landfill</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDisposalModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Issue Disposal Certificate
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
