import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PharmacyProvider } from '../context/PharmacyContext';
import { ClassicDashboardView } from '../components/dashboard/ClassicDashboardView';
import { testInitialData } from './fixtures/testFixtures';

describe('Client UI/UX System Test: Jeeva Medicals Dashboard', () => {
  const mockNavigate = vi.fn();

  const renderDashboard = () => {
    return render(
      <PharmacyProvider initialData={testInitialData}>
        <ClassicDashboardView onNavigateToPOS={mockNavigate} />
      </PharmacyProvider>
    );
  };

  test('renders all 8 KPI metric cards with accurate values and indicators', () => {
    renderDashboard();

    // 1. Today's Sales
    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText(/Last Day: ₹ 7,320/i)).toBeInTheDocument();
    expect(screen.getByText(/↑ 18%/i)).toBeInTheDocument();

    // 2. Today's Purchase
    expect(screen.getByText("Today's Purchase")).toBeInTheDocument();
    expect(screen.getByText("₹ 4,320")).toBeInTheDocument();
    expect(screen.getByText(/Last Day: ₹ 3,850/i)).toBeInTheDocument();
    expect(screen.getByText(/↑ 12%/i)).toBeInTheDocument();

    // 3. Estimated Gross Profit
    expect(screen.getByText("Estimated Gross Profit")).toBeInTheDocument();
    expect(screen.getByText("₹ 4,330")).toBeInTheDocument();
    expect(screen.getByText(/Last Day: ₹ 3,470/i)).toBeInTheDocument();
    expect(screen.getByText(/↑ 25%/i)).toBeInTheDocument();

    // 4. Cash Collection
    expect(screen.getByText("Cash Collection")).toBeInTheDocument();
    expect(screen.getByText(/UPI Collection:/i)).toBeInTheDocument();

    // 5. Stock Value
    expect(screen.getByText("Stock Value")).toBeInTheDocument();

    // 6. Low Stock Items
    expect(screen.getByText("Low Stock Items")).toBeInTheDocument();

    // 7. Near Expiry Items
    expect(screen.getByText("Near Expiry Items")).toBeInTheDocument();

    // 8. Today's Expenses
    expect(screen.getByText("Today's Expenses")).toBeInTheDocument();
    expect(screen.getByText("₹ 1,250")).toBeInTheDocument();
  });

  test('renders all 9 Quick Actions with exact labels and descriptions', () => {
    renderDashboard();

    expect(screen.getByText('New Sales Bill')).toBeInTheDocument();
    expect(screen.getByText('Create a new bill')).toBeInTheDocument();

    expect(screen.getByText('Purchase Entry')).toBeInTheDocument();
    expect(screen.getByText('Add purchase details')).toBeInTheDocument();

    expect(screen.getByText('Add Supplier')).toBeInTheDocument();
    expect(screen.getByText('Manage suppliers')).toBeInTheDocument();

    expect(screen.getByText('Add Patient')).toBeInTheDocument();
    expect(screen.getByText('Register patient')).toBeInTheDocument();

    expect(screen.getByText('Add Doctor')).toBeInTheDocument();
    expect(screen.getByText('Register doctor')).toBeInTheDocument();

    expect(screen.getByText('Prescription Register')).toBeInTheDocument();
    expect(screen.getByText('View & add prescriptions')).toBeInTheDocument();

    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Daily cash & payments')).toBeInTheDocument();

    expect(screen.getByText('Medicine / Stock')).toBeInTheDocument();
    expect(screen.getByText('Manage stock & expiry')).toBeInTheDocument();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('System settings')).toBeInTheDocument();
  });

  test('renders Recent Sales and Near Expiry data tables side-by-side', () => {
    renderDashboard();

    // Recent Sales
    expect(screen.getByText('Recent Sales')).toBeInTheDocument();
    expect(screen.getByText('JP/2026-27/00481')).toBeInTheDocument();
    expect(screen.getByText('K. Sundaram')).toBeInTheDocument();

    // Near Expiry Medicines
    expect(screen.getByText('Near Expiry Medicines')).toBeInTheDocument();
    expect(screen.getByText('Batch No.')).toBeInTheDocument();
    expect(screen.getByText('Days Left')).toBeInTheDocument();
    expect(screen.getByText('DL24K09')).toBeInTheDocument();
  });

  test('renders right-side widget stack with Motto, Quick Links, and System Notifications', () => {
    renderDashboard();

    // Motto banner
    expect(screen.getByText(/Keep your medicines safe and your community healthy/i)).toBeInTheDocument();

    // Quick Links
    expect(screen.getByText('Stock Report')).toBeInTheDocument();
    expect(screen.getByText('Purchase Report')).toBeInTheDocument();
    expect(screen.getByText('Supplier Ledger')).toBeInTheDocument();
    expect(screen.getByText('Patient History')).toBeInTheDocument();
    expect(screen.getByText('Prescription Search')).toBeInTheDocument();

    // Notifications
    expect(screen.getByText('System Notifications')).toBeInTheDocument();
    expect(screen.getByText(/items are low in stock/i)).toBeInTheDocument();
    expect(screen.getByText(/items are near expiry/i)).toBeInTheDocument();
    expect(screen.getByText(/Supplier payment due/i)).toBeInTheDocument();

    // Need Help
    expect(screen.getByText('Need Help?')).toBeInTheDocument();
  });

  test('opens interactive modal dialog when Add Patient quick action is clicked', () => {
    renderDashboard();

    const addPatientBtn = screen.getByText('Add Patient');
    fireEvent.click(addPatientBtn);

    expect(screen.getByText('Register New Patient')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ramesh Kumar/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/98401/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByText('Cancel');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Register New Patient')).not.toBeInTheDocument();
  });

  test('opens interactive modal dialog when Add Doctor quick action is clicked', () => {
    renderDashboard();

    const addDoctorBtn = screen.getByText('Add Doctor');
    fireEvent.click(addDoctorBtn);

    expect(screen.getByText('Register New Doctor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Swaminathan/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/TNMC/i)).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByText('Cancel');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Register New Doctor')).not.toBeInTheDocument();
  });
});
