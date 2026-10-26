import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building,
  ShieldCheck,
  CreditCard,
  Briefcase,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { formatINR } from '../../types/pharmacy';

export type HrPayrollTab =
  | 'EMPLOYEE_MASTER'
  | 'USER_ASSIGNMENT'
  | 'ATTENDANCE'
  | 'SHIFT_MANAGEMENT'
  | 'LEAVE_MANAGEMENT'
  | 'PAYROLL_PROCESSING'
  | 'SALARY_SLIP'
  | 'PAYROLL_REGISTER'
  | 'HR_REPORTS';

export interface HrPayrollViewProps {
  initialTab?: HrPayrollTab | string;
}

const normalizeHrTab = (tab?: string): HrPayrollTab => {
  if (!tab) return 'EMPLOYEE_MASTER';
  if (tab === 'EMPLOYEE_MASTER') return 'EMPLOYEE_MASTER';
  if (tab === 'STAFF_ASSIGNMENT' || tab === 'USER_ASSIGNMENT') return 'USER_ASSIGNMENT';
  if (tab === 'ATTENDANCE') return 'ATTENDANCE';
  if (tab === 'SHIFT_MGMT' || tab === 'SHIFT_MANAGEMENT') return 'SHIFT_MANAGEMENT';
  if (tab === 'LEAVE_MGMT' || tab === 'LEAVE_MANAGEMENT') return 'LEAVE_MANAGEMENT';
  if (tab === 'PAYROLL_PROCESSING') return 'PAYROLL_PROCESSING';
  if (tab === 'SALARY_SLIP') return 'SALARY_SLIP';
  if (tab === 'PAYROLL_REGISTER') return 'PAYROLL_REGISTER';
  if (tab === 'HR_REPORTS') return 'HR_REPORTS';
  return 'EMPLOYEE_MASTER';
};

interface Employee {
  id: string;
  empCode: string;
  name: string;
  designation: 'Pharmacist' | 'Pharmacy Assistant' | 'Accountant' | 'Store Manager' | 'Delivery Associate';
  role: 'ADMIN' | 'PHARMACY_ASSISTANT';
  mobile: string;
  email: string;
  joinedDate: string;
  shift: 'Morning (08:00 - 16:00)' | 'Evening (14:00 - 22:00)' | 'General (09:00 - 18:00)';
  basicSalary: number;
  hra: number;
  allowances: number;
  pfDeduction: number;
  esiDeduction: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
}

