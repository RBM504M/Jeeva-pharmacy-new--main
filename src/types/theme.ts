export type ThemeId = 'CLASSIC_NAVY' | 'EMERALD_CLINICAL' | 'OBSIDIAN_SLATE';

export interface ThemeColors {
  sidebarBg: string;
  sidebarBorder: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarActiveBg: string;
  sidebarText: string;
  sidebarTextMuted: string;
  headerBg: string;
  headerBorder: string;
  headerSearchBg: string;
  headerSearchBorder: string;
  accentPrimary: string;
  accentSecondary: string;
  accentRing: string;
  workspaceBg: string;
  badgeBg: string;
  badgeText: string;
  previewGradient: string;
  swatches: string[];
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  category: string;
  accentLabel: string;
  colors: ThemeColors;
}

export const AVAILABLE_THEMES: Record<ThemeId, ThemeDefinition> = {
  CLASSIC_NAVY: {
    id: 'CLASSIC_NAVY',
    name: 'Jeeva Classic Navy',
    tagline: 'Executive Standard POS & Retail Billing',
    description: 'Deep midnight navy sidebar with crisp sky-blue accents and balanced contrast. The battle-tested standard for fast daytime pharmacy counters.',
    category: 'Standard Commercial',
    accentLabel: 'Sky Blue & Emerald',
    colors: {
      sidebarBg: '#071326',
      sidebarBorder: '#0d2242',
      sidebarHover: '#0e2447',
      sidebarActive: '#0084ff',
      sidebarActiveBg: '#0084ff',
      sidebarText: '#94a3b8',
      sidebarTextMuted: '#64748b',
      headerBg: '#0b1c38',
      headerBorder: '#122b52',
      headerSearchBg: '#132c54',
      headerSearchBorder: '#1b3d75',
      accentPrimary: '#0084ff',
      accentSecondary: '#10b981',
      accentRing: 'rgba(0, 132, 255, 0.4)',
      workspaceBg: '#f5f7fa',
      badgeBg: '#e0f2fe',
      badgeText: '#0369a1',
      previewGradient: 'from-[#071326] via-[#0b1c38] to-[#0084ff]',
      swatches: ['#071326', '#0b1c38', '#0084ff', '#10b981', '#f5f7fa'],
    },
  },
  EMERALD_CLINICAL: {
    id: 'EMERALD_CLINICAL',
    name: 'Emerald Clinical',
    tagline: 'Hospital, Wellness & Clinical Chemist',
    description: 'Deep botanical pine sidebar with clinical emerald green accents and a fresh, calming workspace. Ideal for healthcare-centric retail stores and hospital pharmacies.',
    category: 'Healthcare & Wellness',
    accentLabel: 'Clinical Emerald & Teal',
    colors: {
      sidebarBg: '#05241b',
      sidebarBorder: '#0a3a2c',
      sidebarHover: '#0b3d2e',
      sidebarActive: '#059669',
      sidebarActiveBg: '#059669',
      sidebarText: '#86efac',
      sidebarTextMuted: '#529e7c',
      headerBg: '#083327',
      headerBorder: '#0e4a38',
      headerSearchBg: '#0d4233',
      headerSearchBorder: '#145c47',
      accentPrimary: '#059669',
      accentSecondary: '#0d9488',
      accentRing: 'rgba(5, 150, 105, 0.4)',
      workspaceBg: '#f2f7f4',
      badgeBg: '#d1fae5',
      badgeText: '#065f46',
      previewGradient: 'from-[#05241b] via-[#083327] to-[#059669]',
      swatches: ['#05241b', '#083327', '#059669', '#0d9488', '#f2f7f4'],
    },
  },
  OBSIDIAN_SLATE: {
    id: 'OBSIDIAN_SLATE',
    name: 'Obsidian Slate',
    tagline: 'Low-Glare Terminal & Night Shift Counter',
    description: 'Charcoal obsidian sidebar with high-visibility electric indigo and amber highlights. Engineered to minimize eye fatigue during extended 12-hour shifts and 24/7 night counters.',
    category: 'Night Counter & Pro Terminal',
    accentLabel: 'Electric Indigo & Amber',
    colors: {
      sidebarBg: '#0a0f1d',
      sidebarBorder: '#151e36',
      sidebarHover: '#17213b',
      sidebarActive: '#6366f1',
      sidebarActiveBg: '#6366f1',
      sidebarText: '#94a3b8',
      sidebarTextMuted: '#64748b',
      headerBg: '#0e162b',
      headerBorder: '#1c2b50',
      headerSearchBg: '#172342',
      headerSearchBorder: '#233563',
      accentPrimary: '#6366f1',
      accentSecondary: '#f59e0b',
      accentRing: 'rgba(99, 102, 241, 0.4)',
      workspaceBg: '#edf2f7',
      badgeBg: '#ede9fe',
      badgeText: '#4338ca',
      previewGradient: 'from-[#0a0f1d] via-[#0e162b] to-[#6366f1]',
      swatches: ['#0a0f1d', '#0e162b', '#6366f1', '#f59e0b', '#edf2f7'],
    },
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'CLASSIC_NAVY';

export function getTheme(id?: ThemeId | null): ThemeDefinition {
  if (id && AVAILABLE_THEMES[id]) {
    return AVAILABLE_THEMES[id];
  }
  return AVAILABLE_THEMES[DEFAULT_THEME_ID];
}
