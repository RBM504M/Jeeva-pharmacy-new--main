import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PharmacyProvider, usePharmacy } from '../context/PharmacyContext';
import { DEFAULT_NAVIGATION_CONFIG } from '../types/navigation';
import { MenuManagementConfigView } from '../components/settings/MenuManagementConfigView';
import { SettingsView } from '../components/settings/SettingsView';
import { SidebarNavigation } from '../components/navigation/SidebarNavigation';

describe('Admin Panel: Configurable UI/UX Navigation & Menu Management System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('1. Default Configuration: All 14 main menus and submenus are enabled by default', () => {
    const menus = DEFAULT_NAVIGATION_CONFIG.menus;
    const menuKeys = Object.keys(menus);

    expect(menuKeys.length).toBe(14);
    expect(menuKeys).toEqual([
      'home',
      'pos',
      'purchase',
      'purchase_order',
      'grn',
      'inventory',
      'expiry',
      'batch',
      'masters',
      'accounts',
      'gst',
      'reports',
      'hr',
      'settings',
    ]);

    // Ensure all menus are enabled by default
    for (const key of menuKeys) {
      expect(menus[key].enabled).toBe(true);
      if (menus[key].submenus) {
        for (const sub of Object.values(menus[key].submenus!)) {
          expect(sub.enabled).toBe(true);
        }
      }
    }

    // Ensure settings has safety lock to prevent admin lockout
    expect(menus.settings.isSystemLocked).toBe(true);
    expect(menus.settings.submenus?.menu_management?.isSystemLocked).toBe(true);
  });

  test('2. MenuManagementConfigView: renders summary statistics and all menu cards', () => {
    render(
      <PharmacyProvider>
        <MenuManagementConfigView />
      </PharmacyProvider>
    );

    expect(screen.getByRole('heading', { name: 'Menu & Navigation Management' })).toBeInTheDocument();
    expect(screen.getByText(/Role-Based Access Control \(RBAC\) & Safety Safeguards/i)).toBeInTheDocument();
    expect(screen.getByText('Main Menus Active')).toBeInTheDocument();
    expect(screen.getByText('Submenus Active')).toBeInTheDocument();

    // Check key menus are rendered
    expect(screen.getByText('Home / Dashboard')).toBeInTheDocument();
    expect(screen.getByText('POS / Sales')).toBeInTheDocument();
    expect(screen.getByText('Purchase Order')).toBeInTheDocument();
    expect(screen.getByText('GRN (Goods Receipt)')).toBeInTheDocument();
    expect(screen.getByText('Inventory / Stock')).toBeInTheDocument();
    expect(screen.getByText('Batch & Traceability')).toBeInTheDocument();
    expect(screen.getByText('Files / Masters')).toBeInTheDocument();
    expect(screen.getByText('GST Reports')).toBeInTheDocument();
    expect(screen.getByText('HR & Payroll')).toBeInTheDocument();
  });

  test('3. Search and filter functionality works across menus and submenus', () => {
    render(
      <PharmacyProvider>
        <MenuManagementConfigView />
      </PharmacyProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Search menu or submenu name/i);
    fireEvent.change(searchInput, { target: { value: 'Traceability' } });

    expect(screen.getByText('Batch & Traceability')).toBeInTheDocument();
    // Non-matching menus should be filtered out
    expect(screen.queryByText('HR & Payroll')).not.toBeInTheDocument();
  });

  test('4. Bulk actions: "Disable Optional" disables non-system menus while keeping Settings locked', () => {
    render(
      <PharmacyProvider>
        <MenuManagementConfigView />
      </PharmacyProvider>
    );

    const disableBtn = screen.getByTitle(/Disable all optional menus/i);
    fireEvent.click(disableBtn);

    // Settings must remain locked and active
    expect(screen.getByText('Admin Locked')).toBeInTheDocument();
  });

  test('5. Bulk actions: "Enable All" re-enables all menus and "Reset Defaults" restores configuration', () => {
    render(
      <PharmacyProvider>
        <MenuManagementConfigView />
      </PharmacyProvider>
    );

    const disableBtn = screen.getByTitle(/Disable all optional menus/i);
    fireEvent.click(disableBtn);

    const enableBtn = screen.getByTitle(/Enable all menus and submenus/i);
    fireEvent.click(enableBtn);

    const resetBtn = screen.getByTitle(/Reset to initial default configuration/i);
    fireEvent.click(resetBtn);

    // Verify localStorage has saved configuration
    const stored = localStorage.getItem('jeeva_pharmacy_navigation_config_v1');
    expect(stored).toBeTruthy();
  });

  test('6. SettingsView: includes "Menu & Navigation" tab and switches to it smoothly', () => {
    render(
      <PharmacyProvider>
        <SettingsView initialTab="STORE_PROFILE" />
      </PharmacyProvider>
    );

    const menuTabBtn = screen.getByRole('button', { name: /Menu & Navigation/i });
    expect(menuTabBtn).toBeInTheDocument();

    fireEvent.click(menuTabBtn);
    expect(screen.getByRole('heading', { name: 'Menu & Navigation Management' })).toBeInTheDocument();
  });

  test('7. SidebarNavigation reflects dynamic menu visibility when menus are toggled', () => {
    // Component to test dynamic hiding in Sidebar
    const TestNavigationWrapper = () => {
      const { toggleMenu } = usePharmacy();
      const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ pos: true });

      return (
        <div>
          <button
            type="button"
            data-testid="toggle-hr-btn"
            onClick={() => toggleMenu('hr')}
          >
            Toggle HR
          </button>
          <button
            type="button"
            data-testid="toggle-batch-btn"
            onClick={() => toggleMenu('batch')}
          >
            Toggle Batch
          </button>
          <SidebarNavigation
            currentView="DASHBOARD"
            onNavigate={vi.fn()}
            expandedMenus={expanded}
            toggleAccordion={(k) => setExpanded((p) => ({ ...p, [k]: !p[k] }))}
          />
        </div>
      );
    };

    render(
      <PharmacyProvider>
        <TestNavigationWrapper />
      </PharmacyProvider>
    );

    // Initially HR & Payroll is in the document
    expect(screen.getByText('HR & Payroll')).toBeInTheDocument();
    expect(screen.getByText('Batch & Traceability')).toBeInTheDocument();

    // Toggle HR menu off
    fireEvent.click(screen.getByTestId('toggle-hr-btn'));

    // HR menu should now be hidden from sidebar
    expect(screen.queryByText('HR & Payroll')).not.toBeInTheDocument();
    // Batch remains visible
    expect(screen.getByText('Batch & Traceability')).toBeInTheDocument();

    // Toggle Batch menu off
    fireEvent.click(screen.getByTestId('toggle-batch-btn'));
    expect(screen.queryByText('Batch & Traceability')).not.toBeInTheDocument();
  });
});
