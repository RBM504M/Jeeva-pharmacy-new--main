import React, { useState } from 'react';
import {
  Truck,
  CheckCircle,
  Building,
  Phone,
  Mail,
  Receipt,
  Barcode,
  FileCheck,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Vendor, Product, Batch, GSTRate, formatINR } from '../../types/pharmacy';

export const VendorManagement: React.FC = () => {
  const { vendors, products, inwardStockBatch, currentUser } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'INWARD'>('DIRECTORY');
  const [showInwardSuccess, setShowInwardSuccess] = useState(false);

  const [inwardForm, setInwardForm] = useState<{
    vendorId: string;
    vendorInvoiceNo: string;
    invoiceDate: string;
    productId: string;
    barcodeInput: string;
    batchNumber: string;
    manufacturingDate: string;
    expiryDate: string;
    quantityStrips: number;
    costPricePerStrip: number;
    mrpPerStrip: number;
    sellingPricePerStrip: number;
    gstRate: GSTRate;
  }>({
    vendorId: vendors[0]?.id || '',
    vendorInvoiceNo: 'INV-2026/8941',
    invoiceDate: new Date().toISOString().split('T')[0],
    productId: products[0]?.id || '',
    barcodeInput: products[0]?.barcode || '',
    batchNumber: 'INW-26F01',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: '2027-08-31',
    quantityStrips: 20,
    costPricePerStrip: 22.0,
    mrpPerStrip: 34.0,
    sellingPricePerStrip: 33.0,
    gstRate: 12,
  });

  const handleProductChange = (prodId: string) => {
    const p = products.find((prod) => prod.id === prodId);
    if (!p) return;
    setInwardForm((prev) => ({
      ...prev,
      productId: prodId,
      barcodeInput: p.barcode,
      gstRate: p.defaultGstRate,
    }));
  };

  const handleInwardBarcodeLookup = (barcode: string) => {
    const p = products.find((prod) => prod.barcode === barcode.trim());
    if (p) {
      setInwardForm((prev) => ({
        ...prev,
        productId: p.id,
        barcodeInput: p.barcode,
        gstRate: p.defaultGstRate,
      }));
    } else {
      alert(`Barcode ${barcode} not found in master catalogue. Please register the medicine first.`);
    }
  };

  const handleProcessInwardStock = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === inwardForm.productId);
    if (!prod) {
      alert('Select a valid medicine');
      return;
    }

    const atomicUnits = inwardForm.quantityStrips * (prod.stripSize || 10);

    const batchData: Omit<Batch, 'id'> = {
      productId: prod.id,
      batchNumber: inwardForm.batchNumber.toUpperCase().trim(),
      barcode: inwardForm.barcodeInput,
      expiryDate: inwardForm.expiryDate,
      manufacturingDate: inwardForm.manufacturingDate,
      costPricePerStrip: Number(inwardForm.costPricePerStrip),
      mrpPerStrip: Number(inwardForm.mrpPerStrip),
      sellingPricePerStrip: Number(inwardForm.sellingPricePerStrip),
      gstRate: inwardForm.gstRate,
      totalTablets: atomicUnits,
      vendorId: inwardForm.vendorId,
    };

    inwardStockBatch(batchData, inwardForm.vendorInvoiceNo);

    setShowInwardSuccess(true);
    setTimeout(() => setShowInwardSuccess(false), 4000);

    setInwardForm((prev) => ({
      ...prev,
      batchNumber: `INW-${Math.floor(1000 + Math.random() * 9000)}`,
      quantityStrips: 10,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-normal text-slate-800">
            Supplier & Purchase Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Supplier / Wholesalers & Inward Stock</p>
        </div>

        <div className="flex p-0.5 bg-slate-100 rounded-md text-xs border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('DIRECTORY')}
            className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'DIRECTORY'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Wholesaler Directory & Ledgers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INWARD')}
            className={`px-3 py-1.5 font-medium rounded transition-colors cursor-pointer ${
              activeTab === 'INWARD'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inward Stock Consignment
          </button>
        </div>
      </div>

      {/* Tab 1: Wholesaler Directory & Dues */}
      {activeTab === 'DIRECTORY' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold text-slate-900">{vendor.companyName}</h3>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {vendor.creditPeriodDays}d Credit
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contact: {vendor.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{vendor.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{vendor.email}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] font-mono space-y-0.5">
                  <div className="text-slate-700">GSTIN: {vendor.gstin}</div>
                  <div className="text-slate-400 text-[10px]">DL: {vendor.drugLicenseNumber}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Outstanding Dues
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 tabular-nums">
                    {formatINR(vendor.balanceDue)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInwardForm((prev) => ({ ...prev, vendorId: vendor.id }));
                    setActiveTab('INWARD');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                >
                  Receive Stock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Inward Stock Consignment Processing */}
      {activeTab === 'INWARD' && (
        <div className="bg-white border border-slate-200/90 rounded-md p-6 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Inward Consignment & Batch Receipt
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan distributor packaging barcode or match existing catalogue items to update batch inventories instantly.
              </p>
            </div>
            <Receipt className="w-5 h-5 text-slate-600" />
          </div>

          {showInwardSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                Fresh shipment batch committed successfully to inventory! Stock updated in real-time.
              </span>
            </div>
          )}

          <form onSubmit={handleProcessInwardStock} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Wholesaler Vendor *
                </label>
                <select
                  value={inwardForm.vendorId}
                  onChange={(e) => setInwardForm({ ...inwardForm, vendorId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Distributor Invoice # *
                </label>
                <input
                  type="text"
                  required
                  value={inwardForm.vendorInvoiceNo}
                  onChange={(e) => setInwardForm({ ...inwardForm, vendorInvoiceNo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={inwardForm.invoiceDate}
                  onChange={(e) => setInwardForm({ ...inwardForm, invoiceDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Target Medicine *
                </label>
                <select
                  value={inwardForm.productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.manufacturer})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 flex justify-between">
                  <span>Product Barcode</span>
                  <span
                    className="text-sky-600 cursor-pointer"
                    onClick={() => handleInwardBarcodeLookup(inwardForm.barcodeInput)}
                  >
                    Lookup
                  </span>
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={inwardForm.barcodeInput}
                    onChange={(e) => setInwardForm({ ...inwardForm, barcodeInput: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded bg-white font-mono"
                    placeholder="Scan EAN-13 barcode..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  required
                  value={inwardForm.batchNumber}
                  onChange={(e) => setInwardForm({ ...inwardForm, batchNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono uppercase font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Mfg Date
                </label>
                <input
                  type="date"
                  value={inwardForm.manufacturingDate}
                  onChange={(e) => setInwardForm({ ...inwardForm, manufacturingDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={inwardForm.expiryDate}
                  onChange={(e) => setInwardForm({ ...inwardForm, expiryDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Received Strips *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inwardForm.quantityStrips}
                  onChange={(e) =>
                    setInwardForm({
                      ...inwardForm,
                      quantityStrips: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Cost / St (₹)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={inwardForm.costPricePerStrip}
                  onChange={(e) =>
                    setInwardForm({
                      ...inwardForm,
                      costPricePerStrip: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  MRP / St (₹)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={inwardForm.mrpPerStrip}
                  onChange={(e) =>
                    setInwardForm({
                      ...inwardForm,
                      mrpPerStrip: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Selling / St (₹)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  value={inwardForm.sellingPricePerStrip}
                  onChange={(e) =>
                    setInwardForm({
                      ...inwardForm,
                      sellingPricePerStrip: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded flex justify-between items-center text-xs border border-slate-200">
              <span className="text-slate-600">
                Consignment Value:{' '}
                <span className="font-mono text-slate-900 font-bold">
                  {formatINR(inwardForm.quantityStrips * inwardForm.costPricePerStrip)}
                </span>{' '}
                ({inwardForm.quantityStrips} Strips)
              </span>
              <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700">
                GST: {inwardForm.gstRate}%
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileCheck className="w-4 h-4" /> Process Inward Consignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
