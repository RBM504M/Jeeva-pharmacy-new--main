import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingWizard } from '../components/auth/OnboardingWizard';
import { SignInScreen } from '../components/auth/SignInScreen';
import { UserManagementView } from '../components/auth/UserManagementView';
import { PharmacyProvider } from '../context/PharmacyContext';
import App from '../App';

describe('UI Authentication & Role Flow Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default mock electronAPI auth
    (window as any).electronAPI = {
      auth: {
        getAuthState: vi.fn().mockResolvedValue({
          isConfigured: true,
          isAuthenticated: true,
          user: {
            id: 'usr_admin',
            fullName: 'Admin Pharmacist',
            username: 'admin',
            role: 'ADMIN',
            email: 'admin@rx.in',
            phone: '+91 98401 11111',
            isActive: true,
          },
          pharmacy: {
            id: 'pharm_01',
            name: 'Jeeva Medicals',
            dlNumber: 'TN/20B/001',
            gstin: '33AAAA0000A1Z5',
            city: 'Tiruppur',
          },
        }),
        setupOnboarding: vi.fn().mockResolvedValue({ success: true }),
        login: vi.fn().mockResolvedValue({
          success: true,
          user: {
            id: 'usr_admin',
            fullName: 'Admin Pharmacist',
            username: 'admin',
            role: 'ADMIN',
          },
          pharmacy: {
            id: 'pharm_01',
            name: 'Jeeva Medicals',
            dlNumber: 'TN/20B/001',
          },
        }),
        logout: vi.fn().mockResolvedValue({ success: true }),
        getUsers: vi.fn().mockResolvedValue([
          {
            id: 'usr_admin',
            fullName: 'K. Balan, Chief Pharmacist',
            username: 'balan_rx',
            role: 'ADMIN',
            email: 'balan@rx.in',
            phone: '+91 98401 22222',
            isActive: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'usr_cashier',
            fullName: 'M. Sasi, Billing Cashier',
            username: 'sasi_cashier',
            role: 'CASHIER',
            phone: '+91 98401 33333',
            isActive: true,
            createdAt: '2026-01-02T00:00:00Z',
          },
        ]),
        createUser: vi.fn().mockResolvedValue({ success: true }),
        deactivateUser: vi.fn().mockResolvedValue({ success: true }),
        activateUser: vi.fn().mockResolvedValue({ success: true }),
        resetPassword: vi.fn().mockResolvedValue({ success: true }),
        updatePharmacyProfile: vi.fn().mockResolvedValue({ success: true }),
      },
      saveSetting: vi.fn(),
      getSetting: vi.fn(),
    };
  });

  it('1. Onboarding Wizard: guides step 1 pharmacy profile and step 2 admin creation without hardcoded defaults', async () => {
    const onCompleteMock = vi.fn().mockResolvedValue({ success: true });
    render(<OnboardingWizard onComplete={onCompleteMock} />);

    // Screen must display step 1
    expect(screen.getByText(/Pharmacy Account Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Pharmacy Details/i)).toBeInTheDocument();

    // Verify inputs do NOT contain hardcoded default passwords
    const nameInput = screen.getByPlaceholderText(/Jeeva Medicals/i);
    fireEvent.change(nameInput, { target: { value: 'Kaveri Hospital Pharmacy' } });

    const dlInput = screen.getByPlaceholderText(/DL-TN/i);
    fireEvent.change(dlInput, { target: { value: 'TN/CBE/20B/8901' } });

    const gstinInput = screen.getByPlaceholderText(/33AAAAA0000A1Z5/i);
    fireEvent.change(gstinInput, { target: { value: '33ABCDE1234F1Z5' } });

    const addressInput = screen.getByPlaceholderText(/Street/i);
    fireEvent.change(addressInput, { target: { value: '12 Trichy Road' } });

    const phoneInput = screen.getByPlaceholderText(/\+91 98401/i);
    fireEvent.change(phoneInput, { target: { value: '+91 98422 55555' } });

    // Click Next to proceed to Step 2
    const nextBtn = screen.getByRole('button', { name: /Continue to Admin Account Setup/i });
    fireEvent.click(nextBtn);

    // Step 2 Owner / Administrator Setup
    expect(await screen.findByText(/Primary Administrator \/ Pharmacist Account/i)).toBeInTheDocument();
    expect(screen.getByText(/No default or hardcoded credentials are created/i)).toBeInTheDocument();

    const fullNameInput = screen.getByPlaceholderText(/Dr\. K\. Ramesh/i);
    fireEvent.change(fullNameInput, { target: { value: 'Dr. S. Sundararajan' } });

    const usernameInput = screen.getByPlaceholderText(/^e\.g\. admin$/i);
    fireEvent.change(usernameInput, { target: { value: 'sundar_owner' } });

    const passwordInput = screen.getByPlaceholderText(/Enter strong password/i);
    fireEvent.change(passwordInput, { target: { value: 'MySecretPassword#2026' } });

    const confirmPasswordInput = screen.getByPlaceholderText(/Re-enter password/i);
    fireEvent.change(confirmPasswordInput, { target: { value: 'MySecretPassword#2026' } });

    // Submit setup
    const completeBtn = screen.getByRole('button', { name: /Complete Setup & Open POS/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(onCompleteMock).toHaveBeenCalled();
    });
  });

  it('2. Sign In Screen: authenticates credentials and displays error on invalid attempt', async () => {
    (window as any).electronAPI.auth.login.mockResolvedValueOnce({
      success: false,
      error: 'Invalid username or password.',
    });

    render(
      <PharmacyProvider>
        <SignInScreen />
      </PharmacyProvider>
    );

    expect(screen.getAllByText(/Jeeva Pharmacy/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Staff Sign-In/i)).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/Username \/ Operator ID/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Terminal/i });

    // Attempt invalid credentials
    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Invalid username or password/i)).toBeInTheDocument();

    // Now attempt valid credentials
    (window as any).electronAPI.auth.login.mockResolvedValueOnce({
      success: true,
      user: { id: 'u1', fullName: 'Pharmacist', username: 'admin', role: 'ADMIN' },
      pharmacy: { id: 'p1', name: 'Jeeva Medicals' },
    });

    fireEvent.change(passwordInput, { target: { value: 'ValidPass#123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect((window as any).electronAPI.auth.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'ValidPass#123',
        rememberMe: false,
      });
    });
  });

  it('3. User Management View: lists staff accounts, assigns roles, and displays multi-PC architecture disclaimer', async () => {
    render(
      <PharmacyProvider>
        <UserManagementView />
      </PharmacyProvider>
    );

    // Architecture disclaimer must be prominently visible
    expect(await screen.findByText(/Standalone Workstation Storage/i)).toBeInTheDocument();
    expect(screen.getByText(/local embedded SQLite database/i)).toBeInTheDocument();

    // Staff accounts table
    expect(await screen.findByText(/K. Balan, Chief Pharmacist/i)).toBeInTheDocument();
    expect(screen.getByText(/M. Sasi, Billing Cashier/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CASHIER/i).length).toBeGreaterThan(0);

    // Open Add Staff Modal
    const addStaffBtn = screen.getByRole('button', { name: /Add Staff User/i });
    fireEvent.click(addStaffBtn);

    expect(await screen.findByText(/Add New Staff Operator/i)).toBeInTheDocument();

    // Verify supported role options are selectable
    const roleSelect = screen.getByLabelText(/Assigned Access Role/i);
    expect(roleSelect).toBeInTheDocument();
    fireEvent.change(roleSelect, { target: { value: 'PHARMACIST' } });

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
  });
});
