import { useLanguage } from '../hooks/useLanguage'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="tabs-row" style={{ margin: 0 }} role="group" aria-label="Langue du référentiel">
      <button
        type="button"
        className={`tab-btn ${language === 'fr' ? 'active' : ''}`}
        title="Référentiels en français"
        onClick={() => setLanguage('fr')}
      >
        FR
      </button>
      <button
        type="button"
        className={`tab-btn ${language === 'en' ? 'active' : ''}`}
        title="Référentiels en anglais"
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}
