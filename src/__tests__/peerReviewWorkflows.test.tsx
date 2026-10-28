import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PharmacyProvider, usePharmacy } from '../context/PharmacyContext';
import { Batch, Product, Invoice, Vendor } from '../types/pharmacy';
import { InwardPurchaseInvoice, MasterDoctor, MasterCustomer, WantedBookItem } from '../types/shopaid';

// Mock electron API
const mockSaveBatch = vi.fn().mockResolvedValue({ success: true });
const mockRecordStockAdjustment = vi.fn().mockResolvedValue({ success: true });
const mockSaveSetting = vi.fn().mockResolvedValue({ success: true });
const mockSaveVendor = vi.fn().mockResolvedValue({ success: true });
const mockCreateInvoice = vi.fn().mockResolvedValue({ success: true });

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).electronAPI = {
    isElectron: true,
    saveBatch: mockSaveBatch,
    recordStockAdjustment: mockRecordStockAdjustment,
    saveSetting: mockSaveSetting,
    saveVendor: mockSaveVendor,
    createInvoice: mockCreateInvoice,
    logDpdp: vi.fn().mockResolvedValue({ success: true }),
    getAllData: vi.fn().mockResolvedValue(null),
    auth: {
      getAuthState: vi.fn().mockResolvedValue({
        isConfigured: true,
        isAuthenticated: true,
        user: { id: 'u1', fullName: 'Pharmacist', username: 'pharm', role: 'ADMIN' },
        pharmacy: { id: 'p1', name: 'Pristine Pharmacy', dlNumber: 'DL-12345', gstin: '33AAAAA0000A1Z5' },
      }),
    },
  };
});

