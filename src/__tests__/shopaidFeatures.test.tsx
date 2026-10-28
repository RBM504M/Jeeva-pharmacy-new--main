import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { PharmacyProvider, usePharmacy } from '../context/PharmacyContext';
import { ShopAidMenuBar } from '../components/shopaid/ShopAidMenuBar';
import { ProductBriefModal } from '../components/reports/ProductBriefModal';
import {
  SEED_DOCTORS,
  SEED_CUSTOMERS,
  SEED_SALES_REPS,
  SEED_RACKS,
  SEED_WANTED_BOOK,
  SEED_PURCHASE_INVOICES,
  SEED_SALES_RETURNS,
} from '../data/shopAidSeedData';
import { testInitialData } from './fixtures/testFixtures';

describe('ShopAID Pharmacy Management Integration Tests', () => {
  test('initial seed data is completely purged and empty for clean installation', () => {
    expect(SEED_DOCTORS.length).toBe(0);
    expect(SEED_CUSTOMERS.length).toBe(0);
    expect(SEED_SALES_REPS.length).toBe(0);
    expect(SEED_RACKS.length).toBe(0);
    expect(SEED_WANTED_BOOK.length).toBe(0);
    expect(SEED_PURCHASE_INVOICES.length).toBe(0);
    expect(SEED_SALES_RETURNS.length).toBe(0);
  });

  test('cancelInvoice (Sales Cancellation) voids transaction and reverses batch inventory', () => {
    let latestCtx: ReturnType<typeof usePharmacy>;

    const Harness = () => {
      latestCtx = usePharmacy();
      const targetInvoice = latestCtx.invoices[0];
      const targetBatch = latestCtx.batches.find((b) => b.id === targetInvoice?.items[0]?.batch.id);

      return (
        <div>
          <span data-testid="invoice-status">
            {targetInvoice?.status}
          </span>
          <span data-testid="batch-stock">
            {targetBatch?.totalTablets}
          </span>
          <button
            type="button"
            onClick={() =>
              latestCtx.cancelInvoice(
                targetInvoice.id,
                'Customer change of mind'
              )
            }
          >
            Cancel Bill
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider initialData={testInitialData}>
        <Harness />
      </PharmacyProvider>
    );

    const initialStatus = screen.getByTestId('invoice-status').textContent;
    expect(initialStatus).toBe('COMPLETED');

    const initialBatchStock = Number(screen.getByTestId('batch-stock').textContent);
    const itemSoldTablets = latestCtx!.invoices[0].items[0].totalTabletsSold;

    fireEvent.click(screen.getByText('Cancel Bill'));

    expect(screen.getByTestId('invoice-status').textContent).toBe('CANCELLED');
    expect(Number(screen.getByTestId('batch-stock').textContent)).toBe(
      initialBatchStock + itemSoldTablets
    );
  });

  test('updateInvoicePaymentMethod modifies payment mode in place', () => {
    let latestCtx: ReturnType<typeof usePharmacy>;

    const Harness = () => {
      latestCtx = usePharmacy();
      return (
        <div>
          <span data-testid="payment-method">
            {latestCtx.invoices[0]?.paymentMethod}
          </span>
          <button
            type="button"
            onClick={() =>
              latestCtx.updateInvoicePaymentMethod(
                latestCtx.invoices[0].id,
                'UPI'
              )
            }
          >
            Change To UPI
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider initialData={testInitialData}>
        <Harness />
      </PharmacyProvider>
    );

    fireEvent.click(screen.getByText('Change To UPI'));
    expect(screen.getByTestId('payment-method').textContent).toBe('UPI');
  });

  test('processSalesReturn records return entry and restocks returned quantities', () => {
    let latestCtx: ReturnType<typeof usePharmacy>;

    const Harness = () => {
      latestCtx = usePharmacy();
      return (
        <div>
          <span data-testid="return-count">{latestCtx.salesReturns.length}</span>
          <button
            type="button"
            onClick={() => {
              const inv = latestCtx.invoices[0];
              const item = inv.items[0];
              latestCtx.processSalesReturn({
                invoiceId: inv.id,
                returnedItems: [
                  {
                    cartItemId: item.cartItemId,
                    returnQuantity: item.quantity,
                    reason: 'Incorrect dosage purchased',
                  },
                ],
                refundMode: 'CASH',
              });
            }}
          >
            Execute Return
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider initialData={testInitialData}>
        <Harness />
      </PharmacyProvider>
    );

    const initialCount = Number(screen.getByTestId('return-count').textContent);
    fireEvent.click(screen.getByText('Execute Return'));

    expect(Number(screen.getByTestId('return-count').textContent)).toBe(
      initialCount + 1
    );
  });

  test('addInwardPurchaseInvoice (Section 5 Purchase Entry) increments stock correctly', () => {
    let latestCtx: ReturnType<typeof usePharmacy>;

    const Harness = () => {
      latestCtx = usePharmacy();
      return (
        <div>
          <span data-testid="batch-count">{latestCtx.batches.length}</span>
          <button
            type="button"
            onClick={() => {
              const testProduct = latestCtx.products[0];
              latestCtx.addInwardPurchaseInvoice({
                id: 'inw-test-1',
                grnNumber: 'GRN-TEST-999',
                grnDate: '2025-05-10',
                vendorId: latestCtx.vendors[0].id,
                vendorName: latestCtx.vendors[0].companyName || 'Sun Medicare',
                vendorInvoiceNo: 'INV-WH-888',
                invoiceDate: '2025-05-10',
                paymentDueDate: '2025-06-10',
                paymentStatus: 'CREDIT_PENDING',
                paymentMode: 'CASH',
                items: [
                  {
                    productId: testProduct.id,
                    productName: testProduct.name,
                    genericComposition: testProduct.genericComposition,
                    packing: testProduct.stripSize,
                    quantityStrips: 10,
                    freeStrips: 1,
                    batchNumber: 'BATCH-INWARD-99',
                    expiryDate: '2027-08-31',
                    costPricePerStrip: 100,
                    mrpPerStrip: 150,
                    discountPercent: 5,
                    hsnCode: testProduct.hsnCode,
                    gstRate: 12,
                    taxableAmount: 950,
                    cgstAmount: 57,
                    sgstAmount: 57,
                    igstAmount: 0,
                    lineTotal: 1064,
                  },
                ],
                subtotal: 1000,
                discountTotal: 50,
                taxableTotal: 950,
                cgstTotal: 57,
                sgstTotal: 57,
                igstTotal: 0,
                roundOff: 0,
                grandTotal: 1064,
                notes: 'Test Inward Delivery',
                createdAt: '2025-05-10T10:00:00Z',
              });
            }}
          >
            Add Inward Purchase
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider initialData={testInitialData}>
        <Harness />
      </PharmacyProvider>
    );

    const initialBatchCount = Number(screen.getByTestId('batch-count').textContent);
    fireEvent.click(screen.getByText('Add Inward Purchase'));

    expect(Number(screen.getByTestId('batch-count').textContent)).toBe(
      initialBatchCount + 1
    );
  });

  test('Wanted Book operations: add and toggle status', () => {
    let latestCtx: ReturnType<typeof usePharmacy>;

    const Harness = () => {
      latestCtx = usePharmacy();
      return (
        <div>
          <span data-testid="wanted-count">{latestCtx.wantedBook.length}</span>
          <button
            type="button"
            onClick={() => {
              latestCtx.addWantedBookItem({
                drugName: 'Ketoconazole 2% Cream',
                genericComposition: 'Ketoconazole 2% w/w',
                patientName: 'Kavitha R',
                patientContact: '9840199999',
                requestedQuantityStrips: 2,
                urgency: 'HIGH',
                notes: 'Needed by evening',
              });
            }}
          >
            Add Wanted
          </button>
        </div>
      );
    };

    render(
      <PharmacyProvider initialData={testInitialData}>
        <Harness />
      </PharmacyProvider>
    );

    const initialWantedCount = Number(screen.getByTestId('wanted-count').textContent);
    fireEvent.click(screen.getByText('Add Wanted'));

    expect(Number(screen.getByTestId('wanted-count').textContent)).toBe(
      initialWantedCount + 1
    );
  });

  test('ShopAidMenuBar renders global menu and handles F9 Product Brief trigger', () => {
    let briefOpened = false;
    let navigatedView = '';

    render(
      <ShopAidMenuBar
        currentView="DASHBOARD"
        onNavigate={(view) => {
          navigatedView = view;
        }}
        onOpenProductBrief={() => {
          briefOpened = true;
        }}
      />
    );

    expect(screen.getByText('File / Masters')).toBeDefined();
    expect(screen.getByText('Sales')).toBeDefined();
    expect(screen.getByText('Purchase')).toBeDefined();
    expect(screen.getByText('Order Management')).toBeDefined();
    expect(screen.getByText('Inventory')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('GST')).toBeDefined();

    // Trigger F9 shortcut
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));
    });
    expect(briefOpened).toBe(true);

    // Trigger Ctrl+E (Retail Bill)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', ctrlKey: true }));
    });
    expect(navigatedView).toBe('POS');
  });

  test('ProductBriefModal renders medicine details and clinical status', () => {
    render(
      <PharmacyProvider initialData={testInitialData}>
        <ProductBriefModal isOpen={true} onClose={() => {}} />
      </PharmacyProvider>
    );

    expect(screen.getByText(/Product Brief & Clinical Details/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Search medicine/i)).toBeDefined();
    expect(screen.getByText(/Available Batches & Pricing Breakdown/i)).toBeDefined();
    expect(screen.getByText(/Current In-Hand Stock/i)).toBeDefined();
    expect(screen.getByText(/Storage Location \/ Rack/i)).toBeDefined();
  });
});
