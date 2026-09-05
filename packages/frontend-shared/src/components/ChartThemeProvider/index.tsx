"use client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useMemo, type ReactNode } from "react";
import { useTheme as useAppTheme } from "@/contexts/ThemeContext";

// @mui/x-charts pulls its default axis/legend/tooltip colors straight from
// an MUI theme (theme.palette.text.primary, .divider, etc). This app has no
// MuiThemeProvider anywhere else — it themes via a `data-theme` attribute +
// CSS variables — so without this, charts silently fall back to MUI's
// built-in *light* palette regardless of the app's actual dark/light state.
// These values are hand-matched to app/globals.css's --text-primary,
// --text-secondary, --border and --bg-card for each theme.
const PALETTES = {
  dark: {
    mode: "dark" as const,
    text: { primary: "#f0f0f0", secondary: "#a0a0a0", disabled: "#666666" },
    divider: "#252525",
    background: { paper: "#161616", default: "#0a0a0a" },
  },
  light: {
    mode: "light" as const,
    text: { primary: "#111111", secondary: "#666666", disabled: "#999999" },
    divider: "#e5e7eb",
    background: { paper: "#ffffff", default: "#ffffff" },
  },
};

export default function ChartThemeProvider({ children }: { children: ReactNode }) {
  const { theme } = useAppTheme();
  const muiTheme = useMemo(() => createTheme({ palette: PALETTES[theme] }), [theme]);
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
