export const REGIONS = [
  { value: "north_america", label: "North America" },
  { value: "south_america", label: "South America" },
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "middle_east", label: "Middle East" },
];

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.value, r.label]),
);
