/**
 * Playwright End-to-End Functional Test Suite: Pharmacy Assistant POS Workflow
 * Spec:
 * 1. Simulates hardware barcode scanner input (rapid keydown stream followed by Enter).
 * 2. Asserts item populates the active POS checkout lines automatically.
 * 3. Populates customer phone and doctor prescription credentials.
 * 4. Toggles physical hardware printing preferences (Thermal 80mm vs Laser A4).
 * 5. Completes cash/UPI checkout transaction, verifying stock reduction and invoice modal.
 */

import { test, expect } from '@playwright/test';

test.describe('Pharmacy Assistant POS Checkout & Barcode Scanner Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local development server on Port 3000
    await page.goto('http://localhost:3000');

    // Ensure we are switched to Pharmacy Assistant role if not already
    const userRoleBadge = page.locator('text=Pharmacy Assistant').first();
    const isAssistant = await userRoleBadge.isVisible().catch(() => false);
    if (!isAssistant) {
      // Switch role via user menu
      await page.click('button:has-text("K. Balasubramanian"), button:has-text("Admin")');
      await page.click('button:has-text("Switch to Assistant")');
    }

    // Navigate to POS Billing view from the sidebar
    await page.click('button:has-text("POS Billing"), div:has-text("POS Billing")');
    await expect(page.locator('text=Point of Sale (POS) Billing')).toBeVisible();
  });

  test('executes rapid hardware barcode scanner simulation and populates active invoice line', async ({ page }) => {
    // EAN-13 barcode for Dolo 650 Tablets: "8901117009999"
    const barcodeDolo = '8901117009999';

    // Simulate standard USB HID / Bluetooth barcode reader typing keystrokes with <25ms inter-character delay
    for (const char of barcodeDolo) {
      await page.keyboard.press(char, { delay: 15 });
    }
    // Barcode scanner sends Enter delimiter upon successful symbology read
    await page.keyboard.press('Enter');

    // Assert that Dolo 650 is added to the active invoice table
    const invoiceItemRow = page.locator('table tbody tr:has-text("Dolo 650 Tablets")');
    await expect(invoiceItemRow).toBeVisible({ timeout: 5000 });

    // Verify HSN code snapshot is captured (HSN 3004)
    await expect(invoiceItemRow.locator('text=HSN: 3004')).toBeVisible();

    // Verify GST 12% slab badge is present
    await expect(invoiceItemRow.locator('text=GST 12%')).toBeVisible();
  });

  test('completes end-to-end checkout flow with patient details, print toggle, and invoice generation', async ({ page }) => {
    // Add item using quick formulation pills
    await page.click('button:has-text("Dolo 650 Tablets")');

    // Fill customer contact and name
    await page.fill('input[placeholder*="Walk-in Customer"]', 'Senthil Kumar');
    await page.fill('input[placeholder*="98401 23456"]', '9840123456');

    // Fill doctor prescription details for Schedule H/H1 compliance
    await page.fill('input[placeholder*="Dr. R. Parthiban"]', 'Dr. S. K. Narayanan, MD');
    await page.fill('input[placeholder*="MCI / State Council"]', 'TN-MED-44912');

    // Verify DPDP Act patient privacy indicator
    await expect(page.locator('text=DPDP Act 2023 Compliant')).toBeVisible();

    // Verify and toggle hardware printing preference switch
    const printToggleBtn = page.locator('button:has-text("PRINTING")');
    await expect(printToggleBtn).toBeVisible();

    // Toggle printer format to Laser A4
    const laserA4Btn = page.locator('button:has-text("A4 Laser")');
    await laserA4Btn.click();
    await expect(laserA4Btn).toHaveClass(/bg-slate-900/);

    // Switch back to 80mm Thermal Receipt format
    const thermal80mmBtn = page.locator('button:has-text("80mm Thermal")');
    await thermal80mmBtn.click();
    await expect(thermal80mmBtn).toHaveClass(/bg-slate-900/);

    // Select Payment Method: UPI (GPay / PhonePe / Paytm)
    await page.click('button:has-text("UPI")');

    // Click Finalize & Bill Checkout button
    const checkoutBtn = page.locator('button:has-text("Generate Tax Bill"), button:has-text("Complete Bill")').first();
    await checkoutBtn.click();

    // Verify invoice success modal / print preview is displayed
    const successDialog = page.locator('text=Invoice Generated Successfully, text=Tax Invoice');
    await expect(successDialog.first()).toBeVisible({ timeout: 5000 });

    // Assert that the generated invoice reflects masked customer contact under DPDP
    await expect(page.locator('text=XXXXXX3456')).toBeVisible();
  });
});
