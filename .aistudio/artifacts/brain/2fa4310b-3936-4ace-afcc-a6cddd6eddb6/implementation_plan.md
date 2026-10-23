# Jeeva Pharmacy — Enterprise Retail Management System

A high-performance, compliant pharmacy management application tailored for independent Indian retail pharmacies. The system unifies keyboard-first Point of Sale (POS) billing with hardware barcode scanning, automated Indian GST (CGST/SGST/IGST) calculations, dual-unit (Strips & Tablets) inventory tracking, dual-mode (80mm thermal receipt vs. A4 laser invoice) printing, 30/60/90-day batch expiry monitoring, and DPDP Act compliance.

> [!IMPORTANT]
> **User Review & Confirmed Architectural Choices**
> - **Store Branding**: Configured as **Jeeva Pharmacy** (Retail Chemists & Druggists, Drug License No. DL-TN-2024-8849, GSTIN: 33AAAAA0000A1Z5) across headers, invoices, and thermal receipts.
> - **Hardware Printing Preference**: **Printing toggled OFF by default** as requested. Operators can toggle printing ON in 1 click and switch seamlessly between 80mm thermal slips and standard A4/A5 laser tax invoices.
> - **Preloaded Inventory Catalog**: **Standard generic essential Indian medicines** (e.g., Paracetamol 650mg, Amoxicillin-Clavulanic Acid 625mg, Metformin 500mg, Pantoprazole 40mg, Cetirizine 10mg, Azithromycin 500mg) with authentic HSN codes (3004), GST rates (5%, 12%, 18%), and dual-unit strip-to-tablet conversions.

---

## 1. Overview & Core Concept

- **What It Does**: Jeeva Pharmacy is a dedicated, production-ready pharmacy information and billing system. It streamlines lightning-fast checkout counters using hardware barcode scanners (with manual search fallback), computes accurate itemized Indian tax breakdowns, supports tablet-level dispensing from partial strips, manages distributor stock intake, and surfaces executive financial and expiry analytics.
- **Target Audience & Personas**: 
  - *Admin / Chief Pharmacist*: Full access to gross profit margins, daily/monthly revenue, vendor payables, purchase order inwarding, and compliance audit logs.
  - *Pharmacy Assistant / Billing Operator*: Keyboard-accelerated POS checkout screen, doctor-patient prescription logging, live batch lookup, and basic sales returns without exposure to sensitive net profit figures.
- **Key Value**: Eliminates manual GST billing mistakes, prevents dispensing expired or near-expiry batches, enables loss-less fractional strip selling, and adheres to Indian DPDP data retention policies.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **POS Counter Checkout Flow**:
   - The cashier scans an EAN-13/UPC barcode or presses `/` to focus the search bar.
   - The system intercepts the keystroke burst, matches the exact batch, and appends the item to the bill table with default quantity (1 strip).
   - The cashier toggles unit mode between "Strip" and "Loose Tablet" using the `Tab` key.
   - Taxes (CGST & SGST for intra-state or IGST for inter-state) are auto-calculated per item based on the medicine's statutory GST slab (0%, 5%, 12%, 18%).
   - Prescribing doctor and patient details (Name, Phone, Doctor Reg No) are captured.
   - Total is rounded off to the nearest Rupee (Indian rounding standard).
   - Pressing `F2` or clicking "Complete Bill" commits the invoice, updates the dual-unit inventory pool in real time, and triggers the print workflow (if printer switch is enabled).
2. **Dual-Unit Stock Intake & Expiry Monitoring Flow**:
   - Stock is entered with manufacturer, HSN code, batch number, manufacturing date, expiry date, conversion factor (e.g., 1 strip = 10 tablets), cost price per strip, and MRP/Selling Price per strip.
   - Batches automatically filter into color-coded expiry zones: **Critical (<30 days)**, **Warning (31–60 days)**, and **Caution (61–90 days)**.
3. **Wholesaler & Purchase Ledger Flow**:
   - Record inward distributor consignments with GSTIN verification, invoice matching, payment terms, and unpaid balance dues.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density, professional clinical SaaS console. Crisp, distraction-free neutral canvas with subtle 1px dividers, tabular alignment, and zero superfluous gradients.
- **Color Palette & Discipline (60-30-10 Rule)**:
  - *Canvas (60%)*: Crisp light slate canvas (`#F8FAFC`) with bright white cards (`#FFFFFF`) or high-contrast deep slate dark canvas (`#0F172A`).
  - *Structural Surfaces (30%)*: Border slate (`#E2E8F0` / `#334155`), subdued text slate (`#64748B`), and dense table headers (`#F1F5F9`).
  - *Accent & Semantic Signaling (10%)*: 
    - Medical Emerald (`#059669` / `#10B981`) for checkout triggers and positive profit trends.
    - Deep Amber (`#D97706`) for low stock and 60-day expiry caution.
    - Crimson (`#DC2626`) for critical <30-day expiries, banned drugs, and credit dues.
    - Indigo Accent (`#4F46E5`) for primary tabs and role badge toggles.
- **Typography & Hierarchy**:
  - *Display / Headings*: Plus Jakarta Sans (`font-semibold tracking-tight`).
  - *Body Prose*: DM Sans or Public Sans (`text-sm`, clean readability).
  - *Financial & Inventory Metrics*: Tabular figures (`tabular-nums font-mono`) ensuring vertical decimal alignment across tax tables.
