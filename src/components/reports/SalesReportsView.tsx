import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Percent,
  Download,
  Printer,
  Users,
  Stethoscope,
  XCircle,
  BarChart3,
  Clock,
  Filter,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR, Invoice, Product } from '../../types/pharmacy';

type SalesReportTab =
  | 'DAILY'
  | 'MONTHLY'
  | 'MARGIN'
  | 'DOCTOR'
  | 'SALES_REP'
  | 'CANCELLATION'
  | 'TAX';

export interface SalesReportsViewProps {
  initialTab?: SalesReportTab;
}

export const SalesReportsView: React.FC<SalesReportsViewProps> = ({
  initialTab = 'DAILY',
}) => {
  const { invoices, batches, products, salesReps, doctors, customers } = usePharmacy();

  const [activeTab, setActiveTab] = useState<SalesReportTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Filter invoices by date
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = inv.invoiceDate.split('T')[0];
      return invDate >= fromDate && invDate <= toDate;
    });
  }, [invoices, fromDate, toDate]);

  // 1. Daily Sales Summary (Ctrl+W)
  const dailySalesData = useMemo(() => {
    const dayMap = new Map<string, { date: string; billCount: number; grossTotal: number; taxTotal: number; cash: number; upi: number; card: number; credit: number }>();

    periodInvoices
      .filter((inv) => inv.status !== 'CANCELLED')
      .forEach((inv) => {
        const dateKey = inv.invoiceDate.split('T')[0];
        const entry = dayMap.get(dateKey) || {
          date: dateKey,
          billCount: 0,
          grossTotal: 0,
          taxTotal: 0,
          cash: 0,
          upi: 0,
          card: 0,
          credit: 0,
        };

        entry.billCount += 1;
        entry.grossTotal += inv.grandTotal;
        entry.taxTotal += inv.totalTax;
        if (inv.paymentMethod === 'CASH') entry.cash += inv.grandTotal;
        else if (inv.paymentMethod === 'UPI') entry.upi += inv.grandTotal;
        else if (inv.paymentMethod === 'CARD') entry.card += inv.grandTotal;
        else if (inv.paymentMethod === 'CREDIT_DUE') entry.credit += inv.grandTotal;

        dayMap.set(dateKey, entry);
      });

    return Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [periodInvoices]);

  // 2. Billwise Margin Report (Cost vs Sale vs Margin %)
  const billwiseMarginData = useMemo(() => {
    return periodInvoices
      .filter((inv) => inv.status !== 'CANCELLED')
      .map((inv) => {
        let totalCost = 0;
        let totalSale = inv.grandTotal;

        inv.items.forEach((item) => {
          const b = batches.find((bat) => bat.id === item.batch.id);
          const costPerTab = (b?.costPricePerStrip || item.batch.costPricePerStrip) / (item.product.stripSize || 10);
          totalCost += costPerTab * item.totalTabletsSold;
        });

        const grossMarginAmt = totalSale - totalCost;
        const marginPct = totalSale > 0 ? (grossMarginAmt / totalSale) * 100 : 0;

        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.invoiceDate,
          customerName: inv.prescription.patientName,
          itemCount: inv.items.length,
          totalCost: Number(totalCost.toFixed(2)),
          totalSale: Number(totalSale.toFixed(2)),
          grossMarginAmt: Number(grossMarginAmt.toFixed(2)),
          marginPct: Number(marginPct.toFixed(1)),
        };
      });
  }, [periodInvoices, batches]);

  // 3. Doctorwise Sales Report
  const doctorwiseSalesData = useMemo(() => {
    const docMap = new Map<string, { doctorName: string; patientCount: Set<string>; billCount: number; totalSales: number }>();

    periodInvoices
      .filter((inv) => inv.status !== 'CANCELLED')
      .forEach((inv) => {
        const docName = inv.prescription.doctorName || 'Self / OTC Counter';
        const entry = docMap.get(docName) || {
          doctorName: docName,
          patientCount: new Set<string>(),
          billCount: 0,
          totalSales: 0,
        };

        entry.billCount += 1;
        entry.patientCount.add(inv.prescription.patientName);
        entry.totalSales += inv.grandTotal;
        docMap.set(docName, entry);
      });

    return Array.from(docMap.values())
      .map((d) => ({
        ...d,
        uniquePatients: d.patientCount.size,
        totalSalesFormatted: formatINR(d.totalSales),
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [periodInvoices]);

  // 4. SalesRepwise Sales Report
  const salesRepData = useMemo(() => {
    return salesReps.map((rep) => {
      // Allocate proportional demo sales or based on customer territory
      const repBills = periodInvoices.filter((inv) => inv.status !== 'CANCELLED');
      const share = rep.code === 'SR-01' ? 0.45 : rep.code === 'SR-02' ? 0.35 : 0.2;
      const allocatedTotal = repBills.reduce((acc, i) => acc + i.grandTotal, 0) * share;
      const commission = allocatedTotal * (rep.commissionPercent / 100);

      return {
        ...rep,
        totalSales: allocatedTotal,
        commissionAmount: commission,
      };
    });
  }, [salesReps, periodInvoices]);

  // 5. Bill Cancellation Report
  const cancelledBills = useMemo(() => {
    return periodInvoices.filter((inv) => inv.status === 'CANCELLED');
  }, [periodInvoices]);

  // 6. Sales Tax Report (Slab Breakdown)
  const salesTaxData = useMemo(() => {
    const slabMap = new Map<number, { gstRate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>();

    periodInvoices
      .filter((inv) => inv.status !== 'CANCELLED')
      .forEach((inv) => {
        inv.taxSlabBreakdowns?.forEach((slab) => {
          const entry = slabMap.get(slab.gstRate) || {
            gstRate: slab.gstRate,
            taxable: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
          };
          entry.taxable += slab.taxableAmount;
          entry.cgst += slab.cgstAmount;
          entry.sgst += slab.sgstAmount;
          entry.igst += slab.igstAmount;
          entry.totalTax += slab.totalTax;
          slabMap.set(slab.gstRate, entry);
        });
      });

    return Array.from(slabMap.values()).sort((a, b) => a.gstRate - b.gstRate);
  }, [periodInvoices]);

  // Download Active Tab CSV
  const handleExportCsv = () => {
    let content = '';
    let filename = `Sales_Report_${activeTab}_${fromDate}_to_${toDate}.csv`;

    if (activeTab === 'DAILY') {
      const headers = ['Date', 'Bills Count', 'Gross Sales (INR)', 'Tax Collected (INR)', 'Cash', 'UPI', 'Card', 'Credit'];
      const rows = dailySalesData.map((d) => [d.date, d.billCount, d.grossTotal, d.taxTotal, d.cash, d.upi, d.card, d.credit]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'MARGIN') {
      const headers = ['Bill Number', 'Date', 'Customer', 'Items', 'Total Cost (INR)', 'Total Sale (INR)', 'Gross Profit (INR)', 'Margin (%)'];
      const rows = billwiseMarginData.map((b) => [b.invoiceNumber, b.date.split('T')[0], `"${b.customerName}"`, b.itemCount, b.totalCost, b.totalSale, b.grossMarginAmt, b.marginPct]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'DOCTOR') {
      const headers = ['Doctor Name', 'Unique Patients', 'Total Invoices', 'Total Sales (INR)'];
      const rows = doctorwiseSalesData.map((d) => [`"${d.doctorName}"`, d.uniquePatients, d.billCount, d.totalSales]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'CANCELLATION') {
      const headers = ['Invoice Number', 'Cancelled Date', 'Customer', 'Original Amount', 'Cashier'];
      const rows = cancelledBills.map((c) => [c.invoiceNumber, c.invoiceDate, `"${c.prescription.patientName}"`, c.grandTotal, `"${c.cashierName}"`]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    } else if (activeTab === 'TAX') {
      const headers = ['GST Slab (%)', 'Taxable Value (INR)', 'CGST (INR)', 'SGST (INR)', 'Total Tax (INR)'];
      const rows = salesTaxData.map((t) => [t.gstRate, t.taxable.toFixed(2), t.cgst.toFixed(2), t.sgst.toFixed(2), t.totalTax.toFixed(2)]);
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
              Ctrl+W
            </span>
            <h1 className="text-lg font-bold text-slate-900">Sales Reports Suite</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ShopAID Sales Report submenu: Daily sales, Billwise margin, Prescriber sales, Cancellations, and Tax breakdown.
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

      {/* Date Filter & Tab Switcher Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Submenu Tabs (Section 4) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('DAILY')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'DAILY' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Sales (Ctrl+W)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MARGIN')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'MARGIN' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Billwise Margin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DOCTOR')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'DOCTOR' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctorwise Sales
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SALES_REP')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'SALES_REP' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SalesRepwise
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CANCELLATION')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'CANCELLATION' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bill Cancellations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TAX')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'TAX' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Tax Breakdown
            </button>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">Period:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs font-mono"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. DAILY SALES REPORT (Section 4)                        */}
      {/* ======================================================== */}
      {activeTab === 'DAILY' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Daily Sales Report & Collection Summary
            </span>
            <span className="text-slate-500">
              Total Recorded Days: {dailySalesData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Bills Count</th>
                  <th className="p-3 text-right">Cash Collection</th>
                  <th className="p-3 text-right">UPI Collection</th>
                  <th className="p-3 text-right">Card Collection</th>
                  <th className="p-3 text-right">Credit Due</th>
                  <th className="p-3 text-right">Tax Collected</th>
                  <th className="p-3 text-right font-bold">Gross Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {dailySalesData.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-900">{d.date}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{d.billCount}</td>
                    <td className="p-3 text-right font-mono">{formatINR(d.cash)}</td>
                    <td className="p-3 text-right font-mono text-cyan-800">{formatINR(d.upi)}</td>
                    <td className="p-3 text-right font-mono">{formatINR(d.card)}</td>
                    <td className="p-3 text-right font-mono text-amber-800">{formatINR(d.credit)}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatINR(d.taxTotal)}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatINR(d.grossTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BILLWISE MARGIN REPORT (Section 4)                    */}
      {/* ======================================================== */}
      {activeTab === 'MARGIN' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Billwise Margin & Profitability Analysis
            </span>
            <span className="text-slate-500 font-mono">
              Invoices Audited: {billwiseMarginData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Customer / Patient</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3 text-right">Wholesale Cost</th>
                  <th className="p-3 text-right">Selling Value</th>
                  <th className="p-3 text-right">Gross Margin (₹)</th>
                  <th className="p-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {billwiseMarginData.map((row) => (
                  <tr key={row.invoiceId} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-emerald-800">{row.invoiceNumber}</td>
                    <td className="p-3 font-mono text-slate-500">{row.date.split('T')[0]}</td>
                    <td className="p-3 font-semibold text-slate-900">{row.customerName}</td>
                    <td className="p-3 text-center font-bold text-slate-600">{row.itemCount}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{formatINR(row.totalCost)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(row.totalSale)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      +{formatINR(row.grossMarginAmt)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold ${
                          row.marginPct >= 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.marginPct >= 15
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.marginPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DOCTORWISE SALES REPORT (Section 4)                   */}
      {/* ======================================================== */}
      {activeTab === 'DOCTOR' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Doctorwise Sales Report (Prescriber Performance)
            </span>
            <span className="text-slate-500">
              Active Doctors: {doctorwiseSalesData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Prescribing Doctor (RMP)</th>
                  <th className="p-3 text-center">Unique Patients</th>
                  <th className="p-3 text-center">Prescriptions Dispensed</th>
                  <th className="p-3 text-right">Total Prescribed Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {doctorwiseSalesData.map((doc) => (
                  <tr key={doc.doctorName} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{doc.doctorName}</div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">{doc.uniquePatients}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{doc.billCount}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                      {doc.totalSalesFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SALESREPWISE SALES REPORT (Section 4)                 */}
      {/* ======================================================== */}
      {activeTab === 'SALES_REP' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              SalesRepwise Sales Report (Territory & Commissions)
            </span>
            <span className="text-slate-500 font-mono">
              Registered Reps: {salesRepData.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Rep Code</th>
                  <th className="p-3">Salesperson Name</th>
                  <th className="p-3">Territory / Division</th>
                  <th className="p-3 text-center">Commission %</th>
                  <th className="p-3 text-right">Territory Sales</th>
                  <th className="p-3 text-right">Estimated Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {salesRepData.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-800">{rep.code}</td>
                    <td className="p-3 font-semibold text-slate-900">{rep.name}</td>
                    <td className="p-3 text-slate-600">{rep.division}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">{rep.commissionPercent}%</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(rep.totalSales)}
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                      {formatINR(rep.commissionAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. BILL CANCELLATION REPORT (Section 4)                  */}
      {/* ======================================================== */}
      {activeTab === 'CANCELLATION' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Bill Cancellation Audit Report
            </span>
            <span className="text-rose-700 font-bold font-mono">
              Total Cancelled: {cancelledBills.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Cancelled Bill No.</th>
                  <th className="p-3">Original Date</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3 text-center">Items Voided</th>
                  <th className="p-3 text-right">Void Amount</th>
                  <th className="p-3">Cashier</th>
                  <th className="p-3 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {cancelledBills.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 bg-rose-50/20">
                    <td className="p-3 font-mono font-bold text-rose-800">{c.invoiceNumber}</td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(c.invoiceDate).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{c.prescription.patientName}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{c.items.length}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">
                      {formatINR(c.grandTotal)}
                    </td>
                    <td className="p-3 text-slate-600">{c.cashierName}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                        Reversed
                      </span>
                    </td>
                  </tr>
                ))}
                {cancelledBills.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No bills cancelled in this time period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. SALES TAX REPORT (Section 4)                          */}
      {/* ======================================================== */}
      {activeTab === 'TAX' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Sales Tax Report (CBIC GST Slab Breakup)
            </span>
            <span className="text-slate-500">
              Outward Supplies GST Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">GST Rate Slab</th>
                  <th className="p-3 text-right">Taxable Turnover (₹)</th>
                  <th className="p-3 text-right">CGST (₹)</th>
                  <th className="p-3 text-right">SGST (₹)</th>
                  <th className="p-3 text-right">IGST (₹)</th>
                  <th className="p-3 text-right font-bold">Total Output Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {salesTaxData.map((slab) => (
                  <tr key={slab.gstRate} className="hover:bg-slate-50/60">
                    <td className="p-3">
                      <span className="px-2.5 py-1 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-md font-bold font-mono">
                        {slab.gstRate}% GST Slab
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(slab.taxable)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">{formatINR(slab.cgst)}</td>
                    <td className="p-3 text-right font-mono text-slate-700">{formatINR(slab.sgst)}</td>
                    <td className="p-3 text-right font-mono text-slate-700">{formatINR(slab.igst)}</td>
                    <td className="p-3 text-right font-mono font-extrabold text-emerald-800">
                      {formatINR(slab.totalTax)}
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
