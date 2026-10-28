import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  FileText,
  ShoppingCart,
  Truck,
  Users,
  Stethoscope,
  FileSpreadsheet,
  Wallet,
  Pill,
  Settings,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  LogOut,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Download,
  Database,
  Cloud,
  Check,
  ClipboardList,
  ShieldAlert,
  BarChart3,
  Building2,
  RotateCcw,
  Search,
  Clock,
  MapPin,
  Minus,
  Square,
  X,
  Barcode,
  Package,
  Receipt,
  FileCheck,
  Ban,
  Edit,
  Copy,
  Layers,
  ShieldCheck,
  FolderTree,
  DollarSign,
  UserCheck,
  Palette,
} from 'lucide-react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { Product, Batch, calculateExpiryZone, formatDualUnitStock, formatINR } from './types/pharmacy';
import { ClassicDashboardView } from './components/dashboard/ClassicDashboardView';
import { PosBillingView } from './components/pos/PosBillingView';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { ProductBriefModal } from './components/reports/ProductBriefModal';
import { SidebarNavigation } from './components/navigation/SidebarNavigation';
import { SignInScreen } from './components/auth/SignInScreen';
import { OnboardingWizard } from './components/auth/OnboardingWizard';

// Code-split secondary heavy modules with React.lazy
const AnalyticsDashboard = React.lazy(() => import('./components/analytics/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard })));
const VendorManagement = React.lazy(() => import('./components/vendors/VendorManagement').then((m) => ({ default: m.VendorManagement })));
const DpdpAuditLogView = React.lazy(() => import('./components/dpdp/DpdpAuditLogView').then((m) => ({ default: m.DpdpAuditLogView })));
const SettingsView = React.lazy(() => import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const StockAuditLog = React.lazy(() => import('./components/inventory/StockAuditLog').then((m) => ({ default: m.StockAuditLog })));
const AutomatedBackupConfigView = React.lazy(() => import('./components/settings/AutomatedBackupConfigView').then((m) => ({ default: m.AutomatedBackupConfigView })));
const BillCopiesView = React.lazy(() => import('./components/sales/BillCopiesView').then((m) => ({ default: m.BillCopiesView })));
const PurchaseEntryView = React.lazy(() => import('./components/purchase/PurchaseEntryView').then((m) => ({ default: m.PurchaseEntryView })));
const OrderManagementView = React.lazy(() => import('./components/orders/OrderManagementView').then((m) => ({ default: m.OrderManagementView })));
const ScheduleRegisterView = React.lazy(() => import('./components/reports/ScheduleRegisterView').then((m) => ({ default: m.ScheduleRegisterView })));
const PrescriptionRegisterView = React.lazy(() => import('./components/reports/PrescriptionRegisterView').then((m) => ({ default: m.PrescriptionRegisterView })));
const SalesReportsView = React.lazy(() => import('./components/reports/SalesReportsView').then((m) => ({ default: m.SalesReportsView })));
const InventoryReportsView = React.lazy(() => import('./components/reports/InventoryReportsView').then((m) => ({ default: m.InventoryReportsView })));
const GstReportsView = React.lazy(() => import('./components/gst/GstReportsView').then((m) => ({ default: m.GstReportsView })));
const MastersManagementView = React.lazy(() => import('./components/masters/MastersManagementView').then((m) => ({ default: m.MastersManagementView })));
const ReportsSuiteView = React.lazy(() => import('./components/reports/ReportsSuiteView').then((m) => ({ default: m.ReportsSuiteView })));
const PurchaseOrderView = React.lazy(() => import('./components/orders/PurchaseOrderView').then((m) => ({ default: m.PurchaseOrderView })));
const GrnManagementView = React.lazy(() => import('./components/purchase/GrnManagementView').then((m) => ({ default: m.GrnManagementView })));
const ExpiryManagementView = React.lazy(() => import('./components/expiry/ExpiryManagementView').then((m) => ({ default: m.ExpiryManagementView })));
const BatchTraceabilityView = React.lazy(() => import('./components/batch/BatchTraceabilityView').then((m) => ({ default: m.BatchTraceabilityView })));
const AccountsModuleView = React.lazy(() => import('./components/accounts/AccountsModuleView').then((m) => ({ default: m.AccountsModuleView })));
const HrPayrollView = React.lazy(() => import('./components/hr/HrPayrollView').then((m) => ({ default: m.HrPayrollView })));
const UserManagementView = React.lazy(() => import('./components/auth/UserManagementView').then((m) => ({ default: m.UserManagementView })));
import {
  exportSalesLedgerCsv,
  exportInventoryValuationCsv,
  exportPurchaseLedgerCsv,
  exportStockAuditLogCsv,
} from './utils/csvExport';

export type AppView =
  | 'DASHBOARD'
  | 'POS'
  | 'BILL_COPIES'
  | 'PURCHASE_LIST'
  | 'PURCHASE_ENTRY'
  | 'PURCHASE_ORDERS'
  | 'GRN_SUITE'
  | 'INVENTORY'
  | 'EXPIRY_MANAGEMENT'
  | 'BATCH_TRACEABILITY'
  | 'MASTERS'
  | 'ACCOUNTS'
  | 'GST_REPORTS'
  | 'REPORTS_SUITE'
  | 'HR_PAYROLL'
  | 'SETTINGS'
  | 'ORDERS'
  | 'VENDORS'
  | 'PATIENTS'
  | 'DOCTORS'
  | 'PRESCRIPTIONS'
  | 'SCHEDULE_REGISTER'
  | 'PRESCRIPTION_REGISTER'
  | 'SALES_REPORTS'
  | 'INVENTORY_REPORTS'
  | 'STOCK_AUDIT'
  | 'PROFILE'
  | 'BACKUPS'
  | 'USERS';

const PharmacyAppContent: React.FC = () => {
  const {
    currentUser,
    pharmacyAccount,
    isConfigured,
    isAuthenticated,
    authLoading,
    login,
    logout,
    setupOnboarding,
    switchUserRole,
    products,
    batches,
    invoices,
    vendors,
    doctors,
    dpdpLogs,
    stockAuditLogs,
    backupConfig,
    theme,
    currentThemeId,
    setTheme,
    availableThemes,
  } = usePharmacy();

  const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
  const [backupViewTab, setBackupViewTab] = useState<'AUTOMATED_CONFIG' | 'TAX_LEDGERS'>('AUTOMATED_CONFIG');
  const [auditTargetBatchId, setAuditTargetBatchId] = useState<string | undefined>(undefined);
  const [auditInitialModal, setAuditInitialModal] = useState<'ADJUSTMENT' | 'VENDOR_RETURN' | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subtab States for All 14 Navigation Modules
  const [showProductBriefModal, setShowProductBriefModal] = useState<boolean>(false);
  const [billCopiesAction, setBillCopiesAction] = useState<'COPIES' | 'MODIFICATION' | 'CANCELLATION' | 'RETURNS'>('COPIES');
  const [purchaseSubTab, setPurchaseSubTab] = useState<'ENTRY' | 'RETURNS' | 'CANCELLATION' | 'MODIFICATION' | 'COPIES' | 'REPORT'>('ENTRY');
  const [poSubTab, setPoSubTab] = useState<any>('REGISTER');
  const [grnSubTab, setGrnSubTab] = useState<any>('REGISTER');
  const [inventorySubTab, setInventorySubTab] = useState<any>('OVERVIEW');
  const [expirySubTab, setExpirySubTab] = useState<any>('DASHBOARD');
  const [batchSubTab, setBatchSubTab] = useState<any>('REGISTER');
  const [mastersInitialTab, setMastersInitialTab] = useState<any>('PRODUCTS');
  const [accountsSubTab, setAccountsSubTab] = useState<any>('DASHBOARD');
  const [gstReportsInitialTab, setGstReportsInitialTab] = useState<any>('OUTPUT_REGISTER');
  const [reportsSuiteSubTab, setReportsSuiteSubTab] = useState<any>('EXPIRY');
  const [hrSubTab, setHrSubTab] = useState<any>('EMPLOYEE_MASTER');
  const [settingsSubTab, setSettingsSubTab] = useState<any>('STORE_PROFILE');
  const [salesReportsInitialTab, setSalesReportsInitialTab] = useState<any>('DAILY');
  const [inventoryReportsInitialTab, setInventoryReportsInitialTab] = useState<any>('STOCK_SUMMARY');
  const [ordersInitialTab, setOrdersInitialTab] = useState<'WANTED_BOOK' | 'ORDER_BASED_ON_SALES'>('WANTED_BOOK');

  // Accordion Menu Expansion state: collapsed by default, expands on selection
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  const toggleAccordion = (key: string) => {
    setExpandedMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavigate = (view: AppView, subtab?: string) => {
    setCurrentView(view);

    // Expand the active section and highlight submenu
    if (view === 'POS' || view === 'BILL_COPIES' || view === 'SALES_REPORTS') {
      setExpandedMenus((prev) => ({ ...prev, pos: true }));
    } else if (view === 'PURCHASE_ENTRY' || view === 'PURCHASE_LIST') {
      setExpandedMenus((prev) => ({ ...prev, purchase: true }));
    } else if (view === 'PURCHASE_ORDERS' || view === 'ORDERS') {
      setExpandedMenus((prev) => ({ ...prev, purchase_order: true }));
    } else if (view === 'GRN_SUITE') {
      setExpandedMenus((prev) => ({ ...prev, grn: true }));
    } else if (view === 'INVENTORY') {
      setExpandedMenus((prev) => ({ ...prev, inventory: true }));
    } else if (view === 'EXPIRY_MANAGEMENT') {
      setExpandedMenus((prev) => ({ ...prev, expiry: true }));
    } else if (view === 'BATCH_TRACEABILITY' || view === 'STOCK_AUDIT') {
      setExpandedMenus((prev) => ({ ...prev, batch: true }));
    } else if (view === 'MASTERS') {
      setExpandedMenus((prev) => ({ ...prev, masters: true }));
    } else if (view === 'ACCOUNTS') {
      setExpandedMenus((prev) => ({ ...prev, accounts: true }));
    } else if (view === 'GST_REPORTS') {
      setExpandedMenus((prev) => ({ ...prev, gst: true }));
    } else if (view === 'REPORTS_SUITE' || view === 'PRESCRIPTIONS') {
      setExpandedMenus((prev) => ({ ...prev, reports: true }));
    } else if (view === 'HR_PAYROLL' || view === 'USERS') {
      setExpandedMenus((prev) => ({ ...prev, hr: true }));
    } else if (view === 'SETTINGS') {
      setExpandedMenus((prev) => ({ ...prev, settings: true }));
    }

    if (subtab) {
      if (view === 'BILL_COPIES') setBillCopiesAction(subtab as any);
      else if (view === 'PURCHASE_ENTRY') setPurchaseSubTab(subtab as any);
      else if (view === 'PURCHASE_ORDERS') setPoSubTab(subtab as any);
      else if (view === 'GRN_SUITE') setGrnSubTab(subtab as any);
      else if (view === 'INVENTORY') setInventorySubTab(subtab as any);
      else if (view === 'EXPIRY_MANAGEMENT') setExpirySubTab(subtab as any);
      else if (view === 'BATCH_TRACEABILITY') setBatchSubTab(subtab as any);
      else if (view === 'MASTERS') setMastersInitialTab(subtab as any);
      else if (view === 'ACCOUNTS') setAccountsSubTab(subtab as any);
      else if (view === 'GST_REPORTS') setGstReportsInitialTab(subtab as any);
      else if (view === 'REPORTS_SUITE') setReportsSuiteSubTab(subtab as any);
      else if (view === 'HR_PAYROLL') setHrSubTab(subtab as any);
      else if (view === 'SETTINGS') setSettingsSubTab(subtab as any);
      else if (view === 'SALES_REPORTS') setSalesReportsInitialTab(subtab as any);
      else if (view === 'INVENTORY_REPORTS') setInventoryReportsInitialTab(subtab as any);
      else if (view === 'ORDERS') setOrdersInitialTab(subtab as any);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Formatted current date e.g. "26 Apr 2025" and "Saturday"
  const formattedDate = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const dayStr = now.toLocaleDateString('en-GB', { weekday: 'long' });
    return { date: dateStr, day: dayStr };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#071326] flex flex-col items-center justify-center text-white select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#10b981] flex items-center justify-center p-2 mb-4 animate-pulse shadow-xl shadow-cyan-950/50">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect x="15" y="6" width="10" height="28" rx="2" fill="#ffffff" />
            <rect x="6" y="15" width="28" height="10" rx="2" fill="#ffffff" />
            <circle cx="20" cy="20" r="3" fill="#0284c7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-wide">Pristine Pharmacy</h1>
        <p className="text-xs text-sky-200/80 mt-1 font-mono">Initializing Secure Database & Authentication...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <OnboardingWizard
        onComplete={async (payload) => {
          const res = await setupOnboarding(payload);
          if (res.success) {
            setCurrentView('DASHBOARD');
            showToast('Pharmacy account and administrator credentials configured successfully.');
          }
          return res;
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInScreen
        pharmacy={pharmacyAccount}
        onLogin={login}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex font-sans text-slate-800 antialiased transition-colors duration-200"
      style={{ backgroundColor: theme.colors.workspaceBg }}
    >
      {/* =========================================================
          LEFT SIDEBAR: Curated Dynamic Pharmacy Theme
          ========================================================= */}
      <aside
        className="w-56 shrink-0 text-slate-300 flex flex-col justify-between select-none no-print border-r min-h-screen shadow-xl z-20 transition-colors duration-200"
        style={{
          backgroundColor: theme.colors.sidebarBg,
          borderColor: theme.colors.sidebarBorder,
        }}
      >
        <div className="overflow-y-auto flex-1 py-1">
          {/* Top Brand Logo */}
          <div
            onClick={() => handleNavigate('DASHBOARD')}
            className="p-3.5 flex items-center gap-2.5 cursor-pointer border-b hover:opacity-90 transition-all"
            style={{ borderColor: theme.colors.sidebarBorder }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center p-1.5 shadow-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.accentPrimary}, ${theme.colors.accentSecondary})`,
              }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
                <rect x="15" y="6" width="10" height="28" rx="2" fill="#ffffff" />
                <rect x="6" y="15" width="28" height="10" rx="2" fill="#ffffff" />
                <circle cx="20" cy="20" r="3" fill="#ffffff" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-white font-bold text-sm tracking-wide">Jeeva Medicals</div>
              <div className="text-[10px] text-sky-300/80 font-medium">Pharmacy Management</div>
            </div>
          </div>

          {/* Navigation Accordion Menus - 14 Expandable Modules */}
          <SidebarNavigation
            currentView={currentView}
            onNavigate={handleNavigate}
            billCopiesAction={billCopiesAction}
            purchaseSubTab={purchaseSubTab}
            poSubTab={poSubTab}
            grnSubTab={grnSubTab}
            inventorySubTab={inventorySubTab}
            expirySubTab={expirySubTab}
            batchSubTab={batchSubTab}
            mastersInitialTab={mastersInitialTab}
            accountsSubTab={accountsSubTab}
            gstReportsInitialTab={gstReportsInitialTab}
            reportsSuiteSubTab={reportsSuiteSubTab}
            hrSubTab={hrSubTab}
            settingsSubTab={settingsSubTab}
            salesReportsInitialTab={salesReportsInitialTab}
            expandedMenus={expandedMenus}
            toggleAccordion={toggleAccordion}
          />
        </div>

        {/* Watermark brand at bottom of sidebar matching screenshots */}
        <div
          className="p-4 border-t select-none transition-colors duration-200"
          style={{ borderColor: theme.colors.sidebarBorder }}
        >
          <div className="font-serif italic text-xs text-sky-200/90 font-medium">Better Medicines</div>
          <div className="font-serif italic text-sm text-sky-300 font-bold -mt-0.5">Better Life</div>
          <div className="mt-1 flex items-center gap-1.5 opacity-80">
            <svg className="w-6 h-3" viewBox="0 0 32 16" fill="none">
              <path d="M4 8C4 5.79086 5.79086 4 8 4H16V12H8C5.79086 12 4 10.2091 4 8Z" fill="#10b981" />
              <path d="M16 4H24C26.2091 4 28 5.79086 28 8C28 10.2091 26.2091 12 24 12H16V4Z" fill="#0084ff" />
            </svg>
            <span className="text-[9px] text-slate-400 font-mono">v1.0.3</span>
          </div>
        </div>
      </aside>

      {/* =========================================================
          MAIN WORKSPACE AREA
          ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header matching screenshots */}
        <header
          className="text-white py-2.5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md border-b transition-colors duration-200"
          style={{
            backgroundColor: theme.colors.headerBg,
            borderColor: theme.colors.headerBorder,
          }}
        >
          {/* Left Title & System Name */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center p-1 shadow-sm shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.accentPrimary}, ${theme.colors.accentSecondary})`,
              }}
            >
              <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
                <rect x="15" y="6" width="10" height="28" rx="2" fill="#ffffff" />
                <rect x="6" y="15" width="28" height="10" rx="2" fill="#ffffff" />
                <circle cx="20" cy="20" r="3" fill="#ffffff" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide">Jeeva Medicals</div>
              <div className="text-[10px] text-sky-200/80 -mt-0.5">Pharmacy Management System</div>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="relative max-w-md w-full mx-4">
            <input
              type="text"
              placeholder="Search medicines (F2) - Name, Composition, Batch or Barcode..."
              className="w-full text-white placeholder-slate-300/60 pl-3.5 pr-9 py-1.5 rounded text-xs border focus:outline-hidden transition-colors"
              style={{
                backgroundColor: theme.colors.headerSearchBg,
                borderColor: theme.colors.headerSearchBorder,
              }}
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-sky-300 hover:text-white cursor-pointer"
              title="Barcode Scanner (F2)"
            >
              <Barcode className="w-4 h-4" />
            </button>
          </div>

          {/* Right Header Widgets */}
          <div className="flex items-center gap-4 text-xs">
            {/* Date Widget */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="w-4 h-4 text-sky-400" />
              <div className="text-right leading-tight">
                <div className="font-semibold text-white">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {/* Time Widget */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
              <div className="leading-tight">
                <div className="text-[10px] text-slate-400">Time</div>
                <div className="font-semibold text-white">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Store Widget */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400" />
              <div className="leading-tight">
                <div className="text-[10px] text-slate-400">Store</div>
                <div className="font-semibold text-white truncate max-w-[140px] xl:max-w-xs">
                  {pharmacyAccount?.name || currentUser.storeName || 'Pristine Pharmacy'}
                </div>
              </div>
            </div>

            {/* Quick Theme Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white cursor-pointer border border-white/15 transition-all"
                title="Switch Visual Theme"
              >
                <Palette className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-[11px] font-semibold hidden md:inline">{theme.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-300" />
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Visual Theme</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowThemeDropdown(false);
                        handleNavigate('SETTINGS', 'THEME_SETTINGS');
                      }}
                      className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                    >
                      Preferences →
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1">
                    {Object.values(availableThemes).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeDropdown(false);
                          showToast(`✓ Switched to ${t.name}`);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left cursor-pointer transition-colors ${
                          currentThemeId === t.id
                            ? 'bg-sky-50 text-sky-900 font-bold border border-sky-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: t.colors.accentPrimary }}
                          />
                          <div>
                            <div className="leading-tight">{t.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{t.accentLabel}</div>
                          </div>
                        </div>
                        {currentThemeId === t.id && (
                          <Check className="w-3.5 h-3.5 text-sky-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <div
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-90 pl-2 border-l border-slate-700"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {(currentUser.name || 'U').charAt(0)}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30 uppercase font-mono">
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    @{currentUser.username || 'user'}
                  </div>
                </div>
              </div>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
                    <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">@{currentUser.username}</div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                        {currentUser.role === 'ADMIN' ? 'Administrator / Owner' : currentUser.role}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Terminal
                      </span>
                    </div>
                    {pharmacyAccount?.dlNumber && (
                      <div className="text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-200/60">
                        DL: {pharmacyAccount.dlNumber}
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleNavigate('USERS');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-sky-50 hover:text-sky-900 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                      >
                        <Users className="w-4 h-4 text-indigo-600" />
                        <div>
                          <div>Staff & User Accounts</div>
                          <div className="text-[10px] text-slate-400 font-normal">Add staff, assign roles & reset passwords</div>
                        </div>
                      </button>
                    )}

                    {currentUser.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleNavigate('SETTINGS');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <div>
                          <div>Pharmacy & Terminal Settings</div>
                          <div className="text-[10px] text-slate-400 font-normal">GSTIN, licenses, backups and thermal printers</div>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserDropdown(false);
                        await logout();
                        showToast('Terminal session closed. Please sign in again.');
                      }}
                      className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out Terminal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700 text-slate-400">
              <button type="button" className="hover:text-white p-1 cursor-pointer" title="Minimize">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="hover:text-white p-1 cursor-pointer" title="Maximize">
                <Square className="w-3 h-3" />
              </button>
              <button type="button" className="hover:text-rose-400 p-1 cursor-pointer" title="Close">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content View Container */}
        <main className="p-4 sm:p-6 flex-1">
          <React.Suspense
            fallback={
              <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                <p className="text-xs font-medium">Loading module...</p>
              </div>
            }
          >
            {currentView === 'DASHBOARD' && (
            <ClassicDashboardView
              onNavigateToPOS={() => handleNavigate('POS')}
              onNavigateToInventory={() => handleNavigate('INVENTORY')}
              onNavigateToAnalytics={() => handleNavigate('ACCOUNTS')}
              onNavigateToStockAudit={(batchId, mode) => {
                setAuditTargetBatchId(batchId);
                setAuditInitialModal(mode || null);
                handleNavigate('STOCK_AUDIT');
              }}
              onNavigateToVendors={() => handleNavigate('VENDORS')}
              onNavigateToDPDP={() => handleNavigate('PATIENTS')}
              onNavigateToSettings={() => handleNavigate('SETTINGS')}
              onNavigateToPurchases={() => handleNavigate('PURCHASE_LIST')}
              onNavigateToPrescriptions={() => handleNavigate('PRESCRIPTIONS')}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'POS' && <PosBillingView />}

          {currentView === 'INVENTORY' && (
            <InventoryManagement
              initialTab={inventorySubTab}
              onNavigateToStockAudit={(batchId, mode) => {
                setAuditTargetBatchId(batchId);
                setAuditInitialModal(mode || null);
                setCurrentView('STOCK_AUDIT');
              }}
            />
          )}

          {currentView === 'STOCK_AUDIT' && (
            <StockAuditLog
              onNavigateToInventory={() => setCurrentView('INVENTORY')}
              onNavigateToPOS={() => setCurrentView('POS')}
              preselectedBatchId={auditTargetBatchId}
              initialOpenModal={auditInitialModal}
            />
          )}

          {currentView === 'VENDORS' && <VendorManagement />}

          {currentView === 'PATIENTS' && <DpdpAuditLogView />}

          {currentView === 'PRESCRIPTIONS' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Prescription Register (Schedule H/H1)</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Drugs & Cosmetics Act Compliance Register</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('POS')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  + New Prescription Sale
                </button>
              </div>
              <DpdpAuditLogView />
            </div>
          )}

          {currentView === 'PURCHASE_LIST' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Purchase & Inward Stock Ledger</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Inward Goods Received Notes (GRN) & Wholesaler Invoices</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = exportPurchaseLedgerCsv(vendors, batches, products);
                    showToast(`✓ Downloaded ${res.fileName}`);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download GSTR-2B CSV</span>
                </button>
              </div>
              <VendorManagement />
            </div>
          )}

          {currentView === 'DOCTORS' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Registered Medical Practitioners</h1>
                <p className="text-xs text-slate-500 mt-0.5">Authorized prescribers for Schedule H, H1 & X formulations</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs">
                {doctors && doctors.length > 0 ? (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="p-3">Doctor Name</th>
                        <th className="p-3">State Medical Council Reg. No.</th>
                        <th className="p-3">Specialty</th>
                        <th className="p-3">Clinic / Hospital</th>
                        <th className="p-3">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {doctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{doc.name}</td>
                          <td className="p-3 font-mono font-medium text-slate-800">{doc.regNumber || '-'}</td>
                          <td className="p-3">{doc.specialty || 'General Practitioner'}</td>
                          <td className="p-3">{doc.clinicHospital || '-'}</td>
                          <td className="p-3 font-mono">{doc.phone || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-medium text-slate-700">No Prescribing Doctors Registered Yet</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Navigate to Masters &gt; Doctors to register licensed practitioners for Schedule H and H1 record-keeping.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'USERS' && (
            currentUser.role === 'ADMIN' ? (
              <UserManagementView />
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center space-y-3 max-w-md mx-auto my-12 shadow-xs">
                <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
                <h2 className="text-base font-bold text-rose-900">Access Restricted</h2>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Staff and user account management requires an authorized Administrator account.
                  Your current terminal role is <span className="font-bold underline">{currentUser.role}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigate('DASHBOARD')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {currentView === 'ACCOUNTS' && <AccountsModuleView initialTab={accountsSubTab} />}
          {currentView === 'SETTINGS' && <SettingsView initialTab={settingsSubTab} />}
          {currentView === 'PURCHASE_ORDERS' && (
            <PurchaseOrderView initialTab={poSubTab} onOpenNewPo={() => setPoSubTab('NEW')} />
          )}
          {currentView === 'GRN_SUITE' && (
            <GrnManagementView initialTab={grnSubTab} />
          )}
          {currentView === 'EXPIRY_MANAGEMENT' && (
            <ExpiryManagementView initialTab={expirySubTab} />
          )}
          {currentView === 'BATCH_TRACEABILITY' && (
            <BatchTraceabilityView initialTab={batchSubTab} />
          )}
          {currentView === 'HR_PAYROLL' && (
            <HrPayrollView initialTab={hrSubTab} />
          )}

          {/* =========================================================
              ShopAID Reference Implementation Views
              ========================================================= */}
          {currentView === 'BILL_COPIES' && (
            <BillCopiesView
              initialAction={billCopiesAction}
              onLoadBillToPos={(inv) => {
                setCurrentView('POS');
                showToast(`Loaded Bill #${inv.invoiceNumber} into Retail POS`);
              }}
              onOpenPosBilling={() => setCurrentView('POS')}
            />
          )}

          {currentView === 'PURCHASE_ENTRY' && (
            <PurchaseEntryView initialTab={purchaseSubTab} />
          )}

          {currentView === 'ORDERS' && (
            <OrderManagementView initialTab={ordersInitialTab} />
          )}

          {currentView === 'SCHEDULE_REGISTER' && (
            <ScheduleRegisterView />
          )}

          {currentView === 'PRESCRIPTION_REGISTER' && (
            <PrescriptionRegisterView />
          )}

          {currentView === 'SALES_REPORTS' && (
            <SalesReportsView initialTab={salesReportsInitialTab} />
          )}

          {currentView === 'INVENTORY_REPORTS' && (
            <InventoryReportsView initialTab={inventoryReportsInitialTab} />
          )}

          {currentView === 'GST_REPORTS' && (
            <GstReportsView initialTab={gstReportsInitialTab} />
          )}

          {currentView === 'MASTERS' && (
            <MastersManagementView initialTab={mastersInitialTab} />
          )}

          {currentView === 'REPORTS_SUITE' && (
            <ReportsSuiteView initialTab={reportsSuiteSubTab} />
          )}
          </React.Suspense>
        </main>
      </div>

      {/* F9 Product Brief Quick Lookup Modal */}
      <ProductBriefModal
        isOpen={showProductBriefModal}
        onClose={() => setShowProductBriefModal(false)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium leading-relaxed">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <PharmacyProvider>
      <PharmacyAppContent />
    </PharmacyProvider>
  );
}