// Test harness component to exercise context methods
const TestWorkflowsComponent: React.FC = () => {
  const {
    batches,
    invoices,
    vendors,
    doctors,
    customers,
    wantedBook,
    recordManualAdjustment,
    recordVendorReturn,
    processSalesReturn,
    addInwardPurchaseInvoice,
    addDoctor,
    addCustomer,
    addVendor,
    addWantedBookItem,
    createInvoice,
  } = usePharmacy();

  return (
    <div>
      <div data-testid="batch-count">{batches.length}</div>
      <div data-testid="invoice-count">{invoices.length}</div>
      <div data-testid="vendor-count">{vendors.length}</div>
      <div data-testid="doctor-count">{doctors.length}</div>
      <div data-testid="customer-count">{customers.length}</div>
      <div data-testid="wb-count">{wantedBook.length}</div>

      <button
        onClick={() => {
          if (batches.length > 0) {
            recordManualAdjustment({
              productId: batches[0].productId,
              batchId: batches[0].id,
              adjustmentType: 'MANUAL_ADJUSTMENT',
              quantityChangeTablets: 10,
              reason: 'Audit physical count match',
            });
          }
        }}
      >
        Trigger Manual Adjustment
      </button>

      <button
        onClick={async () => {
          if (batches.length > 0 && vendors.length > 0) {
            await recordVendorReturn({
              productId: batches[0].productId,
              batchId: batches[0].id,
              vendorId: vendors[0].id,
              returnTablets: 5,
              reason: 'Near expiry distributor return',
            });
          }
        }}
      >
        Trigger Vendor Return
      </button>

      <button
        onClick={() => {
          if (batches.length > 0) {
            const mockInv: Invoice = {
              id: 'inv_test_ret_1',
              invoiceNumber: 'INV-2026-9001',
              invoiceDate: '2026-10-25T10:00:00.000Z',
              prescription: {
                patientName: 'Sita Raman',
                patientContact: '9876543210',
                doctorName: 'Dr. Kumar',
                doctorRegNumber: 'MCI-123',
                dpdpConsentAccepted: true,
              },
              isInterState: false,
              items: [
                {
                  cartItemId: 'item_cart_1',
                  product: {
                    id: batches[0].productId,
                    name: 'Paracetamol 650',
                    genericComposition: 'Paracetamol',
                    manufacturer: 'Apex Pharma',
                    hsnCode: '30049099',
                    barcode: '8901234567890',
                    stripSize: 10,
                    drugSchedule: 'OTC',
                    reorderLevelUnits: 50,
                    defaultGstRate: 12,
                    rackLocation: 'A-1',
                    isActive: true,
                  },
                  batch: batches[0],
                  quantity: 1,
                  unitType: 'STRIP',
                  unitPrice: 100,
                  totalAmount: 100,
                  gstRate: 12,
                  taxableAmount: 89.28,
                  cgstAmount: 5.36,
                  sgstAmount: 5.36,
                  igstAmount: 0,
                  totalTabletsSold: 10,
                },
              ],
              subtotal: 89.28,
              totalCgst: 5.36,
              totalSgst: 5.36,
              totalIgst: 0,
              totalTax: 10.72,
              roundOff: 0,
              grandTotal: 100,
              paymentMethod: 'CASH',
              status: 'COMPLETED',
              cashierName: 'Admin',
              createdAt: '2026-10-25T10:00:00.000Z',
              taxSlabBreakdowns: [],
            };
            createInvoice(mockInv);
          }
        }}
      >
        Create Test Invoice
      </button>

      <button
        onClick={() => {
          if (invoices.length > 0 && invoices[0].items.length > 0) {
            const item = invoices[0].items[0];
            processSalesReturn({
              invoiceId: invoices[0].id,
              returnedItems: [
                {
                  cartItemId: item.cartItemId,
                  returnQuantity: 1,
                  reason: 'Customer unneeded medicine',
                },
              ],
              refundMode: 'CASH',
            });
          }
        }}
      >
        Trigger Sales Return
      </button>

      <button
        onClick={async () => {
          const newGRN: InwardPurchaseInvoice = {
            id: 'grn_test_1',
            grnNumber: 'GRN-2026-0099',
            grnDate: '2026-10-25',
            vendorId: 'v_test_1',
            vendorName: 'Apollo Distributors',
            vendorInvoiceNo: 'AP-9988',
            invoiceDate: '2026-10-25',
            paymentDueDate: '2026-11-25',
            paymentStatus: 'CREDIT_PENDING',
            paymentMode: 'CASH',
            createdAt: '2026-10-25',
            items: [
              {
                productId: 'prod_test_1',
                productName: 'Paracetamol 650mg',
                genericComposition: 'Paracetamol',
                batchNumber: 'BATCH-AP-01',
                expiryDate: '2028-12-31',
                quantityStrips: 10,
                freeStrips: 1,
                packing: 10,
                costPricePerStrip: 20,
                mrpPerStrip: 35,
                discountPercent: 0,
                hsnCode: '3004',
                gstRate: 12,
                taxableAmount: 200,
                cgstAmount: 12,
                sgstAmount: 12,
                igstAmount: 0,
                lineTotal: 224,
              },
            ],
            subtotal: 200,
            discountTotal: 0,
            taxableTotal: 200,
            cgstTotal: 12,
            sgstTotal: 12,
            igstTotal: 0,
            roundOff: 0,
            grandTotal: 224,
          };
          await addInwardPurchaseInvoice(newGRN);
        }}
      >
        Trigger Inward GRN
      </button>

      <button
        onClick={() => {
          addDoctor({
            id: 'doc_101',
            name: 'Dr. R. Sharma, MD',
            regNumber: 'MCI-88992',
            specialty: 'Internal Medicine',
            clinicHospital: 'City Care Hospital',
            phone: '9876543210',
            isActive: true,
          });
          addCustomer({
            id: 'cust_101',
            code: 'CUST-001',
            name: 'Priya Sundaram',
            phone: '9876512345',
            address: '12 Gandhi Road',
            city: 'Chennai',
            creditLimit: 5000,
            currentBalance: 0,
            discountPercent: 0,
            isActive: true,
          });
          addVendor({
            id: 'vend_101',
            companyName: 'MedPlus Wholesale Ltd',
            contactPerson: 'Karthik',
            phone: '9876500000',
            email: 'medplus@wholesale.in',
            gstin: '33AABCM1234F1Z5',
            drugLicenseNumber: 'DL-2024-9988',
            state: 'Tamil Nadu',
            creditPeriodDays: 30,
            balanceDue: 5000,
            isActive: true,
          });
          addWantedBookItem({
            drugName: 'Rare Antibiotic Syrup',
            genericComposition: 'Amoxicillin + Clavulanic Acid',
            requestedQuantityStrips: 2,
            urgency: 'HIGH',
            notes: 'Needed by Monday',
          });
        }}
      >
        Trigger Master Additions
      </button>
    </div>
  );
};

