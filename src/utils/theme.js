export const ACCENT_PRESETS = [
  "#C88856", // Editorial Terracotta (Default Light)
  "#D99A6C", // Editorial Amber (Default Dark)
  "#EF4444", // Coral Red
  "#2563EB", // Royal Blue
  "#0891B2", // Cyan
  "#0EA5E9", // Sky Blue
  "#4F46E5", // Indigo
  "#1E3A8A", // Deep Blue
  "#0369A1", // Ocean Blue
  "#65A30D", // Lime
  "#16A34A", // Green
  "#059669", // Emerald
  "#0F766E", // Teal
  "#475569", // Slate
  "#7C3AED", // Violet
  "#A855F7", // Purple
  "#C026D3", // Fuchsia
  "#DB2777", // Pink
  "#E11D48", // Rose
  "#B91C1C", // Dark Red
  "#CA8A04", // Gold
  "#EA580C", // Orange
  "#92400E", // Brown
  "#334155", // Dark Slate
  "#64748B", // Gray
  "#1E293B", // Charcoal
  "#0F172A", // Midnight
  "#000000", // Black
];

export const colors = ACCENT_PRESETS;

export const CATEGORY_CHART_SERIES = {
  light: ["#A3AE8B", "#D59665", "#966031", "#6C7555", "#C8B28E", "#7E6A55"],
  dark: ["#A3AE8B", "#D59665", "#B97A48", "#8C977A", "#C8B28E", "#A08A73"],
};

export const EDITORIAL_LIGHT = {
  homeBackground: "#F5EDDE",
  homeCard: "#FBF7EF",
  homeBorder: "#E1DACD",
  homeTrack: "#E5DECE",
  homeAccent: "#C88856",
  homeOnAccent: "#FFFDFA",
  homeIncome: "#6C7555",
  homeIncomeSoft: "#EEF3DF",
  homeExpense: "#966031",
  homeText: "#2B2827",
  homeTextSecondary: "#68635D",
  homeTextMuted: "#938C7F",
  homeDestructive: "#FB4A49",
  addSheetBackground: "#FFFDF9",
  addKeyBackground: "#F5F1EA",
  addOperatorKeyBackground: "#FBEEE7",
  homeCategory1: "#A3AE8B",
  homeCategory2: "#D59665",
  homeCategory3: "#966031",
  homeCategory4: "#6C7555",
  homeCategory5: "#C8B28E",
  homeCategory6: "#7E6A55",
};

export const EDITORIAL_DARK = {
  homeBackground: "#1A1714",
  homeCard: "#24201C",
  homeBorder: "#3A342D",
  homeTrack: "#332D27",
  homeAccent: "#D99A6C",
  homeOnAccent: "#FFFDFA",
  homeIncome: "#A3AE8B",
  homeIncomeSoft: "#2A2E22",
  homeExpense: "#D08A55",
  homeText: "#F2EADB",
  homeTextSecondary: "#C2B9AB",
  homeTextMuted: "#9A9286",
  homeDestructive: "#FF8A86",
  addSheetBackground: "#221E1A",
  addKeyBackground: "#2E2924",
  addOperatorKeyBackground: "#3A2B23",
  homeCategory1: "#A3AE8B",
  homeCategory2: "#D59665",
  homeCategory3: "#B97A48",
  homeCategory4: "#8C977A",
  homeCategory5: "#C8B28E",
  homeCategory6: "#A08A73",
};

export function buildTheme(mode = "light", customAccent = null) {
  const isDark = mode === "dark";
  const tokens = isDark ? { ...EDITORIAL_DARK } : { ...EDITORIAL_LIGHT };
  const accent = customAccent || tokens.homeAccent;
  tokens.homeAccent = accent;

  return {
    mode: isDark ? "dark" : "light",
    customAccent: customAccent || null,
    tokens,
    colors: {
      primary: accent,
      onPrimary: tokens.homeOnAccent,
      black: "#000000",
      white: "#ffffff",
      gray: tokens.homeTextMuted,
      bg: tokens.homeBackground,
      cardBg: tokens.homeCard,
      badgeBg: tokens.homeTrack,
      text: tokens.homeText,
      textTitle: tokens.homeText,
      textMuted: tokens.homeTextMuted,
      textSecondary: tokens.homeTextSecondary,
      textValue: tokens.homeText,
      border: tokens.homeBorder,
      borderDashed: tokens.homeBorder,
      headerBg: tokens.homeCard,
      sidebarBg: tokens.homeCard,
      income: tokens.homeIncome,
      incomeSoft: tokens.homeIncomeSoft,
      expense: tokens.homeExpense,
      destructive: tokens.homeDestructive,
    },
  };
}

export const theme = buildTheme("light", null);
export const lightTheme = theme;
export const darkTheme = buildTheme("dark", null);
export default theme;
