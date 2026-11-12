import type { FogShape } from '../fog'
import type { useFogEditor } from '../useFogEditor'
import type { MapZone } from './MapCanvas'

const SHAPES: [FogShape, string][] = [
  ['rect', 'Rectangle'],
  ['poly', 'Polygone'],
  ['brush', 'Pinceau'],
]

/** Réglages des outils Fog / Gomme, communs à l'éditeur de carte et à la session. */
export function FogToolbar(props: {
  fog: ReturnType<typeof useFogEditor>
  shape: FogShape
  onShapeChange: (s: FogShape) => void
  brush: number
  onBrushChange: (cells: number) => void
  /** En session : zones préparées dans l'éditeur, révélables d'un clic. */
  zones?: MapZone[]
}) {
  const { fog, shape, onShapeChange, brush, onBrushChange, zones = [] } = props
  const disabled = !fog.mask
  return (
    <>
      <div role="group" aria-label="Forme" style={{ display: 'flex', gap: '0.25rem' }}>
        {SHAPES.map(([s, label]) => (
          <button key={s} type="button" className={`btn btn-small${shape === s ? '' : ' btn-secondary'}`} aria-pressed={shape === s} onClick={() => onShapeChange(s)}>
            {label}
          </button>
        ))}
      </div>
      {shape === 'brush' ? (
        <label style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span style={{ opacity: 0.8 }}>Taille</span>
          <input type="range" min={0.5} max={10} step={0.5} value={brush} onChange={(e) => onBrushChange(Number.parseFloat(e.target.value))} />
          <span style={{ minWidth: '4.5em' }}>{brush} case{brush > 1 ? 's' : ''}</span>
        </label>
      ) : null}
      {shape === 'poly' ? <span style={{ color: 'var(--muted)', fontSize: 13 }}>Clic par sommet, double-clic ou clic sur le 1er sommet pour fermer, Échap pour annuler.</span> : null}
      <button type="button" className="btn btn-secondary btn-small" onClick={fog.undo} disabled={!fog.canUndo} title="Annuler la dernière modification du brouillard">
        Annuler
      </button>
      <button type="button" className="btn btn-secondary btn-small" onClick={fog.coverAll} disabled={disabled}>
        Tout couvrir
      </button>
      <button type="button" className="btn btn-secondary btn-small" onClick={fog.clearAll} disabled={disabled}>
        Tout révéler
      </button>
      {zones.length ? (
        <div role="group" aria-label="Zones" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ opacity: 0.8 }}>Révéler :</span>
          {zones.map((z) => (
            <button key={z.id} type="button" className="btn btn-secondary btn-small" disabled={disabled} onClick={() => fog.apply({ shape: 'poly', erase: true, points: z.points })}>
              {z.name}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}
