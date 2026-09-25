import type { ReferentielLanguage } from '../../app/providers/LanguageProvider'

/**
 * Sélectionne le champ FR ou EN selon la langue courante du référentiel.
 * En FR, retombe sur l'anglais si la traduction n'existe pas encore (jamais de champ vide).
 */
export function pickLang(
  language: ReferentielLanguage,
  fr: string | null | undefined,
  en: string | null | undefined,
): string | null {
  if (language === 'fr') {
    const frTrimmed = fr?.trim()
    if (frTrimmed) return frTrimmed
  }
  return en ?? null
}
