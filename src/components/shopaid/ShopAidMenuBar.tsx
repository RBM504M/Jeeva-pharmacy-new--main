import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ChevronDown,
  ShoppingCart,
  Boxes,
  FileSpreadsheet,
  Building2,
  Settings,
  HelpCircle,
  Percent,
  Search,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { AppView } from '../../App';

interface ShopAidMenuBarProps {
  currentView: string;
  onNavigate: (view: AppView, subtab?: string) => void;
  onOpenProductBrief: () => void;
}

export const ShopAidMenuBar: React.FC<ShopAidMenuBarProps> = ({
  currentView,
  onNavigate,
  onOpenProductBrief,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts Listener matching ShopAID reference
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F9: Product Brief Modal
      if (e.key === 'F9') {
        e.preventDefault();
        onOpenProductBrief();
      }

      // Ctrl + Shortcuts
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'e') {
          e.preventDefault();
          onNavigate('POS');
        } else if (key === 'z') {
          e.preventDefault();
          onNavigate('BILL_COPIES' as any);
        } else if (key === 'i') {
          e.preventDefault();
          onNavigate('PURCHASE_ENTRY' as any, 'ENTRY');
        } else if (key === 'd') {
          e.preventDefault();
          onNavigate('PURCHASE_ENTRY' as any, 'RETURNS');
        } else if (key === 'w') {
          e.preventDefault();
          onNavigate('SALES_REPORTS' as any);
        } else if (key === 'q') {
          e.preventDefault();
          onNavigate('BILL_COPIES' as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, onOpenProductBrief]);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleSubItemClick = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  return (
    <div
      ref={menuBarRef}
      className="bg-white border-b border-slate-200 select-none sticky top-0 z-40 text-xs shadow-2xs no-print"
    >
      <div className="flex items-center justify-between px-3 py-1">
        {/* Main Menu Bar Items */}
        <div className="flex items-center gap-0.5">
          {/* 1. File / Masters */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('MASTERS')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'MASTERS' || currentView === 'MASTERS'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>File / Masters</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'MASTERS' && (
              <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'PRODUCTS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Product Master</span>
                  <span className="text-[10px] text-slate-400 font-mono">F9</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'CUSTOMERS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Customer Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'DOCTORS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Doctor Master (RMP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'SUPPLIERS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Supplier / Vendor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'SALES_REPS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Sales Rep Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'RACKS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Rack & Location Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('MASTERS' as any, 'SCHEDULES'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Schedule Type Master</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Sales Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('SALES')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'SALES' || currentView === 'POS' || currentView === 'BILL_COPIES'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Sales</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'SALES' && (
              <div className="absolute left-0 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('POS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span className="font-semibold">Retail Bill</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Ctrl+E</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('BILL_COPIES' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Bill Copies & Actions</span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('BILL_COPIES' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Sales Return against Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('BILL_COPIES' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Sales Cancellation (Void)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('BILL_COPIES' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Quick Bill Modification</span>
                  <span className="text-[10px] font-mono text-slate-500">Ctrl+Q</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('SALES_REPORTS' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Sales Reports Submenu</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Ctrl+W</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Purchase Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('PURCHASE')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'PURCHASE' || currentView === 'PURCHASE_ENTRY'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Purchase</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'PURCHASE' && (
              <div className="absolute left-0 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('PURCHASE_ENTRY' as any, 'ENTRY'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span className="font-semibold">Purchase Entry (GRN)</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">Ctrl+I</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('PURCHASE_ENTRY' as any, 'RETURNS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Purchase Returns (Debit Note)</span>
                  <span className="text-[10px] font-mono text-amber-700 font-bold">Ctrl+D</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('PURCHASE_ENTRY' as any, 'COPIES'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Purchase Copies / Inward List</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('VENDORS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Wholesaler / Vendor Directory</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Order Management */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('ORDERS')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'ORDERS' || currentView === 'ORDERS'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Order Management</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'ORDERS' && (
              <div className="absolute left-0 mt-1 w-60 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('ORDERS' as any, 'WANTED_BOOK'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span className="font-semibold">Wanted Book (Shortages)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('ORDERS' as any, 'ORDER_BASED_ON_SALES'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Order Based on Sales (Section 6)</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. Inventory */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('INVENTORY')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'INVENTORY' || currentView === 'INVENTORY' || currentView === 'INVENTORY_REPORTS'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Inventory</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'INVENTORY' && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Stock Management & Lookup</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('STOCK_AUDIT'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Stock Adjustment & Recount</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Inventory Reports (Section 8)
                </div>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'STOCK_REPORT'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Stock Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'STOCK_VALUE'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Stock Value Report (Cost vs MRP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'STOCK_MOVEMENT'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Stock Movement / Product Flow</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'NON_MOVING'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Non Moving Stock (Expiry Risk)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'NIL_STOCK'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Nil Stock Report (Stockouts)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'TAX_BREAKUP'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Tax Descriptionwise Closing Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('INVENTORY_REPORTS' as any, 'FREE_STOCK'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>FreeStock Value Report</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Reports Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('REPORTS')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'REPORTS' || currentView === 'SCHEDULE_REGISTER' || currentView === 'PRESCRIPTION_REGISTER'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>Reports</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'REPORTS' && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(onOpenProductBrief)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer font-semibold"
                >
                  <span>Product Brief</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">F9</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('SCHEDULE_REGISTER' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer font-semibold text-purple-900"
                >
                  <span>Schedule Register (H/H1/X)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
                    Statutory
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('PRESCRIPTION_REGISTER' as any))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Prescription Register I & II</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('ACCOUNTS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>Price List & Expiry Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('PATIENTS'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>DPDP Patient Consent Audit</span>
                </button>
              </div>
            )}
          </div>

          {/* 7. GST Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleMenuClick('GST')}
              className={`px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                openMenu === 'GST' || currentView === 'GST_REPORTS'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>GST</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {openMenu === 'GST' && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'OUTPUT_REGISTER'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>GST Output Register (Sales)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'INPUT_REGISTER'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>GST Input Register (Purchases)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'HSN_SALES'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>HSNwise Sales Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'HSN_PURCHASE'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer"
                >
                  <span>HSNwise Purchase Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'GSTR_3B'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer font-semibold text-emerald-800"
                >
                  <span>GST Breakup Summary (GSTR-3B)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubItemClick(() => onNavigate('GST_REPORTS' as any, 'GSTR_1_EXPORT'))}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-900 flex justify-between cursor-pointer font-semibold text-slate-900"
                >
                  <span>GSTR-1 Portal JSON Export</span>
                </button>
              </div>
            )}
          </div>

          {/* 8. Accounts & Financials */}
          <button
            type="button"
            onClick={() => onNavigate('ACCOUNTS')}
            className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
              currentView === 'ACCOUNTS'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Accounts
          </button>

          {/* 9. Maintenance */}
          <button
            type="button"
            onClick={() => onNavigate('SETTINGS')}
            className={`px-2.5 py-1.5 rounded-md font-semibold cursor-pointer transition-colors ${
              currentView === 'SETTINGS'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Maintenance
          </button>
        </div>

        {/* Quick Shortcut Badges on Right */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <button
            type="button"
            onClick={onOpenProductBrief}
            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer font-bold flex items-center gap-1"
          >
            <span>F9</span>
            <span className="font-sans font-normal text-[10px]">Product Brief</span>
          </button>
          <span className="hidden md:inline px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
            Ctrl+E Bill
          </span>
          <span className="hidden md:inline px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
            Ctrl+Z Copies
          </span>
          <span className="hidden md:inline px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
            Ctrl+I Purchase
          </span>
        </div>
      </div>
    </div>
  );
};
