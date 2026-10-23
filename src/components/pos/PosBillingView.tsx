import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Printer,
  Barcode,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  FileText,
  ShieldCheck,
  Calendar,
  RotateCcw,
  ShoppingCart,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  Product,
  Batch,
  PosCartItem,
  UnitType,
  PaymentMethod,
  PrescriptionDetails,
  GSTRate,
  formatINR,
  formatDualUnitStock,
  calculateItemGst,
  Invoice,
  TaxBreakdownSummary,
} from '../../types/pharmacy';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { PrintTemplates } from '../print/PrintTemplates';
import {
  isPrescriptionQr,
  parsePrescriptionQr,
  SAMPLE_PRESCRIPTION_QRS,
  ParsedDigitalPrescription,
} from '../../utils/prescriptionQrParser';

export const PosBillingView: React.FC = () => {
  const {
    products,
    batches,
    printerSettings,
    updatePrinterSettings,
    currentUser,
    createInvoice,
    findProductByBarcode,
  } = usePharmacy();

  // Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>('STRIP');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // Cart & Line Items
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);

  // Prescription & Patient State (DPDP compliant)
  const [prescription, setPrescription] = useState<PrescriptionDetails>({
    patientName: 'Walk-in Customer',
    patientContact: '',
    patientAge: undefined,
    patientGender: 'MALE',
    doctorName: '',
    doctorRegNumber: '',
    notes: '',
    dpdpConsentAccepted: true,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Pressing '/' focuses search input
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  // Digital Rx QR & Scanner State
  const [scannedRxDetails, setScannedRxDetails] = useState<ParsedDigitalPrescription | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [manualQrInput, setManualQrInput] = useState<string>('');

  // Filtered medicines for quick selector
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.genericComposition.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.hsnCode.includes(q)
    );
  }, [products, searchQuery]);

  // Product Selection helper
  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    const availableBatches = batches.filter((b) => b.productId === product.id && b.totalTablets > 0);
    if (availableBatches.length > 0) {
      setSelectedBatchId(availableBatches[0].id);
    } else {
      setSelectedBatchId('');
    }
  };

  // Add Item to Bill Cart
  const addItemToCart = (
    product: Product,
    batch: Batch,
    unitType: UnitType,
    quantity: number
  ) => {
    if (quantity <= 0) return;

    const stripSize = product.stripSize || 10;
    const tabletsRequested = unitType === 'STRIP' ? quantity * stripSize : quantity;

    if (batch.totalTablets < tabletsRequested) {
      const formatted = formatDualUnitStock(batch.totalTablets, stripSize);
      alert(
        `Insufficient stock for ${product.name} (Batch ${batch.batchNumber}). Only ${formatted.displayString} available.`
      );
      return;
    }

    const unitPrice =
      unitType === 'STRIP'
        ? batch.sellingPricePerStrip
        : Number((batch.sellingPricePerStrip / stripSize).toFixed(2));

    const gstCalc = calculateItemGst(unitPrice, quantity, batch.gstRate, isInterState);

    const newItem: PosCartItem = {
      cartItemId: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product,
      batch,
      unitType,
      quantity,
      totalTabletsSold: tabletsRequested,
      unitPrice,
      gstRate: batch.gstRate,
      ...gstCalc,
    };

    setCartItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    setSelectedProductId('');
    setSelectedBatchId('');
    setQuantityInput(1);
    setCheckoutError(null);
  };

  const removeCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateCartItemUnit = (cartItemId: string, newUnit: UnitType) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const stripSize = item.product.stripSize || 10;
        const unitPrice =
          newUnit === 'STRIP'
            ? item.batch.sellingPricePerStrip
            : Number((item.batch.sellingPricePerStrip / stripSize).toFixed(2));

        const totalTablets = newUnit === 'STRIP' ? item.quantity * stripSize : item.quantity;
        const gstCalc = calculateItemGst(unitPrice, item.quantity, item.batch.gstRate, isInterState);

        return {
          ...item,
          unitType: newUnit,
          unitPrice,
          totalTabletsSold: totalTablets,
          ...gstCalc,
        };
      })
    );
  };

  const updateCartItemQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) return;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const stripSize = item.product.stripSize || 10;
        const totalTablets = item.unitType === 'STRIP' ? newQty * stripSize : newQty;
        const gstCalc = calculateItemGst(item.unitPrice, newQty, item.batch.gstRate, isInterState);

        return {
          ...item,
          quantity: newQty,
          totalTabletsSold: totalTablets,
          ...gstCalc,
        };
      })
    );
  };

  // Hardware Barcode & 2D QR Scanner Listener
  const handleHardwareBarcodeScan = (scannedData: string) => {
    if (!scannedData || !scannedData.trim()) return;

    // 1. Digital Prescription QR Code Recognition (ABDM / e-Prescriptions)
    if (isPrescriptionQr(scannedData)) {
      const parsedRx = parsePrescriptionQr(scannedData);
      if (parsedRx) {
        setPrescription((prev) => ({
          ...prev,
          patientName: parsedRx.patientName || prev.patientName,
          patientContact: parsedRx.patientContact || prev.patientContact,
          patientAge: parsedRx.patientAge ?? prev.patientAge,
          patientGender: parsedRx.patientGender ?? prev.patientGender,
          doctorName: parsedRx.doctorName || prev.doctorName,
          doctorRegNumber: parsedRx.doctorRegNumber || prev.doctorRegNumber,
          notes: parsedRx.notes || parsedRx.diagnosis || prev.notes,
          dpdpConsentAccepted: true,
        }));

        setScannedRxDetails(parsedRx);

        let addedCount = 0;
        const unfulfilledMeds: string[] = [];

        parsedRx.medicines.forEach((med) => {
          let matchedProduct: Product | undefined;
          if (med.barcode) {
            matchedProduct = products.find(
              (p) => p.barcode === med.barcode || p.hsnCode === med.barcode
            );
          }
          const medicineName = med.name || med.drugName || '';
          if (!matchedProduct && medicineName) {
            const medNameLower = medicineName.toLowerCase();
            matchedProduct = products.find(
              (p) =>
                p.name.toLowerCase().includes(medNameLower) ||
                medNameLower.includes(p.name.toLowerCase()) ||
                Boolean(med.genericName && p.genericComposition.toLowerCase().includes(med.genericName.toLowerCase()))
            );
          }

          if (matchedProduct) {
            const availableBatch = batches.find(
              (b) => b.productId === matchedProduct!.id && b.totalTablets >= med.quantity
            ) || batches.find((b) => b.productId === matchedProduct!.id && b.totalTablets > 0);

            if (availableBatch) {
              const unitType = med.unitType || med.unit || 'STRIP';
              addItemToCart(matchedProduct, availableBatch, unitType, med.quantity);
              addedCount++;
            } else {
              unfulfilledMeds.push(matchedProduct.name);
            }
          } else {
            unfulfilledMeds.push(medicineName || 'Unknown Medicine');
          }
        });

        if (unfulfilledMeds.length > 0) {
          setScanNotification(
            `Rx loaded (${addedCount} matched). Out of stock / uncatalogued: ${unfulfilledMeds.join(', ')}`
          );
        } else {
          setScanNotification(`✓ E-Prescription loaded from ${parsedRx.doctorName || 'Doctor'} (${addedCount} items added)`);
        }
        setTimeout(() => setScanNotification(null), 6000);
        return;
      }
    }

    // 2. Standard 1D Barcode Lookup
    const result = findProductByBarcode(scannedData.trim());
    if (result && result.activeBatch) {
      addItemToCart(result.product, result.activeBatch, 'STRIP', 1);
      setScanNotification(
        `Scanned: ${result.product.name} (Batch: ${result.activeBatch.batchNumber})`
      );
      setTimeout(() => setScanNotification(null), 3000);
    } else {
      setScanNotification(`Barcode "${scannedData}" not found in catalogue`);
      setTimeout(() => setScanNotification(null), 3500);
    }
  };

  const { simulateScan } = useBarcodeScanner({
    onScan: handleHardwareBarcodeScan,
    isEnabled: true,
  });

  // Bill Financial Totals & Rounding Off
  const billTotals = useMemo(() => {
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const slabMap: Record<GSTRate, TaxBreakdownSummary> = {
      0: { gstRate: 0, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 },
      5: { gstRate: 5, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 },
      12: { gstRate: 12, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 },
      18: { gstRate: 18, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 },
      28: { gstRate: 28, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 },
    };

    cartItems.forEach((item) => {
      subtotal += item.taxableAmount;
      totalCgst += item.cgstAmount;
      totalSgst += item.sgstAmount;
      totalIgst += item.igstAmount;

      const rate = item.gstRate;
      slabMap[rate].taxableAmount += item.taxableAmount;
      slabMap[rate].cgstAmount += item.cgstAmount;
      slabMap[rate].sgstAmount += item.sgstAmount;
      slabMap[rate].igstAmount += item.igstAmount;
      slabMap[rate].totalTax += item.cgstAmount + item.sgstAmount + item.igstAmount;
    });

    const unroundedGross = cartItems.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const grandTotal = Math.round(unroundedGross);
    const roundOff = Number((grandTotal - unroundedGross).toFixed(2));
    const totalTax = totalCgst + totalSgst + totalIgst;

    const activeSlabs = Object.values(slabMap).filter((s) => s.taxableAmount > 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      grandTotal,
      activeSlabs,
    };
  }, [cartItems]);

  const handleFinalCheckout = () => {
    if (cartItems.length === 0) {
      setCheckoutError('Please add at least one medicine to the bill.');
      return;
    }

    if (!prescription.patientName.trim()) {
      setCheckoutError('Patient Name is mandatory for dispensing.');
      return;
    }

    const hasScheduleH1 = cartItems.some((item) => item.product.drugSchedule === 'SCHEDULE_H1');
    if (hasScheduleH1 && !prescription.doctorRegNumber?.trim()) {
      setCheckoutError(
        'Schedule H1 antibiotic detected (Azithromycin). Doctor Registration Number is legally required under Drugs & Cosmetics Act.'
      );
      return;
    }

    const invoiceNumber = `JP/2026-27/${String(Math.floor(1000 + Math.random() * 9000))}`;
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      invoiceDate: new Date().toISOString(),
      isInterState,
      prescription,
      items: cartItems,
      subtotal: billTotals.subtotal,
      totalCgst: billTotals.totalCgst,
      totalSgst: billTotals.totalSgst,
      totalIgst: billTotals.totalIgst,
      totalTax: billTotals.totalTax,
      roundOff: billTotals.roundOff,
      grandTotal: billTotals.grandTotal,
      paymentMethod,
      status: 'COMPLETED',
      cashierName: currentUser.name,
      taxSlabBreakdowns: billTotals.activeSlabs,
      createdAt: new Date().toISOString(),
    };

    const res = createInvoice(newInvoice);
    if (!res.success) {
      setCheckoutError(res.error || 'Failed to complete checkout');
      return;
    }

    setCompletedInvoice(newInvoice);
    setShowPrintModal(true);

    if (printerSettings.isPrintingEnabled) {
      setTimeout(() => {
        window.print();
      }, 500);
    }

    setCartItems([]);
    setPrescription({
      patientName: 'Walk-in Customer',
      patientContact: '',
      patientAge: undefined,
      patientGender: 'MALE',
      doctorName: '',
      doctorRegNumber: '',
      notes: '',
      dpdpConsentAccepted: true,
    });
    setCheckoutError(null);
  };

  return (
    <div className="space-y-4">
      {/* Test & Terminal Companion Bar */}
      <div className="bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Point of Sale (POS) Billing Terminal</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
            Hardware Scanner Active
          </span>
          <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.2 rounded font-medium">
            Scanner Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-semibold">Fast-Moving:</span>
            <button
              type="button"
              onClick={() => {
                const p = products.find((prod) => prod.name.toLowerCase().includes('paracetamol')) || products[0];
                const b = batches.find((batch) => batch.productId === p?.id && batch.totalTablets > 0) || batches[0];
                if (p && b) addItemToCart(p, b, 'STRIP', 1);
              }}
              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
            >
              Dolo 650 Tablets
            </button>
            <button
              type="button"
              onClick={() => {
                const p = products.find((prod) => prod.name.toLowerCase().includes('azithromycin')) || products[1];
                const b = batches.find((batch) => batch.productId === p?.id && batch.totalTablets > 0) || batches[1];
                if (p && b) addItemToCart(p, b, 'STRIP', 1);
              }}
              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
            >
              Azithromycin 500mg
            </button>
            <button
              type="button"
              onClick={() => {
                const p = products.find((prod) => prod.name.toLowerCase().includes('metformin')) || products[2];
                const b = batches.find((batch) => batch.productId === p?.id && batch.totalTablets > 0) || batches[2];
                if (p && b) addItemToCart(p, b, 'STRIP', 1);
              }}
              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
            >
              Metformin 500mg
            </button>
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded">
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <button
              type="button"
              aria-label="TOGGLE PRINTING"
              onClick={() =>
                updatePrinterSettings({ isPrintingEnabled: !printerSettings.isPrintingEnabled })
              }
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                printerSettings.isPrintingEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              PRINTING: {printerSettings.isPrintingEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => updatePrinterSettings({ preferredFormat: 'THERMAL_80MM' })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                printerSettings.preferredFormat === 'THERMAL_80MM'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              onClick={() => updatePrinterSettings({ preferredFormat: 'LASER_A4' })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer ${
                printerSettings.preferredFormat === 'LASER_A4'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Laser
            </button>
          </div>
        </div>
      </div>

      {/* Screen Header matching Image 1 */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0084ff] text-white flex items-center justify-center shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Sale / Bill Entry</h1>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Home &gt; Sales &gt; <span className="text-slate-600 font-semibold">New Sale</span>
        </div>
      </div>

      {/* Bill Bar matching Image 1: Bill No | Date | Bill Type | Large Total Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Bill No */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700 whitespace-nowrap">Bill No</label>
            <div className="flex items-center">
              <input
                type="text"
                readOnly
                value="SLS-00032"
                className="w-28 px-2.5 py-1.5 border border-slate-300 rounded-l-md font-mono text-slate-800 bg-slate-50 text-xs"
              />
              <button
                type="button"
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 border-y border-r border-slate-300 rounded-r-md text-slate-600 font-bold text-xs"
                title="Browse Invoices"
              >
                ...
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700 whitespace-nowrap">Date</label>
            <div className="relative">
              <input
                type="text"
                defaultValue="22-10-2026"
                className="w-32 px-2.5 py-1.5 border border-slate-300 rounded-md font-medium text-slate-800 text-xs pr-8"
              />
              <Calendar className="w-4 h-4 text-sky-600 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Bill Type */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700 whitespace-nowrap">Bill Type</label>
            <select
              value={paymentMethod === 'CASH' ? 'CASH BILL' : paymentMethod === 'CREDIT_DUE' ? 'CREDIT BILL' : 'CASH BILL'}
              onChange={(e) => {
                if (e.target.value === 'CREDIT BILL') setPaymentMethod('CREDIT_DUE');
                else setPaymentMethod('CASH');
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-md font-medium text-slate-800 text-xs bg-white focus:outline-hidden"
            >
              <option value="CASH BILL">CASH BILL</option>
              <option value="CREDIT BILL">CREDIT BILL</option>
              <option value="CARD">CARD BILL</option>
              <option value="UPI">UPI BILL</option>
            </select>
          </div>
        </div>

        {/* Large Total Cyan Box */}
        <div className="bg-[#e6f4fe] border border-[#b6e0fe] rounded-md px-8 py-2 flex items-center gap-4 shadow-xs">
          <span className="text-sm font-bold text-[#0066cc]">Total :</span>
          <span className="text-2xl font-black text-[#0066cc] font-mono tracking-tight">
            ₹ {billTotals.grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Product Entry Grid (Keep only 1 empty row for input, delete redundant empty rows) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {cartItems.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-semibold text-slate-700">
              Bill Items ({cartItems.length})
            </span>
            <button
              type="button"
              onClick={() => setCartItems([])}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded flex items-center gap-1 font-semibold transition-colors cursor-pointer border border-rose-200"
              title="Delete all items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Items</span>
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-[#e6f4fe] text-[#0066cc] font-bold border-b border-[#b6e0fe]">
              <tr>
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-3 text-left w-36">Product Code</th>
                <th className="py-2.5 px-3 text-left">Product Name</th>
                <th className="py-2.5 px-2 text-center w-20">Quantity</th>
                <th className="py-2.5 px-3 text-center w-32">Batch</th>
                <th className="py-2.5 px-2 text-right w-24">MRP</th>
                <th className="py-2.5 px-2 text-center w-28">Sale Unit</th>
                <th className="py-2.5 px-2 text-right w-24">Discount Amount</th>
                <th className="py-2.5 px-2 text-center w-20">Discount %</th>
                <th className="py-2.5 px-3 text-center w-32">Expiry Date</th>
                <th className="py-2.5 px-2 text-right w-24">Item Cost</th>
                <th className="py-2.5 px-3 text-left w-28">Sub Location</th>
                <th className="py-2.5 px-2 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(cartItems.length === 0 ? [null] : [...cartItems, null]).map((item, idx) => {
                const rowNum = idx + 1;
                return (
                  <tr key={item ? item.cartItemId : `empty_row_${idx}`} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-1.5 px-2 text-center font-semibold text-slate-500">{rowNum}</td>
                    
                    {/* Product Code */}
                    <td className="py-1.5 px-2">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={item ? item.product.hsnCode || item.product.barcode : ''}
                          placeholder=""
                          readOnly
                          className="w-full py-1 pl-2 pr-6 border border-slate-300 rounded text-xs bg-white font-mono"
                        />
                        <Search
                          onClick={() => {
                            if (!item) {
                              const p = products[idx % products.length] || products[0];
                              const b = batches.find((batch) => batch.productId === p.id && batch.totalTablets > 0) || batches[0];
                              if (p && b) addItemToCart(p, b, 'STRIP', 1);
                            }
                          }}
                          className="w-3.5 h-3.5 text-slate-400 hover:text-sky-600 absolute right-1.5 cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Product Name */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={item ? item.product.name : ''}
                        placeholder={!item ? 'Click search icon or scan barcode to add item' : ''}
                        readOnly
                        className="w-full py-1 px-2 border border-slate-300 rounded text-xs bg-white font-medium text-slate-800"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item ? item.quantity : 1}
                        onChange={(e) => {
                          if (item) {
                            updateCartItemQuantity(item.cartItemId, Math.max(1, parseInt(e.target.value) || 1));
                          }
                        }}
                        disabled={!item}
                        className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono font-semibold disabled:bg-slate-50"
                      />
                    </td>

                    {/* Batch */}
                    <td className="py-1.5 px-2 text-center">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={item ? item.batch.batchNumber : ''}
                          readOnly
                          className="w-full py-1 pl-2 pr-6 text-center border border-slate-300 rounded text-xs font-mono"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </td>

                    {/* MRP */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="text"
                        value={item ? item.batch.mrpPerStrip.toFixed(2) : '0.00'}
                        readOnly
                        className="w-full py-1 px-2 text-right border border-slate-300 rounded text-xs font-mono"
                      />
                    </td>

                    {/* Sale Unit */}
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={item ? item.unitType : 'STRIP'}
                        onChange={(e) => {
                          if (item) updateCartItemUnit(item.cartItemId, e.target.value as UnitType);
                        }}
                        disabled={!item}
                        className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-50"
                      >
                        <option value="STRIP">STRIP</option>
                        <option value="TABLET">TABLET</option>
                      </select>
                    </td>

                    {/* Discount Amount */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="text"
                        defaultValue="0.00"
                        disabled={!item}
                        className="w-full py-1 px-2 text-right border border-slate-300 rounded text-xs font-mono disabled:bg-slate-50"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="text"
                        defaultValue="0.00"
                        disabled={!item}
                        className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono disabled:bg-slate-50"
                      />
                    </td>

                    {/* Expiry Date */}
                    <td className="py-1.5 px-2 text-center">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={item ? item.batch.expiryDate : 'dd-mm-yyyy'}
                          readOnly
                          className="w-full py-1 pl-2 pr-6 text-center border border-slate-300 rounded text-xs font-mono text-slate-600"
                        />
                        <Calendar className="w-3.5 h-3.5 text-sky-600 absolute right-1.5 pointer-events-none" />
                      </div>
                    </td>

                    {/* Item Cost */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="text"
                        value={item ? (item.unitPrice * item.quantity).toFixed(2) : '0.00'}
                        readOnly
                        className="w-full py-1 px-2 text-right border border-slate-300 rounded text-xs font-mono font-medium text-slate-800"
                      />
                    </td>

                    {/* Sub Location */}
                    <td className="py-1.5 px-2">
                      <select disabled={!item} className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-50">
                        <option value="RACK-A1">RACK-A1</option>
                        <option value="RACK-B2">RACK-B2</option>
                        <option value="MAIN-SHELF">MAIN-SHELF</option>
                      </select>
                    </td>

                    {/* Action Column */}
                    <td className="py-1.5 px-2 text-center">
                      {item ? (
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.cartItemId)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3 Cards matching Image 1: Customer Details | Contact Details | Bill Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Customer Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] border-b border-slate-100 pb-2">
            <UserCheck className="w-4 h-4 text-[#0066cc]" />
            <span>Customer Details</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Customer */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Customer</label>
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={prescription.patientName}
                  onChange={(e) => setPrescription((prev) => ({ ...prev, patientName: e.target.value }))}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                />
                <button
                  type="button"
                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded font-bold cursor-pointer"
                  title="Add Customer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Doctor</label>
              <div className="flex-1 flex gap-1">
                <input
                  type="text"
                  placeholder="e.g. Dr. R. Parthiban"
                  value={prescription.doctorName}
                  onChange={(e) => setPrescription((prev) => ({ ...prev, doctorName: e.target.value }))}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                />
                <button
                  type="button"
                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded font-bold cursor-pointer"
                  title="Add Doctor"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sales Rep */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Sales Rep</label>
              <div className="flex-1 flex gap-1">
                <select className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white">
                  <option value="">Select Sales Rep (F5)</option>
                  <option value="SR-01">Karthik (SR-01)</option>
                  <option value="SR-02">Sundar (SR-02)</option>
                </select>
                <button
                  type="button"
                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded font-bold cursor-pointer"
                  title="Add Sales Rep"
                >
                  +
                </button>
              </div>
            </div>

            {/* Bill Type */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Bill Type</label>
              <select className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white">
                <option value="CASH BILL">CASH BILL</option>
                <option value="CREDIT BILL">CREDIT BILL</option>
              </select>
            </div>

            {/* Customer Code / MCI Reg */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Customer Code</label>
              <input
                type="text"
                placeholder="MCI / State Council"
                value={prescription.doctorRegNumber}
                onChange={(e) => setPrescription((prev) => ({ ...prev, doctorRegNumber: e.target.value }))}
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
              />
            </div>

            {/* Balance */}
            <div className="flex items-center gap-2">
              <label className="w-24 text-slate-600 font-medium">Balance</label>
              <input
                type="text"
                readOnly
                value="0.00"
                className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs font-mono bg-slate-50 text-right font-semibold"
              />
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="w-3 h-3" /> DPDP Act 2023 Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Contact Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] border-b border-slate-100 pb-2">
            <span className="text-base leading-none">📞</span>
            <span>Contact Details</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Customer Phone</label>
              <input
                type="text"
                value={prescription.patientContact}
                onChange={(e) => setPrescription((prev) => ({ ...prev, patientContact: e.target.value }))}
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Customer Address</label>
              <input
                type="text"
                defaultValue=""
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Customer Address 2</label>
              <input
                type="text"
                defaultValue=""
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Doctor Address</label>
              <input
                type="text"
                defaultValue=""
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Doctor Mobile</label>
              <input
                type="text"
                defaultValue=""
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Bill Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0066cc] border-b border-slate-100 pb-2">
            <FileText className="w-4 h-4 text-[#0066cc]" />
            <span>Bill Summary</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-mono font-medium">{billTotals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Discount</span>
              <span className="font-mono">0.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Other Charge</span>
              <span className="font-mono">0.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Cr / Dr Adj</span>
              <span className="font-mono">0.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Roundoff Value</span>
              <span className="font-mono">{billTotals.roundOff.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Advance</span>
              <span className="font-mono">0.00</span>
            </div>

            {/* GST breakdown line for compliance and unit tests */}
            <div className="py-1 border-t border-dashed border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>CGST: ₹{billTotals.totalCgst.toFixed(2)} | SGST: ₹{billTotals.totalSgst.toFixed(2)}</span>
              <span>Total Payable</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-[#0066cc]">Net Amount (₹)</span>
              <span className="text-xl font-bold font-mono text-[#0066cc]">
                {billTotals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Bottom Action Buttons matching Image 1 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const p = products[cartItems.length % products.length] || products[0];
              const b = batches.find((batch) => batch.productId === p.id && batch.totalTablets > 0) || batches[0];
              if (p && b) addItemToCart(p, b, 'STRIP', 1);
            }}
            className="px-4 py-2 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item (F7)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length > 0) {
                removeCartItem(cartItems[cartItems.length - 1].cartItemId);
              }
            }}
            className="px-4 py-2 bg-[#f43f5e] hover:bg-rose-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Row (F8)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCartItems([]);
              setCheckoutError(null);
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Clear (F9)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-sky-400 text-[#0066cc] rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Preview (F10)</span>
          </button>
          <button
            type="button"
            onClick={handleFinalCheckout}
            className="px-5 py-2 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Bill (F6)</span>
          </button>
        </div>
      </div>

      {/* Invoice Generated & Print Modal */}
      {showPrintModal && completedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between no-print">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Invoice #{completedInvoice.invoiceNumber} Generated
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Total: {formatINR(completedInvoice.grandTotal)} ({completedInvoice.paymentMethod})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-0.5 rounded text-xs">
                  <button
                    type="button"
                    onClick={() => updatePrinterSettings({ preferredFormat: 'THERMAL_80MM' })}
                    className={`px-2 py-1 rounded font-medium ${
                      printerSettings.preferredFormat === 'THERMAL_80MM'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    3" Thermal
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePrinterSettings({ preferredFormat: 'LASER_A4' })}
                    className={`px-2 py-1 rounded font-medium ${
                      printerSettings.preferredFormat === 'LASER_A4'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    A4 Laser
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
              <div className="bg-white p-4 rounded shadow-xs max-w-xl w-full">
                <PrintTemplates invoice={completedInvoice} settings={printerSettings} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Pharmacy E-Prescription QR Reader Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Digital Pharmacy E-Prescription QR Reader
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Recognizes ABDM (Ayushman Bharat Digital Mission), e-Sanjeevani, and hospital e-prescription payloads
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  setManualQrInput('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Hardware Scanner Notice */}
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-md text-sky-900 flex items-start gap-2.5">
                <QrCode className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Hardware 2D Scanner Ready:</strong> Aim your USB or Bluetooth 2D barcode scanner at any physical or phone e-prescription QR code. Keystrokes are captured globally across the terminal.
                </div>
              </div>

              {/* Sample QR Templates */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sample E-Prescriptions (Click to Test)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {SAMPLE_PRESCRIPTION_QRS.map((sample, idx) => (
                    <div
                      key={idx}
                      onClick={() => setManualQrInput(sample.payload)}
                      className="p-3 border border-slate-200 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/50 rounded-md cursor-pointer transition-colors flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 text-[11px] line-clamp-2">
                          {sample.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {sample.doctor}
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] font-semibold text-sky-600 flex items-center justify-between">
                        <span>Load Payload →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Payload Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Scanned / Pasted QR Code Data Payload:
                </label>
                <textarea
                  rows={6}
                  value={manualQrInput}
                  onChange={(e) => setManualQrInput(e.target.value)}
                  placeholder="Paste or type raw QR code JSON payload, e-prescription URI, or scan via 2D hardware barcode scanner..."
                  className="w-full p-2.5 border border-slate-300 rounded font-mono text-[11px] bg-slate-50/50 focus:bg-white focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">
                  Compliant with DPDP Act & Indian Drugs and Cosmetics Act
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQrModal(false);
                      setManualQrInput('');
                    }}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!manualQrInput.trim()}
                    onClick={() => {
                      handleHardwareBarcodeScan(manualQrInput);
                      setShowQrModal(false);
                      setManualQrInput('');
                    }}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Recognize & Load E-Prescription</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
