import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PharmacyProvider } from '../context/PharmacyContext';
import App from '../App';
import { PosBillingView } from '../components/pos/PosBillingView';
import { PurchaseOrderView } from '../components/orders/PurchaseOrderView';

describe('Purchase Order View & New Sales Empty Rows Fixes', () => {
  test('Purchase Order view renders properly without crashing or blank screen', () => {
    render(
      <PharmacyProvider>
        <PurchaseOrderView initialTab="PO_REGISTER" />
      </PharmacyProvider>
    );

    expect(screen.getByText(/Purchase Order Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Purchase Order Register/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ New Purchase Order/i)).toBeInTheDocument();
  });

  test('Sidebar clicking Purchase Order does not trigger a crash or blank screen', () => {
    render(<App />);

    // Find and click "Purchase Order" accordion in sidebar
    const poNavButtons = screen.getAllByRole('button', { name: /Purchase Order/i });
    expect(poNavButtons.length).toBeGreaterThan(0);

    // Click the sidebar button for Purchase Order
    fireEvent.click(poNavButtons[0]);

    // The submenus (e.g. Completed Orders) must render without CheckCircle2 reference error
    expect(screen.getByText(/Completed Orders/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Purchase Orders/i)).toBeInTheDocument();
  });

  test('New Sales bill grid renders only ONE empty row when cart is empty', () => {
    render(
      <PharmacyProvider>
        <PosBillingView />
      </PharmacyProvider>
    );

    // Verify New Sale header
    expect(screen.getByText(/New Sale \/ Bill Entry/i)).toBeInTheDocument();

    // Table rows inside tbody: should only have 1 row (instead of 10 empty rows)
    const tableBody = document.querySelector('tbody');
    expect(tableBody).toBeInTheDocument();
    const rows = tableBody?.querySelectorAll('tr');
    expect(rows?.length).toBe(1);

    // Row #1 should be numbered "1"
    expect(rows?.[0].textContent).toContain('1');
  });

  test('Adding an item to New Sales keeps cart items plus 1 empty input row, and allows deleting items', () => {
    render(
      <PharmacyProvider>
        <PosBillingView />
      </PharmacyProvider>
    );

    // Add quick medicine
    const doloBtn = screen.getByText(/Dolo 650 Tablets/i);
    fireEvent.click(doloBtn);

    // Grid should now have 2 rows: 1 for Dolo 650, 1 empty row for next entry
    const tableBody = document.querySelector('tbody');
    const rows = tableBody?.querySelectorAll('tr');
    expect(rows?.length).toBe(2);

    // "Delete All Items" button appears
    const clearAllBtn = screen.getByRole('button', { name: /Delete All Items/i });
    expect(clearAllBtn).toBeInTheDocument();

    // Click "Delete All Items"
    fireEvent.click(clearAllBtn);

    // Should return back to exactly 1 empty row
    const rowsAfterClear = tableBody?.querySelectorAll('tr');
    expect(rowsAfterClear?.length).toBe(1);
  });
});
