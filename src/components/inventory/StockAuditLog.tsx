import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Building2,
  ShieldCheck,
  User,
  X,
  FileSpreadsheet,
  Plus,
  Minus,
  RefreshCw,
  Info,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  StockAuditLogEntry,
  StockAdjustmentType,
  Product,
  Batch,
  Vendor,
  formatDualUnitStock,
  formatINR,
  calculateExpiryZone,
} from '../../types/pharmacy';
import { exportStockAuditLogCsv } from '../../utils/csvExport';

interface StockAuditLogProps {
  onNavigateToInventory?: () => void;
  onNavigateToPOS?: () => void;
  preselectedBatchId?: string;
  initialOpenModal?: 'ADJUSTMENT' | 'VENDOR_RETURN' | null;
}

export const StockAuditLog: React.FC<StockAuditLogProps> = ({
  onNavigateToInventory,
  onNavigateToPOS,
  preselectedBatchId,
  initialOpenModal,
}) => {
  const {
    stockAuditLogs,
    products,
    batches,
    vendors,
    currentUser,
    recordManualAdjustment,
    recordVendorReturn,
  } = usePharmacy();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState<string>('ALL');
  const [timeframe, setTimeframe] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [entriesPerPage, setEntriesPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(
    initialOpenModal === 'ADJUSTMENT'
  );
  const [showReturnModal, setShowReturnModal] = useState<boolean>(
    initialOpenModal === 'VENDOR_RETURN'
  );
  const [selectedLogDetail, setSelectedLogDetail] = useState<StockAuditLogEntry | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Manual Adjustment Form state
  const [adjProductId, setAdjProductId] = useState<string>(() => {
    if (preselectedBatchId) {
      const b = batches.find((item) => item.id === preselectedBatchId);
      return b?.productId || '';
    }
    return products[0]?.id || '';
  });
  const [adjBatchId, setAdjBatchId] = useState<string>(preselectedBatchId || '');
  const [adjType, setAdjType] = useState<'MANUAL_ADJUSTMENT' | 'DAMAGE_WRITEOFF' | 'EXPIRY_DISPOSAL'>('MANUAL_ADJUSTMENT');
  const [adjDirection, setAdjDirection] = useState<'DEDUCT' | 'ADD'>('DEDUCT');
  const [adjStrips, setAdjStrips] = useState<number>(0);
  const [adjLooseTablets, setAdjLooseTablets] = useState<number>(1);
  const [adjReason, setAdjReason] = useState<string>('Physical stock recount: variance reconciliation per annual audit.');
  const [adjRefNo, setAdjRefNo] = useState<string>(`ADJ/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
  const [adjFormError, setAdjFormError] = useState<string | null>(null);

  // Vendor Return Form state
  const [retProductId, setRetProductId] = useState<string>(() => {
    if (preselectedBatchId) {
      const b = batches.find((item) => item.id === preselectedBatchId);
      return b?.productId || '';
    }
    return products[0]?.id || '';
  });
  const [retBatchId, setRetBatchId] = useState<string>(preselectedBatchId || '');
  const [retVendorId, setRetVendorId] = useState<string>(vendors[0]?.id || '');
  const [retStrips, setRetStrips] = useState<number>(1);
  const [retLooseTablets, setRetLooseTablets] = useState<number>(0);
  const [retDebitNote, setRetDebitNote] = useState<string>(`DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [retReason, setRetReason] = useState<string>('Supplier Return: Batch reached ≤30d expiry threshold liquidation.');
  const [retFormError, setRetFormError] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Filtered batches for adjustment modal
  const availableAdjBatches = useMemo(() => {
    if (!adjProductId) return [];
    return batches.filter((b) => b.productId === adjProductId);
  }, [batches, adjProductId]);

  // Sync adjBatchId when adjProductId changes
  React.useEffect(() => {
    if (availableAdjBatches.length > 0) {
      if (!availableAdjBatches.some((b) => b.id === adjBatchId)) {
        setAdjBatchId(availableAdjBatches[0].id);
      }
    } else {
      setAdjBatchId('');
    }
  }, [adjProductId, availableAdjBatches, adjBatchId]);

  // Filtered batches for vendor return modal
  const availableRetBatches = useMemo(() => {
    if (!retProductId) return [];
    return batches.filter((b) => b.productId === retProductId && b.totalTablets > 0);
  }, [batches, retProductId]);

  React.useEffect(() => {
    if (availableRetBatches.length > 0) {
      if (!availableRetBatches.some((b) => b.id === retBatchId)) {
        setRetBatchId(availableRetBatches[0].id);
      }
    } else {
      setRetBatchId('');
    }
  }, [retProductId, availableRetBatches, retBatchId]);

  // Auto-set vendor from batch if assigned
  React.useEffect(() => {
    if (retBatchId) {
      const b = batches.find((item) => item.id === retBatchId);
      if (b?.vendorId && vendors.some((v) => v.id === b.vendorId)) {
        setRetVendorId(b.vendorId);
      }
    }
  }, [retBatchId, batches, vendors]);

  // Filter & Search stock audit logs
  const filteredAuditLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return stockAuditLogs.filter((log) => {
      // Type filter
      if (selectedType !== 'ALL' && log.adjustmentType !== selectedType) {
        return false;
      }

      // Schedule filter
      if (selectedSchedule !== 'ALL' && log.drugSchedule !== selectedSchedule) {
        return false;
      }

      // Timeframe filter
      if (timeframe === 'TODAY') {
        if (!log.timestamp.startsWith(todayStr)) return false;
      } else if (timeframe === 'WEEK') {
        const logDate = new Date(log.timestamp);
        const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (timeframe === 'MONTH') {
        const logDate = new Date(log.timestamp);
        const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        log.productName.toLowerCase().includes(q) ||
        log.genericComposition.toLowerCase().includes(q) ||
        log.batchNumber.toLowerCase().includes(q) ||
        log.referenceNumber.toLowerCase().includes(q) ||
        log.operatorName.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q) ||
        (log.vendorName && log.vendorName.toLowerCase().includes(q))
      );
    });
  }, [stockAuditLogs, selectedType, selectedSchedule, timeframe, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    let salesDeductionsCount = 0;
    let manualAdjustmentsCount = 0;
    let vendorReturnsCount = 0;
    let inwardPurchasesCount = 0;
    let netTabletsChange = 0;

    stockAuditLogs.forEach((log) => {
      netTabletsChange += log.quantityChangeTablets;
      if (log.adjustmentType === 'SALE_DEDUCTION') salesDeductionsCount++;
      else if (log.adjustmentType === 'MANUAL_ADJUSTMENT' || log.adjustmentType === 'DAMAGE_WRITEOFF' || log.adjustmentType === 'EXPIRY_DISPOSAL') manualAdjustmentsCount++;
      else if (log.adjustmentType === 'VENDOR_RETURN') vendorReturnsCount++;
      else if (log.adjustmentType === 'INWARD_PURCHASE') inwardPurchasesCount++;
    });

    return {
      total: stockAuditLogs.length,
      salesDeductionsCount,
      manualAdjustmentsCount,
      vendorReturnsCount,
      inwardPurchasesCount,
      netTabletsChange,
    };
  }, [stockAuditLogs]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAuditLogs.length / entriesPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAuditLogs.slice(start, start + entriesPerPage);
  }, [filteredAuditLogs, currentPage, entriesPerPage]);

  // Submission handler for Manual Stock Adjustment
  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjFormError(null);

    const prod = products.find((p) => p.id === adjProductId);
    const b = batches.find((item) => item.id === adjBatchId);
    if (!prod || !b) {
      setAdjFormError('Please select a valid medicine and batch.');
      return;
    }

    const stripSize = prod.stripSize || 10;
    const requestedTablets = adjStrips * stripSize + adjLooseTablets;
    if (requestedTablets <= 0) {
      setAdjFormError('Quantity must be greater than zero.');
      return;
    }

    const signedTablets = adjDirection === 'ADD' ? requestedTablets : -requestedTablets;

    if (adjDirection === 'DEDUCT' && b.totalTablets < requestedTablets) {
      setAdjFormError(
        `Deduction exceeds available batch stock (${b.totalTablets} tablets). Cannot cause negative inventory.`
      );
      return;
    }

    if (!adjReason.trim()) {
      setAdjFormError('Mandatory audit justification/remark is required for stock changes.');
      return;
    }

    const result = recordManualAdjustment({
      productId: prod.id,
      batchId: b.id,
      adjustmentType: adjType,
      quantityChangeTablets: signedTablets,
      reason: adjReason.trim(),
      referenceNumber: adjRefNo.trim(),
    });

    if (result.success) {
      showNotification(`✓ Recorded Stock Adjustment: ${prod.name} (${signedTablets > 0 ? '+' : ''}${signedTablets} tabs)`);
      setShowAdjustmentModal(false);
      setAdjStrips(0);
      setAdjLooseTablets(1);
      setAdjRefNo(`ADJ/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setAdjFormError(result.error || 'Failed to record adjustment');
    }
  };

  // Submission handler for Vendor Return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    setRetFormError(null);

    const prod = products.find((p) => p.id === retProductId);
    const b = batches.find((item) => item.id === retBatchId);
    if (!prod || !b) {
      setRetFormError('Please select a valid medicine and batch.');
      return;
    }

    const stripSize = prod.stripSize || 10;
    const returnUnits = retStrips * stripSize + retLooseTablets;
    if (returnUnits <= 0) {
      setRetFormError('Return quantity must be greater than zero.');
      return;
    }

    if (b.totalTablets < returnUnits) {
      setRetFormError(
        `Cannot return ${returnUnits} tablets. Batch ${b.batchNumber} only has ${b.totalTablets} tablets.`
      );
      return;
    }

    if (!retReason.trim()) {
      setRetFormError('Mandatory supplier return reason is required.');
      return;
    }

    const result = recordVendorReturn({
      productId: prod.id,
      batchId: b.id,
      vendorId: retVendorId,
      returnTablets: returnUnits,
      reason: retReason.trim(),
      debitNoteNumber: retDebitNote.trim(),
    });

    if (result.success) {
      showNotification(`✓ Processed Vendor Return: Debit Note #${retDebitNote} created for ${prod.name}`);
      setShowReturnModal(false);
      setRetStrips(1);
      setRetLooseTablets(0);
      setRetDebitNote(`DN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    } else {
      setRetFormError(result.error || 'Failed to process vendor return');
    }
  };

  // Badge helpers
  const renderAdjustmentTypeBadge = (type: StockAdjustmentType) => {
    switch (type) {
      case 'SALE_DEDUCTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <ArrowDownRight className="w-3 h-3 text-sky-600" />
            POS Sale Deduction
          </span>
        );
      case 'MANUAL_ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sliders className="w-3 h-3 text-amber-600" />
            Manual Recount / Correction
          </span>
        );
      case 'VENDOR_RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            Vendor Return (Debit Note)
          </span>
        );
      case 'INWARD_PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            Inward Stock Receipt
          </span>
        );
      case 'DAMAGE_WRITEOFF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Damage Write-Off
          </span>
        );
      case 'EXPIRY_DISPOSAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertTriangle className="w-3 h-3 text-slate-600" />
            Expired Stock Clearance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-md shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-normal text-slate-800">
              Stock Audit Log & Inventory Traceability
            </h1>
            <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              CDSCO Audit Trail
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Full historical accountability recording manual entries, sales deductions, vendor returns, and inward GRN
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAdjFormError(null);
              setShowAdjustmentModal(true);
            }}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manual Adjustment</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRetFormError(null);
              setShowReturnModal(true);
            }}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Vendor Return</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const res = exportStockAuditLogCsv(filteredAuditLogs);
              showNotification(`✓ Downloaded ${res.fileName} (${res.rowCount} audit rows)`);
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Download full audit log in CSV format for tax and drug inspector audit"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded text-xs transition-colors cursor-pointer"
            title="Print Stock Audit Ledger"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Audit Events</div>
          <div className="text-xl font-bold font-sans text-slate-800 mt-1 tabular-nums">
            {stats.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Chronological entries</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs">
          <div className="text-[11px] text-sky-700 font-medium">Sales Deductions</div>
          <div className="text-xl font-bold font-sans text-sky-700 mt-1 tabular-nums">
            {stats.salesDeductionsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">POS bills dispensed</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs">
          <div className="text-[11px] text-amber-800 font-medium">Manual Adjustments</div>
          <div className="text-xl font-bold font-sans text-amber-700 mt-1 tabular-nums">
            {stats.manualAdjustmentsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical recounts & breaks</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs">
          <div className="text-[11px] text-purple-700 font-medium">Vendor Returns</div>
          <div className="text-xl font-bold font-sans text-purple-700 mt-1 tabular-nums">
            {stats.vendorReturnsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Supplier debit notes</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] text-emerald-700 font-medium">Inward Receipts</div>
          <div className="text-xl font-bold font-sans text-emerald-700 mt-1 tabular-nums">
            {stats.inwardPurchasesCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">GRN from wholesalers</div>
        </div>
      </div>

      {/* Toolbar: Search & Multi-Filters */}
      <div className="bg-white border border-slate-200/90 rounded-md p-3.5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Medicine, Batch #, Ref #, Pharmacist or Reason..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-hidden focus:border-sky-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Timeframe Filter */}
          <div className="flex items-center gap-1 text-xs bg-slate-100 p-0.5 rounded border border-slate-200">
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTimeframe(t);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  timeframe === t
                    ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'ALL' ? 'All Time' : t === 'TODAY' ? 'Today' : t === 'WEEK' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Row: Event Type & Drug Schedule */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter by:
          </span>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">All Adjustment Types ({stockAuditLogs.length})</option>
            <option value="SALE_DEDUCTION">POS Sales Deductions</option>
            <option value="MANUAL_ADJUSTMENT">Manual Recounts / Variance</option>
            <option value="VENDOR_RETURN">Vendor Returns (Debit Notes)</option>
            <option value="INWARD_PURCHASE">Inward Stock Receipts (GRN)</option>
            <option value="DAMAGE_WRITEOFF">Damage Write-Offs</option>
            <option value="EXPIRY_DISPOSAL">Expired Stock Clearances</option>
          </select>

          <select
            value={selectedSchedule}
            onChange={(e) => {
              setSelectedSchedule(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700 focus:outline-hidden focus:border-sky-500"
          >
            <option value="ALL">All Drug Schedules</option>
            <option value="OTC">OTC (Over-The-Counter)</option>
            <option value="SCHEDULE_H">Schedule H (Prescription)</option>
            <option value="SCHEDULE_H1">Schedule H1 (Antibiotics Register)</option>
            <option value="SCHEDULE_X">Schedule X (Narcotics)</option>
          </select>

          <span className="ml-auto text-[11px] text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredAuditLogs.length}</span> of {stockAuditLogs.length} entries
          </span>
        </div>
      </div>

      {/* Main Stock Audit Ledger Table */}
      <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3 whitespace-nowrap">Timestamp & Ref #</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Adjustment Type</th>
                <th className="py-2.5 px-3">Medicine & Composition</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Batch & Expiry</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Quantity Change</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Balance Shift</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Operator</th>
                <th className="py-2.5 px-3">Reason / Remarks</th>
                <th className="py-2.5 px-3 text-center">Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No stock adjustment entries matched your filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting search keywords or category filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isPositive = log.quantityChangeTablets > 0;
                  const expiry = calculateExpiryZone(log.expiryDate);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLogDetail(log)}
                    >
                      {/* Timestamp & Reference Number */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{log.formattedTimestamp || new Date(log.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                          Ref: <span className="text-sky-700">{log.referenceNumber}</span>
                        </div>
                      </td>

                      {/* Adjustment Type Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {renderAdjustmentTypeBadge(log.adjustmentType)}
                      </td>

                      {/* Medicine Name & Salt */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 truncate" title={log.productName}>
                          {log.productName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate" title={log.genericComposition}>
                          {log.genericComposition}
                        </div>
                        <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {log.drugSchedule}
                        </span>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {log.batchNumber}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] mt-0.5">
                          <span className="text-slate-400">Exp:</span>
                          <span
                            className={
                              expiry.zone === 'CRITICAL_30'
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-600 font-medium'
                            }
                          >
                            {log.expiryDate}
                          </span>
                          {expiry.zone === 'CRITICAL_30' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="≤30 days threshold" />
                          )}
                        </div>
                      </td>

                      {/* Quantity Change (Dual Unit) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {log.formattedChange}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {isPositive ? `+${log.quantityChangeTablets}` : log.quantityChangeTablets} atomic tabs
                        </div>
                      </td>

                      {/* Stock Balance Shift */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                        <div className="text-slate-400 text-[10px]">
                          Was: <span className="text-slate-600">{log.formattedPreviousStock}</span>
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          Now: <span className="text-slate-800">{log.formattedNewStock}</span>
                        </div>
                      </td>

                      {/* Operator Name & Role */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 text-xs">
                          {log.operatorName.split(',')[0]}
                        </div>
                        <span
                          className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-semibold mt-0.5 ${
                            log.operatorRole === 'ADMIN'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {log.operatorRole === 'ADMIN' ? 'Admin' : 'Assistant'}
                        </span>
                      </td>

                      {/* Reason / Remarks */}
                      <td className="py-2.5 px-3 max-w-[220px]">
                        <p className="text-[11px] text-slate-600 line-clamp-2" title={log.reason}>
                          {log.reason}
                        </p>
                        {log.vendorName && (
                          <div className="text-[10px] text-purple-700 font-medium mt-0.5 truncate">
                            Vendor: {log.vendorName}
                          </div>
                        )}
                      </td>

                      {/* Info Button */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogDetail(log);
                          }}
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors"
                          title="View Full Audit Snapshot"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded text-xs bg-white text-slate-700"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries per page</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px]">
              Page <span className="font-bold text-slate-800">{currentPage}</span> of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: MANUAL STOCK ADJUSTMENT (Physical Recount, Damage, Discrepancy) */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Record Manual Stock Adjustment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Physical count reconciliation, damaged blister write-off, or inventory correction
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4 text-xs">
              {adjFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{adjFormError}</span>
                </div>
              )}

              {/* 1. Medicine Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Medicine <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:border-sky-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.genericComposition}) · {p.stripSize} tabs/strip
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Batch Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Batch <span className="text-rose-500">*</span>
                </label>
                {availableAdjBatches.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded text-xs border border-amber-200">
                    No active batches found for this product.
                  </div>
                ) : (
                  <select
                    value={adjBatchId}
                    onChange={(e) => setAdjBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:border-sky-500"
                  >
                    {availableAdjBatches.map((b) => {
                      const prod = products.find((p) => p.id === adjProductId);
                      const stock = formatDualUnitStock(b.totalTablets, prod?.stripSize || 10);
                      return (
                        <option key={b.id} value={b.id}>
                          Batch {b.batchNumber} (Exp: {b.expiryDate}) — In Stock: {stock.displayString} ({b.totalTablets} tabs)
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* 3. Adjustment Category & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Audit Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) =>
                      setAdjType(
                        e.target.value as 'MANUAL_ADJUSTMENT' | 'DAMAGE_WRITEOFF' | 'EXPIRY_DISPOSAL'
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800"
                  >
                    <option value="MANUAL_ADJUSTMENT">Physical Recount / Variance</option>
                    <option value="DAMAGE_WRITEOFF">Damaged / Broken Packaging</option>
                    <option value="EXPIRY_DISPOSAL">Expired Stock Clearance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Adjustment Direction <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjDirection('DEDUCT')}
                      className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        adjDirection === 'DEDUCT'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                      <span>Deduct (-)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjDirection('ADD')}
                      className={`py-1.5 px-2 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        adjDirection === 'ADD'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add (+)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Dual-Unit Quantity Inputs */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Quantity Adjustment (Dual-Unit Strips & Loose Tablets)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 mb-0.5 block">Full Strips:</span>
                    <input
                      type="number"
                      min={0}
                      value={adjStrips}
                      onChange={(e) => setAdjStrips(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 mb-0.5 block">Loose Tablets:</span>
                    <input
                      type="number"
                      min={0}
                      value={adjLooseTablets}
                      onChange={(e) => setAdjLooseTablets(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Live Balance Impact Preview */}
              {(() => {
                const prod = products.find((p) => p.id === adjProductId);
                const b = batches.find((item) => item.id === adjBatchId);
                if (!prod || !b) return null;
                const stripSize = prod.stripSize || 10;
                const requestedTablets = adjStrips * stripSize + adjLooseTablets;
                const prev = b.totalTablets;
                const next = adjDirection === 'ADD' ? prev + requestedTablets : prev - requestedTablets;
                const prevFmt = formatDualUnitStock(prev, stripSize).displayString;
                const nextFmt = formatDualUnitStock(Math.max(0, next), stripSize).displayString;

                return (
                  <div className="p-3 bg-sky-50/60 border border-sky-200 rounded text-xs text-sky-900 space-y-1">
                    <div className="font-semibold text-sky-950 flex items-center justify-between">
                      <span>Inventory Balance Impact:</span>
                      <span className="font-mono text-[11px]">
                        {adjDirection === 'ADD' ? `+${requestedTablets}` : `-${requestedTablets}`} tablets
                      </span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between">
                      <span className="text-slate-600">Current Balance:</span>
                      <span className="font-semibold">{prevFmt} ({prev} tabs)</span>
                    </div>
                    <div className="text-[11px] flex items-center justify-between pt-1 border-t border-sky-200">
                      <span className="text-slate-700 font-bold">New Balance:</span>
                      <span className={`font-bold font-mono ${next < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {nextFmt} ({next} tabs)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Reference Number & Audit Reason */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Voucher / Audit Reference #
                </label>
                <input
                  type="text"
                  value={adjRefNo}
                  onChange={(e) => setAdjRefNo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  placeholder="ADJ/2026/XXXX"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mandatory Audit Remark / Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Explain why stock was adjusted (e.g., physical count recount variance, damaged packaging written off per pharmacy audit protocol)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Confirm & Commit to Audit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PROCESS VENDOR RETURN (Near-expiry / Damaged supplier returns) */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 bg-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Process Vendor Return & Supplier Debit Note
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Return near-expiry (≤30d) or damaged batches to pharmaceutical wholesaler
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-4 text-xs">
              {retFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{retFormError}</span>
                </div>
              )}

              {/* Medicine Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Medicine to Return <span className="text-rose-500">*</span>
                </label>
                <select
                  value={retProductId}
                  onChange={(e) => setRetProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:border-purple-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.genericComposition}) · {p.stripSize} tabs/strip
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Selection */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Batch <span className="text-rose-500">*</span>
                </label>
                {availableRetBatches.length === 0 ? (
                  <div className="p-2.5 bg-amber-50 text-amber-800 rounded text-xs border border-amber-200">
                    No available stock in batches for this product.
                  </div>
                ) : (
                  <select
                    value={retBatchId}
                    onChange={(e) => setRetBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:border-purple-500"
                  >
                    {availableRetBatches.map((b) => {
                      const prod = products.find((p) => p.id === retProductId);
                      const stock = formatDualUnitStock(b.totalTablets, prod?.stripSize || 10);
                      const expiry = calculateExpiryZone(b.expiryDate);
                      return (
                        <option key={b.id} value={b.id}>
                          Batch {b.batchNumber} (Exp: {b.expiryDate} {expiry.zone === 'CRITICAL_30' ? '⚠️ ≤30d threshold' : ''}) — Available: {stock.displayString}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Supplier / Distributor */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Wholesaler / Distributor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={retVendorId}
                  onChange={(e) => setRetVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-800 focus:outline-hidden focus:border-purple-500"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} (GSTIN: {v.gstin})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dual-unit Return Quantities */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Quantity to Return
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 mb-0.5 block">Full Strips:</span>
                    <input
                      type="number"
                      min={0}
                      value={retStrips}
                      onChange={(e) => setRetStrips(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 mb-0.5 block">Loose Tablets:</span>
                    <input
                      type="number"
                      min={0}
                      value={retLooseTablets}
                      onChange={(e) => setRetLooseTablets(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Debit Note & Reason */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Supplier Debit Note # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={retDebitNote}
                  onChange={(e) => setRetDebitNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                  placeholder="DN-2026-XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Reason for Return <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={retReason}
                  onChange={(e) => setRetReason(e.target.value)}
                  placeholder="e.g. Returned to distributor due to ≤30-day expiry threshold liquidation, transit damage, or recall notice..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Issue Debit Note & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT ENTRY DETAIL DRAWER */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Stock Audit Log Entry Details
                  </h3>
                  {renderAdjustmentTypeBadge(selectedLogDetail.adjustmentType)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  ID: {selectedLogDetail.id} · Ref: {selectedLogDetail.referenceNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Medicine Name</span>
                  <span className="font-bold text-slate-900">{selectedLogDetail.productName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Generic Composition</span>
                  <span className="text-slate-700">{selectedLogDetail.genericComposition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Batch Number</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLogDetail.batchNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Batch Expiry</span>
                  <span className="font-mono text-slate-700">{selectedLogDetail.expiryDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Drug Schedule</span>
                  <span className="font-semibold text-slate-800">{selectedLogDetail.drugSchedule}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Storage Location</span>
                  <span className="text-slate-700">{selectedLogDetail.rackLocation || 'General Pharmacy Rack'}</span>
                </div>
              </div>

              {/* Stock Movement Details */}
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80 space-y-2">
                <div className="font-semibold text-slate-800 text-[11px]">Audit Balance Movement:</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Stock Before Adjustment:</span>
                  <span className="font-semibold text-slate-800">{selectedLogDetail.formattedPreviousStock}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Quantity Changed:</span>
                  <span className={`font-mono font-bold ${selectedLogDetail.quantityChangeTablets > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedLogDetail.formattedChange} ({selectedLogDetail.quantityChangeTablets > 0 ? `+${selectedLogDetail.quantityChangeTablets}` : selectedLogDetail.quantityChangeTablets} tablets)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-bold">
                  <span className="text-slate-800">Resulting Stock Balance:</span>
                  <span className="text-slate-900">{selectedLogDetail.formattedNewStock}</span>
                </div>
              </div>

              {/* Accountability & Operators */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">Responsible Operator</span>
                  <span className="font-semibold text-slate-800">{selectedLogDetail.operatorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Role Authorization</span>
                  <span className="font-semibold text-slate-700">{selectedLogDetail.operatorRole}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Recorded Timestamp</span>
                  <span className="font-mono text-slate-700">
                    {selectedLogDetail.formattedTimestamp || selectedLogDetail.timestamp}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Supplier / Wholesaler</span>
                  <span className="text-slate-700">{selectedLogDetail.vendorName || 'N/A'}</span>
                </div>
              </div>

              {/* Remarks */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-1">Reason / Clinical Audit Remark:</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs italic">
                  "{selectedLogDetail.reason}"
                </p>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs cursor-pointer font-medium"
                >
                  Close Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