- **Dual Print Stylesheets**:
  - `@media print { .thermal-mode { width: 72mm; font-family: monospace; font-size: 11px; } }` formatted for rapid 80mm thermal receipt rolls with condensed line spacing and store details.
  - `@media print { .laser-mode { width: 100%; max-width: 210mm; font-family: sans-serif; font-size: 12px; } }` formatted for comprehensive A4 GST Tax Invoices complete with buyer/seller GSTIN, HSN summary tables, and authorized signatory blocks.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Fractional Dual-Unit Stock Representation**
  - *Chosen Approach*: Store stock at the lowest atomic unit (Total Tablets/Capsules) as an integer in the database, with a static `stripSize` conversion factor. Derive human-friendly display strings (e.g. `"14 Strips, 3 Tablets"`) dynamically via integer division `Math.floor(units / stripSize)` and modulus `units % stripSize`.
  - *Why*: Eliminates floating-point rounding errors when dispensing fractional strips; prevents inventory drift during bulk stock returns.
  - *Alternatives Considered*: Floating-point decimal strips (e.g., 14.3 strips) — rejected because 3 tablets out of 10 is 0.3, but 3 tablets out of 15 is 0.2, leading to database rounding corruption.

- **Decision 2: Hardware Barcode Scanner Buffer Protocol**
  - *Chosen Approach*: A global keyboard event listener listening at the `window` level that accumulates key strokes occurring with an inter-keystroke latency < 35ms followed by an `Enter` character, distinguishing automated scanner input from human typing.
  - *Why*: Physical USB and Bluetooth HID barcode scanners type characters at superhuman speeds (10–30ms intervals) followed by carriage return. Capturing this globally allows instant item scanning without requiring the operator to manually click into a text input.
  - *Alternatives Considered*: Requiring the user to focus a specific input field first — rejected because counter clerks need to scan while looking at customer or cash drawer.

- **Decision 3: Indian GST Tax Math & DPDP Structural Alignment**
  - *Chosen Approach*: Maintain intra-state (CGST + SGST split 50-50) and inter-state (IGST 100%) tax calculation engines with mandatory HSN codes (Chapter 30: 3004). Store patient records with DPDP-compliant consent timestamp, purpose metadata, and masked phone numbers in audit logs.
  - *Why*: Fully aligns with Indian Central Board of Indirect Taxes and Customs (CBIC) pharmacy requirements and the Digital Personal Data Protection Act, 2023.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       JEEVA PHARMACY APP (NEXT.JS / REACT)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [Jeeva Pharmacy Brand] ── [POS | Inventory | Analytics | Vendors]  │
│  Global Hardware Layer: Window Barcode Buffer Listener (HID Keyboard Events)│
├──────────────────────┬──────────────────────────────────────────────────────┤
│  POS & Billing Engine│  Executive Analytics & Inventory Management          │
│  - Barcode Auto-Add  │  - Daily / Monthly Gross Revenue & Margin Widgets   │
│  - Unit Toggle       │  - Fastest Moving SKU Charts (Volume & Revenue)     │
│  - Indian GST Engine │  - 30 / 60 / 90 Days Expiry Tracker Table            │
│  - Patient & Rx Form │  - Low-Stock Level Reorder Alerts                    │
│  - Dual Print Switch │  - Vendor Directory & Consignment Inwarding          │
├──────────────────────┴──────────────────────────────────────────────────────┤
│  State & Persistence: TanStack Query + Reactive Storage + Prisma Schema     │
│  Prisma Relational Model: Users ── Invoices ── InvoiceItems ── Batches ──   │
│                           Products ── Vendors ── AuditLogs (DPDP)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Relational Database Schema (`schema.prisma`)
The system specification includes an enterprise Prisma schema mapping:
- `User`: RBAC roles (`ADMIN`, `PHARMACY_ASSISTANT`), active credentials, audit trails.
- `Product`: Name, Brand/Manufacturer, HSN Code (mandatory `String`), Barcode (`String`), Strip Size (units per strip), Schedule flag (`H`, `H1`, `X`, `OTC`).
- `Batch`: Product foreign key, Batch Number, Expiry Date, Manufacturing Date, Cost Price Per Strip, MRP Per Strip, GST Rate Slab (5%, 12%, 18%), Total Available Tablets.
- `Invoice` & `InvoiceItem`: Invoice Number, Patient Name/Phone/Doctor, Subtotal, CGST, SGST, IGST, Round Off, Grand Total, Payment Mode, Dispensed Strips and Dispensed Loose Tablets.
- `Vendor`: Company Name, Contact, GSTIN, Drug License Number, Outstanding Balance.
- `DpdpAuditLog`: Patient ID, Action, Operator ID, Consent Timestamp, Access Reason.

### Core Modules To Implement
1. `src/types/pharmacy.ts`: Complete TypeScript interfaces, Prisma schema matching, API contracts, GST calculation helpers, and dual-unit formatters.
2. `src/components/pos/PosBillingView.tsx`: Full POS billing interface with global barcode listener, manual medicine picker, loose tablet switch, doctor prescription drawer, invoice summary, and instant thermal/A4 print views.
3. `src/components/analytics/AnalyticsDashboard.tsx`: High-density dashboard featuring real-time revenue cards, fastest-moving medicines chart, 30/60/90-day expiry triage table, low-stock reorder alerts, and role-based metric hiding for Assistants.
4. `src/components/inventory/InventoryManagement.tsx`: Stock directory with dual-unit "X Strips, Y Tablets remaining" indicators, batch intake form, and HSN/barcode management.
5. `src/components/vendors/VendorManagement.tsx`: Vendor directory, ledger balance dues, and stock inwarding.
6. `src/components/print/PrintTemplates.tsx`: Dual 80mm thermal receipt and A4 GST tax invoice templates with pure CSS print media rules.
7. `src/data/seedData.ts`: Essential generic Indian medicines dataset pre-seeded for testing barcode scanning, batch expiry zones, and sales.
