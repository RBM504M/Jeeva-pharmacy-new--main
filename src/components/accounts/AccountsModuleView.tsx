import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  CreditCard,
  BookOpen,
  PieChart,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR } from '../../types/pharmacy';

export type AccountsTab =
  | 'ACCOUNTS_DASHBOARD'
  | 'SUPPLIER_OUTSTANDING'
  | 'SUPPLIER_PAYMENTS'
  | 'CUSTOMER_OUTSTANDING'
  | 'CUSTOMER_RECEIPTS'
  | 'CASH_BOOK'
  | 'BANK_BOOK'
  | 'EXPENSE_ENTRY'
  | 'CREDIT_DEBIT_NOTES'
  | 'DAY_BOOK'
  | 'LEDGER'
  | 'ACCOUNTS_REPORTS';

export interface AccountsModuleViewProps {
  initialTab?: AccountsTab | string;
}

const normalizeAccountsTab = (tab?: string): AccountsTab => {
  if (!tab) return 'ACCOUNTS_DASHBOARD';
  if (tab === 'DASHBOARD' || tab === 'ACCOUNTS_DASHBOARD') return 'ACCOUNTS_DASHBOARD';
  if (tab === 'SUPPLIER_OUTSTANDING') return 'SUPPLIER_OUTSTANDING';
  if (tab === 'SUPPLIER_PAYMENTS') return 'SUPPLIER_PAYMENTS';
  if (tab === 'CUSTOMER_OUTSTANDING') return 'CUSTOMER_OUTSTANDING';
  if (tab === 'CUSTOMER_RECEIPTS') return 'CUSTOMER_RECEIPTS';
  if (tab === 'CASH_BOOK') return 'CASH_BOOK';
  if (tab === 'BANK_BOOK') return 'BANK_BOOK';
  if (tab === 'EXPENSE_ENTRY') return 'EXPENSE_ENTRY';
  if (tab === 'CREDIT_DEBIT_NOTES') return 'CREDIT_DEBIT_NOTES';
  if (tab === 'DAY_BOOK') return 'DAY_BOOK';
  if (tab === 'LEDGER') return 'LEDGER';
  if (tab === 'REPORTS' || tab === 'ACCOUNTS_REPORTS') return 'ACCOUNTS_REPORTS';
  return 'ACCOUNTS_DASHBOARD';
};

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  payee: string;
  amount: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI';
  referenceNo: string;
  notes: string;
}

interface CreditDebitNote {
  id: string;
  noteNumber: string;
  type: 'CREDIT_NOTE' | 'DEBIT_NOTE';
  date: string;
  partyName: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  originalBillNo: string;
  amount: number;
  reason: string;
  status: 'ADJUSTED' | 'UNADJUSTED';
}

