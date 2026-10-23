/**
 * Playwright End-to-End Functional Test Suite: Role-Based Access Control (RBAC)
 * Spec:
 * 1. Validates that Pharmacy Assistant is hard-blocked from viewing the Executive Analytics Dashboard.
 * 2. Confirms financial margins, cost prices, and purchase financials are strictly hidden from Assistant.
 * 3. Switches to Chief Pharmacist / Admin role and asserts full access to executive metrics.
 */

import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) Security Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('hard-blocks Pharmacy Assistant from accessing the Executive Analytics Dashboard', async ({ page }) => {
    // 1. Switch to Pharmacy Assistant role
    const userRoleMenu = page.locator('button:has-text("K. Balasubramanian"), button:has-text("Admin")').first();
    if (await userRoleMenu.isVisible()) {
      await userRoleMenu.click();
      await page.click('button:has-text("Switch to Assistant")');
    }

    // 2. Verify current active user is Pharmacy Assistant
    await expect(page.locator('text=Pharmacy Assistant').first()).toBeVisible();

    // 3. Attempt to navigate to Executive Analytics
    const analyticsNavBtn = page.locator('button:has-text("Analytics"), div:has-text("Analytics")').first();
    await analyticsNavBtn.click();

    // 4. Assert that the Assistant is hard-blocked by the RBAC guard
    const accessDeniedBanner = page.locator('text=Access Restricted, text=Admin Clearance Required, text=Access Denied');
    await expect(accessDeniedBanner.first()).toBeVisible();

    // 5. Verify that sensitive financial metrics (Gross Margin %, Revenue ₹, Net Profit) are NOT rendered
    await expect(page.locator('text=Total Gross Margin')).not.toBeVisible();
    await expect(page.locator('text=Net Profit')).not.toBeVisible();
  });

  test('allows Admin (Chief Pharmacist) full access to Executive Analytics and margin analysis', async ({ page }) => {
    // 1. Ensure user is in Admin role
    const assistantBadge = page.locator('text=Pharmacy Assistant').first();
    if (await assistantBadge.isVisible()) {
      await page.click('button:has-text("P. Vignesh"), button:has-text("Assistant")');
      await page.click('button:has-text("Switch to Admin")');
    }

    // 2. Verify Admin identity
    await expect(page.locator('text=Admin (Chief Pharmacist)').first()).toBeVisible();

    // 3. Navigate to Analytics Dashboard
    const analyticsNavBtn = page.locator('button:has-text("Analytics"), div:has-text("Analytics")').first();
    await analyticsNavBtn.click();

    // 4. Verify Executive Analytics Dashboard metrics load successfully
    await expect(page.locator('text=Executive Analytics, text=Financial Analytics').first()).toBeVisible();
    await expect(page.locator('text=Gross Margin, text=Revenue').first()).toBeVisible();
    await expect(page.locator('text=Fastest-Moving Medicines, text=Fast-Moving').first()).toBeVisible();
    await expect(page.locator('text=Expiry Risk Watchlist, text=Critical Expiry').first()).toBeVisible();
  });

  test('masks Cost Price in Medicine Inventory when viewed by Pharmacy Assistant', async ({ page }) => {
    // 1. Switch to Pharmacy Assistant
    const userMenu = page.locator('button:has-text("K. Balasubramanian"), button:has-text("Admin")').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.click('button:has-text("Switch to Assistant")');
    }

    // 2. Open Inventory List
    await page.click('button:has-text("Products"), button:has-text("Inventory")');
    await page.click('text=Medicine List (Dual-Unit)');

    // 3. Assert Cost Price column shows protected placeholder "—" instead of raw supplier purchase prices
    const costPriceCells = page.locator('table tbody tr td:nth-child(5)');
    const firstCellText = await costPriceCells.first().innerText();
    expect(firstCellText.trim()).toBe('—');
  });
});
