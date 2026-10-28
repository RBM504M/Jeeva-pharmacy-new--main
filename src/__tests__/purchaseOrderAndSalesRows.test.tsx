import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PharmacyProvider } from '../context/PharmacyContext';
import App from '../App';
import { PosBillingView } from '../components/pos/PosBillingView';
import { PurchaseOrderView } from '../components/orders/PurchaseOrderView';
import { testInitialData } from './fixtures/testFixtures';

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
      <PharmacyProvider initialData={testInitialData}>
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

  test('Searching product name and pressing Enter selects product and adds to cart upon Enter in quantity', () => {
    render(
      <PharmacyProvider initialData={testInitialData}>
        <PosBillingView />
      </PharmacyProvider>
    );

    const nameInput = screen.getByPlaceholderText(/Type medicine name or salt/i);
    fireEvent.change(nameInput, { target: { value: 'Paracetamol' } });
    fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

    // Should focus quantity input and fill in draft product
    const qtyInput = screen.getByRole('spinbutton');
    expect(qtyInput).toHaveValue(1);

    // Pressing Enter in quantity adds to cart
    fireEvent.keyDown(qtyInput, { key: 'Enter', code: 'Enter' });

    // Grid should now have 2 rows: 1 committed cart row + 1 new draft input row
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.querySelectorAll('tr').length).toBe(2);
  });

  test('Searching product code/HSN selects product directly', () => {
    render(
      <PharmacyProvider initialData={testInitialData}>
        <PosBillingView />
      </PharmacyProvider>
    );

    const codeInput = screen.getByPlaceholderText(/Type code \/ HSN/i);
    fireEvent.change(codeInput, { target: { value: '3004' } });
    fireEvent.keyDown(codeInput, { key: 'Enter', code: 'Enter' });

    // Qty input should be active and populated
    const qtyInput = screen.getByRole('spinbutton');
    expect(qtyInput).toHaveValue(1);
  });
});

