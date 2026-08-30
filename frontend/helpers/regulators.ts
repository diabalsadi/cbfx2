export const REGULATORS = [
  { value: "fca", label: "FCA (United Kingdom)" },
  { value: "cysec", label: "CySEC (Cyprus)" },
  { value: "asic", label: "ASIC (Australia)" },
  { value: "fsca", label: "FSCA (South Africa)" },
  { value: "fsc_mauritius", label: "FSC (Mauritius)" },
  { value: "fsc_bvi", label: "FSC (British Virgin Islands)" },
  { value: "dfsa", label: "DFSA (Dubai, UAE)" },
  { value: "finma", label: "FINMA (Switzerland)" },
  { value: "bafin", label: "BaFin (Germany)" },
  { value: "cftc_nfa", label: "CFTC / NFA (United States)" },
  { value: "mas", label: "MAS (Singapore)" },
  { value: "cima", label: "CIMA (Cayman Islands)" },
  { value: "ifsc", label: "IFSC (Belize)" },
  { value: "vfsc", label: "VFSC (Vanuatu)" },
  { value: "scb", label: "SCB (Bahamas)" },
  { value: "fsa_seychelles", label: "FSA (Seychelles)" },
  { value: "jfsa", label: "JFSA (Japan)" },
  { value: "cbi", label: "CBI (Ireland)" },
  { value: "cnmv", label: "CNMV (Spain)" },
  { value: "consob", label: "CONSOB (Italy)" },
  { value: "amf", label: "AMF (France)" },
] as const;

export const REGULATOR_LABELS: Record<string, string> = Object.fromEntries(
  REGULATORS.map((r) => [r.value, r.label]),
);
