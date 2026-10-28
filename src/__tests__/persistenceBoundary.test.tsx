import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PharmacyProvider, usePharmacy } from '../context/PharmacyContext';
import { PosBillingView } from '../components/pos/PosBillingView';

describe('Phase 0: Safe Async Persistence Boundary Tests', () => {
  let mockElectronAPI: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockElectronAPI = {
      isElectron: true,
      createInvoice: vi.fn(),
      cancelInvoice: vi.fn(),
      updateInvoicePaymentMethod: vi.fn(),
      saveBatch: vi.fn().mockResolvedValue({ success: true }),
      saveProduct: vi.fn().mockResolvedValue({ success: true }),
      saveVendor: vi.fn().mockResolvedValue({ success: true }),
      recordStockAdjustment: vi.fn().mockResolvedValue({ success: true }),
      logDpdp: vi.fn().mockResolvedValue({ success: true }),
      saveSetting: vi.fn().mockResolvedValue({ success: true }),
      getAllData: vi.fn().mockResolvedValue({
        products: [
          {
            id: 'p_dolo',
            name: 'Dolo 650 Tablets',
            genericComposition: 'Paracetamol 650mg',
            manufacturer: 'Micro Labs',
            hsnCode: '30049099',
            stripSize: 15,
            drugSchedule: 'OTC',
            reorderLevelUnits: 50,
            defaultGstRate: 12,
            rackLocation: 'A-01',
            isActive: true,
          },
        ],
        batches: [
          {
            id: 'b_dolo_01',
            productId: 'p_dolo',
            batchNumber: 'DL2026',
            expiryDate: '2028-12-31',
            manufacturingDate: '2025-01-01',
            costPricePerStrip: 25,
            mrpPerStrip: 35,
            sellingPricePerStrip: 30,
            gstRate: 12,
            totalTablets: 150,
            vendorId: 'v1',
          },
        ],
        invoices: [
          {
            id: 'inv_existing_01',
            invoiceNumber: 'JP/2026-27/0001',
            invoiceDate: '2026-10-01T10:00:00.000Z',
            isInterState: false,
            prescription: {
              patientName: 'Existing Patient',
              patientContact: '9876543210',
              doctorName: 'Dr. Test',
              dpdpConsentAccepted: true,
            },
            items: [
              {
                id: 'item_01',
                product: {
                  id: 'p_dolo',
                  name: 'Dolo 650 Tablets',
                  genericComposition: 'Paracetamol 650mg',
                  stripSize: 15,
                  drugSchedule: 'OTC',
                  defaultGstRate: 12,
                },
                batch: {
                  id: 'b_dolo_01',
                  batchNumber: 'DL2026',
                  expiryDate: '2028-12-31',
                  totalTablets: 150,
                  costPricePerStrip: 25,
                  mrpPerStrip: 35,
                  sellingPricePerStrip: 30,
                },
                unitType: 'STRIP',
                quantity: 1,
                totalTabletsSold: 15,
                unitPrice: 30,
                discountPercent: 0,
                discountAmount: 0,
                netPrice: 30,
                taxRate: 12,
                cgstAmount: 1.8,
                sgstAmount: 1.8,
                igstAmount: 0,
                totalTax: 3.6,
                totalAmount: 30,
              },
            ],
            subtotal: 26.79,
            totalCgst: 1.61,
            totalSgst: 1.61,
            totalIgst: 0,
            totalTax: 3.22,
            roundOff: -0.01,
            grandTotal: 30,
            paymentMethod: 'CASH',
            status: 'COMPLETED',
            cashierName: 'Admin',
            createdAt: '2026-10-01T10:00:00.000Z',
          },
        ],
        vendors: [],
        stockAuditLogs: [],
        dpdpLogs: [],
        backupSnapshots: [],
        settings: {},
      }),
      auth: {
        getAuthState: vi.fn().mockResolvedValue({
          isConfigured: true,
          isAuthenticated: true,
          user: { id: 'u1', fullName: 'Pharmacist Admin', username: 'admin', role: 'ADMIN' },
          pharmacy: { id: 'p1', name: 'Jeeva Test Pharmacy', dlNumber: 'DL-TEST-01', gstin: '33AAAAA0000A1Z5' },
        }),
      },
    };

    (window as any).electronAPI = mockElectronAPI;
  });

  test('POS checkout fails safely on SQLite IPC failure: retains cart, displays error, does not print, and does not record invoice', async () => {
    // Simulate SQLite I/O failure or database lock
    mockElectronAPI.createInvoice.mockResolvedValueOnce({
      success: false,
      error: 'Disk write I/O failure: SQLite database is locked',
    });

    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    let ctx: ReturnType<typeof usePharmacy>;
    const ContextInspector = () => {
      ctx = usePharmacy();
      return null;
    };

    render(
      <PharmacyProvider>
        <ContextInspector />
        <PosBillingView />
      </PharmacyProvider>
    );

    // Initial invoice count
    await waitFor(() => {
      expect(ctx?.batches.length).toBeGreaterThan(0);
    });
    const initialInvoiceCount = ctx!.invoices.length;

    // 1. Add item to cart via quick-add button
    const quickDoloBtn = screen.getByText(/Dolo 650 Tablets/i);
    fireEvent.click(quickDoloBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
    });

    // 2. Open Save Bill review modal
    const saveBillBtn = screen.getByRole('button', { name: /Save Bill \(F6\)/i });
    fireEvent.click(saveBillBtn);

    await waitFor(() => {
      expect(screen.getByText(/Review & Edit Bill Before Confirmation/i)).toBeInTheDocument();
    });

    // Set valid patient name
    const modalPatientInput = screen.getByPlaceholderText(/e\.g\. John Doe \/ Walk-in Customer/i);
    fireEvent.change(modalPatientInput, { target: { value: 'Test Patient Kumar' } });

    // 3. Click Confirm & Save Bill (F6)
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save Bill \(F6\)/i });
    fireEvent.click(confirmBtn);

    // 4. Verify checkout failure behavior
    await waitFor(() => {
      expect(mockElectronAPI.createInvoice).toHaveBeenCalled();
    });
    expect(screen.getAllByText(/Disk write I/i).length).toBeGreaterThanOrEqual(1);

    // Verified:
    // a) IPC was called
    expect(mockElectronAPI.createInvoice).toHaveBeenCalledTimes(1);

    // b) Cart items remain in the cart (user can retry, no cart wipe)
    expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);

    // c) Print was NOT called
    expect(printSpy).not.toHaveBeenCalled();

    // d) Completed invoice modal is NOT shown
    expect(screen.queryByText(/Tax Invoice \/ Bill of Supply/i)).not.toBeInTheDocument();

    // e) Database/context state was NOT modified
    expect(ctx!.invoices.length).toBe(initialInvoiceCount);

    // 5. Test retry: if IPC succeeds on retry, checkout completes cleanly
    mockElectronAPI.createInvoice.mockResolvedValueOnce({
      success: true,
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(ctx!.invoices.length).toBe(initialInvoiceCount + 1);
    });

    printSpy.mockRestore();
  });

  test('POS checkout handles rejected IPC promise gracefully without unhandled crash', async () => {
    // Simulate IPC handler throwing or rejecting
    mockElectronAPI.createInvoice.mockRejectedValueOnce(
      new Error('IPC channel communication lost')
    );

    let ctx: ReturnType<typeof usePharmacy>;
    const ContextInspector = () => {
      ctx = usePharmacy();
      return null;
    };

    render(
      <PharmacyProvider>
        <ContextInspector />
        <PosBillingView />
      </PharmacyProvider>
    );

    await waitFor(() => {
      expect(ctx?.batches.length).toBeGreaterThan(0);
    });

    // Add item to cart
    const quickDoloBtn = screen.getByText(/Dolo 650 Tablets/i);
    fireEvent.click(quickDoloBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
    });

    // Open review modal
    const saveBillBtn = screen.getByRole('button', { name: /Save Bill \(F6\)/i });
    fireEvent.click(saveBillBtn);

    await waitFor(() => {
      expect(screen.getByText(/Review & Edit Bill Before Confirmation/i)).toBeInTheDocument();
    });

    const modalPatientInput = screen.getByPlaceholderText(/e\.g\. John Doe \/ Walk-in Customer/i);
    fireEvent.change(modalPatientInput, { target: { value: 'Test Patient' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Save Bill \(F6\)/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockElectronAPI.createInvoice).toHaveBeenCalled();
    });

    // Error message must be rendered and no unhandled crash
    expect(screen.getAllByText(/IPC channel communication lost/i).length).toBeGreaterThanOrEqual(1);

    // Cart is preserved
    expect(screen.getAllByText(/Dolo 650 Tablets/i).length).toBeGreaterThan(0);
  });

  test('cancelInvoice fails safely when database IPC rejects: status remains active and stock is not reversed', async () => {
    mockElectronAPI.cancelInvoice.mockResolvedValueOnce({
      success: false,
      error: 'Foreign key constraint violation during rollback audit',
    });

    let ctx: ReturnType<typeof usePharmacy>;
    const Harness = () => {
      ctx = usePharmacy();
      return (
        <div>
          <span data-testid="inv-status">{ctx.invoices[0]?.status}</span>
          <button
            type="button"
            onClick={async () => {
              await ctx.cancelInvoice(ctx.invoices[0].id, 'Defective packing returned');
            }}
          >
            Trigger Cancel
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider>
        <Harness />
      </PharmacyProvider>
    );

    await waitFor(() => {
      expect(ctx).toBeDefined();
    });

    const targetInvoice = ctx!.invoices[0];
    const targetBatch = ctx!.batches.find((b) => b.id === targetInvoice.items[0]?.batch.id);
    const initialStock = targetBatch?.totalTablets || 0;

    fireEvent.click(screen.getByText('Trigger Cancel'));

    await waitFor(() => {
      expect(mockElectronAPI.cancelInvoice).toHaveBeenCalledTimes(1);
    });

    // Status MUST NOT be CANCELLED because SQLite rejected
    expect(screen.getByTestId('inv-status').textContent).not.toBe('CANCELLED');

    // Batch stock MUST NOT be incremented
    const postBatch = ctx!.batches.find((b) => b.id === targetBatch?.id);
    expect(postBatch?.totalTablets).toBe(initialStock);
  });

  test('updateInvoicePaymentMethod fails safely when database IPC fails: payment method is not updated in UI', async () => {
    mockElectronAPI.updateInvoicePaymentMethod.mockResolvedValueOnce({
      success: false,
      error: 'Permission denied: only ADMIN can modify payment method',
    });

    let ctx: ReturnType<typeof usePharmacy>;
    const Harness = () => {
      ctx = usePharmacy();
      return (
        <div>
          <span data-testid="inv-pm">{ctx.invoices[0]?.paymentMethod}</span>
          <button
            type="button"
            onClick={async () => {
              await ctx.updateInvoicePaymentMethod(ctx.invoices[0].id, 'UPI');
            }}
          >
            Change Mode
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider>
        <Harness />
      </PharmacyProvider>
    );

    await waitFor(() => {
      expect(ctx).toBeDefined();
    });

    const initialMethod = ctx!.invoices[0]?.paymentMethod;

    fireEvent.click(screen.getByText('Change Mode'));

    await waitFor(() => {
      expect(mockElectronAPI.updateInvoicePaymentMethod).toHaveBeenCalledTimes(1);
    });

    // Payment method MUST NOT change to UPI when SQLite rejects
    expect(screen.getByTestId('inv-pm').textContent).toBe(initialMethod);
  });
});
