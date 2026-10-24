import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PharmacyProvider } from '../context/PharmacyContext';
import { MastersManagementView } from '../components/masters/MastersManagementView';
import { VendorManagement } from '../components/vendors/VendorManagement';
import { PosBillingView } from '../components/pos/PosBillingView';
import { BillCopiesView } from '../components/sales/BillCopiesView';

describe('User Requested Feature Enhancements', () => {
  test('1. Supplier Management: allows adding a new supplier and editing existing suppliers', async () => {
    render(
      <PharmacyProvider>
        <VendorManagement />
      </PharmacyProvider>
    );

    // Verify "+ Add New Supplier" button exists
    const addSupplierBtn = screen.getByRole('button', { name: /\+ Add New Supplier/i });
    expect(addSupplierBtn).toBeInTheDocument();

    // Click Add New Supplier
    fireEvent.click(addSupplierBtn);

    // Modal should appear
    expect(screen.getByText(/Register New Supplier \/ Wholesaler/i)).toBeInTheDocument();

    // Fill in supplier name and phone
    const nameInput = screen.getByPlaceholderText(/e\.g\. Sri Balaji Pharma Distributors/i);
    fireEvent.change(nameInput, { target: { value: 'Test New Global Pharma' } });

    const phoneInput = screen.getByPlaceholderText(/\+91 98400 12345/i);
    fireEvent.change(phoneInput, { target: { value: '+91 98400 99999' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Supplier/i });
    fireEvent.click(saveBtn);

    // Verify supplier appears in directory
    await waitFor(() => {
      expect(screen.getByText('Test New Global Pharma')).toBeInTheDocument();
    });

    // Find and click Edit button on a vendor card
    const editBtns = screen.getAllByRole('button', { name: /Edit/i });
    expect(editBtns.length).toBeGreaterThan(0);
    fireEvent.click(editBtns[0]);

    // Edit modal should open
    expect(screen.getByText(/Edit Supplier Details/i)).toBeInTheDocument();
  });

  test('2. Product Master: allows editing existing product data', async () => {
    render(
      <PharmacyProvider>
        <MastersManagementView initialTab="PRODUCTS" />
      </PharmacyProvider>
    );

    // Under Products tab, verify Edit buttons exist for products
    const editProductBtns = screen.getAllByRole('button', { name: /Edit/i });
    expect(editProductBtns.length).toBeGreaterThan(0);

    // Click Edit on the first product
    fireEvent.click(editProductBtns[0]);

    // Edit modal opens with pre-filled product details
    expect(screen.getByText(/Edit Medicine/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Paracetamol Tablets IP 650mg/i)).toBeInTheDocument();

    // Cancel or close modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Edit Medicine —/i)).not.toBeInTheDocument();
    });
  });

  test('3. POS Billing View: allows editing line item fields and reviewing before save/print', async () => {
    render(
      <PharmacyProvider>
        <PosBillingView />
      </PharmacyProvider>
    );

    // Add a fast-moving item to cart (Dolo 650)
    const quickDolo = screen.getByText(/Dolo 650 Tablets/i);
    fireEvent.click(quickDolo);

    // Verify Review & Edit (F4) button exists
    const reviewBtn = screen.getByRole('button', { name: /Review & Edit \(F4\)/i });
    expect(reviewBtn).toBeInTheDocument();

    // Click Review & Edit
    fireEvent.click(reviewBtn);

    // Review Modal should open with all fields editable
    expect(screen.getByText(/Review & Edit Bill Before Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer & Patient Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Doctor & Prescription Details/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Save Bill \(F6\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Print Bill \(F10\)/i })).toBeInTheDocument();

    // Close review modal
    const backBtn = screen.getByRole('button', { name: /← Back to Billing Grid/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Review & Edit Bill Before Confirmation/i)).not.toBeInTheDocument();
    });
  });

  test('4. Bill Copies: context menu does not auto-open and provides a close button', async () => {
    render(
      <PharmacyProvider>
        <BillCopiesView />
      </PharmacyProvider>
    );

    // On initial load, floating popup/context menu is closed
    expect(screen.queryByTitle(/Close popup/i)).not.toBeInTheDocument();

    // Find bill rows and click first data row to open context menu
    const billCells = screen.getAllByText(/K\. Sundaram/i);
    expect(billCells.length).toBeGreaterThan(0);
    fireEvent.click(billCells[0]);

    // Context menu opens with action buttons and close button
    expect(screen.getByTitle(/Close popup/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Bill View/i }).length).toBeGreaterThan(0);

    // Click close button
    const closePopupBtn = screen.getByTitle(/Close popup/i);
    fireEvent.click(closePopupBtn);

    await waitFor(() => {
      expect(screen.queryByTitle(/Close popup/i)).not.toBeInTheDocument();
    });
  });
});
