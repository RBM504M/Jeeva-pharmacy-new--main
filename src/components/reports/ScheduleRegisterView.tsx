import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { DrugSchedule } from '../../types/pharmacy';

export const ScheduleRegisterView: React.FC = () => {
  const { invoices, products, batches, currentUser } = usePharmacy();

  // Filters from Section 10 of ShopAID
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [scheduleType, setScheduleType] = useState<'ALL' | DrugSchedule>('SCHEDULE_H');
  const [transactionMode, setTransactionMode] = useState<string>('ALL');
  const [terminalNo, setTerminalNo] = useState<string>('Terminal 01');
  const [pageNo, setPageNo] = useState<number>(1);
  const [startingSerialNo, setStartingSerialNo] = useState<number>(1);

  // Extract all scheduled drug sales line-by-line
  const scheduledRows = useMemo(() => {
    const list: Array<{
      serialNo: number;
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      patientName: string;
      patientAddress: string;
      patientContact: string;
      doctorName: string;
      doctorRegNo: string;
      drugName: string;
      genericComposition: string;
      schedule: DrugSchedule;
      quantitySold: number;
      unitType: string;
      batchNumber: string;
      expiryDate: string;
      manufacturer: string;
      paymentMode: string;
    }> = [];

    let counter = startingSerialNo;

    invoices
      .filter((inv) => {
        if (inv.status === 'CANCELLED') return false;
        const invDate = inv.invoiceDate.split('T')[0];
        if (fromDate && invDate < fromDate) return false;
        if (toDate && invDate > toDate) return false;
        if (transactionMode !== 'ALL' && inv.paymentMethod !== transactionMode) return false;
        return true;
      })
      .forEach((inv) => {
        inv.items.forEach((item) => {
          const sched = item.product.drugSchedule;
          // Only Schedule H, H1, X (or match filter)
          if (sched === 'OTC') return;
          if (scheduleType !== 'ALL' && sched !== scheduleType) return;

          list.push({
            serialNo: counter++,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            patientName: inv.prescription.patientName,
            patientAddress: inv.prescription.notes?.includes('Address:')
              ? inv.prescription.notes.replace('Address:', '').trim()
              : '',
            patientContact: inv.prescription.patientContact || 'Walk-in',
            doctorName: inv.prescription.doctorName || '',
            doctorRegNo: inv.prescription.doctorRegNumber || '',
            drugName: item.product.name,
            genericComposition: item.product.genericComposition,
            schedule: sched,
            quantitySold: item.quantity,
            unitType: item.unitType,
            batchNumber: item.batch.batchNumber,
            expiryDate: item.batch.expiryDate,
            manufacturer: item.product.manufacturer,
            paymentMode: inv.paymentMethod,
          });
        });
      });

    return list;
  }, [invoices, fromDate, toDate, scheduleType, transactionMode, startingSerialNo]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No.',
      'Bill Number',
      'Bill Date',
      'Patient Name',
      'Patient Residential Address',
      'Patient Phone',
      'Prescribing Doctor (RMP)',
      'Doctor Council Reg. No.',
      'Drug Name & Strength',
      'Generic Salt Composition',
      'Schedule Category',
      'Quantity Dispensed',
      'Unit',
      'Batch Number',
      'Date of Expiry',
      'Manufacturer',
      'Dispensing Pharmacist Signature',
    ];

    const rows = scheduledRows.map((r) => [
      r.serialNo,
      `"${r.invoiceNumber}"`,
      `"${new Date(r.invoiceDate).toLocaleDateString('en-IN')}"`,
      `"${r.patientName}"`,
      `"${r.patientAddress}"`,
      `"${r.patientContact}"`,
      `"${r.doctorName}"`,
      `"${r.doctorRegNo}"`,
      `"${r.drugName}"`,
      `"${r.genericComposition}"`,
      `"${r.schedule}"`,
      r.quantitySold,
      `"${r.unitType}"`,
      `"${r.batchNumber}"`,
      `"${r.expiryDate}"`,
      `"${r.manufacturer}"`,
      `"${currentUser.name} (${currentUser.dlNumber})"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Statutory_Schedule_Register_${scheduleType}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
              Rule 65 Compliance
            </span>
            <h1 className="text-lg font-bold text-slate-900">Schedule Register (Schedule H, H1 & X)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Statutory inspection register mandated by Drugs and Cosmetics Rules, 1945.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Register</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Statutory Banner Notice */}
      <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Drug Inspector Audit Compliance Notice:</strong>
          <p className="mt-0.5 leading-relaxed text-[11px] text-amber-800">
            As per Rule 65(9) and Rule 65(10) of the Drugs & Cosmetics Rules, retail pharmacies in India must
            maintain separate day-to-day registers for Schedule H, Schedule H1, and Schedule X formulations. Each record
            must substantiate prescriber license number, patient residential address, and batch expiration. Records
            must be preserved for a minimum of 2 years from date of dispensing.
          </p>
        </div>
      </div>

      {/* Filters Form (Matching ShopAID Section 10) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          {/* Schedule Type Selection (Section 10 Dropdown: Schedule H, Schedule H1, Schedule X) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Schedule Type</label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
            >
              <option value="ALL">All Scheduled Formulations</option>
              <option value="SCHEDULE_H">Schedule H</option>
              <option value="SCHEDULE_H1">Schedule H1 (High Vigilance)</option>
              <option value="SCHEDULE_X">Schedule X (Psychotropic/Narcotic)</option>
            </select>
          </div>

          {/* Transaction Mode */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Transaction Mode</label>
            <select
              value={transactionMode}
              onChange={(e) => setTransactionMode(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CREDIT_DUE">Credit</option>
            </select>
          </div>

          {/* Terminal No */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Terminal No.</label>
            <input
              type="text"
              value={terminalNo}
              onChange={(e) => setTerminalNo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
            />
          </div>

          {/* Page No */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Page No. / Serial</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min={1}
                value={pageNo}
                onChange={(e) => setPageNo(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-center"
              />
              <span className="self-center text-slate-400">#</span>
              <input
                type="number"
                min={1}
                value={startingSerialNo}
                onChange={(e) => setStartingSerialNo(parseInt(e.target.value) || 1)}
                className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-center font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-500">
            Filtered Schedule Register: <strong className="text-slate-900">{scheduledRows.length}</strong> entry/entries
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Registered Store License: {currentUser.dlNumber}
          </div>
        </div>
      </div>

      {/* Statutory Register Grid (Section 10 & 11) */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
          <div className="font-bold uppercase tracking-wider">
            {scheduleType === 'ALL' ? 'Consolidated Schedule Formulations Register' : `${scheduleType.replace('_', ' ')} Register`}
          </div>
          <div className="font-mono text-emerald-400">
            Page {pageNo} · Terminal: {terminalNo}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center">S.No.</th>
                <th className="p-2.5 w-28">Bill No & Date</th>
                <th className="p-2.5 w-44">Name of Prescriber & Reg. No.</th>
                <th className="p-2.5 w-48">Patient Name & Address</th>
                <th className="p-2.5 w-52">Name of the Drug Prescribed</th>
                <th className="p-2.5 w-20 text-right">Quantity</th>
                <th className="p-2.5 w-24">Batch No.</th>
                <th className="p-2.5 w-24">Date of Expiry</th>
                <th className="p-2.5 w-32">Manufacturer</th>
                <th className="p-2.5 w-28 text-center">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {scheduledRows.map((row) => (
                <tr key={`${row.invoiceId}_${row.serialNo}`} className="hover:bg-slate-50/50">
                  <td className="p-2.5 text-center font-mono font-bold text-slate-500">{row.serialNo}</td>
                  <td className="p-2.5">
                    <div className="font-mono font-bold text-emerald-800">{row.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {new Date(row.invoiceDate).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900">{row.doctorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Reg: {row.doctorRegNo}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{row.patientName}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{row.patientAddress}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{row.drugName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          row.schedule === 'SCHEDULE_H1'
                            ? 'bg-purple-100 text-purple-800'
                            : row.schedule === 'SCHEDULE_X'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.schedule.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{row.genericComposition}</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                    {row.quantitySold} {row.unitType}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">{row.batchNumber}</td>
                  <td className="p-2.5 font-mono text-slate-600">{row.expiryDate}</td>
                  <td className="p-2.5 text-slate-700 truncate max-w-[120px]">{row.manufacturer}</td>
                  <td className="p-2.5 text-center">
                    <div className="border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-400 font-mono italic">
                      Verified
                    </div>
                  </td>
                </tr>
              ))}
              {scheduledRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No scheduled drug transactions found matching the selected dates and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