export const HrPayrollView: React.FC<HrPayrollViewProps> = ({
  initialTab = 'EMPLOYEE_MASTER',
}) => {
  const { currentUser } = usePharmacy();

  const [activeTab, setActiveTab] = useState<HrPayrollTab>(normalizeHrTab(initialTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeHrTab(initialTab));
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Employees List (clean state on fresh installation)
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Selected Employee for Salary Slip
  const [selectedSlipEmp, setSelectedSlipEmp] = useState<Employee | null>(null);
  const [showAddEmpModal, setShowAddEmpModal] = useState<boolean>(false);
  const [newEmp, setNewEmp] = useState<Omit<Employee, 'id' | 'empCode'>>({
    name: '',
    designation: 'Pharmacy Assistant',
    role: 'PHARMACY_ASSISTANT',
    mobile: '+91 ',
    email: '',
    joinedDate: new Date().toISOString().split('T')[0],
    shift: 'Morning (08:00 - 16:00)',
    basicSalary: 18000,
    hra: 5000,
    allowances: 2000,
    pfDeduction: 1500,
    esiDeduction: 400,
    status: 'ACTIVE',
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = e.name.toLowerCase().includes(q);
        const mCode = e.empCode.toLowerCase().includes(q);
        const mDesg = e.designation.toLowerCase().includes(q);
        if (!mName && !mCode && !mDesg) return false;
      }
      return true;
    });
  }, [employees, searchQuery]);

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name.trim()) {
      alert('Please enter employee name.');
      return;
    }
    const rec: Employee = {
      id: `emp-${Date.now()}`,
      empCode: `JM-EMP-${String(employees.length + 1).padStart(3, '0')}`,
      ...newEmp,
    };
    setEmployees([...employees, rec]);
    setShowAddEmpModal(false);
    showToast(`✓ Employee ${rec.name} (${rec.empCode}) enrolled.`);
  };

  const handleExportCsv = () => {
    const headers = ['Emp Code', 'Name', 'Designation', 'Shift', 'Gross Salary', 'Net Pay', 'Status'];
    const rows = employees.map((e) => {
      const gross = e.basicSalary + e.hra + e.allowances;
      const net = gross - e.pfDeduction - e.esiDeduction;
      return [e.empCode, `"${e.name}"`, e.designation, `"${e.shift}"`, gross.toFixed(2), net.toFixed(2), e.status];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HR_Payroll_Register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Exported HR & Payroll Register (CSV)');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0084ff]" />
              <h1 className="text-base font-bold text-slate-900">HR, Staff & Payroll Management</h1>
              <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold border border-sky-200">
                Personnel & Statutory Payroll
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee profiles, shift rosters, biometric attendance, leave workflow, PF/ESI salary slip generation and monthly payroll registers.
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
              onClick={() => setShowAddEmpModal(true)}
              className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Enroll Employee</span>
            </button>
          </div>
        </div>

        {/* 9 Submenus as Horizontal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('EMPLOYEE_MASTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'EMPLOYEE_MASTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employee Master</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-mono text-slate-600">
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('USER_ASSIGNMENT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'USER_ASSIGNMENT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>User / Staff Assignment</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ATTENDANCE'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SHIFT_MANAGEMENT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SHIFT_MANAGEMENT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Shift Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEAVE_MANAGEMENT')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'LEAVE_MANAGEMENT'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            <span>Leave Management</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL_PROCESSING')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PAYROLL_PROCESSING'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-teal-600" />
            <span>Payroll Processing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SALARY_SLIP')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SALARY_SLIP'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>Salary Slip</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYROLL_REGISTER')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PAYROLL_REGISTER'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payroll Register</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HR_REPORTS')}
            className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'HR_REPORTS'
                ? 'border-[#0084ff] text-[#0084ff] font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>HR Reports</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'SALARY_SLIP' && selectedSlipEmp ? (
        /* Printable Salary Slip View */
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Jeeva Medicals — Salary Slip</h2>
              <p className="text-xs text-slate-500">Pay Period: October 2026 | Bank Transfer Slip</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#0084ff] text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 text-[10px] block">Employee Name</span>
              <span className="font-bold text-slate-900">{selectedSlipEmp.name}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Employee Code</span>
              <span className="font-mono font-bold text-slate-900">{selectedSlipEmp.empCode}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Designation</span>
              <span className="font-medium text-slate-800">{selectedSlipEmp.designation}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Shift Roster</span>
              <span className="font-medium text-slate-800">{selectedSlipEmp.shift}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Earnings */}
            <div className="border border-slate-200 rounded p-3 bg-emerald-50/20">
              <div className="font-bold text-emerald-800 mb-2 border-b border-emerald-200 pb-1">Earnings (INR)</div>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Basic Pay</span>
                  <span className="font-mono font-semibold">{formatINR(selectedSlipEmp.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-mono font-semibold">{formatINR(selectedSlipEmp.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Special Pharmacy Allowance</span>
                  <span className="font-mono font-semibold">{formatINR(selectedSlipEmp.allowances)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Gross Earnings</span>
                  <span className="font-mono">
                    {formatINR(selectedSlipEmp.basicSalary + selectedSlipEmp.hra + selectedSlipEmp.allowances)}
                  </span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-200 rounded p-3 bg-rose-50/20">
              <div className="font-bold text-rose-800 mb-2 border-b border-rose-200 pb-1">Deductions (INR)</div>
              <div className="space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Provident Fund (PF)</span>
                  <span className="font-mono font-semibold">{formatINR(selectedSlipEmp.pfDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESI Contribution</span>
                  <span className="font-mono font-semibold">{formatINR(selectedSlipEmp.esiDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Professional Tax</span>
                  <span className="font-mono font-semibold">{formatINR(200)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-rose-800">
                  <span>Total Deductions</span>
                  <span className="font-mono">
                    {formatINR(selectedSlipEmp.pfDeduction + selectedSlipEmp.esiDeduction + 200)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-[11px] text-sky-800 font-semibold block">Net Payable Salary (Direct Bank Credit)</span>
              <span className="text-[10px] text-sky-600">Disbursed on 01-Nov-2026 to Salary Account</span>
            </div>
            <div className="text-xl font-bold font-mono text-[#0084ff]">
              {formatINR(
                selectedSlipEmp.basicSalary +
                  selectedSlipEmp.hra +
                  selectedSlipEmp.allowances -
                  (selectedSlipEmp.pfDeduction + selectedSlipEmp.esiDeduction + 200)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Employee Register Table */
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0b1c38] text-white font-semibold">
                  <th className="py-2.5 px-3">Emp Code</th>
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3">Assigned Shift</th>
                  <th className="py-2.5 px-3">Mobile Contact</th>
                  <th className="py-2.5 px-3 text-right">Basic Pay</th>
                  <th className="py-2.5 px-3 text-right">Net Takehome</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => {
                  const gross = emp.basicSalary + emp.hra + emp.allowances;
                  const net = gross - emp.pfDeduction - emp.esiDeduction - 200;

                  return (
                    <tr key={emp.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0084ff]">{emp.empCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{emp.name}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{emp.designation}</td>
                      <td className="py-2.5 px-3 text-slate-600">{emp.shift}</td>
                      <td className="py-2.5 px-3 font-mono">{emp.mobile}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(emp.basicSalary)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">{formatINR(net)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          {emp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlipEmp(emp);
                              setActiveTab('SALARY_SLIP');
                            }}
                            className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-[#0084ff] rounded text-[10px] font-medium border border-sky-200 cursor-pointer"
                          >
                            Pay Slip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700 text-sm">No Employee Records Yet</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Staff added through User Management or enrolled via "+ Enroll Employee" will appear here for shift tracking and payroll.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddEmpModal(true)}
                        className="mt-3 px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                      >
                        + Enroll First Employee
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ENROLL EMPLOYEE MODAL */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#0084ff] font-bold text-sm">
              <Users className="w-5 h-5" />
              <span>Enroll New Pharmacy Staff Member</span>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Staff Full Name *</label>
                  <input
                    type="text"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Designation *</label>
                  <select
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Pharmacy Assistant">Pharmacy Assistant</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Delivery Associate">Delivery Associate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mobile Contact *</label>
                  <input
                    type="text"
                    value={newEmp.mobile}
                    onChange={(e) => setNewEmp({ ...newEmp, mobile: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift Roster *</label>
                  <select
                    value={newEmp.shift}
                    onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                  >
                    <option value="Morning (08:00 - 16:00)">Morning (08:00 - 16:00)</option>
                    <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                    <option value="General (09:00 - 18:00)">General (09:00 - 18:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Basic Salary *</label>
                  <input
                    type="number"
                    value={newEmp.basicSalary}
                    onChange={(e) => setNewEmp({ ...newEmp, basicSalary: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono font-bold"
                    min={1000}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">HRA *</label>
                  <input
                    type="number"
                    value={newEmp.hra}
                    onChange={(e) => setNewEmp({ ...newEmp, hra: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Allowances *</label>
                  <input
                    type="number"
                    value={newEmp.allowances}
                    onChange={(e) => setNewEmp({ ...newEmp, allowances: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Enroll Staff Member
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
