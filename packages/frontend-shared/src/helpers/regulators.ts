export const REGULATORS = [
  { value: "fca", code: "FCA", jurisdiction: "United Kingdom" },
  { value: "cysec", code: "CySEC", jurisdiction: "Cyprus" },
  { value: "asic", code: "ASIC", jurisdiction: "Australia" },
  { value: "fsca", code: "FSCA", jurisdiction: "South Africa" },
  { value: "fsc_mauritius", code: "FSC", jurisdiction: "Mauritius" },
  { value: "fsc_bvi", code: "FSC", jurisdiction: "British Virgin Islands" },
  { value: "dfsa", code: "DFSA", jurisdiction: "Dubai, UAE" },
  { value: "finma", code: "FINMA", jurisdiction: "Switzerland" },
  { value: "bafin", code: "BaFin", jurisdiction: "Germany" },
  { value: "cftc_nfa", code: "CFTC/NFA", jurisdiction: "United States" },
  { value: "mas", code: "MAS", jurisdiction: "Singapore" },
  { value: "cima", code: "CIMA", jurisdiction: "Cayman Islands" },
  { value: "ifsc", code: "IFSC", jurisdiction: "Belize" },
  { value: "vfsc", code: "VFSC", jurisdiction: "Vanuatu" },
  { value: "scb", code: "SCB", jurisdiction: "Bahamas" },
  { value: "fsa_seychelles", code: "FSA", jurisdiction: "Seychelles" },
  { value: "jfsa", code: "JFSA", jurisdiction: "Japan" },
  { value: "cbi", code: "CBI", jurisdiction: "Ireland" },
  { value: "cnmv", code: "CNMV", jurisdiction: "Spain" },
  { value: "consob", code: "CONSOB", jurisdiction: "Italy" },
  { value: "amf", code: "AMF", jurisdiction: "France" },
] as const;

export const REGULATOR_LABELS: Record<string, string> = Object.fromEntries(
  REGULATORS.map((r) => [r.value, `${r.code} (${r.jurisdiction})`]),
);

export function regulatorInfo(value: string): { code: string; jurisdiction: string } {
  const r = REGULATORS.find((x) => x.value === value);
  return r ? { code: r.code, jurisdiction: r.jurisdiction } : { code: value, jurisdiction: "" };
}
