/** Canonical lookup form: trim, apply compatibility normalization, then ignore case. */
export function normalizePersonId(value: string): string {
  return value.trim().normalize("NFKC").toLocaleUpperCase("en-US");
}
