import React, { useState, useMemo } from 'react';
import {
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
  ShieldAlert,
  Boxes,
  Eye,
  Plus,
  Trash2,
  Check,
  Ban,
  Activity,
  Layers,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, formatDualUnitStock, Product, Batch } from '../../types/pharmacy';

export type BatchTraceTab =
  | 'BATCH_REGISTER'
  | 'BATCH_STOCK'
  | 'MOVEMENT_HISTORY'
  | 'SUPPLIER_TRACE'
  | 'QUALITY_CHECK'
  | 'QUARANTINE_HOLD'
  | 'RECALL_MANAGEMENT'
  | 'DAMAGED_STOCK'
  | 'TRACEABILITY_REPORT';

export interface BatchTraceabilityViewProps {
  initialTab?: BatchTraceTab | string;
}

const normalizeBatchTab = (tab?: string): BatchTraceTab => {
  if (!tab) return 'BATCH_REGISTER';
  if (tab === 'REGISTER' || tab === 'BATCH_REGISTER') return 'BATCH_REGISTER';
  if (tab === 'STOCK' || tab === 'BATCH_STOCK') return 'BATCH_STOCK';
  if (tab === 'MOVEMENT' || tab === 'MOVEMENT_HISTORY') return 'MOVEMENT_HISTORY';
  if (tab === 'TRACEABILITY' || tab === 'SUPPLIER_TRACE') return 'SUPPLIER_TRACE';
  if (tab === 'QUALITY' || tab === 'QUALITY_CHECK') return 'QUALITY_CHECK';
  if (tab === 'QUARANTINE' || tab === 'QUARANTINE_HOLD') return 'QUARANTINE_HOLD';
  if (tab === 'RECALL' || tab === 'RECALL_MANAGEMENT') return 'RECALL_MANAGEMENT';
  if (tab === 'DAMAGED' || tab === 'DAMAGED_STOCK') return 'DAMAGED_STOCK';
  if (tab === 'REPORT' || tab === 'TRACEABILITY_REPORT') return 'TRACEABILITY_REPORT';
  return 'BATCH_REGISTER';
};

interface RecallNotice {
  id: string;
  recallNumber: string;
  batchNumber: string;
  productName: string;
  manufacturer: string;
  reason: string;
  authority: string;
  quarantinedStrips: number;
  status: 'ACTIVE_QUARANTINE' | 'RETURNED_TO_MFG' | 'RESOLVED';
  dateIssued: string;
}

interface DamagedStockRecord {
  id: string;
  date: string;
  productName: string;
  batchNumber: string;
  damagedStrips: number;
  reason: 'Crushed Packaging' | 'Moisture Damage' | 'Broken Vials' | 'Seal Tampered';
  costLoss: number;
  recordedBy: string;
}

