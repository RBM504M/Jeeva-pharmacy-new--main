import React, { useState, useMemo } from 'react';
import {
  Home,
  ShoppingCart,
  Truck,
  FileCheck,
  Package,
  Layers,
  Calendar,
  Search,
  Database,
  Wallet,
  Receipt,
  BarChart3,
  Users,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { MenuConfig } from '../../types/navigation';

export const MenuManagementConfigView: React.FC = () => {
  const {
    navigationConfig,
    toggleMenu,
    toggleSubmenu,
    setAllMenus,
    resetNavigationConfigToDefaults,
    currentUser,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [collapsedMenus, setCollapsedMenus] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getMenuIcon = (iconName?: string) => {
    const props = { className: 'w-4 h-4 shrink-0' };
    switch (iconName) {
      case 'Home':
        return <Home {...props} />;
      case 'ShoppingCart':
        return <ShoppingCart {...props} />;
      case 'Truck':
        return <Truck {...props} />;
      case 'FileCheck':
        return <FileCheck {...props} />;
      case 'Package':
        return <Package {...props} />;
      case 'Layers':
        return <Layers {...props} />;
      case 'Calendar':
        return <Calendar {...props} />;
      case 'Search':
        return <Search {...props} />;
      case 'Database':
        return <Database {...props} />;
      case 'Wallet':
        return <Wallet {...props} />;
      case 'Receipt':
        return <Receipt {...props} />;
      case 'BarChart3':
        return <BarChart3 {...props} />;
      case 'Users':
        return <Users {...props} />;
      case 'Settings':
      default:
        return <Settings {...props} />;
    }
  };

  const toggleAccordionCollapse = (menuId: string) => {
    setCollapsedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Filter and search menus
  const filteredMenuList = useMemo(() => {
    const list: Array<[string, MenuConfig]> = Object.entries(navigationConfig.menus);
    const q = searchQuery.trim().toLowerCase();

    return list.filter(([_, menu]) => {
      // Status filter
      if (statusFilter === 'ENABLED' && !menu.enabled) return false;
      if (statusFilter === 'DISABLED' && menu.enabled) return false;

      if (!q) return true;

      // Match menu name or description
      if (menu.label.toLowerCase().includes(q) || menu.description?.toLowerCase().includes(q)) {
        return true;
      }

      // Match any child submenu name or description
      if (menu.submenus) {
        const matchesSubmenu = Object.values(menu.submenus).some(
          (sub) =>
            sub.label.toLowerCase().includes(q) ||
            sub.description?.toLowerCase().includes(q)
        );
        if (matchesSubmenu) return true;
      }

      return false;
    });
  }, [navigationConfig.menus, searchQuery, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalMenus = 0;
    let enabledMenus = 0;
    let totalSubmenus = 0;
    let enabledSubmenus = 0;

    for (const menu of Object.values(navigationConfig.menus)) {
      totalMenus++;
      if (menu.enabled) enabledMenus++;
      if (menu.submenus) {
        for (const sub of Object.values(menu.submenus)) {
          totalSubmenus++;
          if (sub.enabled) enabledSubmenus++;
        }
      }
    }

    return { totalMenus, enabledMenus, totalSubmenus, enabledSubmenus };
  }, [navigationConfig.menus]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5 text-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header with Title and RBAC Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Menu & Navigation Management
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Customize sidebar menus and submenus visible to staff. Preferences persist across sessions and restarts.
              </p>
            </div>
          </div>
        </div>

        {/* Global Bulk Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAllMenus(true);
              showToast('All menus and submenus have been enabled');
            }}
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Enable all menus and submenus"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Enable All</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAllMenus(false);
              showToast('Non-essential menus disabled (Settings remains active)');
            }}
            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 rounded font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Disable all optional menus"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Disable Optional</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetNavigationConfigToDefaults();
              showToast('Navigation settings restored to defaults');
            }}
            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
            title="Reset to initial default configuration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Security & RBAC Notice Callout */}
      <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-3 text-sky-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
        <div className="text-[11px] leading-relaxed space-y-0.5">
          <p className="font-semibold text-sky-950">
            Role-Based Access Control (RBAC) & Safety Safeguards
          </p>
          <p className="text-sky-800">
            Hiding a menu only customizes the UI surface. Underlying role permissions, pharmacist license enforcement, and data privacy policies remain strictly guarded. The <strong>Settings</strong> module is permanently locked for administrators to prevent lockout.
          </p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Main Menus Active
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900">
              {stats.enabledMenus}
            </span>
            <span className="text-slate-400 font-medium">/ {stats.totalMenus}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${(stats.enabledMenus / stats.totalMenus) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Submenus Active
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-900">
              {stats.enabledSubmenus}
            </span>
            <span className="text-slate-400 font-medium">/ {stats.totalSubmenus}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all"
              style={{ width: `${(stats.enabledSubmenus / stats.totalSubmenus) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Current User
          </span>
          <div className="mt-1">
            <span className="font-bold text-slate-900 truncate block">
              {currentUser.name}
            </span>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-0.5 inline-block">
              {currentUser.role}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
            Configuration Status
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Synchronized</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Live local persistence
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu or submenu name..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded text-xs placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium text-[11px]">Filter:</span>
          {(['ALL', 'ENABLED', 'DISABLED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {filter === 'ALL' ? 'All' : filter === 'ENABLED' ? 'Enabled' : 'Disabled'}
            </button>
          ))}
        </div>
      </div>

      {/* Menus List */}
      <div className="space-y-3">
        {filteredMenuList.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500 space-y-1">
            <Info className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="font-semibold text-xs text-slate-700">No menus match your filter</p>
            <p className="text-[11px]">Try adjusting your search query or reset the filter.</p>
          </div>
        ) : (
          filteredMenuList.map(([menuId, menu]) => {
            const hasSubmenus = menu.submenus && Object.keys(menu.submenus).length > 0;
            const submenusList = hasSubmenus ? Object.entries(menu.submenus!) : [];
            const activeSubmenuCount = submenusList.filter(([_, sub]) => sub.enabled).length;
            const isCollapsed = collapsedMenus[menuId] ?? false;

            return (
              <div
                key={menuId}
                className={`border rounded-lg transition-all ${
                  menu.enabled
                    ? 'border-slate-200 bg-white shadow-2xs'
                    : 'border-slate-200/60 bg-slate-50/70 opacity-80'
                }`}
              >
                {/* Main Menu Header Row */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Expand/Collapse Button */}
                    {hasSubmenus ? (
                      <button
                        type="button"
                        onClick={() => toggleAccordionCollapse(menuId)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                        title={isCollapsed ? 'Expand submenus' : 'Collapse submenus'}
                        aria-label={`Toggle ${menu.label} submenus`}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-6" />
                    )}

                    {/* Icon */}
                    <div
                      className={`p-2 rounded-md ${
                        menu.enabled
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {getMenuIcon(menu.icon)}
                    </div>

                    {/* Label & Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {menu.label}
                        </span>
                        {menu.isSystemLocked && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                            Admin Locked
                          </span>
                        )}
                        {!menu.enabled && (
                          <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-lg">
                        {menu.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Toggle */}
                  <div className="flex items-center gap-4 shrink-0">
                    {hasSubmenus && (
                      <div className="text-right hidden sm:block">
                        <span className="text-[11px] font-bold text-slate-700">
                          {activeSubmenuCount} / {submenusList.length}
                        </span>
                        <span className="text-[10px] text-slate-400 block">submenus active</span>
                      </div>
                    )}

                    {/* Master Menu Switch */}
                    <label
                      className={`relative inline-flex items-center ${
                        menu.isSystemLocked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                      }`}
                      title={
                        menu.isSystemLocked
                          ? 'Settings menu cannot be disabled to prevent administrator lockout'
                          : `Toggle ${menu.label}`
                      }
                    >
                      <input
                        type="checkbox"
                        checked={menu.enabled}
                        disabled={menu.isSystemLocked}
                        onChange={() => {
                          toggleMenu(menuId);
                          showToast(`${menu.label} ${menu.enabled ? 'disabled' : 'enabled'}`);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>

                {/* Submenus Accordion Panel */}
                {hasSubmenus && !isCollapsed && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 pb-1">
                      <span>Submenus & Action Views</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            submenusList.forEach(([subId, sub]) => {
                              if (!sub.enabled && !sub.isSystemLocked) {
                                toggleSubmenu(menuId, subId, true);
                              }
                            });
                            showToast(`All submenus enabled for ${menu.label}`);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                        >
                          Enable All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            submenusList.forEach(([subId, sub]) => {
                              if (sub.enabled && !sub.isSystemLocked) {
                                toggleSubmenu(menuId, subId, false);
                              }
                            });
                            showToast(`Optional submenus disabled for ${menu.label}`);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-800 font-bold hover:underline cursor-pointer"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {submenusList.map(([subId, sub]) => (
                        <div
                          key={subId}
                          className={`p-2.5 rounded-md border flex items-center justify-between gap-2 transition-all ${
                            sub.enabled
                              ? 'bg-white border-slate-200 shadow-2xs'
                              : 'bg-slate-100/70 border-slate-200/60 opacity-75'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-semibold text-xs truncate ${
                                  sub.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
                                }`}
                              >
                                {sub.label}
                              </span>
                              {sub.isSystemLocked && (
                                <span title="System locked">
                                  <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                </span>
                              )}
                            </div>
                            {sub.description && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {sub.description}
                              </p>
                            )}
                          </div>

                          {/* Submenu toggle switch */}
                          <label
                            className={`relative inline-flex items-center shrink-0 ${
                              sub.isSystemLocked || !menu.enabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'cursor-pointer'
                            }`}
                            title={
                              sub.isSystemLocked
                                ? 'Locked by admin policy'
                                : !menu.enabled
                                ? 'Parent menu is disabled'
                                : `Toggle ${sub.label}`
                            }
                          >
                            <input
                              type="checkbox"
                              checked={sub.enabled}
                              disabled={sub.isSystemLocked || !menu.enabled}
                              onChange={() => {
                                toggleSubmenu(menuId, subId);
                                showToast(`${sub.label} ${sub.enabled ? 'disabled' : 'enabled'}`);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
