import { createContext, useEffect, useState, type ReactNode } from 'react'

export type ReferentielLanguage = 'fr' | 'en'

type LanguageContextValue = {
  language: ReferentielLanguage
  setLanguage: (lang: ReferentielLanguage) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'referentiel_language'

function readStoredLanguage(): ReferentielLanguage {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<ReferentielLanguage>(readStoredLanguage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // stockage indisponible (navigation privée...) : la préférence ne persiste pas, sans impact fonctionnel
    }
  }, [language])

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}
