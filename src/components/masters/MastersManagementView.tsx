import React, { useState } from 'react';
import {
  Boxes,
  Users,
  Stethoscope,
  Truck,
  UserCheck,
  MapPin,
  ShieldAlert,
  Building,
  Plus,
  Search,
  CheckCircle2,
  Tag,
  DollarSign,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Product, formatINR } from '../../types/pharmacy';
import {
  MasterDoctor,
  MasterCustomer,
  MasterSalesRep,
  MasterRack,
} from '../../types/shopaid';

export type MasterTab =
  | 'SUPPLIERS'
  | 'CUSTOMERS'
  | 'SALES_REPS'
  | 'DOCTORS'
  | 'PRODUCTS'
  | 'MANUFACTURERS'
  | 'COMPOSITIONS'
  | 'CATEGORIES'
  | 'HSN_GST'
  | 'UNIT_PACKING'
  | 'RACKS'
  | 'PAYMENT_MODES'
  | 'SCHEDULES';

export interface MastersManagementViewProps {
  initialTab?: MasterTab;
}

export const MastersManagementView: React.FC<MastersManagementViewProps> = ({
  initialTab = 'PRODUCTS',
}) => {
  const {
    products,
    addProduct,
    updateProduct,
    customers,
    addCustomer,
    doctors,
    addDoctor,
    vendors,
    salesReps,
    addSalesRep,
    racks,
    addRack,
    manufacturers,
    scheduleTypes,
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState<Omit<MasterCustomer, 'id'>>({
    code: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
    name: '',
    phone: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    creditLimit: 5000,
    currentBalance: 0,
    discountPercent: 5,
    isActive: true,
  });

  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [newDoctor, setNewDoctor] = useState<Omit<MasterDoctor, 'id'>>({
    name: '',
    regNumber: '',
    specialty: 'General Physician',
    clinicHospital: '',
    phone: '',
    address: 'Chennai',
    isActive: true,
  });

  const [showAddSalesRepModal, setShowAddSalesRepModal] = useState<boolean>(false);
  const [newSalesRep, setNewSalesRep] = useState<Omit<MasterSalesRep, 'id'>>({
    code: `SR-0${salesReps.length + 1}`,
    name: '',
    phone: '',
    division: 'Chennai Central',
    commissionPercent: 2.0,
    isActive: true,
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      alert('Please fill in customer name and phone number.');
      return;
    }
    addCustomer({ ...newCustomer, id: `cust_${Date.now()}` });
    showToast(`✓ Registered customer ${newCustomer.name}`);
    setShowAddCustomerModal(false);
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name || !newDoctor.regNumber) {
      alert('Please fill in doctor name and registration number.');
      return;
    }
    addDoctor({ ...newDoctor, id: `doc_${Date.now()}` });
    showToast(`✓ Registered prescriber ${newDoctor.name}`);
    setShowAddDoctorModal(false);
  };

  const handleCreateSalesRep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesRep.name || !newSalesRep.phone) {
      alert('Please fill in sales rep name and phone number.');
      return;
    }
    addSalesRep({ ...newSalesRep, id: `rep_${Date.now()}` });
    showToast(`✓ Registered sales rep ${newSalesRep.name}`);
    setShowAddSalesRepModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white">
              File / Masters
            </span>
            <h1 className="text-lg font-bold text-slate-900">Foundational Master Data Hub</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure medicines, manufacturers, prescribers, customers, suppliers, storage racks, and statutory drug schedules.
          </p>
        </div>

        {successToast && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}
      </div>

      {/* Navigation Submenu */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('PRODUCTS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'PRODUCTS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Product Master ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'SUPPLIERS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supplier Master ({vendors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CUSTOMERS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'CUSTOMERS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Master ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('DOCTORS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'DOCTORS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doctor Master ({doctors.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SALES_REPS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'SALES_REPS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Rep ({salesReps.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANUFACTURERS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'MANUFACTURERS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manufacturer Master
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('COMPOSITIONS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'COMPOSITIONS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Composition Master
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CATEGORIES')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'CATEGORIES' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drug Category
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HSN_GST')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'HSN_GST' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HSN / GST Master
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNIT_PACKING')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'UNIT_PACKING' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unit / Packing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RACKS')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'RACKS' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rack / Location ({racks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PAYMENT_MODES')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
                activeTab === 'PAYMENT_MODES' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Mode Master
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search master records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-56"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PRODUCT MASTER (Section 2)                            */}
      {/* ======================================================== */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Generic Salt Composition</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3 text-center">Packing</th>
                  <th className="p-3 text-center">Schedule</th>
                  <th className="p-3 text-center">GST %</th>
                  <th className="p-3">Rack Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {products
                  .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-900">{prod.name}</td>
                      <td className="p-3 text-slate-600">{prod.genericComposition}</td>
                      <td className="p-3 text-slate-700 font-medium">{prod.manufacturer}</td>
                      <td className="p-3 font-mono text-slate-600">{prod.hsnCode}</td>
                      <td className="p-3 text-center font-mono">{prod.stripSize} tabs/strip</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prod.drugSchedule === 'OTC'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : prod.drugSchedule === 'SCHEDULE_H1'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {prod.drugSchedule.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-cyan-800">{prod.defaultGstRate}%</td>
                      <td className="p-3 text-emerald-700 font-medium">{prod.rackLocation || 'Dispensary Shelf'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CUSTOMER MASTER (Section 2)                           */}
      {/* ======================================================== */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Customer Code</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Residential Address</th>
                  <th className="p-3 text-right">Credit Limit</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Discount %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-700">{c.code}</td>
                    <td className="p-3 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="p-3 text-slate-600">{c.address}, {c.city}</td>
                    <td className="p-3 text-right font-mono">{formatINR(c.creditLimit)}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-700">
                      {formatINR(c.currentBalance)}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700">{c.discountPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DOCTOR MASTER (Section 2)                             */}
      {/* ======================================================== */}
      {activeTab === 'DOCTORS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddDoctorModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Prescriber</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Doctor Name</th>
                  <th className="p-3">Medical Council Reg. No.</th>
                  <th className="p-3">Specialization</th>
                  <th className="p-3">Hospital / Clinic</th>
                  <th className="p-3">Contact Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-slate-900">{d.name}</td>
                    <td className="p-3 font-mono font-bold text-emerald-800">{d.regNumber}</td>
                    <td className="p-3 text-slate-700">{d.specialty}</td>
                    <td className="p-3 text-slate-600">{d.clinicHospital}</td>
                    <td className="p-3 font-mono text-slate-700">{d.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. SUPPLIER MASTER (Section 2)                           */}
      {/* ======================================================== */}
      {activeTab === 'SUPPLIERS' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Company Name</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Drug License</th>
                <th className="p-3">Credit Period</th>
                <th className="p-3 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-bold text-slate-900">{v.companyName}</td>
                  <td className="p-3 text-slate-700">{v.contactPerson}</td>
                  <td className="p-3 font-mono text-slate-600">{v.gstin}</td>
                  <td className="p-3 font-mono text-slate-600">{v.drugLicenseNumber}</td>
                  <td className="p-3 font-mono">{v.creditPeriodDays} days</td>
                  <td className="p-3 text-right font-mono font-bold text-rose-700">
                    {formatINR(v.balanceDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SALES REP MASTER (Section 2)                          */}
      {/* ======================================================== */}
      {activeTab === 'SALES_REPS' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddSalesRepModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sales Rep</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Rep Code</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Contact Phone</th>
                  <th className="p-3">Assigned Division</th>
                  <th className="p-3 text-center">Commission Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {salesReps.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-mono font-bold text-slate-800">{r.code}</td>
                    <td className="p-3 font-bold text-slate-900">{r.name}</td>
                    <td className="p-3 font-mono text-slate-600">{r.phone}</td>
                    <td className="p-3 text-slate-700">{r.division}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{r.commissionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. RACKS MASTER (Section 2)                              */}
      {/* ======================================================== */}
      {activeTab === 'RACKS' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Rack Code</th>
                <th className="p-3">Shelf Details</th>
                <th className="p-3">Therapeutic Zone Description</th>
                <th className="p-3">Storage Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {racks.map((rk) => (
                <tr key={rk.id} className="hover:bg-slate-50/60">
                  <td className="p-3 font-mono font-bold text-emerald-800">{rk.rackCode}</td>
                  <td className="p-3 text-slate-700">{rk.shelfNumber}</td>
                  <td className="p-3 text-slate-600">{rk.zoneDescription}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rk.storageType === 'COLD_CHAIN_2_TO_8'
                          ? 'bg-cyan-100 text-cyan-800'
                          : rk.storageType === 'LOCKED_SCHEDULE_H1'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {rk.storageType.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. SCHEDULE TYPES MASTER (Section 2)                     */}
      {/* ======================================================== */}
      {activeTab === 'SCHEDULES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scheduleTypes.map((st) => (
            <div key={st.code} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-start justify-between">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold ${
                    st.code === 'OTC'
                      ? 'bg-emerald-100 text-emerald-800'
                      : st.code === 'SCHEDULE_H1'
                      ? 'bg-purple-100 text-purple-800'
                      : st.code === 'SCHEDULE_X'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {st.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Preserve {st.retentionYears} Years
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1">
                <div>
                  <strong className="text-slate-700">Storage: </strong>
                  <span className="text-slate-600">{st.storageRequirement}</span>
                </div>
                <div className="pt-1 text-slate-500 italic border-t border-slate-200 text-[10px]">
                  {st.statutoryWarning}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 8. MANUFACTURER MASTER */}
      {activeTab === 'MANUFACTURERS' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="p-3">Manufacturer / Brand House</th>
                <th className="p-3">Manufacturing Plant Location</th>
                <th className="p-3">Quality Certification</th>
                <th className="p-3 text-center">Associated Formulations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {manufacturers.map((mfg, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{mfg}</td>
                  <td className="p-3 text-slate-600">Baddi / Sikkim / Chennai SEZ</td>
                  <td className="p-3 font-mono text-[11px] text-emerald-700 font-semibold">WHO-GMP & US-FDA Compliant</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {products.filter((p) => p.manufacturer === mfg).length} Products
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. COMPOSITION MASTER */}
      {activeTab === 'COMPOSITIONS' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="p-3">Generic Molecular Composition</th>
                <th className="p-3">Therapeutic Class</th>
                <th className="p-3">Statutory Schedule</th>
                <th className="p-3 text-center">Formulations in Formulary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Array.from(new Set(products.map((p) => p.genericComposition))).map((comp, idx) => {
                const matched = products.find((p) => p.genericComposition === comp);
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{comp}</td>
                    <td className="p-3 text-slate-600">Systemic Anti-Infective / Analgesic</td>
                    <td className="p-3 font-mono font-bold text-purple-700">{matched?.drugSchedule || 'OTC'}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {products.filter((p) => p.genericComposition === comp).length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 10. DRUG CATEGORY MASTER */}
      {activeTab === 'CATEGORIES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Antibiotics & Anti-Infectives', count: 18, desc: 'Oral solid doses, suspensions, cephalosporins & fluoroquinolones' },
            { name: 'Cardiovascular & Anti-Hypertensives', count: 24, desc: 'Beta-blockers, ACE inhibitors, Statins & ARBs' },
            { name: 'Gastrointestinal & Antacids', count: 15, desc: 'Proton-pump inhibitors, H2 blockers and prokinetics' },
            { name: 'Analgesics & Anti-Pyretics', count: 22, desc: 'NSAIDs, Paracetamol combinations and muscle relaxants' },
            { name: 'Anti-Diabetic Care', count: 19, desc: 'Metformin formulations, sulfonylureas and DPP-4 inhibitors' },
            { name: 'Dermatologicals & Topicals', count: 12, desc: 'Antifungal ointments, steroidal creams & antiseptic solutions' },
          ].map((cat, idx) => (
            <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">{cat.name}</span>
                <span className="bg-sky-50 text-sky-700 font-mono text-[11px] px-2 py-0.5 rounded-full font-bold">
                  {cat.count} SKUs
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{cat.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* 11. HSN / GST MASTER */}
      {activeTab === 'HSN_GST' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="p-3">HSN Code</th>
                <th className="p-3">Statutory Description</th>
                <th className="p-3 text-center">CGST %</th>
                <th className="p-3 text-center">SGST %</th>
                <th className="p-3 text-center">Total GST %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-[#0084ff]">3004</td>
                <td className="p-3">Medicaments consisting of mixed or unmixed products for therapeutic uses</td>
                <td className="p-3 text-center font-mono font-bold">6.0%</td>
                <td className="p-3 text-center font-mono font-bold">6.0%</td>
                <td className="p-3 text-center font-mono font-bold text-emerald-700">12.0%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-[#0084ff]">3002</td>
                <td className="p-3">Human blood; vaccines, toxins, cultures of micro-organisms (Life-Saving)</td>
                <td className="p-3 text-center font-mono font-bold">2.5%</td>
                <td className="p-3 text-center font-mono font-bold">2.5%</td>
                <td className="p-3 text-center font-mono font-bold text-emerald-700">5.0%</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-[#0084ff]">3006</td>
                <td className="p-3">Pharmaceutical preparations and sterile surgical catgut appliances</td>
                <td className="p-3 text-center font-mono font-bold">9.0%</td>
                <td className="p-3 text-center font-mono font-bold">9.0%</td>
                <td className="p-3 text-center font-mono font-bold text-emerald-700">18.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 12. UNIT / PACKING MASTER */}
      {activeTab === 'UNIT_PACKING' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="p-3">Unit Name</th>
                <th className="p-3">Primary Unit Description</th>
                <th className="p-3 text-center">Sub-Units (Conversion Factor)</th>
                <th className="p-3">Dispensing Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">STRIP-10</td>
                <td className="p-3">Blister / Alu-Alu Strip of 10 Tablets</td>
                <td className="p-3 text-center font-mono font-bold">10 Tablets</td>
                <td className="p-3 text-slate-600">Loose tablet dispensing enabled with pro-rata pricing</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">STRIP-15</td>
                <td className="p-3">Blister Strip of 15 Tablets (e.g. Dolo 650)</td>
                <td className="p-3 text-center font-mono font-bold">15 Tablets</td>
                <td className="p-3 text-slate-600">Dual-unit stock calculation active</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">BOTTLE-100ML</td>
                <td className="p-3">Syrup / Suspension Liquid Container</td>
                <td className="p-3 text-center font-mono font-bold">1 Unit</td>
                <td className="p-3 text-slate-600">Dispensed as whole unit only</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 13. PAYMENT MODE MASTER */}
      {activeTab === 'PAYMENT_MODES' && (
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#0b1c38] text-white font-semibold">
                <th className="p-3">Payment Mode</th>
                <th className="p-3">Settlement Account</th>
                <th className="p-3 text-center">Transaction Surcharge %</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">Cash Currency (Physical Drawer)</td>
                <td className="p-3 font-mono text-slate-600">Main Pharmacy Cash Book (A/c 101)</td>
                <td className="p-3 text-center font-mono">0.0%</td>
                <td className="p-3 text-center">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">UPI / QR Code (PhonePe, GPay, Paytm)</td>
                <td className="p-3 font-mono text-slate-600">HDFC Bank Current A/c (A/c 204)</td>
                <td className="p-3 text-center font-mono">0.0% (Zero MDR)</td>
                <td className="p-3 text-center">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-bold text-slate-900">Credit / Debit POS Card Terminal</td>
                <td className="p-3 font-mono text-slate-600">SBI Merchant Current A/c (A/c 208)</td>
                <td className="p-3 text-center font-mono">0.9%</td>
                <td className="p-3 text-center">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900">Add Customer Master Record</span>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={newCustomer.creditLimit}
                    onChange={(e) => setNewCustomer({ ...newCustomer, creditLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    value={newCustomer.discountPercent}
                    onChange={(e) => setNewCustomer({ ...newCustomer, discountPercent: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Doctor */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900">Register Medical Prescriber (Doctor)</span>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Doctor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. R. Subramanian, MD"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State Medical Council Reg. No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TNMC-90812"
                  value={newDoctor.regNumber}
                  onChange={(e) => setNewDoctor({ ...newDoctor, regNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiologist / General Physician"
                  value={newDoctor.specialty}
                  onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinic / Hospital</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Specialty Centre"
                  value={newDoctor.clinicHospital}
                  onChange={(e) => setNewDoctor({ ...newDoctor, clinicHospital: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98401 22334"
                  value={newDoctor.phone}
                  onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  Save Doctor Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
