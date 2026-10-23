import React, { useState } from 'react';
import {
  Printer,
  Sliders,
  ShieldCheck,
  CheckCircle,
  FileText,
  Save,
  Database,
  Building,
  Store,
  Users,
  Lock,
  Receipt,
  Barcode,
  UploadCloud,
  DownloadCloud,
  FileSpreadsheet,
  Activity,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { AutomatedBackupConfigView } from './AutomatedBackupConfigView';

export type SettingsTab =
  | 'STORE_PROFILE'
  | 'COMPANY_GST'
  | 'USER_MANAGEMENT'
  | 'ROLE_PERMISSIONS'
  | 'BILLING_SETTINGS'
  | 'INVOICE_PRINT'
  | 'TAX_SETTINGS'
  | 'PAYMENT_SETTINGS'
  | 'BARCODE_SETTINGS'
  | 'BACKUP'
  | 'RESTORE'
  | 'IMPORT_EXPORT'
  | 'AUDIT_LOG'
  | 'THEME_SETTINGS';

export interface SettingsViewProps {
  initialTab?: SettingsTab;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialTab = 'STORE_PROFILE',
}) => {
  const { printerSettings, updatePrinterSettings, currentUser, switchUserRole } = usePharmacy();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Store Profile Form State
  const [storeName, setStoreName] = useState('Jeeva Medicals');
  const [storeBranch, setStoreBranch] = useState('Tiruppur Rural Unit');
  const [storePhone, setStorePhone] = useState('+91 98422 11099');
  const [storeEmail, setStoreEmail] = useState('care@jeevamedicals.com');
  const [storeAddress, setStoreAddress] = useState('14/2, Kangeyam Main Road, Nallur, Tiruppur, Tamil Nadu 641606');

  // Company GST & Drug License Details
  const [gstin, setGstin] = useState('33AAAAJ9921M1Z4');
  const [pan, setPan] = useState('AAAAJ9921M');
  const [dl20B, setDl20B] = useState('TN/TPR/20B/008492');
  const [dl21B, setDl21B] = useState('TN/TPR/21B/008493');
  const [fssaiNo, setFssaiNo] = useState('12423999000142');

  // Billing Settings
  const [roundOffBills, setRoundOffBills] = useState(true);
  const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);
  const [enforceDoctorPrescription, setEnforceDoctorPrescription] = useState(true);
  const [looseTabletPricingFactor, setLooseTabletPricingFactor] = useState(1.0);

  // Barcode Settings
  const [barcodeScannerPrefix, setBarcodeScannerPrefix] = useState('');
  const [barcodeScannerSuffix, setBarcodeScannerSuffix] = useState('Enter');
  const [barcodeLabelFormat, setBarcodeLabelFormat] = useState('38mm x 25mm (2-Across Thermal)');

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">System Preferences & Settings</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Store profile, drug licenses, statutory GST details, printer templates, RBAC security and database backups.
        </p>
      </div>

      {/* 14 Submenus as Horizontal Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-1.5 shadow-2xs overflow-x-auto flex items-center gap-1 text-xs">
        {[
          { id: 'STORE_PROFILE', label: 'Store Profile' },
          { id: 'COMPANY_GST', label: 'Company / GST Details' },
          { id: 'USER_MANAGEMENT', label: 'User Management' },
          { id: 'ROLE_PERMISSIONS', label: 'Role & Permissions' },
          { id: 'BILLING_SETTINGS', label: 'Billing Settings' },
          { id: 'INVOICE_PRINT', label: 'Invoice / Print Format' },
          { id: 'TAX_SETTINGS', label: 'Tax Settings' },
          { id: 'PAYMENT_SETTINGS', label: 'Payment Settings' },
          { id: 'BARCODE_SETTINGS', label: 'Barcode Settings' },
          { id: 'BACKUP', label: 'Backup' },
          { id: 'RESTORE', label: 'Restore' },
          { id: 'IMPORT_EXPORT', label: 'Data Import / Export' },
          { id: 'AUDIT_LOG', label: 'Audit Log' },
          { id: 'THEME_SETTINGS', label: 'Theme Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`px-3 py-1.5 rounded font-medium whitespace-nowrap cursor-pointer transition-colors ${activeTab === tab.id
                ? 'bg-[#0084ff] text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'STORE_PROFILE' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-[#0084ff]" />
            <h2 className="text-sm font-bold text-slate-900">Retail Pharmacy Store Profile</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pharmacy / Trade Name *</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Branch Name</label>
              <input
                type="text"
                value={storeBranch}
                onChange={(e) => setStoreBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Store Phone Contact *</label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Email Address</label>
              <input
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Store Physical Address (Printed on Invoices)</label>
            <textarea
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              rows={2}
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast('✓ Store profile details saved.')}
              className="px-4 py-2 bg-[#0084ff] hover:bg-[#0073e6] text-white rounded font-semibold cursor-pointer"
            >
              Save Store Profile
            </button>
          </div>
        </div>
      )}

      {activeTab === 'COMPANY_GST' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Tax Registration & Statutory Drug Licenses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN Number (State Code 33 - Tamil Nadu) *</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Permanent Account Number (PAN) *</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Drug License 20B (Biological & General) *</label>
              <input
                type="text"
                value={dl20B}
                onChange={(e) => setDl20B(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Drug License 21B (Specified Schedules C, C1) *</label>
              <input
                type="text"
                value={dl21B}
                onChange={(e) => setDl21B(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">FSSAI Registration No. (Nutraceuticals / Foods)</label>
              <input
                type="text"
                value={fssaiNo}
                onChange={(e) => setFssaiNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast('✓ Statutory tax and license particulars updated.')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer"
            >
              Update Tax & Licenses
            </button>
          </div>
        </div>
      )}

      {activeTab === 'USER_MANAGEMENT' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">System Users & Terminal Operators</h2>
            </div>
            <button
              type="button"
              onClick={() => showToast('Enroll new terminal user modal')}
              className="px-3 py-1 bg-[#0084ff] text-white rounded text-xs font-semibold cursor-pointer"
            >
              + Add User
            </button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">User Name</th>
                  <th className="p-2.5">Email / Login ID</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Registered Pharmacist No.</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{currentUser.name}</td>
                  <td className="p-2.5 font-mono">{currentUser.email}</td>
                  <td className="p-2.5 font-bold text-purple-700">{currentUser.role}</td>
                  <td className="p-2.5 font-mono">{currentUser.dlNumber}</td>
                  <td className="p-2.5 text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">S. Kausalya Devi</td>
                  <td className="p-2.5 font-mono">kausalya@jeevamedicals.com</td>
                  <td className="p-2.5 font-bold text-sky-700">PHARMACY_ASSISTANT</td>
                  <td className="p-2.5 font-mono">TN-REG-48901</td>
                  <td className="p-2.5 text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ROLE_PERMISSIONS' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Role-Based Access Control (RBAC) Matrix</h2>
          </div>
          <p className="text-slate-500">Privileges granted to Chief Pharmacist (Admin) versus Billing Counter Assistant.</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Operational Module</th>
                  <th className="p-2.5 text-center">Chief Pharmacist (Admin)</th>
                  <th className="p-2.5 text-center">Pharmacy Assistant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="p-2.5 font-medium">Retail Counter POS & Barcode Billing</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full Access</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full Access</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Sales Bill Cancellation & Void Approval</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Authorized</td>
                  <td className="p-2.5 text-center text-rose-600 font-bold">✕ Requires Admin PIN</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Wholesaler Inward GRN & Cost Editing</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full Access</td>
                  <td className="p-2.5 text-center text-rose-600 font-bold">✕ View Only (Cost Masked)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-medium">Statutory GSTR-1 & Financial Profit Reports</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">✓ Full Access</td>
                  <td className="p-2.5 text-center text-rose-600 font-bold">✕ Restricted</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'BILLING_SETTINGS' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-[#0084ff]" />
            <h2 className="text-sm font-bold text-slate-900">Retail Billing & Counter Rules</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Automatic Invoice Round-off</span>
                <span className="text-slate-500 text-[11px]">Round off grand total to the nearest Rupee (50 paise rule).</span>
              </div>
              <input
                type="checkbox"
                checked={roundOffBills}
                onChange={(e) => setRoundOffBills(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Enforce Prescriber Reg No. for Schedule H & H1</span>
                <span className="text-slate-500 text-[11px]">Block checkout of Schedule H1 drugs without valid Doctor Reg No.</span>
              </div>
              <input
                type="checkbox"
                checked={enforceDoctorPrescription}
                onChange={(e) => setEnforceDoctorPrescription(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Open Cash Drawer on Cash Settlement</span>
                <span className="text-slate-500 text-[11px]">Send ESC/POS pulse signal to RJ11 cash drawer port on complete payment.</span>
              </div>
              <input
                type="checkbox"
                checked={autoOpenCashDrawer}
                onChange={(e) => setAutoOpenCashDrawer(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast('✓ Billing parameters updated.')}
              className="px-4 py-2 bg-[#0084ff] text-white rounded font-semibold cursor-pointer"
            >
              Save Billing Rules
            </button>
          </div>
        </div>
      )}

      {activeTab === 'INVOICE_PRINT' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Hardware & Thermal Receipt Print Templates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Receipt Format Style</label>
              <select
                value={printerSettings.format}
                onChange={(e) => updatePrinterSettings({ format: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              >
                <option value="THERMAL_3_INCH">3-Inch Thermal Receipt (80mm ESC/POS)</option>
                <option value="THERMAL_2_INCH">2-Inch Thermal Slip (58mm ESC/POS)</option>
                <option value="A4_LASER">A4 Laser Invoice (Standard Tax Invoice)</option>
                <option value="A5_LANDSCAPE">A5 Half-Sheet Invoice</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Invoice Header Footer Message</label>
              <input
                type="text"
                defaultValue="Thank you for trusting Jeeva Medicals. Get well soon!"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast('✓ Printer profile preferences saved.')}
              className="px-4 py-2 bg-emerald-600 text-white rounded font-semibold cursor-pointer"
            >
              Save Print Settings
            </button>
          </div>
        </div>
      )}

      {activeTab === 'BARCODE_SETTINGS' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Barcode className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900">Barcode Scanner & Sticker Label Engine</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Barcode Symbology Standard</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                <option value="EAN13">EAN-13 (Standard Retail Medicine Standard)</option>
                <option value="CODE128">Code 128 (Batch + Expiry Encoded)</option>
                <option value="QRCODE">GS1 DataMatrix (Pharma 2D Barcode)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Label Sticker Dimensions</label>
              <input
                type="text"
                value={barcodeLabelFormat}
                onChange={(e) => setBarcodeLabelFormat(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => showToast('✓ Barcode hardware parameters calibrated.')}
              className="px-4 py-2 bg-purple-600 text-white rounded font-semibold cursor-pointer"
            >
              Calibrate Scanner
            </button>
          </div>
        </div>
      )}

      {(activeTab === 'BACKUP' || activeTab === 'RESTORE') && (
        <AutomatedBackupConfigView />
      )}

      {activeTab === 'IMPORT_EXPORT' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <UploadCloud className="w-5 h-5 text-[#0084ff]" />
            <h2 className="text-sm font-bold text-slate-900">Bulk Data Migration, Import & Export Hub</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block">Medicine Master Bulk Excel Import</span>
              <p className="text-slate-500 text-[11px]">
                Import product catalog, compositions, HSN codes and strip sizes from standard wholesaler Excel sheets.
              </p>
              <button
                type="button"
                onClick={() => showToast('Choose Excel file for Medicine Master import')}
                className="px-3 py-1.5 bg-[#0084ff] text-white rounded text-xs font-semibold cursor-pointer"
              >
                Choose Excel File (.xlsx)
              </button>
            </div>

            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
              <span className="font-bold text-slate-900 block">Wholesaler Price List Sync</span>
              <p className="text-slate-500 text-[11px]">
                Update cost prices and MRPs directly from Sun Pharma, Cipla or Apollo wholesaler rate circulars.
              </p>
              <button
                type="button"
                onClick={() => showToast('Rate master synchronization initiated')}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Sync Wholesaler Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'AUDIT_LOG' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Security Audit Log & Terminal Trace</h2>
          </div>
          <p className="text-slate-500">Immutable record of all login events, role switches, bill voids and database backups.</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Action Event</th>
                  <th className="p-2.5">Terminal IP / Machine</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                <tr>
                  <td className="p-2.5">2026-10-22 10:24:18</td>
                  <td className="p-2.5 font-bold">Admin (Chief Pharmacist)</td>
                  <td className="p-2.5">Terminal authentication successful</td>
                  <td className="p-2.5">192.168.1.101 (Billing-POS-01)</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">SUCCESS</td>
                </tr>
                <tr>
                  <td className="p-2.5">2026-10-22 09:30:05</td>
                  <td className="p-2.5 font-bold">System Scheduler</td>
                  <td className="p-2.5">Automated encrypted backup snapshot generated</td>
                  <td className="p-2.5">Local Daemon / SQLite Engine</td>
                  <td className="p-2.5 text-center text-emerald-600 font-bold">SUCCESS</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'THEME_SETTINGS' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Palette className="w-5 h-5 text-[#0084ff]" />
            <h2 className="text-sm font-bold text-slate-900">Visual Theme & Display Preferences</h2>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-sky-900 block">Jeeva Medicals Classic Theme</span>
                <span className="text-sky-700 text-[11px]">Deep navy sidebar (#071326), sky-blue active accents and high-contrast white tables.</span>
              </div>
              <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">Active Theme</span>
            </div>
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