export const BatchTraceabilityView: React.FC<BatchTraceabilityViewProps> = ({
  initialTab = 'BATCH_REGISTER',
}) => {
  const { batches, products, vendors, invoices, currentUser } = usePharmacy();

  const [activeTab, setActiveTab] = useState<BatchTraceTab>(normalizeBatchTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeBatchTab(initialTab));
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quarantine State for batches
  const [quarantinedBatchIds, setQuarantinedBatchIds] = useState<string[]>(['b-quar-1']);

  // Recalls List
  const [recalls, setRecalls] = useState<RecallNotice[]>([
    {
      id: 'rec-001',
      recallNumber: 'CDSCO-REC-2026-44',
      batchNumber: 'NW26-102',
      productName: 'Paracetamol 650mg (Dolo 650)',
      manufacturer: 'Micro Labs Ltd',
      reason: 'Dissolution profile failure reported in batch testing by State Drug Lab',
      authority: 'CDSCO South Zone / TN Drug Control',
      quarantinedStrips: 45,
      status: 'ACTIVE_QUARANTINE',
      dateIssued: '2026-10-14',
    },
  ]);

  // Damaged Stock Register
  const [damagedLogs, setDamagedLogs] = useState<DamagedStockRecord[]>([
    {
      id: 'dmg-01',
      date: '2026-10-15',
      productName: 'Cough Syrup 100ml',
      batchNumber: 'CS26-88',
      damagedStrips: 4,
      reason: 'Broken Vials',
      costLoss: 180.0,
      recordedBy: 'Pharmacist Assistant',
    },
    {
      id: 'dmg-02',
      date: '2026-10-18',
      productName: 'Amoxicillin 500mg',
      batchNumber: 'AX26-302',
      damagedStrips: 5,
      reason: 'Crushed Packaging',
      costLoss: 232.5,
      recordedBy: 'Chief Pharmacist',
    },
  ]);

  // New Recall Modal
  const [showNewRecallModal, setShowNewRecallModal] = useState<boolean>(false);
  const [newRecallBatch, setNewRecallBatch] = useState<string>(batches[0]?.batchNumber || '');
  const [newRecallReason, setNewRecallReason] = useState<string>('State Drug Inspector alert');
  const [newRecallAuthority, setNewRecallAuthority] = useState<string>('Tamil Nadu DCA');
  const [newRecallQty, setNewRecallQty] = useState<number>(20);

  // New Damage Modal
  const [showDamageModal, setShowDamageModal] = useState<boolean>(false);
  const [damageBatch, setDamageBatch] = useState<string>(batches[0]?.batchNumber || '');
  const [damageQty, setDamageQty] = useState<number>(2);
  const [damageReason, setDamageReason] = useState<'Crushed Packaging' | 'Moisture Damage' | 'Broken Vials' | 'Seal Tampered'>('Crushed Packaging');

  // Combined detailed batch info
  const enrichedBatches = useMemo(() => {
    return batches.map((batch, idx) => {
      const product = products.find((p) => p.id === batch.productId);
      const vendor = vendors[idx % vendors.length] || vendors[0];
      const stock = product ? formatDualUnitStock(batch.totalTablets, product.stripSize) : { strips: 0, looseUnits: 0, displayString: '0' };
      const isQuarantined = quarantinedBatchIds.includes(batch.id);

      return {
        batch,
        product,
        vendor,
        stock,
        isQuarantined,
        qcStatus: isQuarantined ? 'QUARANTINE_HOLD' : 'PASSED_QC',
        invoiceRef: `INV-2026-${String(1000 + idx * 47)}`,
        invoiceDate: '2026-09-' + String(10 + (idx % 18)).padStart(2, '0'),
      };
    });
  }, [batches, products, vendors, quarantinedBatchIds]);

  // Tab Filtering
  const filteredBatches = useMemo(() => {
    return enrichedBatches.filter((item) => {
      if (activeTab === 'QUARANTINE_HOLD' && !item.isQuarantined) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mProd = item.product?.name.toLowerCase().includes(q);
        const mBatch = item.batch.batchNumber.toLowerCase().includes(q);
        const mVendor = (item.vendor?.companyName || item.vendor?.name || '').toLowerCase().includes(q);
        if (!mProd && !mBatch && !mVendor) return false;
      }
      return true;
    });
  }, [enrichedBatches, activeTab, searchQuery]);

  // Movement History mock
  const movementHistory = useMemo(() => {
    const list: Array<{
      date: string;
      docType: 'PURCHASE_GRN' | 'POS_SALE' | 'STOCK_ADJUST' | 'RECALL_HOLD';
      docNo: string;
      productName: string;
      batchNumber: string;
      qtyStrips: number;
      type: 'INWARD' | 'OUTWARD' | 'HOLD';
      party: string;
    }> = [];

    // Purchase Inwards
    enrichedBatches.forEach((item, idx) => {
      list.push({
        date: item.invoiceDate,
        docType: 'PURCHASE_GRN',
        docNo: `GRN-2026-${String(idx + 10).padStart(3, '0')}`,
        productName: item.product?.name || 'Medicine',
        batchNumber: item.batch.batchNumber,
        qtyStrips: item.stock.strips + 25,
        type: 'INWARD',
        party: item.vendor?.companyName || item.vendor?.name || 'Wholesaler',
      });
    });

    // POS Sales Outwards
    invoices.slice(0, 8).forEach((inv, idx) => {
      inv.items.forEach((it) => {
        list.push({
          date: inv.invoiceDate.split('T')[0],
          docType: 'POS_SALE',
          docNo: inv.invoiceNumber,
          productName: it.product?.name || 'Medicine',
          batchNumber: it.batch?.batchNumber || 'NW26-88',
          qtyStrips: Math.ceil((it.totalTabletsSold || 10) / (it.product?.stripSize || 10)),
          type: 'OUTWARD',
          party: inv.prescription?.patientName || inv.customerName || 'Retail Walk-in Customer',
        });
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [enrichedBatches, invoices]);

  const toggleQuarantine = (batchId: string) => {
    if (quarantinedBatchIds.includes(batchId)) {
      setQuarantinedBatchIds(quarantinedBatchIds.filter((id) => id !== batchId));
      showToast('✓ Batch released from Quarantine to live saleable stock.');
    } else {
      setQuarantinedBatchIds([...quarantinedBatchIds, batchId]);
      showToast('⚠️ Batch placed under Quarantine Hold. POS billing locked for this batch.');
    }
  };

  const handleAddRecall = (e: React.FormEvent) => {
    e.preventDefault();
    const batchObj = enrichedBatches.find((b) => b.batch.batchNumber === newRecallBatch);
    const newNotice: RecallNotice = {
      id: `rec-${Date.now()}`,
      recallNumber: `CDSCO-REC-2026-${Math.floor(10 + Math.random() * 90)}`,
      batchNumber: newRecallBatch,
      productName: batchObj?.product?.name || 'Pharmaceutical Formulation',
      manufacturer: batchObj?.product?.manufacturer || 'Pharma Mfg Ltd',
      reason: newRecallReason,
      authority: newRecallAuthority,
      quarantinedStrips: newRecallQty,
      status: 'ACTIVE_QUARANTINE',
      dateIssued: new Date().toISOString().split('T')[0],
    };

    setRecalls([newNotice, ...recalls]);
    if (batchObj) {
      setQuarantinedBatchIds((prev) => [...prev, batchObj.batch.id]);
    }
    setShowNewRecallModal(false);
    showToast(`✓ Registered drug recall notice ${newNotice.recallNumber}`);
    setActiveTab('RECALL_MANAGEMENT');
  };

  const handleAddDamage = (e: React.FormEvent) => {
    e.preventDefault();
    const batchObj = enrichedBatches.find((b) => b.batch.batchNumber === damageBatch);
    const cost = (batchObj?.batch.costPricePerStrip || 20) * damageQty;

    const newRec: DamagedStockRecord = {
      id: `dmg-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      productName: batchObj?.product?.name || 'Medicine',
      batchNumber: damageBatch,
      damagedStrips: damageQty,
      reason: damageReason,
      costLoss: Number(cost.toFixed(2)),
      recordedBy: currentUser.name,
    };

    setDamagedLogs([newRec, ...damagedLogs]);
    setShowDamageModal(false);
    showToast('✓ Damaged stock write-off logged successfully.');
    setActiveTab('DAMAGED_STOCK');
  };

  const handleExportCsv = () => {
    const headers = ['Product', 'Batch No', 'Mfg Date', 'Expiry Date', 'Supplier', 'Stock Strips', 'QC Status', 'Quarantine'];
    const rows = filteredBatches.map((b) => [
      `"${b.product?.name}"`,
      b.batch.batchNumber,
      b.batch.manufacturingDate,
      b.batch.expiryDate,
      `"${b.vendor?.companyName || b.vendor?.name || ''}"`,
      b.stock.strips,
      b.qcStatus,
      b.isQuarantined ? 'YES' : 'NO',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Batch_Traceability_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported Batch Traceability Report (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#0084ff]" />
              <h1 className="text-base font-bold text-slate-900">Batch & Traceability Register</h1>
              <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold border border-sky-200">
                End-to-End Pharmaceutical Traceability
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Wholesaler-to-patient tracking, batch movement history, quality testing, quarantine holds, statutory drug recalls and damaged stock accounting.
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
            onClick={() => setActiveTab('BATCH_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'BATCH_REGISTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Batch Register</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono text-slate-600">
              {batches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BATCH_STOCK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'BATCH_STOCK'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Batch-wise Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MOVEMENT_HISTORY')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'MOVEMENT_HISTORY'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Batch Movement History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUPPLIER_TRACE')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SUPPLIER_TRACE'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>Supplier-to-Batch Traceability</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUALITY_CHECK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'QUALITY_CHECK'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Batch Quality Check</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('QUARANTINE_HOLD')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'QUARANTINE_HOLD'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Quarantine / Hold Stock</span>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded-full font-mono">
              {quarantinedBatchIds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECALL_MANAGEMENT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'RECALL_MANAGEMENT'
                ? 'border-rose-600 text-rose-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Recall Management</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {recalls.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DAMAGED_STOCK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DAMAGED_STOCK'
                ? 'border-purple-600 text-purple-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Damaged Stock Register</span>
            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded-full font-mono">
              {damagedLogs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TRACEABILITY_REPORT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'TRACEABILITY_REPORT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Batch Traceability Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-medium">Active Traceable Batches</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{batches.length} Batches</div>
          <div className="text-[10px] text-slate-400 mt-1">100% Barcode & HSN linked</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
            <span>QC Passed Batches</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-900 mt-0.5">
            {batches.length - quarantinedBatchIds.length} Batches
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">Approved for counter billing</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-amber-700 font-medium flex items-center justify-between">
            <span>Quarantine / On Hold</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{quarantinedBatchIds.length} Batches</div>
          <div className="text-[10px] text-amber-600 mt-1">Dispensing locked</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between">
            <span>Statutory Recalls</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-900 mt-0.5">{recalls.length} Active</div>
          <div className="text-[10px] text-rose-600 mt-1">CDSCO / State DCA Alerts</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by Medicine, Batch number, or Wholesaler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#0084ff]"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'RECALL_MANAGEMENT' && (
            <button
              type="button"
              onClick={() => setShowNewRecallModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Register Drug Recall
            </button>
          )}

          {activeTab === 'DAMAGED_STOCK' && (
            <button
              type="button"
              onClick={() => setShowDamageModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Log Damaged Stock
            </button>
          )}
        </div>
      </div>

      {/* Main Content Renderers based on activeTab */}
      {activeTab === 'MOVEMENT_HISTORY' ? (
        /* Movement History Ledger */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-xs">Chronological Batch Movement Audit Trail</h3>
            <p className="text-[11px] text-slate-500">Every inward from supplier, outward sale to patient, and adjustment is recorded.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Doc Type</th>
                <th className="py-2.5 px-3">Reference No.</th>
                <th className="py-2.5 px-3">Medicine Name</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3 text-center">Flow</th>
                <th className="py-2.5 px-3 text-center">Qty (Strips)</th>
                <th className="py-2.5 px-3">Counterparty / Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {movementHistory.map((mv, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-600">{mv.date}</td>
                  <td className="py-2 px-3 font-mono font-semibold text-[11px]">{mv.docType}</td>
                  <td className="py-2 px-3 font-mono text-[#0084ff]">{mv.docNo}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{mv.productName}</td>
                  <td className="py-2 px-3 font-mono">{mv.batchNumber}</td>
                  <td className="py-2 px-3 text-center font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        mv.type === 'INWARD'
                          ? 'bg-emerald-100 text-emerald-800'
                          : mv.type === 'OUTWARD'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {mv.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{mv.qtyStrips}</td>
                  <td className="py-2 px-3 text-slate-600">{mv.party}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'RECALL_MANAGEMENT' ? (
        /* Statutory Recall Management */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-rose-50 border-b border-rose-100">
            <h3 className="font-bold text-rose-900 text-xs">CDSCO / State Drug Controller Product Recall Register</h3>
            <p className="text-[11px] text-rose-700">All recalled batches are placed on mandatory lock to protect consumers.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Recall Order No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Medicine Description</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3">Manufacturer</th>
                <th className="py-2.5 px-3 text-center">Quarantined Qty</th>
                <th className="py-2.5 px-3">Defect Reason</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recalls.map((rec) => (
                <tr key={rec.id} className="hover:bg-rose-50/30">
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{rec.recallNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.dateIssued}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{rec.productName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-800">{rec.batchNumber}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.manufacturer}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">{rec.quarantinedStrips} strips</td>
                  <td className="py-2.5 px-3 text-slate-700">{rec.reason}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold">
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'DAMAGED_STOCK' ? (
        /* Damaged Stock Register */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-purple-50 border-b border-purple-100">
            <h3 className="font-bold text-purple-900 text-xs">Damaged, Broken & Crushed Stock Loss Register</h3>
            <p className="text-[11px] text-purple-700">Breakages written off with cause and financial loss documentation.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Medicine Description</th>
                <th className="py-2.5 px-3">Batch</th>
                <th className="py-2.5 px-3 text-center">Damaged Qty</th>
                <th className="py-2.5 px-3">Damage Reason</th>
                <th className="py-2.5 px-3 text-right">Cost Loss</th>
                <th className="py-2.5 px-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {damagedLogs.map((dmg) => (
                <tr key={dmg.id} className="hover:bg-purple-50/20">
                  <td className="py-2.5 px-3 text-slate-600">{dmg.date}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{dmg.productName}</td>
                  <td className="py-2.5 px-3 font-mono">{dmg.batchNumber}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-600">{dmg.damagedStrips} strips</td>
                  <td className="py-2.5 px-3 text-slate-700">{dmg.reason}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(dmg.costLoss)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{dmg.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Default Batch Register & Supplier Trace Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">Medicine Name</th>
                  <th className="py-2.5 px-3">Batch No.</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Wholesaler / Supplier</th>
                  <th className="py-2.5 px-3">Inward Invoice</th>
                  <th className="py-2.5 px-3 text-center">Live Stock</th>
                  <th className="py-2.5 px-3 text-center">QC Status</th>
                  <th className="py-2.5 px-3 text-center">Quarantine</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBatches.map((item) => (
                  <tr key={item.batch.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.product?.name}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0084ff]">{item.batch.batchNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.batch.manufacturingDate}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">{item.batch.expiryDate}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{item.vendor?.companyName || item.vendor?.name}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      <div>{item.invoiceRef}</div>
                      <div className="text-[10px] text-slate-400">{item.invoiceDate}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {item.stock.displayString}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.qcStatus === 'PASSED_QC'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.qcStatus === 'PASSED_QC' ? 'PASSED' : 'HOLD'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleQuarantine(item.batch.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          item.isQuarantined
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {item.isQuarantined ? 'On Hold' : 'Release'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => showToast(`Tracing batch ${item.batch.batchNumber} complete.`)}
                        className="p-1 text-[#0084ff] hover:bg-sky-50 rounded cursor-pointer"
                        title="View Full Lifecycle Trace"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW RECALL MODAL */}
      {showNewRecallModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Register Drug Recall Notice</span>
            </div>
            <form onSubmit={handleAddRecall} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batch to Recall *</label>
                <select
                  value={newRecallBatch}
                  onChange={(e) => setNewRecallBatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.batchNumber}>
                      {b.batchNumber} ({products.find((p) => p.id === b.productId)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Regulatory Authority *</label>
                <input
                  type="text"
                  value={newRecallAuthority}
                  onChange={(e) => setNewRecallAuthority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recall Reason / Defect *</label>
                <textarea
                  value={newRecallReason}
                  onChange={(e) => setNewRecallReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewRecallModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Quarantine & Issue Recall
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW DAMAGE MODAL */}
      {showDamageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>Log Damaged Stock Write-off</span>
            </div>
            <form onSubmit={handleAddDamage} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Batch Number *</label>
                <select
                  value={damageBatch}
                  onChange={(e) => setDamageBatch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.batchNumber}>
                      {b.batchNumber} ({products.find((p) => p.id === b.productId)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Damaged Strips *</label>
                  <input
                    type="number"
                    value={damageQty}
                    onChange={(e) => setDamageQty(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Damage Cause *</label>
                  <select
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="Crushed Packaging">Crushed Packaging</option>
                    <option value="Broken Vials">Broken Vials</option>
                    <option value="Moisture Damage">Moisture Damage</option>
                    <option value="Seal Tampered">Seal Tampered</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDamageModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Record Damage Loss
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
