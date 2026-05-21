export const PREDEFINED_KEY_MAP: Record<string, string> = {
  "Databehandleravtale": "catDatabehandleravtale",
  "Husleieavtale": "catHusleieavtale",
  "Samarbeidsavtale": "catSamarbeidsavtale",
  "Tjenesteavtale": "catTjenesteavtale",
  "Konfidensialitetsavtale (NDA)": "catKonfidensialitetsavtale",
  "Arbeidsavtale": "catArbeidsavtale",
}

export function getCategoryDisplayName(
  cat: { name: string; is_predefined?: boolean },
  t: (key: string) => string
): string {
  if (!cat.is_predefined) return cat.name
  const key = PREDEFINED_KEY_MAP[cat.name]
  return key ? t(key) : cat.name
}
