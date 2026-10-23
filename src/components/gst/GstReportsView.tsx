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
  const { invoices, purchaseInvoices, products, currentUser } = usePharmacy();

  const [fromDate, setFromDate] = useState<string>('01-10-2026');
  const [toDate, setToDate] = useState<string>('12-10-2026');
  const [finYear, setFinYear] = useState<string>('2026 - 2027');
  const [taxPeriod, setTaxPeriod] = useState<string>('October 2026');
  const [gstinSearch, setGstinSearch] = useState<string>('33ABCDE1234F1Z5');
  const [activeReportName, setActiveReportName] = useState<string>('GST Input Register');

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Sample data rows matching Image 4
  const gstInputSampleRows = [
    {
      idx: 1,
      date: '02-10-2026',
      voucherNo: 'PUR-000245',
      supplier: 'Medico Distributors',
      gstin: '33AACM1234B1Z1',
      hsn: '30049099',
      taxable: 25000.0,
      cgst: 2250.0,
      sgst: 2250.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 4500.0,
      total: 29500.0,
    },
    {
      idx: 2,
      date: '03-10-2026',
      voucherNo: 'PUR-000246',
      supplier: 'Sri Pharma',
      gstin: '33BBCD5678C1Z2',
      hsn: '30042019',
      taxable: 48000.0,
      cgst: 4320.0,
      sgst: 4320.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 8640.0,
      total: 56640.0,
    },
    {
      idx: 3,
      date: '05-10-2026',
      voucherNo: 'PUR-000247',
      supplier: 'Global Healthcare',
      gstin: '29AACG7890D1Z5',
      hsn: '30045090',
      taxable: 32500.0,
      cgst: 2925.0,
      sgst: 2925.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 5850.0,
      total: 38350.0,
    },
    {
      idx: 4,
      date: '06-10-2026',
      voucherNo: 'PUR-000248',
      supplier: 'RR Medicals',
      gstin: '33AAAFR1122E1Z8',
      hsn: '30049099',
      taxable: 18750.0,
      cgst: 1687.5,
      sgst: 1687.5,
      igst: 0.0,
      cess: 0.0,
      totalTax: 3375.0,
      total: 22125.0,
    },
    {
      idx: 5,
      date: '08-10-2026',
      voucherNo: 'PUR-000249',
      supplier: 'Apex Surgicals',
      gstin: '33ACPA3344F1Z7',
      hsn: '90189099',
      taxable: 65000.0,
      cgst: 5850.0,
      sgst: 5850.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 11700.0,
      total: 76700.0,
    },
    {
      idx: 6,
      date: '10-10-2026',
      voucherNo: 'PUR-000250',
      supplier: 'United Pharma',
      gstin: '27AAACU5566G1Z9',
      hsn: '30041090',
      taxable: 42000.0,
      cgst: 3780.0,
      sgst: 3780.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 7560.0,
      total: 49560.0,
    },
    {
      idx: 7,
      date: '11-10-2026',
      voucherNo: 'PUR-000251',
      supplier: 'Life Care Distributors',
      gstin: '33AACL7788H1Z2',
      hsn: '30049099',
      taxable: 12800.0,
      cgst: 1152.0,
      sgst: 1152.0,
      igst: 0.0,
      cess: 0.0,
      totalTax: 2304.0,
      total: 15104.0,
    },
    {
      idx: 8,
      date: '12-10-2026',
      voucherNo: 'PUR-000252',
      supplier: 'Sun Pharma Stockist',
      gstin: '36AAACS9999J1Z5',
      hsn: '30045020',
      taxable: 28250.0,
      cgst: 2542.5,
      sgst: 2542.5,
      igst: 0.0,
      cess: 0.0,
      totalTax: 5085.0,
      total: 33335.0,
    },
  ];

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
    const headers = 'Sl No,Date,Voucher No,Supplier,GSTIN,HSN,Taxable,CGST,SGST,IGST,CESS,Total Tax,Invoice Total\n';
    const csvRows = gstInputSampleRows
      .map(
        (r) =>
          `${r.idx},${r.date},${r.voucherNo},"${r.supplier}",${r.gstin},${r.hsn},${r.taxable},${r.cgst},${r.sgst},${r.igst},${r.cess},${r.totalTax},${r.total}`
      )
      .join('\n');
    const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Input_Register_${taxPeriod.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✓ Successfully exported GST Input Register to CSV');
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
            className="bg-white border border-slate-200/90 hover:border-sky-400 rounded-lg p-3 shadow-xs cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 group"
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
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ 4,85,320</div>
            <div className="text-[10px] text-slate-400">Invoices: 42</div>
          </div>
        </div>

        {/* Card 2: Taxable Sales */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#10b981] text-white flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Taxable Sales</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ 5,72,650</div>
            <div className="text-[10px] text-slate-400">Invoices: 68</div>
          </div>
        </div>

        {/* Card 3: Input Tax Credit (ITC) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f97316] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Input Tax Credit (ITC)</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ 61,420</div>
          </div>
        </div>

        {/* Card 4: Output Tax */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8b5cf6] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Output Tax</div>
            <div className="text-base font-extrabold text-slate-900 font-mono">₹ 72,830</div>
          </div>
        </div>

        {/* Card 5: Net GST Payable */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f43f5e] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Net GST Payable</div>
            <div className="text-base font-extrabold text-rose-600 font-mono">₹ 11,410</div>
            <div className="text-[10px] text-slate-400">Output - Input</div>
          </div>
        </div>
      </div>

      {/* Data Table Section matching Image 4 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc]">
            <FileText className="w-4 h-4 text-[#0066cc]" />
            <span>{activeReportName} (Sample Data)</span>
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
              {gstInputSampleRows.map((row) => (
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
            </tbody>
          </table>
        </div>

        {/* Pagination matching Image 4 */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>Showing 1 to 8 of 42 entries (Sample Data)</div>
          <div className="flex items-center gap-1">
            <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
              &lt;
            </button>
            <button type="button" className="px-2.5 py-1 rounded bg-[#0084ff] text-white font-bold">
              1
            </button>
            <button type="button" className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600">
              2
            </button>
            <button type="button" className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600">
              3
            </button>
            <button type="button" className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600">
              4
            </button>
            <button type="button" className="px-2 py-1 rounded hover:bg-slate-100 text-slate-600">
              5
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
