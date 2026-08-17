// @mui/x-charts renders its own default (light) text/line colors since this
// app themes via a `data-theme` attribute + CSS variables rather than a MUI
// ThemeProvider — without this override, axis and legend text stay dark and
// disappear against the dark-mode background.
export const chartSx = {
  "& .MuiChartsAxis-tickLabel": { fill: "var(--text-secondary)" },
  "& .MuiChartsAxis-line": { stroke: "var(--border)" },
  "& .MuiChartsAxis-tick": { stroke: "var(--border)" },
  "& .MuiChartsGrid-line": { stroke: "var(--border-subtle)" },
  "& .MuiChartsLegend-series text": { fill: "var(--text-secondary) !important" },
  "& .MuiChartsLegend-label": { color: "var(--text-secondary)" },
};
