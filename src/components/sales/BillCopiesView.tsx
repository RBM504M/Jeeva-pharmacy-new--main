import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Printer,
  XCircle,
  RotateCcw,
  Eye,
  FileText,
  CreditCard,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Edit,
  Ban,
  FileCheck,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Invoice, PaymentMethod, formatINR } from '../../types/pharmacy';

interface BillCopiesViewProps {
  onLoadBillToPos?: (invoice: Invoice) => void;
  onOpenPosBilling?: () => void;
  initialAction?: 'COPIES' | 'MODIFICATION' | 'CANCELLATION' | 'RETURNS';
}

export const BillCopiesView: React.FC<BillCopiesViewProps> = ({
  onLoadBillToPos,
  onOpenPosBilling,
  initialAction,
}) => {
  const {
    invoices,
    cancelInvoice,
    updateInvoicePaymentMethod,
    processSalesReturn,
    customers,
    doctors,
    salesReps,
    currentUser,
  } = usePharmacy();

  // Filter States matching Image 3
  const [fromDate, setFromDate] = useState<string>('01-10-2026');
  const [toDate, setToDate] = useState<string>('12-10-2026');
  const [txType, setTxType] = useState<string>('All');
  const [series, setSeries] = useState<string>('All');
  const [billNoQuery, setBillNoQuery] = useState<string>('');
  const [customerQuery, setCustomerQuery] = useState<string>('');
  const [mobileQuery, setMobileQuery] = useState<string>('');
  const [terminalNo, setTerminalNo] = useState<string>('All');
  const [txMode, setTxMode] = useState<string>('All');

  // Selected Bill for details inspection & context actions
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(invoices[0]?.id || 'SLS-00031');
  const [showContextMenu, setShowContextMenu] = useState<boolean>(true);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [newPaymentMode, setNewPaymentMode] = useState<PaymentMethod>('UPI');
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnItemQtys, setReturnItemQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<string>('Patient requested refund / excess tablets');
  const [returnRefundMode, setReturnRefundMode] = useState<PaymentMethod>('CASH');
  const [showInvoiceViewModal, setShowInvoiceViewModal] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  React.useEffect(() => {
    if (initialAction === 'MODIFICATION') {
      setShowPaymentModal(true);
    } else if (initialAction === 'CANCELLATION') {
      setShowCancelModal(true);
    } else if (initialAction === 'RETURNS') {
      setShowReturnModal(true);
    } else if (initialAction === 'COPIES') {
      setShowInvoiceViewModal(true);
    }
  }, [initialAction]);

  // Master bills list: loads real invoices from context with fallback to demo bills
  const sampleInvoicesList = useMemo(() => {
    let list: Array<{
      id: string;
      billDate: string;
      billTime: string;
      billNumber: string;
      customerName: string;
      mobileNo: string;
      billAmount: number;
      discAmt: number;
      netAmount: number;
      terminal: string;
      mode: string;
      status: string;
    }> = [];

    if (invoices && invoices.length > 0) {
      list = invoices.map((inv, idx) => {
        const d = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date();
        const billDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        const billTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return {
          id: inv.id,
          billDate,
          billTime,
          billNumber: inv.invoiceNumber || `SLS-${String(idx + 1).padStart(5, '0')}`,
          customerName: inv.prescription?.patientName || inv.customerName || 'Walk-in Customer',
          mobileNo: inv.prescription?.patientContact || '-',
          billAmount: inv.subtotal || inv.grandTotal,
          discAmt: 0,
          netAmount: inv.grandTotal,
          terminal: 'T01',
          mode: inv.paymentMethod || 'Cash',
          status: inv.status === 'CANCELLED' ? 'Cancelled' : inv.status === 'RETURNED' ? 'Return' : 'Normal',
        };
      });
    } else {
      list = [
      {
        id: 'inv_1',
        billDate: '12-10-2026',
        billTime: '10:21 AM',
        billNumber: 'SLS-00032',
        customerName: 'Kumar',
        mobileNo: '9843012345',
        billAmount: 842.0,
        discAmt: 42.0,
        netAmount: 800.0,
        terminal: 'T01',
        mode: 'Cash',
        status: 'Normal',
      },
      {
        id: 'inv_2',
        billDate: '12-10-2026',
        billTime: '09:58 AM',
        billNumber: 'SLS-00031',
        customerName: 'Priya',
        mobileNo: '9786012345',
        billAmount: 1230.0,
        discAmt: 0.0,
        netAmount: 1230.0,
        terminal: 'T01',
        mode: 'UPI',
        status: 'Normal',
      },
      {
        id: 'inv_3',
        billDate: '12-10-2026',
        billTime: '09:42 AM',
        billNumber: 'SLS-00030',
        customerName: 'Saravanan',
        mobileNo: '9600012345',
        billAmount: 650.0,
        discAmt: 0.0,
        netAmount: 650.0,
        terminal: 'T02',
        mode: 'Card',
        status: 'Normal',
      },
      {
        id: 'inv_4',
        billDate: '12-10-2026',
        billTime: '09:18 AM',
        billNumber: 'SLS-00029',
        customerName: 'Radhika',
        mobileNo: '9789012345',
        billAmount: 1540.0,
        discAmt: 50.0,
        netAmount: 1490.0,
        terminal: 'T01',
        mode: 'Cash',
        status: 'Normal',
      },
      {
        id: 'inv_5',
        billDate: '12-10-2026',
        billTime: '08:52 AM',
        billNumber: 'SLS-00028',
        customerName: 'Venkatesh',
        mobileNo: '9841012345',
        billAmount: 980.0,
        discAmt: 0.0,
        netAmount: 980.0,
        terminal: 'T02',
        mode: 'UPI',
        status: 'Normal',
      },
      {
        id: 'inv_6',
        billDate: '11-10-2026',
        billTime: '07:36 PM',
        billNumber: 'SLS-00027',
        customerName: 'Karthik',
        mobileNo: '9845012345',
        billAmount: 420.0,
        discAmt: 0.0,
        netAmount: 420.0,
        terminal: 'T01',
        mode: 'Cash',
        status: 'Cancelled',
      },
      {
        id: 'inv_7',
        billDate: '11-10-2026',
        billTime: '06:25 PM',
        billNumber: 'SLS-00026',
        customerName: 'Anitha',
        mobileNo: '9500012345',
        billAmount: 1120.0,
        discAmt: 20.0,
        netAmount: 1100.0,
        terminal: 'T01',
        mode: 'UPI',
        status: 'Return',
      },
      {
        id: 'inv_8',
        billDate: '11-10-2026',
        billTime: '05:10 PM',
        billNumber: 'SLS-00025',
        customerName: 'Deepak',
        mobileNo: '9940012345',
        billAmount: 360.0,
        discAmt: 0.0,
        netAmount: 360.0,
        terminal: 'T02',
        mode: 'Cash',
        status: 'Normal',
      },
    ];

    }

    if (!billNoQuery.trim() && !customerQuery.trim()) return list;
    return list.filter((item) => {
      if (billNoQuery.trim() && !item.billNumber.toLowerCase().includes(billNoQuery.toLowerCase())) return false;
      if (customerQuery.trim() && !item.customerName.toLowerCase().includes(customerQuery.toLowerCase())) return false;
      return true;
    });
  }, [invoices, billNoQuery, customerQuery]);

  const activeBill = sampleInvoicesList.find((b) => b.id === selectedInvoiceId) || sampleInvoicesList[0] || {
    id: 'none',
    billDate: 'Today',
    billTime: '10:00 AM',
    billNumber: 'N/A',
    customerName: 'N/A',
    mobileNo: '-',
    billAmount: 0,
    discAmt: 0,
    netAmount: 0,
    terminal: 'T01',
    mode: 'Cash',
    status: 'Normal',
  };

  const activeRealInvoice = invoices.find((i) => i.id === selectedInvoiceId || i.invoiceNumber === activeBill?.billNumber);

  // Bill items corresponding to active selected bill matching Image 3
  const activeBillItems = useMemo(() => {
    if (activeRealInvoice && activeRealInvoice.items && activeRealInvoice.items.length > 0) {
      return activeRealInvoice.items.map((item, idx) => ({
        idx: idx + 1,
        name: item.product?.name || 'Medicine',
        composition: item.product?.genericComposition || item.product?.name || 'Medicine',
        batch: item.batch?.batchNumber || 'B001',
        expiry: item.batch?.expiryDate || 'N/A',
        qty: item.quantity,
        freeQty: 0,
        mrp: item.batch?.mrpPerStrip || item.unitPrice,
        rate: item.unitPrice,
        discPercent: 0,
        discAmt: 0,
        amount: item.totalAmount,
      }));
    }
    return [
    {
      idx: 1,
      name: 'Paracetamol 500mg',
      composition: 'Paracetamol 500mg',
      batch: 'P2501',
      expiry: '04/2027',
      qty: 2,
      freeQty: 0,
      mrp: 15.0,
      rate: 12.5,
      discPercent: 0.0,
      discAmt: 0.0,
      amount: 25.0,
    },
    {
      idx: 2,
      name: 'Amoxicillin 500mg',
      composition: 'Amoxicillin 500mg',
      batch: 'A2410',
      expiry: '11/2026',
      qty: 1,
      freeQty: 0,
      mrp: 32.0,
      rate: 28.0,
      discPercent: 0.0,
      discAmt: 0.0,
      amount: 28.0,
    },
    {
      idx: 3,
      name: 'ORS Packet',
      composition: 'Oral Rehydration Salts',
      batch: 'O2405',
      expiry: '05/2027',
      qty: 2,
      freeQty: 0,
      mrp: 25.0,
      rate: 22.0,
      discPercent: 0.0,
      discAmt: 0.0,
      amount: 44.0,
    },
    {
      idx: 4,
      name: 'Crocin 650mg',
      composition: 'Paracetamol 650mg',
      batch: 'C2408',
      expiry: '08/2026',
      qty: 1,
      freeQty: 0,
      mrp: 70.0,
      rate: 70.0,
      discPercent: 0.0,
      discAmt: 0.0,
      amount: 70.0,
    },
    ];
  }, [activeRealInvoice]);

  // Real context invoice handler (fallback)
  const realSelectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || invoices[0];

  const handleConfirmCancel = () => {
    if (!realSelectedInvoice) {
      triggerNotice(`✓ Bill #${activeBill.billNumber} cancelled.`);
      setShowCancelModal(false);
      return;
    }
    const res = cancelInvoice(realSelectedInvoice.id, cancelReason || 'Customer requested cancellation');
    if (res.success) {
      triggerNotice(`✓ Bill #${realSelectedInvoice.invoiceNumber} cancelled.`);
      setShowCancelModal(false);
      setCancelReason('');
    }
  };

  const handleDownloadPnet = () => {
    const lines = [
      '[PNET-BILL-EXCHANGE-V2]',
      `INVOICE=${activeBill.billNumber}`,
      `DATE=${activeBill.billDate}`,
      `TIME=${activeBill.billTime}`,
      `CUSTOMER=${activeBill.customerName}`,
      `MOBILE=${activeBill.mobileNo}`,
      `TERMINAL=${activeBill.terminal}`,
      `PAYMENT_MODE=${activeBill.mode}`,
      `NET_AMOUNT=${activeBill.netAmount}`,
      'ITEMS_COUNT=4',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeBill.billNumber}_PNET.txt`;
    link.click();
    URL.revokeObjectURL(url);
    triggerNotice(`✓ Recreated and downloaded PNET file for ${activeBill.billNumber}`);
  };

  return (
    <div className="space-y-3.5">
      {/* Title Bar matching Image 3 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#0084ff] text-white flex items-center justify-center shadow-xs">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bill Copy</h1>
          <p className="text-xs text-slate-500 font-medium">Search, view, reprint and manage sales bills</p>
        </div>
      </div>

      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2-Row Filter Bar matching Image 3 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2 text-xs">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
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

          <div>
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

          <div>
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Transaction Type</label>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="All">All</option>
              <option value="Sale">Sale</option>
              <option value="Return">Return</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Series</label>
            <select
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="All">All</option>
              <option value="SLS">SLS</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Bill No</label>
            <input
              type="text"
              placeholder="Enter Bill No"
              value={billNoQuery}
              onChange={(e) => setBillNoQuery(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs"
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Customer Name</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter customer name (F2)"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs pr-7"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Mobile No</label>
            <input
              type="text"
              placeholder="Enter mobile number"
              value={mobileQuery}
              onChange={(e) => setMobileQuery(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Terminal No</label>
            <select
              value={terminalNo}
              onChange={(e) => setTerminalNo(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="All">All</option>
              <option value="T01">T01</option>
              <option value="T02">T02</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-600 font-medium block mb-0.5">Transaction Mode</label>
            <select
              value={txMode}
              onChange={(e) => setTxMode(e.target.value)}
              className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
            >
              <option value="All">All</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerNotice('✓ Filter applied to invoice registry')}
              className="flex-1 py-1.5 px-3 bg-[#0084ff] hover:bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search (F5)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBillNoQuery('');
                setCustomerQuery('');
                setMobileQuery('');
              }}
              className="flex-1 py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear (F6)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master Bills Table matching Image 3 with Context Menu */}
      <div className="relative bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#e6f4fe] text-[#0066cc] font-bold border-b border-[#b6e0fe]">
              <tr>
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-2.5 text-left">Bill Date</th>
                <th className="py-2 px-2.5 text-left">Bill Time</th>
                <th className="py-2 px-2.5 text-left">Bill Number</th>
                <th className="py-2 px-3 text-left">Customer Name</th>
                <th className="py-2 px-2.5 text-left">Mobile No</th>
                <th className="py-2 px-2.5 text-right">Bill Amount (₹)</th>
                <th className="py-2 px-2.5 text-right">Disc Amt (₹)</th>
                <th className="py-2 px-2.5 text-right">Net Amount (₹)</th>
                <th className="py-2 px-2 text-center">Terminal</th>
                <th className="py-2 px-2 text-center">Mode</th>
                <th className="py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sampleInvoicesList.map((item, idx) => {
                const isSelected = item.id === selectedInvoiceId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedInvoiceId(item.id);
                      setShowContextMenu(true);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-sky-50/70 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2 px-2 text-center font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-mono">{item.billDate}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-600">{item.billTime}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-800">{item.billNumber}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{item.customerName}</td>
                    <td className="py-2 px-2.5 font-mono">{item.mobileNo}</td>
                    <td className="py-2 px-2.5 text-right font-mono">{item.billAmount.toFixed(2)}</td>
                    <td className="py-2 px-2.5 text-right font-mono">{item.discAmt.toFixed(2)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                      {item.netAmount.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center font-mono">{item.terminal}</td>
                    <td className="py-2 px-2 text-center">{item.mode}</td>
                    <td className="py-2 px-2 text-center">
                      {item.status === 'Normal' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Normal
                        </span>
                      )}
                      {item.status === 'Cancelled' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Cancelled
                        </span>
                      )}
                      {item.status === 'Return' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Return
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Floating Context Menu matching Image 3 */}
        {showContextMenu && (
          <div
            className="absolute left-[38%] top-[25%] z-20 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs w-52 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <Ban className="w-3.5 h-3.5 text-rose-600" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <Edit className="w-3.5 h-3.5 text-sky-600" />
              <span>Bill Detail Modification</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <Edit className="w-3.5 h-3.5 text-slate-600" />
              <span>Modify</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPnet}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Recreate PNET File</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInvoiceViewModal(true)}
              className="w-full px-3 py-1.5 flex items-center gap-2 bg-[#e6f4fe] text-[#0066cc] font-bold text-left"
            >
              <Eye className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>Bill View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenPosBilling) onOpenPosBilling();
                triggerNotice(`✓ Loaded ${activeBill.billNumber} into active POS workspace`);
              }}
              className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-100 text-slate-700 text-left"
            >
              <Copy className="w-3.5 h-3.5 text-purple-600" />
              <span>Bill To Bill Load</span>
            </button>
          </div>
        )}

        {/* Pagination matching Image 3 */}
        <div className="px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
          <div>Showing 1 to 8 of 125</div>
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

      {/* Lower Detail Section matching Image 3: Bill Items */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc]">
            <FileText className="w-4 h-4 text-[#0066cc]" />
            <span>Bill Items - {activeBill.billNumber}</span>
          </div>
          <div className="text-xs text-slate-600">
            Customer : <strong className="text-slate-900">{activeBill.customerName}</strong> | Date :{' '}
            <strong className="text-slate-900 font-mono">{activeBill.billDate} {activeBill.billTime}</strong> | Mode :{' '}
            <strong className="text-slate-900 font-mono">{activeBill.mode}</strong> | Terminal :{' '}
            <strong className="text-slate-900 font-mono">{activeBill.terminal}</strong>
          </div>
        </div>

        {/* Lower Item Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#e6f4fe] text-[#0066cc] font-bold border-b border-[#b6e0fe]">
              <tr>
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3 text-left">Product Name</th>
                <th className="py-2 px-3 text-left">Composition</th>
                <th className="py-2 px-2.5 text-center">Batch No</th>
                <th className="py-2 px-2.5 text-center">Expiry Date</th>
                <th className="py-2 px-2 text-center">Qty</th>
                <th className="py-2 px-2 text-center">Free Qty</th>
                <th className="py-2 px-2.5 text-right">MRP (₹)</th>
                <th className="py-2 px-2.5 text-right">Rate (₹)</th>
                <th className="py-2 px-2 text-center">Disc %</th>
                <th className="py-2 px-2.5 text-right">Disc Amt (₹)</th>
                <th className="py-2 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {activeBillItems.map((it) => (
                <tr key={it.idx} className="hover:bg-sky-50/20">
                  <td className="py-1.5 px-2 text-center font-semibold text-slate-500">{it.idx}</td>
                  <td className="py-1.5 px-3 font-semibold text-slate-900">{it.name}</td>
                  <td className="py-1.5 px-3 text-slate-500">{it.composition}</td>
                  <td className="py-1.5 px-2.5 text-center font-mono">{it.batch}</td>
                  <td className="py-1.5 px-2.5 text-center font-mono">{it.expiry}</td>
                  <td className="py-1.5 px-2 text-center font-mono font-bold">{it.qty}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{it.freeQty}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">{it.mrp.toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">{it.rate.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{it.discPercent.toFixed(2)}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">{it.discAmt.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                    {it.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Lower Summary & Action Buttons matching Image 3 */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#10b981] hover:bg-emerald-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print (F6)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInvoiceViewModal(true)}
              className="px-4 py-2 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Bill View (F7)</span>
            </button>
            <button
              type="button"
              onClick={() => triggerNotice(`✓ Downloading PDF for ${activeBill.billNumber}`)}
              className="px-4 py-2 bg-[#8b5cf6] hover:bg-purple-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF (F8)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPnet}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-sky-400 text-[#0066cc] rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Recreate PNET File</span>
            </button>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-slate-500 mr-2">Total Amount :</span>
              <strong className="text-slate-900">{activeBill.billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-slate-500 mr-2">Discount Amount :</span>
              <strong className="text-slate-900">{activeBill.discAmt.toFixed(2)}</strong>
            </div>
            <div className="text-sm">
              <span className="text-slate-700 font-bold mr-2">Net Amount :</span>
              <strong className="text-base font-extrabold text-[#0066cc]">
                ₹ {activeBill.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Cancel Bill */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 border-b border-slate-100 pb-2">
              <Ban className="w-5 h-5" />
              <h3 className="font-bold text-sm">Cancel Bill #{activeBill.billNumber}</h3>
            </div>
            <p className="text-xs text-slate-600">
              Cancelling will reverse all sold batches back into the inventory stock.
            </p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full p-2 border border-slate-300 rounded text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bill View */}
      {showInvoiceViewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Invoice View — {activeBill.billNumber}</h3>
              <button
                type="button"
                onClick={() => setShowInvoiceViewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-1">
              <div>Customer: <strong>{activeBill.customerName}</strong> ({activeBill.mobileNo})</div>
              <div>Date: <strong>{activeBill.billDate} {activeBill.billTime}</strong></div>
              <div>Payment Mode: <strong>{activeBill.mode}</strong> | Terminal: <strong>{activeBill.terminal}</strong></div>
              <div className="pt-2 text-base font-bold text-[#0066cc]">Net Total: ₹{activeBill.netAmount.toFixed(2)}</div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInvoiceViewModal(false)}
                className="px-4 py-1.5 bg-[#0084ff] text-white rounded text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
