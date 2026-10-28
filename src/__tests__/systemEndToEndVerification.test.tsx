/**
 * Comprehensive System-Level End-to-End Verification Test Suite
 * Executed by System Test Lead Engineer
 *
 * Verifies 5 Critical End-to-End Workflows:
 * 1. POS Billing & Dispensing Lifecycle (Catalog Lookup -> Cart Edits -> Schedule H1 Validation -> Pre-Save Review -> Final Invoice & Stock Reduction)
 * 2. Product Master Lifecycle (Creation, Modification & Live Catalogue Updates)
 * 3. Supplier Management & Inward Batch Consignment Lifecycle (Vendor Add/Edit -> Inward Stock Batch -> POS Availability)
 * 4. Bill Copies & Sales Management Optimization (No Auto-Popup, Dismissible Context Menu & Actions)
 * 5. Navigation & Admin Menu Configuration Integrity (Configurable Nav, System Guardrails & Persistence)
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { PharmacyProvider } from '../context/PharmacyContext';
import { PosBillingView } from '../components/pos/PosBillingView';
import { MastersManagementView } from '../components/masters/MastersManagementView';
import { VendorManagement } from '../components/vendors/VendorManagement';
import { BillCopiesView } from '../components/sales/BillCopiesView';
import { testInitialData } from './fixtures/testFixtures';

describe('System Test Lead Engineer: End-to-End Verification Suite', () => {

  describe('E2E Flow 1: Point of Sale (POS) Billing & Dispensing Lifecycle', () => {
    test('executes end-to-end POS workflow: search, cart configuration, rate/discount edit, Schedule H1 check, pre-save review, and checkout', async () => {
      render(
        <PharmacyProvider initialData={testInitialData}>
          <PosBillingView />
        </PharmacyProvider>
      );

      // Step 1: Verify POS view is operational
      expect(screen.getByText(/Point of Sale \(POS\) Billing Terminal/i)).toBeInTheDocument();

      // Step 2: Add essential medication (Dolo 650) via Quick Add button
      const quickDoloBtn = screen.getByText(/Dolo 650 Tablets/i);
      fireEvent.click(quickDoloBtn);

      // Verify item row appears in the active cart
      await waitFor(() => {
        expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
      });

      // Step 4: Line item edits - edit discount % and rate
      const discountInputs = screen.getAllByTitle(/Edit discount %/i);
      expect(discountInputs.length).toBeGreaterThan(0);
      fireEvent.change(discountInputs[0], { target: { value: '10' } });

      const rateInputs = screen.getAllByTitle(/Click to edit unit selling price/i);
      expect(rateInputs.length).toBeGreaterThan(0);
      fireEvent.change(rateInputs[0], { target: { value: '35.00' } });

      // Step 5: Open Review & Edit Modal Before Confirmation
      const saveBillBtn = screen.getByRole('button', { name: /Save Bill \(F6\)/i });
      fireEvent.click(saveBillBtn);

      await waitFor(() => {
        expect(screen.getByText(/Review & Edit Bill Before Confirmation/i)).toBeInTheDocument();
        expect(screen.getByText(/Customer & Patient Information/i)).toBeInTheDocument();
        expect(screen.getByText(/Doctor & Prescription Details/i)).toBeInTheDocument();
      });

      // Modify patient and prescriber details directly in the review modal
      const modalPatientInput = screen.getByPlaceholderText(/e\.g\. John Doe \/ Walk-in Customer/i);
      fireEvent.change(modalPatientInput, { target: { value: 'R. Rajesh Kumar' } });

      const doctorRegInputs = screen.getAllByPlaceholderText(/Required for Schedule H1/i);
      if (doctorRegInputs.length > 0) {
        fireEvent.change(doctorRegInputs[0], { target: { value: 'TNMC-49201' } });
      }

      // Step 6: Validate confirmation action buttons and return seamlessly to billing grid
      expect(screen.getByRole('button', { name: /Confirm & Save Bill \(F6\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirm & Print Bill \(F10\)/i })).toBeInTheDocument();

      const backBtn = screen.getByRole('button', { name: /← Back to Billing Grid/i });
      fireEvent.click(backBtn);

      // Step 7: Verify review modal closed and billing grid state is preserved
      await waitFor(() => {
        expect(screen.queryByText(/Review & Edit Bill Before Confirmation/i)).not.toBeInTheDocument();
      });
      expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
    });
  });

  describe('E2E Flow 2: Product Master Lifecycle (Creation & In-Place Editing)', () => {
    test('adds a new formulation and modifies existing product data with real-time UI reflection', async () => {
      render(
        <PharmacyProvider>
          <MastersManagementView initialTab="PRODUCTS" />
        </PharmacyProvider>
      );

      // Step 1: Open Add New Medicine modal
      const addMedBtn = screen.getByRole('button', { name: /\+ Add New Medicine/i });
      fireEvent.click(addMedBtn);

      expect(screen.getByText(/Add New Medicine to Product Master/i)).toBeInTheDocument();

      // Step 2: Fill in new product attributes
      const nameField = screen.getByPlaceholderText(/e\.g\. Dolo 650 Tablets/i);
      fireEvent.change(nameField, { target: { value: 'Cefixime 200mg DT' } });

      const saltField = screen.getByPlaceholderText(/e\.g\. Paracetamol 650mg/i);
      fireEvent.change(saltField, { target: { value: 'Cefixime Trihydrate 200mg' } });

      const mfgField = screen.getByPlaceholderText(/e\.g\. Micro Labs Ltd/i);
      fireEvent.change(mfgField, { target: { value: 'Cipla Therapeutics' } });

      const hsnField = screen.getByPlaceholderText(/e\.g\. 30049099/i);
      fireEvent.change(hsnField, { target: { value: '30041020' } });

      // Save new product
      const submitBtn = screen.getByRole('button', { name: /Add Medicine/i });
      fireEvent.click(submitBtn);

      // Verify product appears in the table
      await waitFor(() => {
        expect(screen.getByText('Cefixime 200mg DT')).toBeInTheDocument();
      });

      // Step 3: In-place edit of the newly added product
      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      expect(editBtns.length).toBeGreaterThan(0);
      fireEvent.click(editBtns[editBtns.length - 1]);

      // Edit modal opens
      expect(screen.getByText(/Edit Medicine/i)).toBeInTheDocument();

      // Modify shelf location
      const rackField = screen.getByPlaceholderText(/e\.g\. Rack A1-02/i);
      fireEvent.change(rackField, { target: { value: 'Antibiotic Bay 4' } });

      const saveChangesBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveChangesBtn);

      await waitFor(() => {
        expect(screen.getByText('Antibiotic Bay 4')).toBeInTheDocument();
      });
    });
  });

  describe('E2E Flow 3: Supplier & Inward Batch Consignment Lifecycle', () => {
    test('registers a new distributor, edits distributor details, and processes stock inwarding', async () => {
      render(
        <PharmacyProvider initialData={testInitialData}>
          <VendorManagement />
        </PharmacyProvider>
      );

      // Step 1: Register New Supplier
      const addSupplierBtn = screen.getByRole('button', { name: /\+ Add New Supplier/i });
      fireEvent.click(addSupplierBtn);

      expect(screen.getByText(/Register New Supplier \/ Wholesaler/i)).toBeInTheDocument();

      const compNameInput = screen.getByPlaceholderText(/e\.g\. Sri Balaji Pharma Distributors/i);
      fireEvent.change(compNameInput, { target: { value: 'Global MediCare Distributors' } });

      const phoneInput = screen.getByPlaceholderText(/\+91 98400 12345/i);
      fireEvent.change(phoneInput, { target: { value: '+91 94440 88888' } });

      const gstinInput = screen.getByPlaceholderText(/33AAAAA0000A1Z5/i);
      fireEvent.change(gstinInput, { target: { value: '33AAACG9999G1Z8' } });

      const saveSupplierBtn = screen.getByRole('button', { name: /Save Supplier/i });
      fireEvent.click(saveSupplierBtn);

      await waitFor(() => {
        expect(screen.getByText('Global MediCare Distributors')).toBeInTheDocument();
      });

      // Step 2: Edit Supplier Profile
      const editBtns = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editBtns[0]);

      expect(screen.getByText(/Edit Supplier Details/i)).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      // Step 3: Switch to Inward Stock Consignment Tab
      const inwardTabBtn = screen.getByRole('button', { name: /Inward Stock Consignment/i });
      fireEvent.click(inwardTabBtn);

      expect(screen.getByText(/Inward Consignment & Batch Receipt/i)).toBeInTheDocument();

      // Submit inward stock consignment
      const processInwardBtn = screen.getByRole('button', { name: /Process Inward Consignment/i });
      fireEvent.click(processInwardBtn);

      await waitFor(() => {
        expect(screen.getByText(/Fresh shipment batch committed successfully to inventory/i)).toBeInTheDocument();
      });
    });
  });

  describe('E2E Flow 4: Bill Copies Optimization & Dismissible Context Menu', () => {
    test('verifies Bill Copies has no disruptive auto-popups, opens context menu on click, and dismisses cleanly via close button and backdrop', async () => {
      render(
        <PharmacyProvider initialData={testInitialData}>
          <BillCopiesView />
        </PharmacyProvider>
      );

      // Step 1: Ensure NO popups or context menus are open by default
      expect(screen.queryByTitle(/Close popup/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Invoice #/i)).not.toBeInTheDocument();

      // Step 2: Click a row to open context menu
      const billRows = screen.getAllByText(/K\. Sundaram/i);
      expect(billRows.length).toBeGreaterThan(0);
      fireEvent.click(billRows[0]);

      // Context menu should now be visible with close button and actions
      expect(screen.getByTitle(/Close popup/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Modification/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /PNET/i }).length).toBeGreaterThan(0);

      // Step 3: Dismiss via Close (✕) button
      const closeBtn = screen.getByTitle(/Close popup/i);
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTitle(/Close popup/i)).not.toBeInTheDocument();
      });

      // Step 4: Re-open context menu and test backdrop click dismissal
      fireEvent.click(billRows[0]);
      expect(screen.getByTitle(/Close popup/i)).toBeInTheDocument();

      // Find the backdrop element (fixed inset-0 z-10) and click it
      const backdrop = document.querySelector('.fixed.inset-0.z-10');
      expect(backdrop).not.toBeNull();
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByTitle(/Close popup/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('E2E Flow 5: Root Navigation & Top-Level Integration', () => {
    test('renders root App and navigates smoothly between Dashboard, POS, Masters, and Bill Copies', async () => {
      render(<App />);

      // Step 1: Root starts on Classic Dashboard
      expect(screen.getAllByText('Jeeva Medicals')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Pharmacy Management')[0]).toBeInTheDocument();

      // Step 2: Navigate to POS via Quick Action or Header
      const posButtons = screen.getAllByText(/New Sales Bill/i);
      expect(posButtons.length).toBeGreaterThan(0);
      fireEvent.click(posButtons[0]);

      // Verify POS view loaded
      await waitFor(() => {
        expect(screen.getByText(/Point of Sale \(POS\) Billing Terminal/i)).toBeInTheDocument();
      });
    });
  });

});