describe('Senior Peer Review End-to-End Persistence Workflows', () => {
  it('calls saveBatch and recordStockAdjustment on manual adjustment', async () => {
    render(
      <PharmacyProvider>
        <TestWorkflowsComponent />
      </PharmacyProvider>
    );

    const adjBtn = screen.getByText('Trigger Manual Adjustment');
    await act(async () => {
      adjBtn.click();
    });

    expect(mockSaveBatch).toHaveBeenCalled();
    expect(mockRecordStockAdjustment).toHaveBeenCalled();
  });

  it('calls saveBatch, recordStockAdjustment, and saveVendor on vendor return', async () => {
    render(
      <PharmacyProvider>
        <TestWorkflowsComponent />
      </PharmacyProvider>
    );

    const retBtn = screen.getByText('Trigger Vendor Return');
    await act(async () => {
      retBtn.click();
    });

    expect(mockSaveBatch).toHaveBeenCalled();
    expect(mockRecordStockAdjustment).toHaveBeenCalled();
    expect(mockSaveVendor).toHaveBeenCalled();
  });

  it('calls saveBatch, recordStockAdjustment, and saveSetting on sales return', async () => {
    render(
      <PharmacyProvider>
        <TestWorkflowsComponent />
      </PharmacyProvider>
    );

    const createInvBtn = screen.getByText('Create Test Invoice');
    await act(async () => {
      createInvBtn.click();
    });

    const salesRetBtn = screen.getByText('Trigger Sales Return');
    await act(async () => {
      salesRetBtn.click();
    });

    expect(mockSaveBatch).toHaveBeenCalled();
    expect(mockRecordStockAdjustment).toHaveBeenCalled();
    expect(mockSaveSetting).toHaveBeenCalledWith('sales_returns', expect.any(Array));
  });

  it('inwards new batch and calls saveBatch and recordStockAdjustment on GRN inward invoice', async () => {
    render(
      <PharmacyProvider>
        <TestWorkflowsComponent />
      </PharmacyProvider>
    );

    const grnBtn = screen.getByText('Trigger Inward GRN');
    await act(async () => {
      grnBtn.click();
    });

    expect(mockSaveBatch).toHaveBeenCalled();
    expect(mockRecordStockAdjustment).toHaveBeenCalled();
    expect(mockSaveSetting).toHaveBeenCalledWith('purchase_invoices', expect.any(Array));
  });

  it('persists newly added doctors, customers, vendors, and wanted book items across SQLite & storage', async () => {
    render(
      <PharmacyProvider>
        <TestWorkflowsComponent />
      </PharmacyProvider>
    );

    const mastersBtn = screen.getByText('Trigger Master Additions');
    await act(async () => {
      mastersBtn.click();
    });

    expect(mockSaveSetting).toHaveBeenCalledWith('doctors', expect.any(Array));
    expect(mockSaveSetting).toHaveBeenCalledWith('customers', expect.any(Array));
    expect(mockSaveSetting).toHaveBeenCalledWith('wanted_book', expect.any(Array));
    expect(mockSaveVendor).toHaveBeenCalledWith(expect.objectContaining({ id: 'vend_101' }));
  });
});
