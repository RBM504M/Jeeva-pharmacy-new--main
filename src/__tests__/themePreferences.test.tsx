import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PharmacyProvider, usePharmacy } from '../context/PharmacyContext';
import { SettingsView } from '../components/settings/SettingsView';
import { AVAILABLE_THEMES, ThemeId } from '../types/theme';

describe('Professional 3 Themes & Display Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('1. Provides 3 curated professional themes with complete color tokens', () => {
    const themeIds = Object.keys(AVAILABLE_THEMES);
    expect(themeIds).toHaveLength(3);
    expect(themeIds).toContain('CLASSIC_NAVY');
    expect(themeIds).toContain('EMERALD_CLINICAL');
    expect(themeIds).toContain('OBSIDIAN_SLATE');

    for (const id of themeIds as ThemeId[]) {
      const t = AVAILABLE_THEMES[id];
      expect(t.name).toBeTruthy();
      expect(t.colors.sidebarBg).toMatch(/^#/);
      expect(t.colors.headerBg).toMatch(/^#/);
      expect(t.colors.accentPrimary).toMatch(/^#/);
      expect(t.colors.swatches.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('2. SettingsView renders 3 theme cards and switches active theme seamlessly', () => {
    render(
      <PharmacyProvider>
        <SettingsView initialTab="THEME_SETTINGS" />
      </PharmacyProvider>
    );

    // Verify all 3 theme titles render
    expect(screen.getAllByText('Jeeva Classic Navy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Emerald Clinical').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Obsidian Slate').length).toBeGreaterThanOrEqual(1);

    // Default theme should be Active
    expect(screen.getByText('Current Active:')).toBeInTheDocument();

    // Click "Emerald Clinical" card
    const emeraldCard = screen.getByText('Emerald Clinical').closest('div[class*="rounded-xl"]');
    expect(emeraldCard).not.toBeNull();
    fireEvent.click(emeraldCard!);

    // Verify data-theme attribute updated on documentElement
    expect(document.documentElement.getAttribute('data-theme')).toBe('EMERALD_CLINICAL');

    // Verify localStorage updated
    expect(localStorage.getItem('jeeva_pharmacy_theme_v1')).toBe('EMERALD_CLINICAL');

    // Click "Obsidian Slate" card
    const obsidianCard = screen.getByText('Obsidian Slate').closest('div[class*="rounded-xl"]');
    expect(obsidianCard).not.toBeNull();
    fireEvent.click(obsidianCard!);

    expect(document.documentElement.getAttribute('data-theme')).toBe('OBSIDIAN_SLATE');
    expect(localStorage.getItem('jeeva_pharmacy_theme_v1')).toBe('OBSIDIAN_SLATE');
  });

  it('3. Renders counter display & POS preferences toggles', () => {
    render(
      <PharmacyProvider>
        <SettingsView initialTab="THEME_SETTINGS" />
      </PharmacyProvider>
    );

    expect(screen.getByText('Counter Display & POS Grid Preferences')).toBeInTheDocument();
    expect(screen.getByText('Compact Billing Grid (25+ Rows)')).toBeInTheDocument();
    expect(screen.getByText('Show Generic Salt under Brand Name')).toBeInTheDocument();
    expect(screen.getByText('Schedule H / H1 / X Warning Badges')).toBeInTheDocument();
    expect(screen.getByText('Hardware Barcode Audio Confirmation')).toBeInTheDocument();
  });
});
