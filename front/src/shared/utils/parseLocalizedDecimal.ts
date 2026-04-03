/** Accepte la virgule comme séparateur décimal (ex. `0,5`), ou le point. */
export function parseLocalizedDecimalString(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const normalized = s.includes(',') ? s.replace(',', '.') : s
  const n = Number.parseFloat(normalized)
  if (Number.isNaN(n) || n < 0) return null
  return n
}
