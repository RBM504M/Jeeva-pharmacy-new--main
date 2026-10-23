import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { DrugSchedule } from '../../types/pharmacy';

export const PrescriptionRegisterView: React.FC = () => {
  const { invoices, products, currentUser, doctors } = usePharmacy();

  const [activeRegister, setActiveRegister] = useState<'REGISTER_1' | 'REGISTER_2'>('REGISTER_1');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [scheduleCodeFilter, setScheduleCodeFilter] = useState<'ALL' | DrugSchedule>('ALL');
  const [serialNoStart, setSerialNoStart] = useState<number>(1);
  const [pageNo, setPageNo] = useState<number>(1);

  // Rows matching Section 11.2 columns
  const registerRows = useMemo(() => {
    const list: Array<{
      serialNo: number;
      billNo: string;
      billDate: string;
      prescriberName: string;
      prescriberRegNo: string;
      patientNameAndAddress: string;
      patientPhone: string;
      drugPrescribed: string;
      quantity: string;
      manufacturerCode: string;
      batchNo: string;
      dateOfExpiry: string;
      schedule: DrugSchedule;
    }> = [];

    let count = serialNoStart;

    invoices
      .filter((inv) => {
        if (inv.status === 'CANCELLED') return false;
        const invDate = inv.invoiceDate.split('T')[0];
        if (fromDate && invDate < fromDate) return false;
        if (toDate && invDate > toDate) return false;
        if (selectedDoctorFilter !== 'ALL' && inv.prescription.doctorName !== selectedDoctorFilter) {
          return false;
        }
        return true;
      })
      .forEach((inv) => {
        inv.items.forEach((item) => {
          if (scheduleCodeFilter !== 'ALL' && item.product.drugSchedule !== scheduleCodeFilter) {
            return;
          }

          const address = inv.prescription.notes?.includes('Address:')
            ? inv.prescription.notes.replace('Address:', '').trim()
            : 'Chennai, Tamil Nadu';

          list.push({
            serialNo: count++,
            billNo: inv.invoiceNumber,
            billDate: new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
            prescriberName: inv.prescription.doctorName || 'Dr. A. Swaminathan, MD',
            prescriberRegNo: inv.prescription.doctorRegNumber || 'TNMC-84920',
            patientNameAndAddress: `${inv.prescription.patientName}, ${address}`,
            patientPhone: inv.prescription.patientContact || 'N/A',
            drugPrescribed: `${item.product.name} (${item.product.genericComposition})`,
            quantity: `${item.quantity} ${item.unitType}`,
            manufacturerCode: item.product.manufacturer.slice(0, 16),
            batchNo: item.batch.batchNumber,
            dateOfExpiry: item.batch.expiryDate,
            schedule: item.product.drugSchedule,
          });
        });
      });

    return list;
  }, [invoices, fromDate, toDate, selectedDoctorFilter, scheduleCodeFilter, serialNoStart]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'S.No.',
      'Bill No.',
      'Bill Date',
      'Name of the Prescriber',
      'Prescriber Reg. No.',
      'Name of the Patient and Address',
      'Name of the Drug Prescribed',
      'Quantity',
      'Manufacturer Code',
      'Batch No.',
      'Date of Expiry',
      'Pharmacist Signature',
    ];

    const rows = registerRows.map((r) => [
      r.serialNo,
      `"${r.billNo}"`,
      `"${r.billDate}"`,
      `"${r.prescriberName}"`,
      `"${r.prescriberRegNo}"`,
      `"${r.patientNameAndAddress}"`,
      `"${r.drugPrescribed}"`,
      `"${r.quantity}"`,
      `"${r.manufacturerCode}"`,
      `"${r.batchNo}"`,
      `"${r.dateOfExpiry}"`,
      `"${currentUser.name}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription_Register_${activeTabFilename(activeRegister)}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  function activeTabFilename(tab: string) {
    return tab === 'REGISTER_1' ? 'Register_I' : 'Register_II';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
              Section 11
            </span>
            <h1 className="text-lg font-bold text-slate-900">Prescription Register I & II</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescription transactions, prescriber council records, and patient-specific medicine logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Register I / II */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold mr-2">
            <button
              type="button"
              onClick={() => setActiveRegister('REGISTER_1')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeRegister === 'REGISTER_1' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prescription Register I
            </button>
            <button
              type="button"
              onClick={() => setActiveRegister('REGISTER_2')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeRegister === 'REGISTER_2' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prescription Register II
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
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

      {/* Filter Toolbar (Section 11.1) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Enter To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Prescriber</label>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Consider Schedule Code</label>
            <select
              value={scheduleCodeFilter}
              onChange={(e) => setScheduleCodeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
            >
              <option value="ALL">All Schedules</option>
              <option value="SCHEDULE_H">Schedule H</option>
              <option value="SCHEDULE_H1">Schedule H1</option>
              <option value="SCHEDULE_X">Schedule X</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Page Number</label>
            <input
              type="number"
              min={1}
              value={pageNo}
              onChange={(e) => setPageNo(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-center"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Serial No.</label>
            <input
              type="number"
              min={1}
              value={serialNoStart}
              onChange={(e) => setSerialNoStart(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-center font-bold"
            />
          </div>
        </div>
      </div>

      {/* Report Columns Table (Section 11.2) */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider">
            {activeRegister === 'REGISTER_1' ? 'Prescription Register I' : 'Prescription Register II'}
          </span>
          <span className="font-mono text-emerald-400">
            Page {pageNo} · Showing {registerRows.length} prescription records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center">S.No.</th>
                <th className="p-2.5 w-28">Bill No.</th>
                <th className="p-2.5 w-44">Name of the Prescriber</th>
                <th className="p-2.5 w-52">Name of the Patient and Address</th>
                <th className="p-2.5 w-56">Name of the Drug Prescribed</th>
                <th className="p-2.5 w-20 text-right">Quantity</th>
                <th className="p-2.5 w-28">Manufacturer Code</th>
                <th className="p-2.5 w-24">Batch No.</th>
                <th className="p-2.5 w-24">Date of Expiry</th>
                <th className="p-2.5 w-28 text-center">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {registerRows.map((r) => (
                <tr key={`${r.billNo}_${r.serialNo}`} className="hover:bg-slate-50/50">
                  <td className="p-2.5 text-center font-mono font-bold text-slate-500">{r.serialNo}</td>
                  <td className="p-2.5">
                    <span className="font-mono font-bold text-emerald-800">{r.billNo}</span>
                    <div className="text-[10px] text-slate-400 font-mono">{r.billDate}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-semibold text-slate-900">{r.prescriberName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Reg: {r.prescriberRegNo}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900">{r.patientNameAndAddress}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.patientPhone}</div>
                  </td>
                  <td className="p-2.5">
                    <div className="font-bold text-slate-900 leading-tight">{r.drugPrescribed}</div>
                    <span
                      className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        r.schedule === 'SCHEDULE_H1'
                          ? 'bg-purple-100 text-purple-800'
                          : r.schedule === 'SCHEDULE_X'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.schedule.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900 font-mono">{r.quantity}</td>
                  <td className="p-2.5 font-mono text-slate-700">{r.manufacturerCode}</td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">{r.batchNo}</td>
                  <td className="p-2.5 font-mono text-slate-600">{r.dateOfExpiry}</td>
                  <td className="p-2.5 text-center">
                    <div className="border-b border-dashed border-slate-300 pb-1 text-[10px] text-slate-400 italic">
                      Signed
                    </div>
                  </td>
                </tr>
              ))}
              {registerRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No prescription entries match the selected filters.
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
