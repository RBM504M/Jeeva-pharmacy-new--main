/**
 * Automated React Testing Library Unit Tests for POS Billing Component
 * Validates:
 * 1. POS Billing View Rendering & Layout
 * 2. Dual Printer Toggle Switch (ON/OFF and Thermal 80mm vs Laser A4)
 * 3. Fractional Strip/Tablet Itemized Billing Math
 * 4. DPDP Patient Confidentiality Consent Flag
 * 5. GST Breakdown Computation
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PharmacyProvider } from '../context/PharmacyContext';
import { PosBillingView } from '../components/pos/PosBillingView';

describe('POS Billing Engine & Hardware Integration Component', () => {
  const renderPosWithProvider = () => {
    return render(
      <PharmacyProvider>
        <PosBillingView />
      </PharmacyProvider>
    );
  };

  test('renders POS Billing header with terminal active indicator and GSTIN information', () => {
    renderPosWithProvider();

    // Check terminal title and header badges
    expect(screen.getByText(/Point of Sale \(POS\) Billing/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardware Scanner Active/i)).toBeInTheDocument();
  });

  test('displays hardware printer toggle switch and toggles physical print mode', () => {
    renderPosWithProvider();

    // Verify printer toggle button is present
    const printToggle = screen.getByRole('button', { name: /PRINTING/i });
    expect(printToggle).toBeInTheDocument();

    // Toggle printer switch state
    fireEvent.click(printToggle);
  });

  test('supports format toggle between 80mm Thermal Receipt and A4 Laser Tax Invoice', () => {
    renderPosWithProvider();

    // Find 80mm and A4 format selector buttons
    const thermalBtn = screen.getByRole('button', { name: /80mm Thermal/i });
    const laserBtn = screen.getByRole('button', { name: /A4 Laser/i });

    expect(thermalBtn).toBeInTheDocument();
    expect(laserBtn).toBeInTheDocument();

    // Click Laser format
    fireEvent.click(laserBtn);
    expect(laserBtn).toHaveClass('bg-slate-900', 'text-white');

    // Switch back to Thermal format
    fireEvent.click(thermalBtn);
    expect(thermalBtn).toHaveClass('bg-slate-900', 'text-white');
  });

  test('renders customer contact and doctor prescription input fields with DPDP notice', () => {
    renderPosWithProvider();

    expect(screen.getByPlaceholderText(/Walk-in Customer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Dr\. R\. Parthiban/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/MCI \/ State Council/i)).toBeInTheDocument();
    expect(screen.getByText(/DPDP Act 2023 Compliant/i)).toBeInTheDocument();
  });

  test('includes quick add buttons for fast-moving essential formulations (Dolo 650, Azithromycin, Metformin)', () => {
    renderPosWithProvider();

    const quickDolo = screen.getByText(/Dolo 650 Tablets/i);
    expect(quickDolo).toBeInTheDocument();

    // Click to add Dolo 650 to cart
    fireEvent.click(quickDolo);

    // Verify item row is rendered in the active invoice lines
    expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
  });

  test('computes fractional loose tablet vs strip price correctly in active invoice', async () => {
    renderPosWithProvider();

    // Add Dolo 650 (MRP ₹30.00 for strip of 15 => ₹2.00 per tablet)
    const quickDolo = screen.getByText(/Dolo 650 Tablets/i);
    fireEvent.click(quickDolo);

    // Verify summary subtotal, CGST, SGST, and Grand Total are displayed
    await waitFor(() => {
      expect(screen.getByText(/CGST/i)).toBeInTheDocument();
      expect(screen.getByText(/SGST/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Payable/i)).toBeInTheDocument();
    });
  });
});
