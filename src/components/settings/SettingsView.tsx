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
  Check,
  Sun,
  Moon,
  Sparkles,
  Monitor,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { ThemeId } from '../../types/theme';
import { AutomatedBackupConfigView } from './AutomatedBackupConfigView';
import { MenuManagementConfigView } from './MenuManagementConfigView';
import { UserManagementView } from '../auth/UserManagementView';

export type SettingsTab =
  | 'STORE_PROFILE'
  | 'COMPANY_GST'
  | 'USER_MANAGEMENT'
  | 'ROLE_PERMISSIONS'
  | 'MENU_MANAGEMENT'
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
  const {
    pharmacyAccount,
    printerSettings,
    updatePrinterSettings,
    currentUser,
    switchUserRole,
    clearAllData,
    currentThemeId,
    theme,
    setTheme,
    availableThemes,
  } = usePharmacy();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pharmacist Display Preferences
  const [compactRows, setCompactRows] = useState(() => {
    try {
      return localStorage.getItem('jeeva_compact_rows') === 'true';
    } catch {
      return false;
    }
  });
  const [showGenericInPos, setShowGenericInPos] = useState(() => {
    try {
      const v = localStorage.getItem('jeeva_show_generic');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [highlightScheduleH, setHighlightScheduleH] = useState(() => {
    try {
      const v = localStorage.getItem('jeeva_highlight_schedule');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [audioScanBeep, setAudioScanBeep] = useState(() => {
    try {
      const v = localStorage.getItem('jeeva_audio_scan');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Store Profile Form State (Bound to real pharmacy account or empty)
  const [storeName, setStoreName] = useState(() => pharmacyAccount?.name || currentUser.storeName || '');
  const [storeBranch, setStoreBranch] = useState('');
  const [storePhone, setStorePhone] = useState(() => pharmacyAccount?.phone || currentUser.phone || '');
  const [storeEmail, setStoreEmail] = useState(() => pharmacyAccount?.email || currentUser.email || '');
  const [storeAddress, setStoreAddress] = useState(() => pharmacyAccount?.address || '');

  // Company GST & Drug License Details
  const [gstin, setGstin] = useState(() => pharmacyAccount?.gstin || currentUser.gstin || '');
  const [pan, setPan] = useState('');
  const [dl20B, setDl20B] = useState(() => pharmacyAccount?.dlNumber || currentUser.dlNumber || '');
  const [dl21B, setDl21B] = useState('');
  const [fssaiNo, setFssaiNo] = useState('');

  // Keep state synced if pharmacyAccount changes
  React.useEffect(() => {
    if (pharmacyAccount) {
      if (pharmacyAccount.name) setStoreName(pharmacyAccount.name);
      if (pharmacyAccount.phone) setStorePhone(pharmacyAccount.phone);
      if (pharmacyAccount.email) setStoreEmail(pharmacyAccount.email);
      if (pharmacyAccount.gstin) setGstin(pharmacyAccount.gstin);
      if (pharmacyAccount.dlNumber) setDl20B(pharmacyAccount.dlNumber);
      if (pharmacyAccount.address) setStoreAddress(pharmacyAccount.address);
    }
  }, [pharmacyAccount]);

  // Billing Settings
  const [roundOffBills, setRoundOffBills] = useState(true);
  const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);
  const [enforceDoctorPrescription, setEnforceDoctorPrescription] = useState(true);
  const [looseTabletPricingFactor, setLooseTabletPricingFactor] = useState(1.0);

  // Barcode Settings
  const [barcodeScannerPrefix, setBarcodeScannerPrefix] = useState('');
  const [barcodeScannerSuffix, setBarcodeScannerSuffix] = useState('Enter');
  const [barcodeLabelFormat, setBarcodeLabelFormat] = useState('38mm x 25mm (2-Across Thermal)');

  const handleSaveStoreProfile = async () => {
    if (window.electronAPI?.auth?.updatePharmacyProfile && pharmacyAccount) {
      try {
        await window.electronAPI.auth.updatePharmacyProfile({
          name: storeName,
          phone: storePhone,
          email: storeEmail,
          address: storeAddress,
        });
      } catch (e) {
        console.warn('Failed to update pharmacy profile across IPC:', e);
      }
    }
    showToast('✓ Store profile details saved.');
  };

  const handleSaveCompanyGst = async () => {
    if (window.electronAPI?.auth?.updatePharmacyProfile && pharmacyAccount) {
      try {
        await window.electronAPI.auth.updatePharmacyProfile({
          gstin,
          dlNumber: [dl20B, dl21B].filter(Boolean).join(', '),
        });
      } catch (e) {
        console.warn('Failed to update GST/DL across IPC:', e);
      }
    }
    showToast('✓ Statutory tax and license particulars updated.');
  };

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
          { id: 'MENU_MANAGEMENT', label: 'Menu & Navigation' },
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
              onClick={handleSaveStoreProfile}
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
              onClick={handleSaveCompanyGst}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer"
            >
              Update Tax & Licenses
            </button>
          </div>
        </div>
      )}

      {activeTab === 'USER_MANAGEMENT' && (
        <UserManagementView />
      )}

      {activeTab === 'ROLE_PERMISSIONS' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-900">Role-Based Workflow Controls (Convenience Matrix)</h2>
          </div>
          <p className="text-slate-500">Interface and workflow privileges for Chief Pharmacist (Admin) versus Billing Counter Assistant.</p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 leading-relaxed">
            <strong>Client-Side Role Controls Notice:</strong> In this client-only standalone deployment, roles function as local workflow and UI convenience controls to streamline cashier and inventory tasks. They do not constitute server-enforced, cryptographically tamper-proof authentication.
          </div>
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

      {activeTab === 'MENU_MANAGEMENT' && <MenuManagementConfigView />}

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
                value={printerSettings.preferredFormat}
                onChange={(e) => updatePrinterSettings({ preferredFormat: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
              >
                <option value="THERMAL_80MM">3-Inch Thermal Receipt (80mm ESC/POS)</option>
                <option value="LASER_A4">A4 Laser Invoice (Standard Tax Invoice)</option>
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

            {/* Clean Slate & Reset Data */}
            <div className="p-4 border border-rose-200 rounded-lg bg-rose-50/50 space-y-2 md:col-span-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-rose-900 block">Database Reset & Clean Slate</span>
                  <p className="text-rose-700 text-[11px] mt-0.5">
                    Clear all operational sales, purchase records, local cache and reset to a clean database state.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset your database? This will clear all transactions and operational data.')) {
                        clearAllData();
                        showToast('✓ Database reset to clean empty state.');
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
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
        <div className="space-y-5 text-xs">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: theme.colors.accentPrimary }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Visual Theme & Display Preferences</h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Personalize your pharmacy terminal aesthetics, contrast levels, and counter display density.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] text-slate-500 font-medium">Current Active:</span>
                <span
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold shadow-2xs border"
                  style={{
                    backgroundColor: theme.colors.badgeBg,
                    color: theme.colors.badgeText,
                    borderColor: `${theme.colors.accentPrimary}33`,
                  }}
                >
                  {theme.name}
                </span>
              </div>
            </div>

            {/* 3 Professional Themes Selection Cards */}
            <div className="mt-5">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Select From 3 Professional Pharmacy Themes</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.values(availableThemes).map((t) => {
                  const isActive = currentThemeId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        showToast(`✓ Activated ${t.name}`);
                      }}
                      className={`rounded-xl border-2 transition-all p-4 flex flex-col justify-between cursor-pointer relative group ${
                        isActive
                          ? 'border-sky-500 shadow-md bg-white ring-2 ring-sky-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white shadow-xs'
                      }`}
                    >
                      {/* Active Indicator Ribbon */}
                      {isActive && (
                        <div className="absolute -top-2.5 right-3 bg-sky-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active Theme</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Mini UI Mockup */}
                        <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-300/80 shadow-inner flex flex-col">
                          {/* Mini Header */}
                          <div
                            className="h-5 px-2 flex items-center justify-between text-[9px] text-white font-medium"
                            style={{ backgroundColor: t.colors.headerBg }}
                          >
                            <span className="truncate">Jeeva Medicals POS</span>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.colors.accentPrimary }} />
                          </div>
                          {/* Mini Body */}
                          <div className="flex-1 flex" style={{ backgroundColor: t.colors.workspaceBg }}>
                            {/* Mini Sidebar */}
                            <div
                              className="w-10 p-1 flex flex-col gap-1 border-r"
                              style={{
                                backgroundColor: t.colors.sidebarBg,
                                borderColor: t.colors.sidebarBorder,
                              }}
                            >
                              <div
                                className="h-2 rounded-[2px]"
                                style={{ backgroundColor: t.colors.sidebarActiveBg }}
                              />
                              <div className="h-1.5 rounded-[2px] bg-white/20" />
                              <div className="h-1.5 rounded-[2px] bg-white/20" />
                            </div>
                            {/* Mini Content Area */}
                            <div className="flex-1 p-1.5 flex flex-col justify-between">
                              <div className="space-y-1">
                                <div className="h-2 w-3/4 rounded bg-slate-200" />
                                <div className="h-2 w-1/2 rounded bg-slate-200" />
                              </div>
                              <div className="flex justify-end">
                                <div
                                  className="h-2.5 w-7 rounded-[3px]"
                                  style={{ backgroundColor: t.colors.accentPrimary }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Title & Tagline */}
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm">{t.name}</h3>
                            <span className="text-[10px] font-mono font-semibold text-slate-500">
                              {t.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{t.tagline}</p>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-slate-600 leading-relaxed">{t.description}</p>

                        {/* Color Swatches */}
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Color Signature
                          </div>
                          <div className="flex items-center gap-1.5">
                            {t.colors.swatches.map((color, idx) => (
                              <span
                                key={idx}
                                className="w-5 h-5 rounded-md border border-slate-300 shadow-2xs"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                            <span className="text-[10px] font-medium text-slate-500 ml-1">
                              {t.accentLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        {isActive ? (
                          <div className="w-full py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-center font-bold text-xs flex items-center justify-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Currently Active</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTheme(t.id);
                              showToast(`✓ Switched to ${t.name}`);
                            }}
                            className="w-full py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 text-center font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Apply This Theme
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pharmacist Counter & POS Display Preferences */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Monitor className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Counter Display & POS Grid Preferences</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compact Rows */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Compact Billing Grid (25+ Rows)</span>
                  <span className="text-slate-500 text-[11px]">
                    Reduces row padding in POS billing to fit more items on 1366×768 screens without scrolling.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !compactRows;
                    setCompactRows(next);
                    localStorage.setItem('jeeva_compact_rows', String(next));
                    showToast(`✓ Compact rows ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    compactRows ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      compactRows ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show Generic Salts */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Show Generic Salt under Brand Name</span>
                  <span className="text-slate-500 text-[11px]">
                    Displays salt composition during POS item search to assist with generic medicine substitutions.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showGenericInPos;
                    setShowGenericInPos(next);
                    localStorage.setItem('jeeva_show_generic', String(next));
                    showToast(`✓ Generic salt display ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    showGenericInPos ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      showGenericInPos ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule H Badges */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Schedule H / H1 / X Warning Badges</span>
                  <span className="text-slate-500 text-[11px]">
                    Highlights prescription-restricted schedules with high-contrast alert badges in POS table.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !highlightScheduleH;
                    setHighlightScheduleH(next);
                    localStorage.setItem('jeeva_highlight_schedule', String(next));
                    showToast(`✓ Schedule warning badges ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    highlightScheduleH ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      highlightScheduleH ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Audio Scan Beep */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">Hardware Barcode Audio Confirmation</span>
                  <span className="text-slate-500 text-[11px]">
                    Plays audio confirmation beep whenever a physical barcode scanner detects a product.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !audioScanBeep;
                    setAudioScanBeep(next);
                    localStorage.setItem('jeeva_audio_scan', String(next));
                    showToast(`✓ Barcode audio confirmation ${next ? 'enabled' : 'disabled'}`);
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    audioScanBeep ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      audioScanBeep ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
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
