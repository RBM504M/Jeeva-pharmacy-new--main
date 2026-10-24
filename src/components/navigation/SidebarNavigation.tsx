import React from 'react';
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
  Sliders,
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Clock,
  MapPin,
  Barcode,
  Package,
  Receipt,
  FileCheck,
  Ban,
  Edit,
  Copy,
  Layers,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Building2,
  RotateCcw,
  Search,
  FolderTree,
  DollarSign,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  Database,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { AppView } from '../../App';
import { usePharmacy } from '../../context/PharmacyContext';

interface SidebarNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView, subtab?: string) => void;
  billCopiesAction?: string;
  purchaseSubTab?: string;
  poSubTab?: string;
  grnSubTab?: string;
  inventorySubTab?: string;
  expirySubTab?: string;
  batchSubTab?: string;
  mastersInitialTab?: string;
  accountsSubTab?: string;
  gstReportsInitialTab?: string;
  reportsSuiteSubTab?: string;
  hrSubTab?: string;
  settingsSubTab?: string;
  salesReportsInitialTab?: string;
  expandedMenus: { [key: string]: boolean };
  toggleAccordion: (key: string) => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  currentView,
  onNavigate,
  billCopiesAction,
  purchaseSubTab,
  poSubTab,
  grnSubTab,
  inventorySubTab,
  expirySubTab,
  batchSubTab,
  mastersInitialTab,
  accountsSubTab,
  gstReportsInitialTab,
  reportsSuiteSubTab,
  hrSubTab,
  settingsSubTab,
  salesReportsInitialTab,
  expandedMenus,
  toggleAccordion,
}) => {
  const { isMenuEnabled, isSubmenuEnabled } = usePharmacy();
  return (
    <nav className="p-2 space-y-0.5 text-xs font-medium">
      {/* 1. Home */}
      {isMenuEnabled('home') && (
      <button
        type="button"
        onClick={() => onNavigate('DASHBOARD')}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
          currentView === 'DASHBOARD'
            ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
            : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
        }`}
      >
        <Home className="w-4 h-4 shrink-0" />
        <span>Home</span>
      </button>
      )}

      {/* 2. POS / Sales (Expandable) */}
      {isMenuEnabled('pos') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('pos')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'POS' || currentView === 'BILL_COPIES' || currentView === 'SALES_REPORTS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>POS / Sales</span>
          </div>
          {expandedMenus.pos ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.pos && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('pos', 'new_sale') && (
            <button
              type="button"
              onClick={() => onNavigate('POS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'POS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>New Sale</span>
            </button>
          )}
            {isSubmenuEnabled('pos', 'bill_copy') && (
            <button
              type="button"
              onClick={() => onNavigate('BILL_COPIES', 'COPIES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BILL_COPIES' && billCopiesAction === 'COPIES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>Bill Copy</span>
            </button>
          )}
            {isSubmenuEnabled('pos', 'sales_modification') && (
            <button
              type="button"
              onClick={() => onNavigate('BILL_COPIES', 'MODIFICATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BILL_COPIES' && billCopiesAction === 'MODIFICATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Edit className="w-3.5 h-3.5 shrink-0" />
              <span>Sales Modification</span>
            </button>
          )}
            {isSubmenuEnabled('pos', 'sales_cancellation') && (
            <button
              type="button"
              onClick={() => onNavigate('BILL_COPIES', 'CANCELLATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BILL_COPIES' && billCopiesAction === 'CANCELLATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>Sales Cancellation</span>
            </button>
          )}
            {isSubmenuEnabled('pos', 'sales_return') && (
            <button
              type="button"
              onClick={() => onNavigate('BILL_COPIES', 'RETURNS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BILL_COPIES' && billCopiesAction === 'RETURNS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Sales Return</span>
            </button>
          )}
            <div className="pt-1 border-t border-slate-800/80 my-0.5">
              <span className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-0.5">
                Sales Report
              </span>
              {isSubmenuEnabled('pos', 'daily_sales_report') && (
            <button
                type="button"
                onClick={() => onNavigate('SALES_REPORTS', 'DAILY')}
                className={`w-full flex items-center gap-2 px-3 py-1 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                  currentView === 'SALES_REPORTS' && salesReportsInitialTab === 'DAILY'
                    ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Daily Sales Report</span>
              </button>
          )}
              {isSubmenuEnabled('pos', 'monthly_sales_report') && (
            <button
                type="button"
                onClick={() => onNavigate('SALES_REPORTS', 'MONTHLY')}
                className={`w-full flex items-center gap-2 px-3 py-1 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                  currentView === 'SALES_REPORTS' && salesReportsInitialTab === 'MONTHLY'
                    ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                    : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Monthly Sales Report</span>
              </button>
          )}
            </div>
          </div>
        )}
      </div>
)}

      {/* 3. Purchase (Expandable) */}
      {isMenuEnabled('purchase') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('purchase')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'PURCHASE_ENTRY' || currentView === 'PURCHASE_LIST'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 shrink-0" />
            <span>Purchase</span>
          </div>
          {expandedMenus.purchase ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.purchase && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('purchase', 'purchase_entry') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'ENTRY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'ENTRY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Entry</span>
            </button>
          )}
            {isSubmenuEnabled('purchase', 'purchase_return') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'RETURNS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'RETURNS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Return</span>
            </button>
          )}
            {isSubmenuEnabled('purchase', 'purchase_cancellation') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'CANCELLATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'CANCELLATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Cancellation</span>
            </button>
          )}
            {isSubmenuEnabled('purchase', 'purchase_modification') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'MODIFICATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'MODIFICATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Edit className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Modification</span>
            </button>
          )}
            {isSubmenuEnabled('purchase', 'purchase_copies') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'COPIES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'COPIES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Copies</span>
            </button>
          )}
            {isSubmenuEnabled('purchase', 'purchase_report') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ENTRY', 'REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ENTRY' && purchaseSubTab === 'REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 4. Purchase Order (Expandable) */}
      {isMenuEnabled('purchase_order') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('purchase_order')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'PURCHASE_ORDERS' || currentView === 'ORDERS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>Purchase Order</span>
          </div>
          {expandedMenus.purchase_order ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.purchase_order && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('purchase_order', 'new_po') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'NEW')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'NEW'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>New Purchase Order</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'po_register') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Order Register</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'pending_po') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'PENDING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'PENDING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Pending Purchase Orders</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'partial_po') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'PARTIAL')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'PARTIAL'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Partially Received Orders</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'completed_po') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'COMPLETED')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'COMPLETED'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Completed Orders</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'cancelled_po') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'CANCELLED')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'CANCELLED'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>Cancelled Orders</span>
            </button>
          )}
            {isSubmenuEnabled('purchase_order', 'po_report') && (
            <button
              type="button"
              onClick={() => onNavigate('PURCHASE_ORDERS', 'REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'PURCHASE_ORDERS' && poSubTab === 'REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Order Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 5. GRN (Goods Receipt) (Expandable) */}
      {isMenuEnabled('grn') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('grn')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'GRN_SUITE'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4 shrink-0" />
            <span>GRN (Goods Receipt)</span>
          </div>
          {expandedMenus.grn ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.grn && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('grn', 'new_grn') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'NEW')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'NEW'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>New GRN</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'grn_register') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>GRN Register</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'pending_grn') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'PENDING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'PENDING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Pending GRN</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'partial_grn') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'PARTIAL')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'PARTIAL'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Partially Received GRN</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'grn_modification') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'MODIFICATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'MODIFICATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Edit className="w-3.5 h-3.5 shrink-0" />
              <span>GRN Modification</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'grn_cancellation') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'CANCELLATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'CANCELLATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0" />
              <span>GRN Cancellation</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'grn_copies') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'COPIES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'COPIES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Copy className="w-3.5 h-3.5 shrink-0" />
              <span>GRN Copies</span>
            </button>
          )}
            {isSubmenuEnabled('grn', 'grn_report') && (
            <button
              type="button"
              onClick={() => onNavigate('GRN_SUITE', 'REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GRN_SUITE' && grnSubTab === 'REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>GRN Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 6. Inventory / Stock (Expandable) */}
      {isMenuEnabled('inventory') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('inventory')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'INVENTORY'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 shrink-0" />
            <span>Inventory / Stock</span>
          </div>
          {expandedMenus.inventory ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.inventory && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('inventory', 'stock_overview') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'OVERVIEW')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'OVERVIEW'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Overview</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'product_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'PRODUCT_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'PRODUCT_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Product Stock</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'batch_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'BATCH_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'BATCH_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Batch-wise Stock</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'stock_ledger') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'STOCK_LEDGER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'STOCK_LEDGER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Ledger</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'opening_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'OPENING_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'OPENING_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Opening Stock</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'stock_adjustment') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'STOCK_ADJUSTMENT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'STOCK_ADJUSTMENT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Edit className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Adjustment</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'stock_transfer') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'STOCK_TRANSFER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'STOCK_TRANSFER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Transfer</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'physical_verification') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'PHYSICAL_VERIFICATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'PHYSICAL_VERIFICATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Physical Stock Verification</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'stock_valuation') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'STOCK_VALUATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'STOCK_VALUATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Valuation</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'low_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'LOW_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'LOW_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Low Stock / Reorder List</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'out_of_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'OUT_OF_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'OUT_OF_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Out-of-Stock Products</span>
            </button>
          )}
            {isSubmenuEnabled('inventory', 'adjustment_report') && (
            <button
              type="button"
              onClick={() => onNavigate('INVENTORY', 'ADJUSTMENT_REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'INVENTORY' && inventorySubTab === 'ADJUSTMENT_REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Adjustment Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 7. Expiry Management (Expandable) */}
      {isMenuEnabled('expiry') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('expiry')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'EXPIRY_MANAGEMENT'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Expiry Management</span>
          </div>
          {expandedMenus.expiry ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.expiry && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('expiry', 'expiry_dashboard') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'DASHBOARD')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'DASHBOARD'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Expiry Dashboard</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'expired_products') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'EXPIRED')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'EXPIRED'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Expired Products</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'expiring_30') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', '30_DAYS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === '30_DAYS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Expiring in 30 Days</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'expiring_60') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', '60_DAYS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === '60_DAYS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-300" />
              <span>Expiring in 60 Days</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'expiring_90') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', '90_DAYS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === '90_DAYS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              <span>Expiring in 90 Days</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'batch_expiry_register') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'BATCH_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'BATCH_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Batch-wise Expiry Register</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'vendor_return') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'VENDOR_RETURN')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'VENDOR_RETURN'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Near-Expiry Return</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'disposal_register') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'DISPOSAL')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'DISPOSAL'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Expiry Disposal Register</span>
            </button>
          )}
            {isSubmenuEnabled('expiry', 'expiry_report') && (
            <button
              type="button"
              onClick={() => onNavigate('EXPIRY_MANAGEMENT', 'REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'EXPIRY_MANAGEMENT' && expirySubTab === 'REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Expiry Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 8. Batch & Traceability (Expandable) */}
      {isMenuEnabled('batch') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('batch')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'BATCH_TRACEABILITY' || currentView === 'STOCK_AUDIT'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 shrink-0" />
            <span>Batch & Traceability</span>
          </div>
          {expandedMenus.batch ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.batch && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('batch', 'batch_register') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Batch Register</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'batch_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Batch-wise Stock</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'batch_movement') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'MOVEMENT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'MOVEMENT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Batch Movement History</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'traceability') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'TRACEABILITY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'TRACEABILITY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier-to-Batch Traceability</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'quality_check') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'QUALITY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'QUALITY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Batch Quality Check</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'quarantine') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'QUARANTINE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'QUARANTINE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Quarantine / Hold Stock</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'recall') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'RECALL')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'RECALL'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Recall Management</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'damaged_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'DAMAGED')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'DAMAGED'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Damaged Stock Register</span>
            </button>
          )}
            {isSubmenuEnabled('batch', 'batch_report') && (
            <button
              type="button"
              onClick={() => onNavigate('BATCH_TRACEABILITY', 'REPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'BATCH_TRACEABILITY' && batchSubTab === 'REPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Batch Traceability Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 9. Files / Masters (Expandable) */}
      {isMenuEnabled('masters') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('masters')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'MASTERS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 shrink-0" />
            <span>Files / Masters</span>
          </div>
          {expandedMenus.masters ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.masters && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('masters', 'suppliers') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'SUPPLIERS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'SUPPLIERS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier Management</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'customers') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'CUSTOMERS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'CUSTOMERS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Customer Management</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'sales_reps') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'SALES_REPS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'SALES_REPS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Sales Representative Management</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'doctors') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'DOCTORS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'DOCTORS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 shrink-0" />
              <span>Doctor Management</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'products') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'PRODUCTS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'PRODUCTS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Pill className="w-3.5 h-3.5 shrink-0" />
              <span>Product / Medicine Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'manufacturers') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'MANUFACTURERS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'MANUFACTURERS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Manufacturer Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'compositions') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'COMPOSITIONS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'COMPOSITIONS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Composition Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'categories') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'CATEGORIES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'CATEGORIES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 shrink-0" />
              <span>Drug Category Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'hsn_gst') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'HSN_GST')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'HSN_GST'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>HSN / GST Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'unit_packing') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'UNIT_PACKING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'UNIT_PACKING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Unit / Packing Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'racks') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'RACKS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'RACKS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>Rack / Location Master</span>
            </button>
          )}
            {isSubmenuEnabled('masters', 'payment_modes') && (
            <button
              type="button"
              onClick={() => onNavigate('MASTERS', 'PAYMENT_MODES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'MASTERS' && mastersInitialTab === 'PAYMENT_MODES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Payment Mode Master</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 10. Accounts (Expandable) */}
      {isMenuEnabled('accounts') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('accounts')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'ACCOUNTS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 shrink-0" />
            <span>Accounts</span>
          </div>
          {expandedMenus.accounts ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.accounts && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('accounts', 'accounts_dashboard') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'DASHBOARD')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'DASHBOARD'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Accounts Dashboard</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'supplier_outstanding') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'SUPPLIER_OUTSTANDING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'SUPPLIER_OUTSTANDING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier Outstanding</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'supplier_payments') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'SUPPLIER_PAYMENTS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'SUPPLIER_PAYMENTS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier Payments</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'customer_outstanding') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'CUSTOMER_OUTSTANDING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'CUSTOMER_OUTSTANDING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Customer Outstanding</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'customer_receipts') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'CUSTOMER_RECEIPTS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'CUSTOMER_RECEIPTS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Customer Receipts</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'cash_book') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'CASH_BOOK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'CASH_BOOK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Cash Book</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'bank_book') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'BANK_BOOK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'BANK_BOOK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Bank Book</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'expense_entry') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'EXPENSE_ENTRY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'EXPENSE_ENTRY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Expense Entry</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'credit_debit_notes') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'CREDIT_DEBIT_NOTES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'CREDIT_DEBIT_NOTES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Credit / Debit Notes</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'day_book') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'DAY_BOOK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'DAY_BOOK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Day Book</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'ledger') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'LEDGER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'LEDGER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Ledger</span>
            </button>
          )}
            {isSubmenuEnabled('accounts', 'accounts_reports') && (
            <button
              type="button"
              onClick={() => onNavigate('ACCOUNTS', 'REPORTS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'ACCOUNTS' && accountsSubTab === 'REPORTS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Accounts Reports</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 11. GST Reports (Expandable) */}
      {isMenuEnabled('gst') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('gst')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'GST_REPORTS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 shrink-0" />
            <span>GST Reports</span>
          </div>
          {expandedMenus.gst ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.gst && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('gst', 'closing_stock') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'CLOSING_STOCK')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'CLOSING_STOCK'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>Closing Stock Report (VAT Period)</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'update_ref') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'UPDATE_REF')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'UPDATE_REF'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Update Reference for Return</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'input_register') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'INPUT_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'INPUT_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>GST Input Register</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'hsn_purchase') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'HSN_PURCHASE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'HSN_PURCHASE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>HSN-wise Purchase Report</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'output_register') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'OUTPUT_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'OUTPUT_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>GST Output Register</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'hsn_sales') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'HSN_SALES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'HSN_SALES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>HSN-wise Sales Report</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gstr_3b') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSTR_3B')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSTR_3B'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>GST Breakup Summary (3B)</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gstr_1') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSTR_1')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSTR_1'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>GSTR-1</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gstr_1_summary') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSTR_1_SUMMARY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSTR_1_SUMMARY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>GSTR-1 Summary</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gsp_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSP_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSP_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>GSP Settings</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gsp_export') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSP_EXPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSP_EXPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>GSP Export</span>
            </button>
          )}
            {isSubmenuEnabled('gst', 'gstr_2') && (
            <button
              type="button"
              onClick={() => onNavigate('GST_REPORTS', 'GSTR_2')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'GST_REPORTS' && gstReportsInitialTab === 'GSTR_2'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>GSTR-2</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 12. Reports (Expandable) */}
      {isMenuEnabled('reports') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('reports')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'REPORTS_SUITE'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Reports</span>
          </div>
          {expandedMenus.reports ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.reports && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('reports', 'expiry_report') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'EXPIRY')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'EXPIRY'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Expiry Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'non_moving') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'NON_MOVING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'NON_MOVING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Non-Moving Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'prescription') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'PRESCRIPTION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'PRESCRIPTION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Prescription Register</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'daily_collection') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'DAILY_COLLECTION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'DAILY_COLLECTION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Daily Collection Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'product_sales') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'PRODUCT_SALES')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'PRODUCT_SALES'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Product Sales Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'supplier_purchase') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'SUPPLIER_PURCHASE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'SUPPLIER_PURCHASE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>Supplier Purchase Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'profit_margin') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'PROFIT_MARGIN')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'PROFIT_MARGIN'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Profit / Margin Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'stock_valuation') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'STOCK_VALUATION')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'STOCK_VALUATION'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Stock Valuation Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'purchase_register') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'PURCHASE_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'PURCHASE_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Purchase Register</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'sales_register') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'SALES_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'SALES_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Sales Register</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'returns_register') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'RETURNS_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'RETURNS_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Returns Register</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'cancelled_txn') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'CANCELLED_TXN')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'CANCELLED_TXN'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Ban className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>Cancelled Transactions Report</span>
            </button>
          )}
            {isSubmenuEnabled('reports', 'audit_trail') && (
            <button
              type="button"
              onClick={() => onNavigate('REPORTS_SUITE', 'AUDIT_TRAIL')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'REPORTS_SUITE' && reportsSuiteSubTab === 'AUDIT_TRAIL'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              <span>Audit Trail Report</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 13. HR & Payroll (Expandable) */}
      {isMenuEnabled('hr') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('hr')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'HR_PAYROLL' || currentView === 'USERS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 shrink-0" />
            <span>HR & Payroll</span>
          </div>
          {expandedMenus.hr ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.hr && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('hr', 'employee_master') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'EMPLOYEE_MASTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'EMPLOYEE_MASTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Employee Master</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'staff_assignment') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'STAFF_ASSIGNMENT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'STAFF_ASSIGNMENT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>User / Staff Assignment</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'attendance') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'ATTENDANCE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'ATTENDANCE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Attendance</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'shift_mgmt') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'SHIFT_MGMT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'SHIFT_MGMT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Shift Management</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'leave_mgmt') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'LEAVE_MGMT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'LEAVE_MGMT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Leave Management</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'payroll_processing') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'PAYROLL_PROCESSING')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'PAYROLL_PROCESSING'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span>Payroll Processing</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'salary_slip') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'SALARY_SLIP')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'SALARY_SLIP'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Salary Slip</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'payroll_register') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'PAYROLL_REGISTER')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'PAYROLL_REGISTER'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 shrink-0" />
              <span>Payroll Register</span>
            </button>
          )}
            {isSubmenuEnabled('hr', 'hr_reports') && (
            <button
              type="button"
              onClick={() => onNavigate('HR_PAYROLL', 'HR_REPORTS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'HR_PAYROLL' && hrSubTab === 'HR_REPORTS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>HR Reports</span>
            </button>
          )}
          </div>
        )}
      </div>
)}

      {/* 14. Settings (Expandable) */}
      {isMenuEnabled('settings') && (
      <div>
        <button
          type="button"
          onClick={() => toggleAccordion('settings')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all cursor-pointer text-left ${
            currentView === 'SETTINGS'
              ? 'bg-[#0a2347] text-sky-300 font-semibold'
              : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </div>
          {expandedMenus.settings ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {expandedMenus.settings && (
          <div className="pl-3 pr-1 py-1 space-y-0.5 animate-in fade-in duration-150">
            {isSubmenuEnabled('settings', 'store_profile') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'STORE_PROFILE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'STORE_PROFILE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Store Profile</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'company_gst') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'COMPANY_GST')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'COMPANY_GST'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Company / GST Details</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'user_management') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'USER_MANAGEMENT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'USER_MANAGEMENT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>User Management</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'role_permissions') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'ROLE_PERMISSIONS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'ROLE_PERMISSIONS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Role & Permission Management</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'menu_management') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'MENU_MANAGEMENT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'MENU_MANAGEMENT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span>Menu & Navigation Management</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'billing_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'BILLING_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'BILLING_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span>Billing Settings</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'invoice_print') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'INVOICE_PRINT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'INVOICE_PRINT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Invoice / Print Format</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'tax_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'TAX_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'TAX_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Tax Settings</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'payment_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'PAYMENT_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'PAYMENT_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Payment Settings</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'barcode_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'BARCODE_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'BARCODE_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Barcode className="w-3.5 h-3.5 shrink-0" />
              <span>Barcode Settings</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'backup') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'BACKUP')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'BACKUP'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Backup</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'restore') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'RESTORE')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'RESTORE'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Restore</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'import_export') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'IMPORT_EXPORT')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'IMPORT_EXPORT'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Data Import / Export</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'audit_log') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'AUDIT_LOG')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'AUDIT_LOG'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Audit Log</span>
            </button>
          )}
            {isSubmenuEnabled('settings', 'theme_settings') && (
            <button
              type="button"
              onClick={() => onNavigate('SETTINGS', 'THEME_SETTINGS')}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-all cursor-pointer text-left ${
                currentView === 'SETTINGS' && settingsSubTab === 'THEME_SETTINGS'
                  ? 'bg-[#0084ff] text-white font-semibold shadow-xs'
                  : 'hover:bg-[#0e2447] text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Theme Settings</span>
            </button>
          )}
          </div>
        )}
      </div>)}

    </nav>
  );
};
