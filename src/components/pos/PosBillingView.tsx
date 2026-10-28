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
  X,
  Package,
  Edit3,
  Check,
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
  ParsedDigitalPrescription,
} from '../../utils/prescriptionQrParser';

export const PosBillingView: React.FC = () => {
  const {
    products,
    batches,
    invoices,
    printerSettings,
    updatePrinterSettings,
    currentUser,
    createInvoice,
    findProductByBarcode,
  } = usePharmacy();

  // Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [isTopSearchOpen, setIsTopSearchOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType>('STRIP');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // Inline Draft Row State (for adding item directly by typing code or name in the grid row)
  const [draftCode, setDraftCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftProduct, setDraftProduct] = useState<Product | null>(null);
  const [draftBatch, setDraftBatch] = useState<Batch | null>(null);
  const [draftQty, setDraftQty] = useState<number>(1);
  const [draftUnit, setDraftUnit] = useState<UnitType>('STRIP');
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);

  // Product Lookup Modal State (F2 or search icon)
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [lookupSearchQuery, setLookupSearchQuery] = useState('');

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
    dpdpConsentAccepted: false,
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Additional Customer, Doctor & Review State for Pre-Save/Print Editing
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAddress2, setCustomerAddress2] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [doctorMobile, setDoctorMobile] = useState('');
  const [salesRep, setSalesRep] = useState('SR-01');
  const [billType, setBillType] = useState('CASH BILL');
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [preConfirmAction, setPreConfirmAction] = useState<'SAVE' | 'PRINT'>('SAVE');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const draftCodeInputRef = useRef<HTMLInputElement>(null);
  const draftNameInputRef = useRef<HTMLInputElement>(null);
  const draftQtyInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Pressing 'F2' toggles Product Catalog Lookup; '/' focuses top search input
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsLookupModalOpen((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setPreConfirmAction('SAVE');
          setShowReviewModal(true);
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setPreConfirmAction('SAVE');
          setShowReviewModal(true);
        } else {
          setCheckoutError('Please add at least one medicine to the bill.');
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setPreConfirmAction('PRINT');
          setShowReviewModal(true);
        } else {
          setCheckoutError('Please add at least one medicine to the bill.');
        }
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
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

  // Inline Code Autocomplete Matches (search barcode, HSN, ID, or product name)
  const codeMatches = useMemo(() => {
    if (!draftCode.trim()) return [];
    const q = draftCode.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.barcode.toLowerCase().includes(q) ||
          p.hsnCode.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, draftCode]);

  // Inline Name Autocomplete Matches (search name, salt, barcode, or HSN)
  const nameMatches = useMemo(() => {
    if (!draftName.trim()) return [];
    const q = draftName.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.genericComposition.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.hsnCode.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, draftName]);

  // Select a product for the inline draft row
  const selectDraftProduct = (prod: Product, preferredBatch?: Batch) => {
    setDraftProduct(prod);
    setDraftCode(prod.hsnCode || prod.barcode || prod.id);
    setDraftName(prod.name);
    setShowCodeDropdown(false);
    setShowNameDropdown(false);

    // Pick earliest non-expired batch with available stock
    const isNonExpired = (b: Batch) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const exp = new Date(b.expiryDate);
      exp.setHours(0, 0, 0, 0);
      return exp.getTime() >= now.getTime();
    };

    const prodBatches = batches
      .filter((b) => b.productId === prod.id && b.totalTablets > 0 && isNonExpired(b))
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const chosenBatch =
      (preferredBatch && isNonExpired(preferredBatch) ? preferredBatch : null) ||
      prodBatches[0] ||
      batches.find((b) => b.productId === prod.id && isNonExpired(b)) ||
      null;
    setDraftBatch(chosenBatch);
    setDraftQty(1);

    setTimeout(() => {
      draftQtyInputRef.current?.focus();
      draftQtyInputRef.current?.select();
    }, 50);
  };

  // Product Selection helper (for modal and top search)
  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const availableBatches = batches.filter(
      (b) => b.productId === product.id && b.totalTablets > 0 && new Date(b.expiryDate).getTime() >= now.getTime()
    );
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

    // Guard against dispensing expired medications
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expDate = new Date(batch.expiryDate);
    expDate.setHours(0, 0, 0, 0);
    if (expDate.getTime() < now.getTime()) {
      alert(
        `Cannot dispense expired batch ${batch.batchNumber} (Expired on: ${batch.expiryDate}). Please quarantine this batch.`
      );
      return;
    }

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
    setLiveAnnouncement(`Added ${product.name} to bill. Quantity: ${quantity} ${unitType}.`);
    setSearchQuery('');
    setSelectedProductId('');
    setSelectedBatchId('');
    setQuantityInput(1);
    setCheckoutError(null);
  };

  // Add the prepared inline draft item to the cart
  const handleAddDraftToCart = () => {
    if (!draftProduct) {
      alert('Please search and select a medicine product first.');
      return;
    }
    if (!draftBatch) {
      alert(`No batch available for ${draftProduct.name}. Please inward stock first.`);
      return;
    }
    if (draftQty <= 0) {
      alert('Quantity must be at least 1.');
      return;
    }
    addItemToCart(draftProduct, draftBatch, draftUnit, draftQty);

    // Reset draft row for next entry
    setDraftProduct(null);
    setDraftBatch(null);
    setDraftCode('');
    setDraftName('');
    setDraftQty(1);
    setDraftUnit('STRIP');
    setShowCodeDropdown(false);
    setShowNameDropdown(false);

    // Auto-focus name field for subsequent fast entry
    setTimeout(() => {
      draftNameInputRef.current?.focus();
    }, 50);
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
        const discPercent = item.discountPercent || 0;
        const effectiveRate = Number((unitPrice * (1 - discPercent / 100)).toFixed(2));
        const gstCalc = calculateItemGst(effectiveRate, item.quantity, item.batch.gstRate, isInterState);

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

  const updateCartItemBatch = (cartItemId: string, newBatchId: string) => {
    const candidateBatch = batches.find((b) => b.id === newBatchId);
    if (!candidateBatch) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expDate = new Date(candidateBatch.expiryDate);
    expDate.setHours(0, 0, 0, 0);
    if (expDate.getTime() < now.getTime()) {
      alert(`Cannot switch to expired batch ${candidateBatch.batchNumber} (Expired on: ${candidateBatch.expiryDate}).`);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const newBatch = candidateBatch;
        const stripSize = item.product.stripSize || 10;
        const unitPrice =
          item.unitType === 'STRIP'
            ? newBatch.sellingPricePerStrip
            : Number((newBatch.sellingPricePerStrip / stripSize).toFixed(2));
        const discPercent = item.discountPercent || 0;
        const effectiveRate = Number((unitPrice * (1 - discPercent / 100)).toFixed(2));
        const gstCalc = calculateItemGst(effectiveRate, item.quantity, newBatch.gstRate, isInterState);
        return {
          ...item,
          batch: newBatch,
          unitPrice,
          gstRate: newBatch.gstRate,
          ...gstCalc,
        };
      })
    );
  };

  const updateCartItemPrice = (cartItemId: string, newPrice: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const validPrice = Math.max(0, newPrice);
        const discPercent = item.discountPercent || 0;
        const effectiveRate = Number((validPrice * (1 - discPercent / 100)).toFixed(2));
        const gstCalc = calculateItemGst(effectiveRate, item.quantity, item.batch.gstRate, isInterState);
        return {
          ...item,
          unitPrice: validPrice,
          ...gstCalc,
        };
      })
    );
  };

  const updateCartItemDiscount = (cartItemId: string, discPercent: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        const validDisc = Math.min(100, Math.max(0, discPercent));
        const effectiveRate = Number((item.unitPrice * (1 - validDisc / 100)).toFixed(2));
        const gstCalc = calculateItemGst(effectiveRate, item.quantity, item.batch.gstRate, isInterState);
        return {
          ...item,
          discountPercent: validDisc,
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
        const discPercent = item.discountPercent || 0;
        const effectiveRate = Number((item.unitPrice * (1 - discPercent / 100)).toFixed(2));
        const gstCalc = calculateItemGst(effectiveRate, newQty, item.batch.gstRate, isInterState);

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
          dpdpConsentAccepted: false,
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
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const validBatches = batches.filter(
              (b) => b.productId === matchedProduct!.id && b.totalTablets > 0 && new Date(b.expiryDate).getTime() >= now.getTime()
            );
            const availableBatch =
              validBatches.find((b) => b.totalTablets >= med.quantity) || validBatches[0];

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
          setScanNotification(
            parsedRx.untrustedPayload
              ? `[UNVERIFIED QR] Loaded ${addedCount} items. Pharmacist verification & patient consent required.`
              : `✓ Prescription loaded (${addedCount} items added)`
          );
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

    let totalDiscount = 0;
    cartItems.forEach((item) => {
      subtotal += item.taxableAmount;
      const itemDiscAmount = ((item.unitPrice * (item.discountPercent || 0) / 100) * item.quantity);
      totalDiscount += itemDiscAmount;
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

    const activeSlabs = Object.values(slabMap)
      .filter((s) => s.taxableAmount > 0)
      .map((s) => ({
        gstRate: s.gstRate,
        taxableAmount: Number(s.taxableAmount.toFixed(2)),
        cgstAmount: Number(s.cgstAmount.toFixed(2)),
        sgstAmount: Number(s.sgstAmount.toFixed(2)),
        igstAmount: Number(s.igstAmount.toFixed(2)),
        totalTax: Number(s.totalTax.toFixed(2)),
      }));

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalIgst: Number(totalIgst.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      grandTotal,
      activeSlabs,
    };
  }, [cartItems]);

  const handleFinalCheckout = async (autoPrint: boolean = false) => {
    if (cartItems.length === 0) {
      setCheckoutError('Please add at least one medicine to the bill.');
      return;
    }

    if (!prescription.patientName.trim()) {
      setCheckoutError('Patient Name is mandatory for dispensing.');
      return;
    }

    if (prescription.patientContact.trim().length > 0 && !prescription.dpdpConsentAccepted) {
      setCheckoutError('Patient consent must be explicitly recorded when capturing contact numbers under DPDP regulations.');
      return;
    }

    const hasScheduleH1 = cartItems.some((item) => item.product.drugSchedule === 'SCHEDULE_H1');
    if (hasScheduleH1 && !prescription.doctorRegNumber?.trim()) {
      setCheckoutError(
        'Schedule H1 antibiotic detected (Azithromycin). Doctor Registration Number is legally required under Drugs & Cosmetics Act.'
      );
      return;
    }

    const currentYear = new Date().getFullYear();
    const fy = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
    const maxSeq = invoices.reduce((max, inv) => {
      const match = inv.invoiceNumber?.match(/JP\/\d{4}-\d{2}\/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1000);
    const nextSeq = maxSeq + 1;
    const invoiceNumber = `JP/${fy}/${String(nextSeq).padStart(4, '0')}`;
    const newInvoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    try {
      const res = await createInvoice(newInvoice);
      if (!res.success) {
        setCheckoutError(res.error || 'Failed to complete checkout');
        return;
      }

      setCompletedInvoice(res.invoice || newInvoice);
      setShowReviewModal(false);
      setShowPrintModal(true);

      if (autoPrint || printerSettings.isPrintingEnabled) {
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
        dpdpConsentAccepted: false,
      });
      setCheckoutError(null);
    } catch (err: any) {
      setCheckoutError(err?.message || 'Failed to complete checkout');
    }
  };

  return (
    <div className="space-y-4">
      {/* Screen reader live region for fast counter actions */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

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
            {products.length === 0 ? (
              <span className="text-[11px] text-slate-400 italic">No inventory loaded yet</span>
            ) : (
              <>
                {products.find((prod) => prod.name.toLowerCase().includes('dolo') || prod.name.toLowerCase().includes('paracetamol')) && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = products.find((prod) => prod.name.toLowerCase().includes('dolo') || prod.name.toLowerCase().includes('paracetamol'));
                      if (!p) return;
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const b = batches.find((batch) => batch.productId === p.id && batch.totalTablets > 0 && new Date(batch.expiryDate).getTime() >= now.getTime());
                      if (b) addItemToCart(p, b, 'STRIP', 1);
                      else alert(`No non-expired batch available for ${p.name}`);
                    }}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    Dolo 650 Tablets
                  </button>
                )}
                {products.find((prod) => prod.name.toLowerCase().includes('azithromycin')) && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = products.find((prod) => prod.name.toLowerCase().includes('azithromycin'));
                      if (!p) return;
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const b = batches.find((batch) => batch.productId === p.id && batch.totalTablets > 0 && new Date(batch.expiryDate).getTime() >= now.getTime());
                      if (b) addItemToCart(p, b, 'STRIP', 1);
                      else alert(`No non-expired batch available for ${p.name}`);
                    }}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    Azithromycin 500mg
                  </button>
                )}
                {products.find((prod) => prod.name.toLowerCase().includes('metformin')) && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = products.find((prod) => prod.name.toLowerCase().includes('metformin'));
                      if (!p) return;
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const b = batches.find((batch) => batch.productId === p.id && batch.totalTablets > 0 && new Date(batch.expiryDate).getTime() >= now.getTime());
                      if (b) addItemToCart(p, b, 'STRIP', 1);
                      else alert(`No non-expired batch available for ${p.name}`);
                    }}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    Metformin 500mg
                  </button>
                )}
              </>
            )}
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

      {/* Unverified Scanned Prescription Payload Banner */}
      {scannedRxDetails && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs flex items-start justify-between gap-3 shadow-xs">
          <div>
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>⚠️ Scanned Digital Prescription Payload</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-mono font-bold">UNVERIFIED PAYLOAD</span>
            </div>
            <p className="text-amber-800 text-[11px] mt-1">
              Client-only barcode/QR reading cannot establish legal physician identity or signature authenticity without PKI verification. The dispensing pharmacist must inspect the physical prescription, verify doctor credentials, and explicitly obtain patient DPDP consent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScannedRxDetails(null)}
            className="text-amber-800 hover:text-amber-950 text-xs font-semibold px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded cursor-pointer transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* First-Run Clean Inventory Guidance */}
      {products.length === 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 text-xs text-sky-900 flex items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="font-bold text-sm text-sky-950">Clean Pharmacy Installation — No Stock Loaded</div>
            <p className="text-sky-800 text-xs mt-0.5">
              Your pharmacy database has started with zero sample records. To dispense medicines, inward batch stock from the Inward Stock menu or add products in the Product Catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsLookupModalOpen(true)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded text-xs shrink-0 cursor-pointer transition-colors"
          >
            Open Catalog (F2)
          </button>
        </div>
      )}

      {/* Quick Search & Barcode Lookup Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsTopSearchOpen(true);
              }}
              onFocus={() => setIsTopSearchOpen(true)}
              placeholder="Quick search medicine by Name, Salt, Barcode, HSN or Code (Press '/' to focus, F2 for catalog)..."
              className="w-full pl-9 pr-28 py-2 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-sky-500 bg-slate-50 focus:bg-white"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLookupModalOpen(true)}
                className="px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                title="Open Product Catalog (F2)"
              >
                Catalog (F2)
              </button>
            </div>
          </div>

          {/* Quick Search Dropdown Results */}
          {isTopSearchOpen && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex justify-between items-center">
                <span>Matching Products ({filteredProducts.length})</span>
                <button
                  type="button"
                  onClick={() => setIsTopSearchOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No medicines match "{searchQuery}". Check spelling or add new product in Master.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const prodBatches = batches.filter(
                    (b) => b.productId === p.id && b.totalTablets > 0 && new Date(b.expiryDate).getTime() >= now.getTime()
                  );
                  const totalTabs = prodBatches.reduce((acc, b) => acc + b.totalTablets, 0);
                  const stock = formatDualUnitStock(totalTabs, p.stripSize);
                  const earliestBatch = prodBatches.sort(
                    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                  )[0];

                  return (
                    <div
                      key={p.id}
                      className="p-2.5 hover:bg-sky-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                            {p.hsnCode || p.barcode}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold">
                            {p.drugSchedule}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {p.genericComposition}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>Pack: 1x{p.stripSize || 10}</span>
                          {earliestBatch && (
                            <span>
                              Batch: {earliestBatch.batchNumber} (Exp: {earliestBatch.expiryDate})
                            </span>
                          )}
                          <span>Rack: {p.rackLocation || 'MAIN'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">
                            ₹ {earliestBatch ? earliestBatch.mrpPerStrip.toFixed(2) : '0.00'}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              totalTabs > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {totalTabs > 0 ? `${stock.displayString}` : 'Out of Stock'}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={totalTabs <= 0 || !earliestBatch}
                          onClick={() => {
                            if (earliestBatch) {
                              addItemToCart(p, earliestBatch, 'STRIP', 1);
                              setIsTopSearchOpen(false);
                              setSearchQuery('');
                            }
                          }}
                          className="px-2.5 py-1.5 bg-[#0084ff] hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Bill</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Entry Grid */}
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
              {/* 1. Existing Cart Items */}
              {cartItems.map((item, idx) => {
                const rowNum = idx + 1;
                return (
                  <tr key={item.cartItemId} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-1.5 px-2 text-center font-semibold text-slate-500">{rowNum}</td>

                    {/* Product Code */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={item.product.hsnCode || item.product.barcode}
                        readOnly
                        className="w-full py-1 px-2 border border-slate-200 rounded text-xs bg-slate-50 font-mono text-slate-600"
                      />
                    </td>

                    {/* Product Name */}
                    <td className="py-1.5 px-2">
                      <div className="font-medium text-slate-900 text-xs">{item.product.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.product.genericComposition}</div>
                    </td>

                    {/* Quantity */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          updateCartItemQuantity(item.cartItemId, Math.max(1, parseInt(e.target.value) || 1));
                        }}
                        className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono font-semibold"
                      />
                    </td>

                    {/* Batch */}
                    <td className="py-1.5 px-2 text-center">
                      {batches.filter((b) => b.productId === item.product.id).length > 1 ? (
                        <select
                          value={item.batch.id}
                          onChange={(e) => updateCartItemBatch(item.cartItemId, e.target.value)}
                          className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono bg-white text-slate-800 focus:ring-1 focus:ring-sky-500"
                          title="Change medicine batch"
                        >
                          {batches
                            .filter((b) => b.productId === item.product.id)
                            .map((b) => {
                              const isExpired = new Date(b.expiryDate).getTime() < new Date().setHours(0, 0, 0, 0);
                              return (
                                <option key={b.id} value={b.id} disabled={isExpired}>
                                  {b.batchNumber} ({b.expiryDate}){isExpired ? ' [EXPIRED]' : ''}
                                </option>
                              );
                            })}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={item.batch.batchNumber}
                          readOnly
                          className="w-full py-1 px-2 text-center border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-700"
                          title="Batch number"
                        />
                      )}
                    </td>

                    {/* MRP / Rate */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateCartItemPrice(item.cartItemId, parseFloat(e.target.value) || 0)}
                        className="w-full py-1 px-1 text-right border border-slate-300 rounded text-xs font-mono bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-sky-500"
                        title="Click to edit unit selling price"
                      />
                    </td>

                    {/* Sale Unit */}
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={item.unitType}
                        onChange={(e) => updateCartItemUnit(item.cartItemId, e.target.value as UnitType)}
                        className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white font-medium"
                      >
                        <option value="STRIP">STRIP</option>
                        <option value="TABLET">TABLET</option>
                      </select>
                    </td>

                    {/* Discount Amount */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="text"
                        value={((item.unitPrice * (item.discountPercent || 0) / 100) * item.quantity).toFixed(2)}
                        readOnly
                        className="w-full py-1 px-2 text-right border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-700"
                        title="Calculated discount amount"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={item.discountPercent ?? 0}
                        onChange={(e) => updateCartItemDiscount(item.cartItemId, parseFloat(e.target.value) || 0)}
                        className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono bg-white text-slate-800 focus:ring-1 focus:ring-sky-500"
                        title="Edit discount %"
                      />
                    </td>

                    {/* Expiry Date */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="text"
                        value={item.batch.expiryDate}
                        readOnly
                        className="w-full py-1 px-2 text-center border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-600"
                      />
                    </td>

                    {/* Item Cost */}
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="text"
                        value={item.totalAmount.toFixed(2)}
                        readOnly
                        className="w-full py-1 px-2 text-right border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 bg-slate-50"
                      />
                    </td>

                    {/* Sub Location */}
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={item.product.rackLocation || 'MAIN-SHELF'}
                        readOnly
                        className="w-full py-1 px-1 text-center border border-slate-200 rounded text-xs bg-slate-50 text-slate-600"
                      />
                    </td>

                    {/* Action Column */}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.cartItemId)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* 2. Interactive Input Row for Adding Products directly by Code / Name */}
              <tr className="bg-sky-50/20 hover:bg-sky-50/40 transition-colors border-t-2 border-sky-200">
                <td className="py-2 px-2 text-center font-bold text-sky-600">
                  {cartItems.length + 1}
                </td>

                {/* Product Code Search Input with Autocomplete */}
                <td className="py-2 px-2">
                  <div className="relative flex items-center">
                    <input
                      ref={draftCodeInputRef}
                      type="text"
                      value={draftCode}
                      onChange={(e) => {
                        setDraftCode(e.target.value);
                        setShowCodeDropdown(true);
                        setShowNameDropdown(false);
                      }}
                      onFocus={() => {
                        setShowCodeDropdown(true);
                        setShowNameDropdown(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (codeMatches.length > 0) {
                            selectDraftProduct(codeMatches[0]);
                          }
                        } else if (e.key === 'Escape') {
                          setShowCodeDropdown(false);
                        }
                      }}
                      placeholder="Type code / HSN..."
                      className="w-full py-1 pl-2 pr-6 border border-sky-300 focus:border-sky-500 rounded text-xs bg-white font-mono text-slate-800 focus:outline-hidden shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setIsLookupModalOpen(true)}
                      title="Open Product Catalog (F2)"
                      className="absolute right-1.5 text-slate-400 hover:text-sky-600 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>

                    {/* Code dropdown suggestions */}
                    {showCodeDropdown && codeMatches.length > 0 && (
                      <div className="absolute top-full left-0 z-50 w-72 mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {codeMatches.map((p) => (
                          <div
                            key={p.id}
                            onMouseDown={() => selectDraftProduct(p)}
                            className="p-2 hover:bg-sky-50 cursor-pointer text-left"
                          >
                            <div className="font-bold text-xs text-slate-900">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Code/HSN: {p.hsnCode || p.barcode} | Rack: {p.rackLocation || 'MAIN'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>

                {/* Product Name Search Input with Autocomplete */}
                <td className="py-2 px-2">
                  <div className="relative">
                    <input
                      ref={draftNameInputRef}
                      type="text"
                      value={draftName}
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        setShowNameDropdown(true);
                        setShowCodeDropdown(false);
                      }}
                      onFocus={() => {
                        setShowNameDropdown(true);
                        setShowCodeDropdown(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (nameMatches.length > 0) {
                            selectDraftProduct(nameMatches[0]);
                          }
                        } else if (e.key === 'Escape') {
                          setShowNameDropdown(false);
                        }
                      }}
                      placeholder="Type medicine name or salt (e.g. Paracetamol)..."
                      className="w-full py-1 px-2 border border-sky-300 focus:border-sky-500 rounded text-xs bg-white font-medium text-slate-800 focus:outline-hidden shadow-2xs"
                    />

                    {/* Name dropdown suggestions */}
                    {showNameDropdown && nameMatches.length > 0 && (
                      <div className="absolute top-full left-0 z-50 w-80 mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {nameMatches.map((p) => {
                          const prodBatches = batches.filter((b) => b.productId === p.id && b.totalTablets > 0);
                          const totalTabs = prodBatches.reduce((acc, b) => acc + b.totalTablets, 0);
                          const dual = formatDualUnitStock(totalTabs, p.stripSize);

                          return (
                            <div
                              key={p.id}
                              onMouseDown={() => selectDraftProduct(p)}
                              className="p-2 hover:bg-sky-50 cursor-pointer text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{p.name}</span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                    totalTabs > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  {totalTabs > 0 ? dual.displayString : 'Out of Stock'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {p.genericComposition}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>

                {/* Quantity */}
                <td className="py-2 px-2 text-center">
                  <input
                    ref={draftQtyInputRef}
                    type="number"
                    min={1}
                    value={draftQty}
                    onChange={(e) => setDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDraftToCart();
                    }}
                    disabled={!draftProduct}
                    className="w-full py-1 px-1 text-center border border-slate-300 focus:border-sky-500 rounded text-xs font-mono font-bold disabled:bg-slate-50"
                  />
                </td>

                {/* Batch Selector */}
                <td className="py-2 px-2 text-center">
                  {draftProduct ? (
                    <select
                      value={draftBatch?.id || ''}
                      onChange={(e) => {
                        const b = batches.find((item) => item.id === e.target.value);
                        if (b) setDraftBatch(b);
                      }}
                      className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white font-mono text-slate-800"
                    >
                      {batches
                        .filter((b) => b.productId === draftProduct.id)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} (Exp: {b.expiryDate})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Auto batch"
                        readOnly
                        className="w-full py-1 pl-2 pr-6 text-center border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-400"
                      />
                      <Search
                        onClick={() => setIsLookupModalOpen(true)}
                        className="w-3.5 h-3.5 text-slate-400 hover:text-sky-600 absolute right-1.5 cursor-pointer"
                      />
                    </div>
                  )}
                </td>

                {/* MRP */}
                <td className="py-2 px-2 text-right">
                  <input
                    type="text"
                    value={draftBatch ? draftBatch.mrpPerStrip.toFixed(2) : '0.00'}
                    readOnly
                    className="w-full py-1 px-2 text-right border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-700"
                  />
                </td>

                {/* Sale Unit */}
                <td className="py-2 px-2 text-center">
                  <select
                    value={draftUnit}
                    onChange={(e) => setDraftUnit(e.target.value as UnitType)}
                    disabled={!draftProduct}
                    className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white font-medium disabled:bg-slate-50"
                  >
                    <option value="STRIP">STRIP</option>
                    <option value="TABLET">TABLET</option>
                  </select>
                </td>

                {/* Discount Amount */}
                <td className="py-2 px-2 text-right">
                  <input
                    type="text"
                    defaultValue="0.00"
                    readOnly
                    className="w-full py-1 px-2 text-right border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-400"
                  />
                </td>

                {/* Discount % */}
                <td className="py-2 px-2 text-center">
                  <input
                    type="text"
                    defaultValue="0.00"
                    readOnly
                    className="w-full py-1 px-1 text-center border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-400"
                  />
                </td>

                {/* Expiry Date */}
                <td className="py-2 px-2 text-center">
                  <input
                    type="text"
                    value={draftBatch ? draftBatch.expiryDate : 'dd-mm-yyyy'}
                    readOnly
                    className="w-full py-1 px-2 text-center border border-slate-200 rounded text-xs font-mono bg-slate-50 text-slate-600"
                  />
                </td>

                {/* Item Cost */}
                <td className="py-2 px-2 text-right">
                  <input
                    type="text"
                    value={
                      draftBatch && draftProduct
                        ? (
                            (draftUnit === 'STRIP'
                              ? draftBatch.sellingPricePerStrip
                              : draftBatch.sellingPricePerStrip / (draftProduct.stripSize || 10)) *
                            draftQty
                          ).toFixed(2)
                        : '0.00'
                    }
                    readOnly
                    className="w-full py-1 px-2 text-right border border-slate-200 rounded text-xs font-mono font-bold text-emerald-700 bg-slate-50"
                  />
                </td>

                {/* Sub Location */}
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={draftProduct?.rackLocation || 'MAIN-SHELF'}
                    readOnly
                    className="w-full py-1 px-1 text-center border border-slate-200 rounded text-xs bg-slate-50 text-slate-600"
                  />
                </td>

                {/* Action Column */}
                <td className="py-2 px-2 text-center">
                  {draftProduct && draftBatch ? (
                    <button
                      type="button"
                      onClick={handleAddDraftToCart}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-colors"
                      title="Add to Bill (Enter)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsLookupModalOpen(true)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer transition-colors"
                      title="Open Product Catalog (F2)"
                    >
                      <Search className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  )}
                </td>
              </tr>
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
                <select
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                  className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                >
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
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs bg-white"
              >
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
                placeholder="10-digit mobile number"
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <input
                id="pos-dpdp-consent"
                type="checkbox"
                checked={prescription.dpdpConsentAccepted}
                onChange={(e) => setPrescription((prev) => ({ ...prev, dpdpConsentAccepted: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <label htmlFor="pos-dpdp-consent" className="text-[11px] text-slate-600 cursor-pointer">
                Explicit DPDP consent obtained for contact & prescription processing
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Customer Address</label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Door No, Street"
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Customer Address 2</label>
              <input
                type="text"
                value={customerAddress2}
                onChange={(e) => setCustomerAddress2(e.target.value)}
                placeholder="Area, Pincode"
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Doctor Address</label>
              <input
                type="text"
                value={doctorAddress}
                onChange={(e) => setDoctorAddress(e.target.value)}
                placeholder="Clinic / Hospital address"
                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="w-32 text-slate-600 font-medium">Doctor Mobile</label>
              <input
                type="text"
                value={doctorMobile}
                onChange={(e) => setDoctorMobile(e.target.value)}
                placeholder="10-digit mobile number"
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
              <span className="font-mono text-emerald-600 font-semibold">{billTotals.totalDiscount.toFixed(2)}</span>
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
            onClick={() => {
              if (cartItems.length === 0) {
                setCheckoutError('Please add at least one medicine to the bill.');
                return;
              }
              setPreConfirmAction('SAVE');
              setShowReviewModal(true);
            }}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700 rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Review and edit all patient, doctor, pricing and tax details before finalizing"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Review & Edit (F4)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length === 0) {
                setCheckoutError('Please add at least one medicine to the bill.');
                return;
              }
              setPreConfirmAction('PRINT');
              setShowReviewModal(true);
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-sky-400 text-[#0066cc] rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Preview (F10)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (cartItems.length === 0) {
                setCheckoutError('Please add at least one medicine to the bill.');
                return;
              }
              setPreConfirmAction('SAVE');
              setShowReviewModal(true);
            }}
            className="px-5 py-2 bg-[#0084ff] hover:bg-blue-600 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Bill (F6)</span>
          </button>
        </div>
      </div>

      
      {/* Review & Edit All Fields Modal Before Confirming Save or Print */}
      {showReviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-bill-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-6 h-6 text-sky-200" />
                </div>
                <div>
                  <h3 id="review-bill-modal-title" className="text-lg font-bold">Review & Edit Bill Before Confirmation</h3>
                  <p className="text-xs text-sky-100">
                    Verify and modify customer details, doctor details, pricing, discount, and batch before saving or printing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                title="Close and return to billing grid"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{checkoutError}</span>
                </div>
              )}

              {/* Section 1: Customer & Doctor Details in 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Customer / Patient Information */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span>Customer & Patient Information</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Patient / Customer Name *</label>
                      <input
                        type="text"
                        value={prescription.patientName}
                        onChange={(e) => setPrescription((prev) => ({ ...prev, patientName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-medium focus:ring-1 focus:ring-sky-500"
                        placeholder="e.g. John Doe / Walk-in Customer"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Customer Mobile</label>
                        <input
                          type="text"
                          value={prescription.patientContact}
                          onChange={(e) => setPrescription((prev) => ({ ...prev, patientContact: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="10-digit mobile"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Gender</label>
                        <select
                          value={prescription.patientGender}
                          onChange={(e) => setPrescription((prev) => ({ ...prev, patientGender: e.target.value as any }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Age</label>
                        <input
                          type="number"
                          value={prescription.patientAge ?? ''}
                          onChange={(e) => setPrescription((prev) => ({ ...prev, patientAge: parseInt(e.target.value) || undefined }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="Age in yrs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Customer Address</label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="City / Street"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Doctor & Clinical Details */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>Doctor & Prescription Details</span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Doctor Name</label>
                        <input
                          type="text"
                          value={prescription.doctorName}
                          onChange={(e) => setPrescription((prev) => ({ ...prev, doctorName: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="e.g. Dr. R. Parthiban"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Doctor Reg. No (MCI / State)</label>
                        <input
                          type="text"
                          value={prescription.doctorRegNumber}
                          onChange={(e) => setPrescription((prev) => ({ ...prev, doctorRegNumber: e.target.value }))}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="Required for Schedule H1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Doctor Mobile</label>
                        <input
                          type="text"
                          value={doctorMobile}
                          onChange={(e) => setDoctorMobile(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="Doctor phone"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">Clinic / Hospital</label>
                        <input
                          type="text"
                          value={doctorAddress}
                          onChange={(e) => setDoctorAddress(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-sky-500"
                          placeholder="Hospital or clinic name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Prescription Notes / Remarks</label>
                      <input
                        type="text"
                        value={prescription.notes}
                        onChange={(e) => setPrescription((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-sky-500"
                        placeholder="e.g. After food 5 days"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Mode & Billing Configuration */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-700">Payment Mode:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="px-2.5 py-1 border border-slate-300 rounded text-xs bg-white font-bold text-sky-700"
                    >
                      <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="CREDIT_DUE">Credit Due (Khata)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="font-semibold text-slate-700">Bill Type:</label>
                    <select
                      value={billType}
                      onChange={(e) => setBillType(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="CASH BILL">CASH BILL</option>
                      <option value="CREDIT BILL">CREDIT BILL</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInterState}
                      onChange={(e) => setIsInterState(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>Inter-State Supply (Apply IGST instead of CGST+SGST)</span>
                  </label>
                </div>
              </div>

              {/* Section 3: Line Items Table with Complete Field Editing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-sky-600" />
                    <span>Medicine Line Items ({cartItems.length}) - Fully Editable</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Edit unit rate, quantity, discount % or select batch directly in the table
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        <th className="py-2 px-3">Medicine Formulation</th>
                        <th className="py-2 px-2 text-center w-36">Batch</th>
                        <th className="py-2 px-2 text-center w-24">Unit</th>
                        <th className="py-2 px-2 text-center w-16">Qty</th>
                        <th className="py-2 px-2 text-right w-24">Rate (₹)</th>
                        <th className="py-2 px-2 text-center w-16">Disc %</th>
                        <th className="py-2 px-2 text-right w-20">Taxable</th>
                        <th className="py-2 px-2 text-center w-16">GST %</th>
                        <th className="py-2 px-3 text-right w-24">Total (₹)</th>
                        <th className="py-2 px-2 text-center w-10">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {cartItems.map((item, idx) => {
                        const itemBatches = batches.filter((b) => b.productId === item.product.id);
                        return (
                          <tr key={item.cartItemId} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-2 text-center font-semibold text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-900">{item.product.name}</div>
                              <div className="text-[10px] text-slate-500">{item.product.genericComposition}</div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {itemBatches.length > 1 ? (
                                <select
                                  value={item.batch.id}
                                  onChange={(e) => updateCartItemBatch(item.cartItemId, e.target.value)}
                                  className="w-full py-1 px-1 border border-slate-300 rounded text-xs font-mono bg-white"
                                >
                                  {itemBatches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.batchNumber} (Exp: {b.expiryDate})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 block text-center">
                                  {item.batch.batchNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <select
                                value={item.unitType}
                                onChange={(e) => updateCartItemUnit(item.cartItemId, e.target.value as UnitType)}
                                className="w-full py-1 px-1 border border-slate-300 rounded text-xs bg-white font-medium"
                              >
                                <option value="STRIP">STRIP</option>
                                <option value="TABLET">TABLET</option>
                              </select>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartItemQuantity(item.cartItemId, Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => updateCartItemPrice(item.cartItemId, parseFloat(e.target.value) || 0)}
                                className="w-full py-1 px-1 text-right border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="100"
                                value={item.discountPercent ?? 0}
                                onChange={(e) => updateCartItemDiscount(item.cartItemId, parseFloat(e.target.value) || 0)}
                                className="w-full py-1 px-1 text-center border border-slate-300 rounded text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-700">
                              {item.taxableAmount.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600">
                                {item.gstRate}%
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-sky-700">
                              {item.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeCartItem(item.cartItemId)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Delete item"
                              >
                                <Trash2 className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Live Financial Summary Breakdown */}
              <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 text-slate-600">
                    <span>Taxable: <strong className="font-mono text-slate-800">₹{billTotals.subtotal.toFixed(2)}</strong></span>
                    <span>Total Discount: <strong className="font-mono text-emerald-700">₹{billTotals.totalDiscount.toFixed(2)}</strong></span>
                    <span>Total GST: <strong className="font-mono text-slate-800">₹{billTotals.totalTax.toFixed(2)}</strong></span>
                    <span>Round-off: <strong className="font-mono text-slate-800">₹{billTotals.roundOff.toFixed(2)}</strong></span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isInterState
                      ? `IGST: ₹${billTotals.totalIgst.toFixed(2)}`
                      : `CGST: ₹${billTotals.totalCgst.toFixed(2)} | SGST: ₹${billTotals.totalSgst.toFixed(2)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Net Amount Payable</div>
                  <div className="text-2xl font-bold font-mono text-sky-700">
                    ₹{billTotals.grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                ← Back to Billing Grid
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFinalCheckout(false)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Bill (F6)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinalCheckout(true)}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Confirm & Print Bill (F10)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generated & Print Modal */}
      {showPrintModal && completedInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-invoice-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between no-print">
              <div>
                <h3 id="print-invoice-modal-title" className="text-base font-bold text-slate-800">
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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-reader-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="qr-reader-modal-title" className="font-bold text-slate-900 text-sm">
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
      {/* Product Lookup & Batch Selection Modal (F2) */}
      {isLookupModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-lookup-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 id="catalog-lookup-modal-title" className="font-bold text-sm">Product Catalog & Batch Browser (F2)</h3>
                  <p className="text-[11px] text-slate-300">
                    Search pharmacy inventory by medicine name, salt, barcode or HSN to add directly to current bill.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLookupModalOpen(false);
                  setLookupSearchQuery('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  autoFocus
                  value={lookupSearchQuery}
                  onChange={(e) => setLookupSearchQuery(e.target.value)}
                  placeholder="Search products by brand name, salt, barcode, or HSN code..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-xs bg-white focus:outline-hidden focus:border-sky-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Modal Inventory Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {products.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No products registered in the database yet. Add medicines via Medicine Master or inward a purchase.
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <th className="py-2 px-3">Medicine Name</th>
                      <th className="py-2 px-3">Generic Salt</th>
                      <th className="py-2 px-2 text-center">Schedule</th>
                      <th className="py-2 px-2 text-center">Rack</th>
                      <th className="py-2 px-3 text-right">Stock</th>
                      <th className="py-2 px-3 text-right">MRP</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {products
                      .filter((p) => {
                        if (!lookupSearchQuery.trim()) return true;
                        const q = lookupSearchQuery.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.genericComposition.toLowerCase().includes(q) ||
                          p.barcode.includes(q) ||
                          p.hsnCode.includes(q)
                        );
                      })
                      .map((p) => {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const prodBatches = batches.filter(
                          (b) => b.productId === p.id && b.totalTablets > 0 && new Date(b.expiryDate).getTime() >= now.getTime()
                        );
                        const totalTabs = prodBatches.reduce((acc, b) => acc + b.totalTablets, 0);
                        const stock = formatDualUnitStock(totalTabs, p.stripSize);
                        const earliestBatch = prodBatches.sort(
                          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                        )[0];

                        return (
                          <tr key={p.id} className="hover:bg-sky-50/50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                HSN: {p.hsnCode || '—'} | Barcode: {p.barcode || '—'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{p.genericComposition}</td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {p.drugSchedule}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {p.rackLocation || 'MAIN'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`font-semibold ${
                                  totalTabs > 0 ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {totalTabs > 0 ? stock.displayString : 'Out of Stock'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              ₹ {earliestBatch ? earliestBatch.mrpPerStrip.toFixed(2) : '0.00'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                disabled={totalTabs <= 0 || !earliestBatch}
                                onClick={() => {
                                  if (earliestBatch) {
                                    addItemToCart(p, earliestBatch, 'STRIP', 1);
                                    setIsLookupModalOpen(false);
                                    setLookupSearchQuery('');
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#0084ff] hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded text-xs cursor-pointer shadow-2xs"
                              >
                                Select & Add
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Tip: Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono">F2</kbd> or <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono">/</kbd> anytime on the billing screen to search.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLookupModalOpen(false);
                  setLookupSearchQuery('');
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
