import React from 'react';
import { Invoice, PrinterSettings, formatINR, maskPhoneDPDP } from '../../types/pharmacy';

interface PrintTemplatesProps {
  invoice: Invoice;
  settings: PrinterSettings;
  pharmacyInfo?: {
    name: string;
    address: string;
    cityState: string;
    phone: string;
    gstin: string;
    dlNumber: string;
  };
}

export const PrintTemplates: React.FC<PrintTemplatesProps> = ({
  invoice,
  settings,
  pharmacyInfo = {
    name: 'JEEVA PHARMACY',
    address: 'No. 42, Gandhi Road, Opp. Govt Hospital',
    cityState: 'Chennai, Tamil Nadu - 600003',
    phone: '+91 98401 23456 / 044-25381122',
    gstin: '33AAAAA0000A1Z5',
    dlNumber: 'DL-TN-2024-8849 (Form 20/21)',
  },
}) => {
  if (!invoice) return null;

  return (
    <div>
      {/* 80mm Continuous Thermal Receipt Format */}
      {settings.preferredFormat === 'THERMAL_80MM' && (
        <div className="thermal-receipt-root bg-white text-black">
          <div className="thermal-title">{pharmacyInfo.name}</div>
          <div className="text-center text-[10px] leading-tight">
            <div>{pharmacyInfo.address}</div>
            <div>{pharmacyInfo.cityState}</div>
            <div>Ph: {pharmacyInfo.phone}</div>
            <div className="font-semibold">GSTIN: {pharmacyInfo.gstin}</div>
            <div>DL: {pharmacyInfo.dlNumber}</div>
          </div>

          <div className="thermal-divider" />

          <div className="text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>Bill: <strong>{invoice.invoiceNumber}</strong></span>
              <span>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')} {new Date(invoice.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Patient: <strong>{invoice.prescription.patientName}</strong></span>
              <span>Mob: {invoice.prescription.patientContact ? maskPhoneDPDP(invoice.prescription.patientContact) : 'N/A'}</span>
            </div>
            {invoice.prescription.doctorName && (
              <div className="flex justify-between">
                <span>Dr: {invoice.prescription.doctorName}</span>
                {invoice.prescription.doctorRegNumber && (
                  <span className="text-[9px]">Reg: {invoice.prescription.doctorRegNumber}</span>
                )}
              </div>
            )}
            <div className="flex justify-between">
              <span>Cashier: {invoice.cashierName}</span>
              <span>Pay: <strong>{invoice.paymentMethod}</strong></span>
            </div>
          </div>

          <div className="thermal-double-divider" />

          {/* Thermal Items Header */}
          <div className="text-[10px] font-bold grid grid-cols-12 gap-1 py-0.5">
            <div className="col-span-5">Item/Batch</div>
            <div className="col-span-2 text-center">Exp</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-3 text-right">Amt (₹)</div>
          </div>

          <div className="thermal-divider" />

          {/* Thermal Item Rows */}
          <div className="space-y-1.5 text-[10px]">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="leading-tight">
                <div className="font-medium truncate">{item.product.name}</div>
                <div className="grid grid-cols-12 gap-1 text-[9px] text-gray-800">
                  <div className="col-span-5">
                    B:{item.batch.batchNumber} | HSN:{item.product.hsnCode}
                  </div>
                  <div className="col-span-2 text-center">
                    {new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })}
                  </div>
                  <div className="col-span-2 text-right">
                    {item.unitType === 'STRIP' ? `${item.quantity} St` : `${item.quantity} Tab`}
                  </div>
                  <div className="col-span-3 text-right font-bold tabular-nums">
                    {item.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="thermal-divider" />

          {/* Thermal Financial Summary */}
          <div className="space-y-0.5 text-[10.5px]">
            <div className="flex justify-between">
              <span>Subtotal (Excl. Tax):</span>
              <span className="tabular-nums">₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between text-[9.5px]">
                  <span>Total CGST:</span>
                  <span className="tabular-nums">₹{invoice.totalCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9.5px]">
                  <span>Total SGST:</span>
                  <span className="tabular-nums">₹{invoice.totalSgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-[9.5px]">
                <span>Total IGST:</span>
                <span className="tabular-nums">₹{invoice.totalIgst.toFixed(2)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between text-[9.5px]">
                <span>Round Off:</span>
                <span className="tabular-nums">{invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}</span>
              </div>
            )}
            <div className="thermal-double-divider" />
            <div className="flex justify-between text-[12px] font-bold">
              <span>NET PAYABLE:</span>
              <span className="tabular-nums">₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {settings.printTaxBreakdown && (
            <div className="mt-2 text-[8.5px] border-t border-dotted border-black pt-1">
              <div className="font-semibold text-center mb-0.5">TAX SUMMARY (INCLUSIVE MRP)</div>
              <div className="grid grid-cols-4 text-center font-medium">
                <div>GST%</div>
                <div>Taxable</div>
                <div>CGST</div>
                <div>SGST</div>
              </div>
              {invoice.taxSlabBreakdowns.map((slab) => (
                <div key={slab.gstRate} className="grid grid-cols-4 text-center tabular-nums">
                  <div>{slab.gstRate}%</div>
                  <div>₹{slab.taxableAmount.toFixed(1)}</div>
                  <div>₹{slab.cgstAmount.toFixed(1)}</div>
                  <div>₹{slab.sgstAmount.toFixed(1)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="thermal-divider" />
          <div className="text-center text-[9px] space-y-0.5 mt-1">
            <div>{settings.customFooterNote}</div>
            <div className="text-[8px] text-gray-700">DPDP Consent recorded on file. System generated invoice.</div>
            <div className="text-[10px] font-bold tracking-widest mt-1">*** GET WELL SOON ***</div>
          </div>
        </div>
      )}

      {/* Standard A4 / A5 Laser Tax Invoice Format */}
      {settings.preferredFormat === 'LASER_A4' && (
        <div className="laser-invoice-root bg-white p-6 text-slate-900 border border-slate-300 rounded shadow-sm">
          {/* A4 Tax Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pharmacyInfo.name}</h1>
                <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                  <div>{pharmacyInfo.address}, {pharmacyInfo.cityState}</div>
                  <div>Contact: {pharmacyInfo.phone}</div>
                  <div className="font-semibold text-slate-800">Drug License No: {pharmacyInfo.dlNumber}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold bg-slate-900 text-white rounded">
                  TAX INVOICE (RETAIL)
                </span>
                <div className="text-xs font-mono font-bold text-slate-900 mt-2">
                  GSTIN: {pharmacyInfo.gstin}
                </div>
                <div className="text-xs text-slate-600">State: 33 (Tamil Nadu)</div>
              </div>
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded border border-slate-200 mb-4">
            <div>
              <div className="font-semibold text-slate-800 mb-1">INVOICE & PRESCRIPTION DETAILS</div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Invoice No:</span>
                <span className="col-span-2 font-mono font-bold">{invoice.invoiceNumber}</span>
                <span className="text-slate-500">Date & Time:</span>
                <span className="col-span-2">{new Date(invoice.invoiceDate).toLocaleString('en-IN')}</span>
                <span className="text-slate-500">Doctor Name:</span>
                <span className="col-span-2 font-medium">{invoice.prescription.doctorName || 'Self / OTC'}</span>
                {invoice.prescription.doctorRegNumber && (
                  <>
                    <span className="text-slate-500">Doctor Reg No:</span>
                    <span className="col-span-2 font-mono">{invoice.prescription.doctorRegNumber}</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-800 mb-1">PATIENT INFORMATION (DPDP ACT 2023)</div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Patient Name:</span>
                <span className="col-span-2 font-semibold">{invoice.prescription.patientName}</span>
                <span className="text-slate-500">Contact No:</span>
                <span className="col-span-2 font-mono">
                  {invoice.prescription.patientContact ? maskPhoneDPDP(invoice.prescription.patientContact) : 'N/A'}
                </span>
                <span className="text-slate-500">Payment Mode:</span>
                <span className="col-span-2 font-semibold text-emerald-800">{invoice.paymentMethod}</span>
                <span className="text-slate-500">Billed By:</span>
                <span className="col-span-2">{invoice.cashierName}</span>
              </div>
            </div>
          </div>

          {/* Full Statutory Item Table */}
          <table className="w-full text-xs border-collapse border border-slate-300 mb-4">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-left">
                <th className="p-1.5 border border-slate-300 text-center w-8">#</th>
                <th className="p-1.5 border border-slate-300">Description of Medicine</th>
                <th className="p-1.5 border border-slate-300 text-center">HSN</th>
                <th className="p-1.5 border border-slate-300 text-center">Batch</th>
                <th className="p-1.5 border border-slate-300 text-center">Expiry</th>
                <th className="p-1.5 border border-slate-300 text-center">Qty / Unit</th>
                <th className="p-1.5 border border-slate-300 text-right">MRP / Unit</th>
                <th className="p-1.5 border border-slate-300 text-right">Taxable</th>
                <th className="p-1.5 border border-slate-300 text-center">GST %</th>
                <th className="p-1.5 border border-slate-300 text-right">CGST</th>
                <th className="p-1.5 border border-slate-300 text-right">SGST</th>
                <th className="p-1.5 border border-slate-300 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.cartItemId} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-1.5 border border-slate-300 text-center">{index + 1}</td>
                  <td className="p-1.5 border border-slate-300">
                    <div className="font-semibold text-slate-900">{item.product.name}</div>
                    <div className="text-[10px] text-slate-500">{item.product.genericComposition}</div>
                  </td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{item.product.hsnCode}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono font-medium">{item.batch.batchNumber}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">
                    {new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-center">
                    {item.quantity} {item.unitType === 'STRIP' ? 'Strip' : 'Loose Tab'}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono tabular-nums">
                    ₹{item.unitPrice.toFixed(2)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono tabular-nums">
                    ₹{item.taxableAmount.toFixed(2)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{item.gstRate}%</td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono tabular-nums">
                    ₹{item.cgstAmount.toFixed(2)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono tabular-nums">
                    ₹{item.sgstAmount.toFixed(2)}
                  </td>
                  <td className="p-1.5 border border-slate-300 text-right font-mono font-bold tabular-nums">
                    ₹{item.totalAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bottom Summary Grid */}
          <div className="grid grid-cols-12 gap-4 text-xs mb-4">
            {/* HSN Slab Breakdown Table */}
            <div className="col-span-7 border border-slate-200 rounded p-2.5">
              <div className="font-semibold text-slate-800 mb-1.5">GST TAX SLAB ANALYSIS</div>
              <table className="w-full text-center border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-1 border border-slate-200">Rate Slab</th>
                    <th className="p-1 border border-slate-200">Taxable Value</th>
                    <th className="p-1 border border-slate-200">CGST Amount</th>
                    <th className="p-1 border border-slate-200">SGST Amount</th>
                    <th className="p-1 border border-slate-200">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.taxSlabBreakdowns.map((slab) => (
                    <tr key={slab.gstRate}>
                      <td className="p-1 border border-slate-200 font-mono font-medium">{slab.gstRate}%</td>
                      <td className="p-1 border border-slate-200 font-mono tabular-nums">₹{slab.taxableAmount.toFixed(2)}</td>
                      <td className="p-1 border border-slate-200 font-mono tabular-nums">₹{slab.cgstAmount.toFixed(2)}</td>
                      <td className="p-1 border border-slate-200 font-mono tabular-nums">₹{slab.sgstAmount.toFixed(2)}</td>
                      <td className="p-1 border border-slate-200 font-mono font-bold tabular-nums">₹{slab.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Computation Card */}
            <div className="col-span-5 bg-slate-50 border border-slate-300 rounded p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Taxable Amount:</span>
                <span className="font-mono font-medium tabular-nums">₹{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total CGST:</span>
                <span className="font-mono tabular-nums">₹{invoice.totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total SGST:</span>
                <span className="font-mono tabular-nums">₹{invoice.totalSgst.toFixed(2)}</span>
              </div>
              {invoice.totalIgst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Total IGST:</span>
                  <span className="font-mono tabular-nums">₹{invoice.totalIgst.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">
                    {invoice.roundOff > 0 ? `+₹${invoice.roundOff.toFixed(2)}` : `-₹${Math.abs(invoice.roundOff).toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between text-sm font-bold text-slate-900">
                <span>GRAND TOTAL:</span>
                <span className="font-mono text-base tabular-nums">{formatINR(invoice.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Legal Declarations & Pharmacist Signoff */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex justify-between items-end">
            <div className="space-y-1 max-w-md">
              <p><strong>Declaration:</strong> Certified that the medicines mentioned in this invoice are sold in accordance with the provisions of the Drugs and Cosmetics Act, 1940 and Rules thereunder.</p>
              <p><strong>Terms:</strong> {settings.customFooterNote}</p>
            </div>
            <div className="text-center w-48 border-t border-dashed border-slate-400 pt-8 mt-4">
              <div className="font-semibold text-slate-800 text-xs">Registered Pharmacist</div>
              <div className="text-[10px]">For {pharmacyInfo.name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