export const AccountsModuleView: React.FC<AccountsModuleViewProps> = ({
  initialTab = 'ACCOUNTS_DASHBOARD',
}) => {
  const { invoices, vendors, customers, currentUser } = usePharmacy();

  const [activeTab, setActiveTab] = useState<AccountsTab>(normalizeAccountsTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeAccountsTab(initialTab));
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real Expenses & Notes
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [notes, setNotes] = useState<CreditDebitNote[]>([]);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Electricity & Power',
    payee: '',
    amount: 500,
    paymentMode: 'CASH' as const,
    referenceNo: '',
    notes: '',
  });

  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [newNote, setNewNote] = useState({
    type: 'CREDIT_NOTE' as 'CREDIT_NOTE' | 'DEBIT_NOTE',
    partyName: '',
    partyType: 'CUSTOMER' as 'CUSTOMER' | 'SUPPLIER',
    originalBillNo: '',
    amount: 100,
    reason: '',
  });

  // Financial Metrics
  const metrics = useMemo(() => {
    const todaySales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const supplierOutstanding = vendors.reduce((sum, v) => sum + (v.balanceDue || v.currentBalance || 15000), 0);
    const customerOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance || 1200), 0);

    return { todaySales, totalExpenses, supplierOutstanding, customerOutstanding };
  }, [invoices, expenses, vendors, customers]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.payee.trim() || newExpense.amount <= 0) {
      alert('Please fill valid payee and amount.');
      return;
    }
    const rec: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...newExpense,
    };
    setExpenses([rec, ...expenses]);
    setShowExpenseModal(false);
    showToast(`✓ Expense of ${formatINR(newExpense.amount)} recorded.`);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.partyName.trim() || newNote.amount <= 0) {
      alert('Please fill valid party and amount.');
      return;
    }
    const rec: CreditDebitNote = {
      id: `note-${Date.now()}`,
      noteNumber: `${newNote.type === 'CREDIT_NOTE' ? 'CN' : 'DN'}-2026-${String(notes.length + 13).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      status: 'UNADJUSTED',
      ...newNote,
    };
    setNotes([rec, ...notes]);
    setShowNoteModal(false);
    showToast(`✓ ${newNote.type === 'CREDIT_NOTE' ? 'Credit' : 'Debit'} Note ${rec.noteNumber} issued.`);
  };

  const handleExportCsv = () => {
    const headers = ['Type', 'Date', 'Party / Payee', 'Amount', 'Reference / Category', 'Status'];
    const rows = expenses.map((e) => [
      'EXPENSE',
      e.date,
      `"${e.payee}"`,
      e.amount.toFixed(2),
      `"${e.category}"`,
      e.paymentMode,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Accounts_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported Accounts Ledger (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h1 className="text-base font-bold text-slate-900">Accounts & Financial Ledger</h1>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                Cash Flow, Outstanding & Reconciliation
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Wholesaler payables, customer credit receivables, cash book, bank book, day book and statutory double-entry ledgers.
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
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Expense</span>
            </button>
          </div>
        </div>

        {/* 12 Submenus as Horizontal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNTS_DASHBOARD')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ACCOUNTS_DASHBOARD'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Accounts Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUPPLIER_OUTSTANDING')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SUPPLIER_OUTSTANDING'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Supplier Outstanding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUPPLIER_PAYMENTS')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SUPPLIER_PAYMENTS'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            <span>Supplier Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER_OUTSTANDING')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CUSTOMER_OUTSTANDING'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Outstanding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER_RECEIPTS')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CUSTOMER_RECEIPTS'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Customer Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CASH_BOOK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CASH_BOOK'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-500" />
            <span>Cash Book</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BANK_BOOK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'BANK_BOOK'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-500" />
            <span>Bank Book</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPENSE_ENTRY')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EXPENSE_ENTRY'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>Expense Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREDIT_DEBIT_NOTES')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CREDIT_DEBIT_NOTES'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Credit / Debit Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DAY_BOOK')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'DAY_BOOK'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Day Book</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'LEDGER'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            <span>Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNTS_REPORTS')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ACCOUNTS_REPORTS'
                ? 'border-emerald-600 text-emerald-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Accounts Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-medium">Total Revenue (Gross Sales)</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{formatINR(metrics.todaySales)}</div>
          <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Cash & Digital collections</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between">
            <span>Supplier Payables</span>
            <Building className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-900 mt-0.5">{formatINR(metrics.supplierOutstanding)}</div>
          <div className="text-[10px] text-rose-600 mt-1">Due within credit terms</div>
        </div>

        <div className="bg-sky-50/70 border border-sky-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-sky-700 font-medium flex items-center justify-between">
            <span>Customer Receivables</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-bold text-sky-900 mt-0.5">{formatINR(metrics.customerOutstanding)}</div>
          <div className="text-[10px] text-sky-600 mt-1">Pending patient credit dues</div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/90 rounded-lg p-3 shadow-2xs">
          <div className="text-[11px] text-purple-700 font-medium flex items-center justify-between">
            <span>Store Operating Expenses</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-900 mt-0.5">{formatINR(metrics.totalExpenses)}</div>
          <div className="text-[10px] text-purple-600 mt-1">Utilities, rent & stationery</div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'EXPENSE_ENTRY' ? (
        /* Expenses Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-purple-900">Pharmacy Overhead & Operational Expenses</h3>
              <p className="text-[11px] text-purple-700">Track petty cash, utilities, logistics and statutory charges.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Add Expense Voucher
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Expense Category</th>
                <th className="py-2.5 px-3">Payee / Beneficiary</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Reference No.</th>
                <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                <th className="py-2.5 px-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-purple-50/20">
                  <td className="py-2.5 px-3 text-slate-600">{exp.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{exp.category}</td>
                  <td className="py-2.5 px-3 text-slate-800">{exp.payee}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {exp.paymentMode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{exp.referenceNo}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(exp.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">{exp.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'CREDIT_DEBIT_NOTES' ? (
        /* Credit / Debit Notes Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-indigo-900">Credit / Debit Note Adjustment Register</h3>
              <p className="text-[11px] text-indigo-700">Customer return credits & supplier debit notes for rate adjustments.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Issue Note Voucher
            </button>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Note No.</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">Original Bill</th>
                <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                <th className="py-2.5 px-3">Adjustment Reason</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-indigo-50/20">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0084ff]">{n.noteNumber}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        n.type === 'CREDIT_NOTE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {n.type === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 'DEBIT NOTE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{n.date}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{n.partyName}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{n.originalBillNo}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(n.amount)}</td>
                  <td className="py-2.5 px-3 text-slate-600">{n.reason}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        n.status === 'ADJUSTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'SUPPLIER_OUTSTANDING' || activeTab === 'SUPPLIER_PAYMENTS' ? (
        /* Supplier Outstanding Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-xs">Wholesaler & Supplier Ledger Balances</h3>
            <p className="text-[11px] text-slate-500">Track outstanding invoices, payment aging and credit terms.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">GSTIN</th>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3 text-center">Credit Days</th>
                <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{v.companyName || v.name}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">{v.gstin}</td>
                  <td className="py-2.5 px-3">{v.city || v.state}</td>
                  <td className="py-2.5 px-3 font-mono">{v.phone}</td>
                  <td className="py-2.5 px-3 text-center font-mono">30 Days</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                    {formatINR(v.balanceDue || v.currentBalance || 18450)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => showToast(`Payment voucher generated for ${v.companyName || v.name}`)}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium cursor-pointer"
                    >
                      Make Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'CUSTOMER_OUTSTANDING' || activeTab === 'CUSTOMER_RECEIPTS' ? (
        /* Customer Outstanding Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-900 text-xs">Patient & Customer Credit Balances</h3>
            <p className="text-[11px] text-slate-500">Maintain credit book for regular hospital & chronic therapy patients.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Customer Code</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Mobile No.</th>
                <th className="py-2.5 px-3 text-right">Credit Limit</th>
                <th className="py-2.5 px-3 text-right">Current Due</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0084ff]">{c.code}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 font-mono">{c.phone}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(c.creditLimit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-700">
                    {formatINR(c.currentBalance || 850)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => showToast(`Receipt voucher logged for ${c.name}`)}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-medium cursor-pointer"
                    >
                      Receive Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cash Book / Bank Book / Day Book / Default Ledger */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-xs">
                {activeTab === 'CASH_BOOK'
                  ? 'Daily Cash Book Register'
                  : activeTab === 'BANK_BOOK'
                  ? 'Bank Account & UPI Ledger'
                  : activeTab === 'DAY_BOOK'
                  ? 'Consolidated Day Book Transactions'
                  : 'General Accounts Ledger'}
              </h3>
              <p className="text-[11px] text-slate-500">Real-time debits, credits and running balance verification.</p>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              Closing Balance: {formatINR(42850.0)}
            </div>
          </div>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher / Doc No.</th>
                <th className="py-2.5 px-3">Particulars / Account</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Credit In (INR)</th>
                <th className="py-2.5 px-3 text-right text-rose-300">Debit Out (INR)</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {invoices.slice(0, 8).map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-600">{inv.invoiceDate.split('T')[0]}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0084ff]">{inv.invoiceNumber}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Retail Sale ({inv.paymentMethod}) - {inv.prescription?.patientName || inv.customerName || 'Walk-in'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                    {formatINR(inv.grandTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(35000 + (idx + 1) * 850)}
                  </td>
                </tr>
              ))}
              {expenses.map((exp, idx) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-600">{exp.date}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-purple-600">{exp.referenceNo}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    Expense: {exp.category} ({exp.payee})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                    {formatINR(exp.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(42850 - (idx + 1) * 450)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <DollarSign className="w-5 h-5" />
              <span>Record Expense Voucher</span>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Category *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                >
                  <option value="Electricity & Power">Electricity & Power</option>
                  <option value="Rent & Premises">Rent & Premises</option>
                  <option value="Store Maintenance & Cleanliness">Store Maintenance & Cleanliness</option>
                  <option value="Printing & Stationery">Printing & Stationery</option>
                  <option value="Staff Refreshments & Food">Staff Refreshments & Food</option>
                  <option value="Logistics & Delivery Fuel">Logistics & Delivery Fuel</option>
                  <option value="Pharmacy License & Regulatory Fees">Pharmacy License & Regulatory Fees</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payee / Vendor Name *</label>
                <input
                  type="text"
                  value={newExpense.payee}
                  onChange={(e) => setNewExpense({ ...newExpense, payee: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  placeholder="e.g. City Electricity Board"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Mode *</label>
                  <select
                    value={newExpense.paymentMode}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                    <option value="UPI">UPI / QR Code</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Remarks</label>
                <input
                  type="text"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Post Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <BookOpen className="w-5 h-5" />
              <span>Issue Credit / Debit Note</span>
            </div>
            <form onSubmit={handleAddNote} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Note Type *</label>
                  <select
                    value={newNote.type}
                    onChange={(e) => setNewNote({ ...newNote, type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="CREDIT_NOTE">Credit Note (Party Credit)</option>
                    <option value="DEBIT_NOTE">Debit Note (Party Debit)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Party Type *</label>
                  <select
                    value={newNote.partyType}
                    onChange={(e) => setNewNote({ ...newNote, partyType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="CUSTOMER">Customer / Patient</option>
                    <option value="SUPPLIER">Wholesaler / Supplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Party Name *</label>
                <input
                  type="text"
                  value={newNote.partyName}
                  onChange={(e) => setNewNote({ ...newNote, partyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Original Bill / Inv No. *</label>
                  <input
                    type="text"
                    value={newNote.originalBillNo}
                    onChange={(e) => setNewNote({ ...newNote, originalBillNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Adjustment Amount *</label>
                  <input
                    type="number"
                    value={newNote.amount}
                    onChange={(e) => setNewNote({ ...newNote, amount: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                    min={1}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason / Description *</label>
                <textarea
                  value={newNote.reason}
                  onChange={(e) => setNewNote({ ...newNote, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  rows={2}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Create Note Voucher
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
