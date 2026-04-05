import { useCallback, useSyncExternalStore } from 'react'
import { Card } from '../../../shared/components/Card'
import { applyPaletteById, getStoredPaletteId, setStoredPaletteId } from '../../../app/theme/applyPalette'
import { DEFAULT_THEME_ID, THEME_PALETTES } from '../../../app/theme/palettes'
import type { ThemePalette } from '../../../app/theme/types'

const SWATCH_KEYS = ['--bg', '--panel', '--primary', '--text'] as const

function subscribeThemeStorage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('2d10-theme-changed', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('2d10-theme-changed', onStoreChange)
  }
}

function getThemeSnapshot(): string {
  return getStoredPaletteId()
}

function getServerSnapshot(): string {
  return DEFAULT_THEME_ID
}

function dispatchThemeChanged() {
  window.dispatchEvent(new Event('2d10-theme-changed'))
}

function PalettePreview(props: { palette: ThemePalette }) {
  const { vars } = props.palette
  return (
    <div className="theme-palette-swatches" aria-hidden="true">
      {SWATCH_KEYS.map((k) => (
        <span key={k} className="theme-palette-swatch" style={{ background: vars[k] }} />
      ))}
    </div>
  )
}

export function OptionsPage() {
  const selectedId = useSyncExternalStore(subscribeThemeStorage, getThemeSnapshot, getServerSnapshot)

  const selectPalette = useCallback((id: string) => {
    if (!applyPaletteById(id)) return
    setStoredPaletteId(id)
    dispatchThemeChanged()
  }, [])

  return (
    <Card title="Options">
      <section className="theme-palette-section" aria-labelledby="theme-palette-heading">
        <h4 id="theme-palette-heading" className="theme-palette-heading">
          Choix de palette de couleurs
        </h4>
        <p className="theme-palette-intro">Choix enregistré sur cet appareil.</p>
        <div className="theme-palette-grid" role="radiogroup" aria-label="Palette de l’interface">
          {THEME_PALETTES.map((p) => {
            const selected = p.id === selectedId
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`theme-palette-card${selected ? ' theme-palette-card--active' : ''}`}
                onClick={() => selectPalette(p.id)}
              >
                <PalettePreview palette={p} />
                <span className="theme-palette-card-body">
                  <span className="theme-palette-card-title">{p.label}</span>
                  {p.description ? (
                    <span className="theme-palette-card-desc">{p.description}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </Card>
  )
}
