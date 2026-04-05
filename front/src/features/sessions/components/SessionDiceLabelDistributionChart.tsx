import { useMemo } from 'react'

/** Champs minimaux pour agréger par personnage / joueur legacy */
export type DiceRollChartInput = {
  total: number
  label: string | null
  user_id: number
  username: string | null
  character_id: number | null
  character_name: string | null
}

function rollBucket(r: DiceRollChartInput, groupByPlayer: boolean): { key: string; displayName: string } {
  if (groupByPlayer) {
    const uid = r.user_id
    const dn = (r.username ?? `Joueur #${uid}`).trim() || `Joueur #${uid}`
    return { key: `u:${uid}`, displayName: dn }
  }
  if (r.character_id != null && Number.isFinite(r.character_id)) {
    const dn = (r.character_name?.trim() || `Personnage #${r.character_id}`).trim()
    return { key: `c:${r.character_id}`, displayName: dn || `Personnage #${r.character_id}` }
  }
  const uid = r.user_id
  const dn = (r.username ?? `Joueur #${uid}`).trim() || `Joueur #${uid}`
  return { key: `u:${uid}`, displayName: dn }
}

const STROKE_COLORS = [
  '#818cf8',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#a78bfa',
  '#fb923c',
  '#94a3b8',
]

type SeriesModel = { key: string; displayName: string; points: { x: number; y: number }[] }

function buildModel(
  rolls: DiceRollChartInput[],
  labelExact: string,
  groupByPlayer: boolean,
): { xs: number[]; series: SeriesModel[] } | null {
  const filtered = rolls.filter((r) => (r.label?.trim() ?? '') === labelExact)
  if (filtered.length === 0) return null

  let minV = Infinity
  let maxV = -Infinity
  for (const r of filtered) {
    minV = Math.min(minV, r.total)
    maxV = Math.max(maxV, r.total)
  }
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) return null

  const xs: number[] = []
  for (let v = minV; v <= maxV; v += 1) xs.push(v)

  const byChar = new Map<string, { displayName: string; totals: number[] }>()
  for (const r of filtered) {
    const { key, displayName } = rollBucket(r, groupByPlayer)
    const b = byChar.get(key) ?? { displayName, totals: [] }
    b.totals.push(r.total)
    b.displayName = displayName
    byChar.set(key, b)
  }

  const series: SeriesModel[] = [...byChar.entries()].map(([key, { displayName, totals }]) => {
    const freq = new Map<number, number>()
    for (const t of totals) freq.set(t, (freq.get(t) ?? 0) + 1)
    const points = xs.map((x) => ({ x, y: freq.get(x) ?? 0 }))
    return { key, displayName, points }
  })

  series.sort((a, b) => {
    const ya = a.points.reduce((s, p) => s + p.y, 0)
    const yb = b.points.reduce((s, p) => s + p.y, 0)
    return yb - ya
  })

  return { xs, series }
}

const VB_W = 400
const VB_H = 200
const M = { left: 34, right: 10, top: 14, bottom: 36 }

