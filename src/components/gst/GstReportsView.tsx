import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  CheckCircle2,
  Percent,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Search,
  RotateCcw,
  HelpCircle,
  ShoppingCart,
  Database,
  BarChart3,
  Save,
  Settings,
  Upload,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, Invoice, Product } from '../../types/pharmacy';

type GstTab =
  | 'OUTPUT_REGISTER'
  | 'INPUT_REGISTER'
  | 'HSN_SALES'
  | 'HSN_PURCHASE'
  | 'GSTR_3B'
  | 'GSTR_1_EXPORT';

export interface GstReportsViewProps {
  initialTab?: GstTab;
}

export const GstReportsView: React.FC<GstReportsViewProps> = ({
  initialTab = 'OUTPUT_REGISTER',
}) => {
  const { invoices, purchaseInvoices, products, vendors, currentUser } = usePharmacy();

  const [fromDate, setFromDate] = useState<string>('01-10-2026');
  const [toDate, setToDate] = useState<string>('12-10-2026');
  const [finYear, setFinYear] = useState<string>('2026 - 2027');
  const [taxPeriod, setTaxPeriod] = useState<string>('October 2026');
  const [gstinSearch, setGstinSearch] = useState<string>('33ABCDE1234F1Z5');
  const [activeReportName, setActiveReportName] = useState<string>(() => {
    const tileMap: Record<string, string> = {
      CLOSING_STOCK: 'Closing Stock Report (VAT Period)',
      UPDATE_REF: 'Update Reference for Return',
      INPUT_REGISTER: 'GST Input Register',
      HSN_PURCHASE: 'HSN-wise Purchase Report',
      OUTPUT_REGISTER: 'GST Output Register',
      HSN_SALES: 'HSN-wise Sales Report',
      GSTR_3B: 'GST Breakup Summary (3B)',
      GSTR_1: 'GSTR-1',
      GSTR_1_SUMMARY: 'GSTR-1 Summary',
      GSP_SETTINGS: 'GSP Settings',
      GSP_EXPORT: 'GSP Export',
      GSTR_2: 'GSTR-2',
    };
    return tileMap[initialTab] || 'GST Input Register';
  });

  const tileMap: Record<string, string> = {
    CLOSING_STOCK: 'Closing Stock Report (VAT Period)',
    UPDATE_REF: 'Update Reference for Return',
    INPUT_REGISTER: 'GST Input Register',
    HSN_PURCHASE: 'HSN-wise Purchase Report',
    OUTPUT_REGISTER: 'GST Output Register',
    HSN_SALES: 'HSN-wise Sales Report',
    GSTR_3B: 'GST Breakup Summary (3B)',
    GSTR_1: 'GSTR-1',
    GSTR_1_SUMMARY: 'GSTR-1 Summary',
    GSP_SETTINGS: 'GSP Settings',
    GSP_EXPORT: 'GSP Export',
    GSTR_2: 'GSTR-2',
  };

  React.useEffect(() => {
    if (initialTab) {
      const mapped = tileMap[initialTab] || initialTab;
      setActiveReportName(mapped);
    }
  }, [initialTab]);

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Dynamic GST report rows computed from actual operational data
  const gstReportRows = useMemo(() => {
    const isOutward =
      activeReportName.includes('Sales') ||
      activeReportName.includes('Output') ||
      activeReportName.includes('GSTR-1');

    if (isOutward) {
      return (invoices || [])
        .filter((inv) => inv.status === 'COMPLETED')
        .map((inv, idx) => {
          const d = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date();
          const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
          const cgst = inv.totalCgst || 0;
          const sgst = inv.totalSgst || 0;
          const igst = inv.totalIgst || 0;
          const totalTax = cgst + sgst + igst;
          const taxable = inv.subtotal || Math.max(0, inv.grandTotal - totalTax);
          return {
            idx: idx + 1,
            date: dateStr,
            voucherNo: inv.invoiceNumber || `SLS-${String(idx + 1).padStart(5, '0')}`,
            supplier: inv.prescription?.patientName || inv.customerName || 'Retail Customer (B2C)',
            gstin: (inv as any).customerGstin || 'URP (Unregistered)',
            hsn: '30049099',
            taxable,
            cgst,
            sgst,
            igst,
            cess: 0,
            totalTax,
            total: inv.grandTotal,
          };
        });
    }

    // Default to Inward / Purchase GST records
    return (purchaseInvoices || []).map((pinv, idx) => {
      const d = pinv.invoiceDate ? new Date(pinv.invoiceDate) : new Date();
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const tax = (pinv.cgstTotal || 0) + (pinv.sgstTotal || 0) + (pinv.igstTotal || 0);
      const taxable = pinv.taxableTotal || Math.max(0, pinv.grandTotal - tax);
      const matchedVendor = vendors?.find((v) => v.id === pinv.vendorId);
      return {
        idx: idx + 1,
        date: dateStr,
        voucherNo: pinv.vendorInvoiceNo || pinv.grnNumber || `PUR-${String(idx + 1).padStart(5, '0')}`,
        supplier: pinv.vendorName || matchedVendor?.companyName || 'Pharmaceutical Wholesaler',
        gstin: matchedVendor?.gstin || '33AAAAA0000A1Z5',
        hsn: '30049099',
        taxable,
        cgst: pinv.cgstTotal || Number((tax / 2).toFixed(2)),
        sgst: pinv.sgstTotal || Number((tax / 2).toFixed(2)),
        igst: pinv.igstTotal || 0,
        cess: 0,
        totalTax: tax,
        total: pinv.grandTotal,
      };
    });
  }, [invoices, purchaseInvoices, vendors, activeReportName]);

  const kpis = useMemo(() => {
    let taxablePurchases = 0;
    let itc = 0;
    (purchaseInvoices || []).forEach((p) => {
      const tax = (p.cgstTotal || 0) + (p.sgstTotal || 0) + (p.igstTotal || 0);
      taxablePurchases += p.taxableTotal || Math.max(0, p.grandTotal - tax);
      itc += tax;
    });

    let taxableSales = 0;
    let outputTax = 0;
    (invoices || []).filter((i) => i.status === 'COMPLETED').forEach((inv) => {
      const tax = (inv.totalCgst || 0) + (inv.totalSgst || 0) + (inv.totalIgst || 0);
      taxableSales += inv.subtotal || (inv.grandTotal - tax);
      outputTax += tax;
    });

    const netPayable = Math.max(0, outputTax - itc);

    return {
      taxablePurchases,
      purchaseCount: (purchaseInvoices || []).length,
      taxableSales,
      salesCount: (invoices || []).filter((i) => i.status === 'COMPLETED').length,
      itc,
      outputTax,
      netPayable,
    };
  }, [purchaseInvoices, invoices]);

  // 12 Feature Tiles matching Image 4
  const gstTiles = [
    {
      id: 'closing_stock',
      title: 'Closing Stock Report (VAT Period)',
      subtitle: 'Stock value as on selected date',
      color: 'bg-[#0084ff]',
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
    },
    {
      id: 'update_ref',
      title: 'Update Reference for Return',
      subtitle: 'Update invoice reference',
      color: 'bg-[#10b981]',
      icon: <RotateCcw className="w-5 h-5 text-white" />,
    },
    {
      id: 'gst_input',
      title: 'GST Input Register',
      subtitle: 'Input tax credit details',
      color: 'bg-[#f97316]',
      icon: <FileText className="w-5 h-5 text-white" />,
    },
    {
      id: 'hsn_purchase',
      title: 'HSN-wise Purchase Report',
      subtitle: 'HSN/SAC wise purchase analysis',
      color: 'bg-[#8b5cf6]',
      icon: <FileSpreadsheet className="w-5 h-5 text-white" />,
    },
    {
      id: 'gst_output',
      title: 'GST Output Register',
      subtitle: 'Output tax details',
      color: 'bg-[#f43f5e]',
      icon: <Save className="w-5 h-5 text-white" />,
    },
    {
      id: 'hsn_sales',
      title: 'HSN-wise Sales Report',
      subtitle: 'HSN/SAC wise sales analysis',
      color: 'bg-[#0d9488]',
      icon: <BarChart3 className="w-5 h-5 text-white" />,
    },
    {
      id: 'gst_breakup_3b',
      title: 'GST Breakup Summary (3B)',
      subtitle: 'Summary for GSTR-3B',
      color: 'bg-[#0284c7]',
      icon: <Database className="w-5 h-5 text-white" />,
    },
    {
      id: 'gstr_1',
      title: 'GSTR-1',
      subtitle: 'Outward supply details',
      color: 'bg-[#e11d48]',
      icon: <Save className="w-5 h-5 text-white" />,
    },
    {
      id: 'gstr_1_summary',
      title: 'GSTR-1 Summary',
      subtitle: 'Section wise summary',
      color: 'bg-[#eab308]',
      icon: <FileText className="w-5 h-5 text-white" />,
    },
    {
      id: 'gsp_settings',
      title: 'GSP Settings',
      subtitle: 'Configure GSP credentials',
      color: 'bg-[#7c3aed]',
      icon: <Settings className="w-5 h-5 text-white" />,
    },
    {
      id: 'gsp_export',
      title: 'GSP Export',
      subtitle: 'Export data to GSP portal',
      color: 'bg-[#16a34a]',
      icon: <Upload className="w-5 h-5 text-white" />,
    },
    {
      id: 'gstr_2',
      title: 'GSTR-2',
      subtitle: 'Inward supply details',
      color: 'bg-[#ec4899]',
      icon: <FileText className="w-5 h-5 text-white" />,
    },
  ];

  const handleExportCsv = () => {
    const headers = 'Sl No,Date,Voucher No,Party / Supplier,GSTIN,HSN,Taxable,CGST,SGST,IGST,CESS,Total Tax,Invoice Total\n';
    const csvRows = gstReportRows
      .map(
        (r) =>
          `${r.idx},${r.date},${r.voucherNo},"${r.supplier}",${r.gstin},${r.hsn},${r.taxable},${r.cgst},${r.sgst},${r.igst},${r.cess},${r.totalTax},${r.total}`
      )
      .join('\n');
    const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Register_${taxPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✓ Successfully exported GST Register to CSV');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner matching Image 4 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0084ff] text-white flex items-center justify-center shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">GST Reports</h1>
            <p className="text-xs text-slate-500 font-medium">Generate and analyze GST related reports</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            Home &gt; <span className="text-slate-600 font-semibold">GST Reports</span>
          </div>
          <button
            type="button"
            onClick={() => showToast('Press F1 anytime for GST compliance documentation & portal rules.')}
            className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help (F1)</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter Row matching Image 4 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">From Date</label>
            <div className="relative">
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs pr-7 font-mono"
              />
              <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-2 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">To Date</label>
            <div className="relative">
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs pr-7 font-mono"
              />
              <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-2 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Financial Year</label>
            <select
              value={finYear}
              onChange={(e) => setFinYear(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="2026 - 2027">2026 - 2027</option>
              <option value="2025 - 2026">2025 - 2026</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Tax Period</label>
            <select
              value={taxPeriod}
              onChange={(e) => setTaxPeriod(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">GSTIN</label>
            <div className="relative">
              <input
                type="text"
                value={gstinSearch}
                onChange={(e) => setGstinSearch(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs font-mono pr-7 uppercase"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast(`✓ GST query loaded for ${taxPeriod}`)}
              className="flex-1 py-1 px-3 bg-[#0084ff] hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search (F5)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate('01-10-2026');
                setToDate('12-10-2026');
              }}
              className="flex-1 py-1 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear (F6)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 12 Vibrant Colorful Feature Tiles matching Image 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {gstTiles.map((tile) => (
          <div
            key={tile.id}
            onClick={() => {
              setActiveReportName(tile.title);
              showToast(`✓ Switched view to: ${tile.title}`);
            }}
            className={`bg-white border rounded-lg p-3 shadow-xs cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 group ${activeReportName === tile.title ? 'border-[#0084ff] ring-2 ring-blue-100 bg-sky-50/20' : 'border-slate-200/90 hover:border-sky-400'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-lg ${tile.color} flex items-center justify-center shrink-0 shadow-xs`}>
                {tile.icon}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[12px] truncate group-hover:text-[#0084ff] transition-colors">
                  {tile.title}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{tile.subtitle}</div>
              </div>
            </div>

            <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-[#0084ff] group-hover:text-white flex items-center justify-center shrink-0 transition-colors text-slate-400">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>

      {/* 5 KPI Summary Cards matching Image 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Card 1: Taxable Purchases */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0084ff] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Taxable Purchases</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ {kpis.taxablePurchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-400">Invoices: {kpis.purchaseCount}</div>
          </div>
        </div>

        {/* Card 2: Taxable Sales */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Taxable Sales</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ {kpis.taxableSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-400">Invoices: {kpis.salesCount}</div>
          </div>
        </div>

        {/* Card 3: Input Tax Credit (ITC) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Input Tax Credit (ITC)</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ {kpis.itc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Card 4: Output Tax */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Output Tax</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ {kpis.outputTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Card 5: Net GST Payable */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f43f5e] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Net GST Payable</div>
            <div className="text-base font-extrabold text-rose-600 font-mono">₹ {kpis.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-400">Output - Input</div>
          </div>
        </div>
      </div>

      {/* Data Table Section matching Image 4 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc]">
            <FileText className="w-4 h-4 text-[#0066cc]" />
            <span>{activeReportName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 bg-[#10b981] hover:bg-emerald-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (F7)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (F8)</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('✓ Generating statutory PDF report...')}
              className="px-3.5 py-1.5 bg-[#f43f5e] hover:bg-rose-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* GST Data Table matching Image 4 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#e6f4fe] text-[#0066cc] font-bold border-b border-[#b6e0fe]">
              <tr>
                <th className="py-2 px-1 text-center w-8">#</th>
                <th className="py-2 px-2 text-left">Date</th>
                <th className="py-2 px-2 text-left">Voucher No</th>
                <th className="py-2 px-3 text-left">Party / Supplier</th>
                <th className="py-2 px-2.5 text-left">GSTIN</th>
                <th className="py-2 px-2 text-center">HSN / SAC</th>
                <th className="py-2 px-2.5 text-right">Taxable Value (₹)</th>
                <th className="py-2 px-2 text-right">CGST (₹)</th>
                <th className="py-2 px-2 text-right">SGST (₹)</th>
                <th className="py-2 px-2 text-right">IGST (₹)</th>
                <th className="py-2 px-2 text-right">CESS (₹)</th>
                <th className="py-2 px-2.5 text-right">Total Tax (₹)</th>
                <th className="py-2 px-2.5 text-right">Invoice Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {gstReportRows.map((row) => (
                <tr key={row.idx} className="hover:bg-sky-50/20 transition-colors">
                  <td className="py-1.5 px-1 text-center font-semibold text-slate-500">{row.idx}</td>
                  <td className="py-1.5 px-2 font-mono">{row.date}</td>
                  <td className="py-1.5 px-2 font-mono font-medium text-slate-800">{row.voucherNo}</td>
                  <td className="py-1.5 px-3 font-semibold text-slate-900">{row.supplier}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[11px]">{row.gstin}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{row.hsn}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">{row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{row.igst.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{row.cess.toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">{row.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">{row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {gstReportRows.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No GST Records for {activeReportName}</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Transactions recorded via Purchase Entries and Retail POS sales will calculate here automatically.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching Image 4 */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>Showing 1 to {gstReportRows.length} of {gstReportRows.length} entries</div>
          <div className="flex items-center gap-1">
            <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
              &lt;
            </button>
            <button type="button" className="px-2.5 py-1 rounded bg-[#0084ff] text-white font-bold">
              1
            </button>
            <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
