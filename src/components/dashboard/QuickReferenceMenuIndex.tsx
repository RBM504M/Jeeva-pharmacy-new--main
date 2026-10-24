import React, { useState } from 'react';
import {
  FileText,
  ShoppingCart,
  Boxes,
  FileSpreadsheet,
  Building2,
  Settings,
  Percent,
  Search,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AppView } from '../../App';

interface QuickReferenceMenuIndexProps {
  onNavigate: (view: AppView, subtab?: string) => void;
}

interface MenuSectionItem {
  label: string;
  shortcut?: string;
  view: string;
  subtab?: string;
}

interface MenuSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge: string;
  color: string;
  items: MenuSectionItem[];
}

export const QuickReferenceMenuIndex: React.FC<QuickReferenceMenuIndexProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const menuSections: MenuSection[] = [
    {
      id: 'MASTERS',
      title: 'File / Masters',
      icon: <Building2 className="w-4 h-4 text-emerald-600" />,
      badge: '26 Masters',
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      items: [
        { label: 'Product Master', shortcut: 'F9', view: 'MASTERS', subtab: 'PRODUCTS' },
        { label: 'Customer Master', view: 'MASTERS', subtab: 'CUSTOMERS' },
        { label: 'Doctor Master (RMP)', view: 'MASTERS', subtab: 'DOCTORS' },
        { label: 'Supplier / Vendor', view: 'MASTERS', subtab: 'SUPPLIERS' },
        { label: 'Sales Rep Master', view: 'MASTERS', subtab: 'SALES_REPS' },
        { label: 'Rack & Location Master', view: 'MASTERS', subtab: 'RACKS' },
        { label: 'Schedule Type Master', view: 'MASTERS', subtab: 'SCHEDULES' },
        { label: 'Manufacturer Master', view: 'MASTERS', subtab: 'PRODUCTS' },
        { label: 'Tax & GST Definitions', view: 'GST_REPORTS', subtab: 'GSTR_3B' },
        { label: 'Unit Description Master', view: 'MASTERS', subtab: 'PRODUCTS' },
        { label: 'Schemes & Offers', view: 'MASTERS', subtab: 'PRODUCTS' },
      ],
    },
    {
      id: 'SALES',
      title: 'Sales Operations',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      badge: '11 Operations',
      color: 'bg-blue-50 text-blue-900 border-blue-200',
      items: [
        { label: 'Retail Bill / New Sale', shortcut: 'Ctrl+E', view: 'POS' },
        { label: 'Bill Copies & Actions', shortcut: 'Ctrl+Z', view: 'BILL_COPIES' },
        { label: 'Sales Return against Bill', view: 'BILL_COPIES' },
        { label: 'Sales Cancellation (Void)', view: 'BILL_COPIES' },
        { label: 'Quick Bill Modification', shortcut: 'Ctrl+Q', view: 'BILL_COPIES' },
        { label: 'Payment Mode Modification', view: 'BILL_COPIES' },
        { label: 'Continuous Bill Print', view: 'BILL_COPIES' },
      ],
    },
    {
      id: 'SALES_REPORT',
      title: 'Sales Reports Submenu',
      icon: <Percent className="w-4 h-4 text-purple-600" />,
      badge: '16 Reports',
      color: 'bg-purple-50 text-purple-900 border-purple-200',
      items: [
        { label: 'Daily Sales Report', shortcut: 'Ctrl+W', view: 'SALES_REPORTS', subtab: 'DAILY' },
        { label: 'Monthly Sales Report', view: 'SALES_REPORTS', subtab: 'MONTHLY' },
        { label: 'Billwise Margin Report', view: 'SALES_REPORTS', subtab: 'MARGIN' },
        { label: 'Doctorwise Sales Report', view: 'SALES_REPORTS', subtab: 'DOCTOR' },
        { label: 'SalesRepwise Sales Report', view: 'SALES_REPORTS', subtab: 'SALES_REP' },
        { label: 'Bill Cancellation Report', view: 'SALES_REPORTS', subtab: 'CANCELLATION' },
        { label: 'Sales Tax Slab Report', view: 'SALES_REPORTS', subtab: 'TAX' },
      ],
    },
    {
      id: 'PURCHASE',
      title: 'Purchase Operations',
      icon: <ShoppingCart className="w-4 h-4 text-amber-600" />,
      badge: '9 Operations',
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      items: [
        { label: 'Purchase Entry (GRN)', shortcut: 'Ctrl+I', view: 'PURCHASE_ENTRY', subtab: 'ENTRY' },
        { label: 'Purchase Returns (Debit Note)', shortcut: 'Ctrl+D', view: 'PURCHASE_ENTRY', subtab: 'RETURNS' },
        { label: 'Purchase Copies / Inward List', view: 'PURCHASE_ENTRY', subtab: 'COPIES' },
        { label: 'Supplier DC (Delivery Challan)', view: 'PURCHASE_ENTRY', subtab: 'COPIES' },
        { label: 'Purchase Modifications', view: 'PURCHASE_ENTRY', subtab: 'COPIES' },
      ],
    },
    {
      id: 'ORDERS',
      title: 'Order Management',
      icon: <Boxes className="w-4 h-4 text-indigo-600" />,
      badge: '2 Workflows',
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
      items: [
        { label: 'Wanted Book (Shortages)', view: 'ORDERS', subtab: 'WANTED_BOOK' },
        { label: 'Order Based on Sales (Section 6.1)', view: 'ORDERS', subtab: 'ORDER_BASED_ON_SALES' },
      ],
    },
    {
      id: 'INVENTORY',
      title: 'Inventory & Inventory Reports',
      icon: <Boxes className="w-4 h-4 text-teal-600" />,
      badge: '12 Reports',
      color: 'bg-teal-50 text-teal-900 border-teal-200',
      items: [
        { label: 'Stock Report (Batch In-Hand)', view: 'INVENTORY_REPORTS', subtab: 'STOCK_REPORT' },
        { label: 'Stock Value Report (Cost vs MRP)', view: 'INVENTORY_REPORTS', subtab: 'STOCK_VALUE' },
        { label: 'Stock Movement / Product Flow', view: 'INVENTORY_REPORTS', subtab: 'STOCK_MOVEMENT' },
        { label: 'Non Moving Stock (Expiry Risk)', view: 'INVENTORY_REPORTS', subtab: 'NON_MOVING' },
        { label: 'Nil Stock Report (Stockouts)', view: 'INVENTORY_REPORTS', subtab: 'NIL_STOCK' },
        { label: 'Tax Descriptionwise Closing Stock', view: 'INVENTORY_REPORTS', subtab: 'TAX_BREAKUP' },
        { label: 'FreeStock Value Report', view: 'INVENTORY_REPORTS', subtab: 'FREE_STOCK' },
        { label: 'Stock Adjustment & Recount', view: 'STOCK_AUDIT' },
      ],
    },
    {
      id: 'REPORTS',
      title: 'Statutory Reports',
      icon: <FileSpreadsheet className="w-4 h-4 text-rose-600" />,
      badge: '10 Registers',
      color: 'bg-rose-50 text-rose-900 border-rose-200',
      items: [
        { label: 'Schedule Register (Schedule H/H1/X)', shortcut: 'Statutory', view: 'SCHEDULE_REGISTER' },
        { label: 'Prescription Register I & II', view: 'PRESCRIPTION_REGISTER' },
        { label: 'Product Brief Lookup', shortcut: 'F9', view: 'REPORTS' },
        { label: 'Expiry List & Expiry Alerts', view: 'REPORTS' },
        { label: 'Price List Master', view: 'REPORTS' },
      ],
    },
    {
      id: 'GST',
      title: 'GST Filing Suite',
      icon: <Percent className="w-4 h-4 text-cyan-600" />,
      badge: '12 Modules',
      color: 'bg-cyan-50 text-cyan-900 border-cyan-200',
      items: [
        { label: 'GST Output Register (Sales)', view: 'GST_REPORTS', subtab: 'OUTPUT_REGISTER' },
        { label: 'GST Input Register (Purchases)', view: 'GST_REPORTS', subtab: 'INPUT_REGISTER' },
        { label: 'HSNwise Sales Report', view: 'GST_REPORTS', subtab: 'HSN_SALES' },
        { label: 'HSNwise Purchase Report', view: 'GST_REPORTS', subtab: 'HSN_PURCHASE' },
        { label: 'GST Breakup Summary (GSTR-3B)', view: 'GST_REPORTS', subtab: 'GSTR_3B' },
        { label: 'GSTR-1 Portal JSON & CSV Export', view: 'GST_REPORTS', subtab: 'GSTR_1_EXPORT' },
        { label: 'GSTR-1 Section Summary', view: 'GST_REPORTS', subtab: 'GSTR_3B' },
        { label: 'Closing Stock Report (VAT Period)', view: 'GST_REPORTS', subtab: 'OUTPUT_REGISTER' },
      ],
    },
  ];

  const filteredSections = menuSections.filter((sec) => {
    if (selectedCategory !== 'ALL' && sec.id !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hasMatchInItems = sec.items.some((it) => it.label.toLowerCase().includes(q));
      const hasMatchInTitle = sec.title.toLowerCase().includes(q);
      return hasMatchInItems || hasMatchInTitle;
    }
    return true;
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                16. Quick-Reference Menu Index
              </h2>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                ShopAID System Directory
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated quick navigation index for all Masters, Sales, Purchase, Inventory, Reports & GST registers
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search menu or shortcut..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Menus ({menuSections.length})
        </button>
        {menuSections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setSelectedCategory(sec.id)}
            className={`px-3 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-colors ${
              selectedCategory === sec.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {/* Grid of Menus */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            className="border border-slate-200/90 rounded-xl p-3 bg-slate-50/40 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  {sec.icon}
                  <span className="font-bold text-xs text-slate-900">{sec.title}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 font-mono">
                  {sec.badge}
                </span>
              </div>

              <div className="space-y-1">
                {sec.items.map((it, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onNavigate(it.view as any, it.subtab)}
                    className="w-full text-left px-2 py-1 rounded-md text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 flex items-center justify-between cursor-pointer group transition-colors"
                  >
                    <span className="truncate">{it.label}</span>
                    {it.shortcut && (
                      <span className="text-[9px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 group-hover:border-blue-300 group-hover:text-blue-700 shrink-0 ml-1">
                        {it.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigate(sec.items[0].view as any, sec.items[0].subtab)}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Open Section</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