export function SessionDiceLabelDistributionChart(props: {
  title: string
  rolls: DiceRollChartInput[]
  labelExact: string
  emptyMessage: string
  /** Propriétaire de session : une courbe par compte joueur (nom d’utilisateur). */
  groupByPlayer?: boolean
}) {
  const { title, rolls, labelExact, emptyMessage, groupByPlayer = false } = props

  const model = useMemo(() => buildModel(rolls, labelExact, groupByPlayer), [rolls, labelExact, groupByPlayer])

  if (!model) {
    return (
      <div className="session-dice-chart-block">
        <h4 className="session-dice-stats-section-title">{title}</h4>
        <p className="session-dice-stats-empty session-dice-stats-empty-inline">{emptyMessage}</p>
      </div>
    )
  }

  const { xs, series } = model
  const plotW = VB_W - M.left - M.right
  const plotH = VB_H - M.top - M.bottom
  const xMin = xs[0]!
  const xMax = xs[xs.length - 1]!
  const xSpan = Math.max(1, xMax - xMin)
  let yMax = 0
  for (const s of series) {
    for (const p of s.points) yMax = Math.max(yMax, p.y)
  }
  yMax = Math.max(1, yMax)

  const xScale = (x: number) => M.left + ((x - xMin) / xSpan) * plotW
  const yScale = (y: number) => M.top + plotH - (y / yMax) * plotH

  const xTicks: number[] = []
  const tickCount = Math.min(7, xs.length)
  if (tickCount <= 1) xTicks.push(xMin)
  else {
    const step = (xMax - xMin) / (tickCount - 1)
    for (let i = 0; i < tickCount; i += 1) {
      xTicks.push(Math.round(xMin + step * i))
    }
  }

  return (
    <div className="session-dice-chart-block">
      <h4 className="session-dice-stats-section-title">{title}</h4>
      <p className="session-dice-chart-axis-hint">
        Axe horizontal : total du jet · Axe vertical : nombre de jets à ce total (
        {groupByPlayer ? 'par joueur' : 'par personnage'}).
      </p>
      <svg
        className="session-dice-distribution-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={`Courbe de répartition des totaux pour ${labelExact}`}
      >
        <title>Répartition des totaux — {labelExact}</title>
        {/* Axes */}
        <line
          x1={M.left}
          y1={M.top + plotH}
          x2={M.left + plotW}
          y2={M.top + plotH}
          className="session-dice-chart-axis"
        />
        <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + plotH} className="session-dice-chart-axis" />
        {/* Y grid + labels */}
        {Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * yMax))))
          .sort((a, b) => a - b)
          .map((yVal) => {
            const py = yScale(yVal)
            return (
              <g key={`gy-${yVal}`}>
                <line
                  x1={M.left}
                  y1={py}
                  x2={M.left + plotW}
                  y2={py}
                  className="session-dice-chart-grid"
                />
                <text x={M.left - 6} y={py + 4} textAnchor="end" className="session-dice-chart-tick">
                  {yVal}
                </text>
              </g>
            )
          })}
        {/* X tick labels */}
        {xTicks.map((xv) => {
          const px = xScale(xv)
          return (
            <text key={`x-${xv}`} x={px} y={VB_H - 10} textAnchor="middle" className="session-dice-chart-tick">
              {xv}
            </text>
          )
        })}
        <text
          x={M.left + plotW / 2}
          y={VB_H - 2}
          textAnchor="middle"
          className="session-dice-chart-axis-label"
        >
          Total
        </text>
        <text
          x={10}
          y={M.top + plotH / 2}
          textAnchor="middle"
          className="session-dice-chart-axis-label session-dice-chart-axis-label--y"
          transform={`rotate(-90, 10, ${M.top + plotH / 2})`}
        >
          Jets
        </text>
        {/* Series */}
        {series.map((s, idx) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.x).toFixed(2)} ${yScale(p.y).toFixed(2)}`)
            .join(' ')
          const color = STROKE_COLORS[idx % STROKE_COLORS.length]!
          return (
            <path
              key={s.key}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="session-dice-chart-line"
            />
          )
        })}
        {/* Points (visible when y > 0) */}
        {series.flatMap((s, sidx) => {
          const color = STROKE_COLORS[sidx % STROKE_COLORS.length]!
          return s.points
            .filter((p) => p.y > 0)
            .map((p) => (
              <circle
                key={`${s.key}-${p.x}`}
                cx={xScale(p.x)}
                cy={yScale(p.y)}
                r={3}
                fill={color}
                className="session-dice-chart-dot"
              />
            ))
        })}
      </svg>
      <ul className="session-dice-chart-legend">
        {series.map((s, idx) => (
          <li key={s.key}>
            <span className="session-dice-chart-legend-swatch" style={{ background: STROKE_COLORS[idx % STROKE_COLORS.length] }} />
            <span>{s.displayName}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
