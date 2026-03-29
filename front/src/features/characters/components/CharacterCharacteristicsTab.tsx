import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet, apiPut } from '../../../shared/api/client'

const DND_5E_RACES = [
  'Humain',
  'Elfe',
  'Nain',
  'Halfelin',
  'Gnome',
  'Demi-elfe',
  'Demi-orc',
  'Drakéide',
  'Tieffelin',
]

const DND_5E_CLASSES = [
  'Barbare',
  'Barde',
  'Clerc',
  'Druide',
  'Ensorceleur',
  'Guerrier',
  'Magicien',
  'Moine',
  'Occultiste',
  'Paladin',
  'Rôdeur',
  'Roublard',
]

const DND_5E_SKILLS_FR: Array<{ key: string; label: string }> = [
  { key: 'ACROBATICS', label: 'Acrobaties' },
  { key: 'ANIMAL_HANDLING', label: 'Dressage' },
  { key: 'ARCANA', label: 'Arcanes' },
  { key: 'ATHLETICS', label: 'Athletisme' },
  { key: 'DECEPTION', label: 'Tromperie' },
  { key: 'HISTORY', label: 'Histoire' },
  { key: 'INSIGHT', label: 'Perspicacite' },
  { key: 'INTIMIDATION', label: 'Intimidation' },
  { key: 'INVESTIGATION', label: 'Investigation' },
  { key: 'MEDICINE', label: 'Medecine' },
  { key: 'NATURE', label: 'Nature' },
  { key: 'PERCEPTION', label: 'Perception' },
  { key: 'PERFORMANCE', label: 'Representation' },
  { key: 'PERSUASION', label: 'Persuasion' },
  { key: 'RELIGION', label: 'Religion' },
  { key: 'SLEIGHT_OF_HAND', label: 'Escamotage' },
  { key: 'STEALTH', label: 'Discretion' },
  { key: 'SURVIVAL', label: 'Survie' },
]

type AbilityScoreFormKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

/** Caractéristique associée (D&D 5e) pour calculer modificateur + maîtrise. */
const SKILL_ABILITY_KEY: Record<string, AbilityScoreFormKey> = {
  ACROBATICS: 'dexterity',
  ANIMAL_HANDLING: 'wisdom',
  ARCANA: 'intelligence',
  ATHLETICS: 'strength',
  DECEPTION: 'charisma',
  HISTORY: 'intelligence',
  INSIGHT: 'wisdom',
  INTIMIDATION: 'charisma',
  INVESTIGATION: 'intelligence',
  MEDICINE: 'wisdom',
  NATURE: 'intelligence',
  PERCEPTION: 'wisdom',
  PERFORMANCE: 'charisma',
  PERSUASION: 'charisma',
  RELIGION: 'intelligence',
  SLEIGHT_OF_HAND: 'dexterity',
  STEALTH: 'dexterity',
  SURVIVAL: 'wisdom',
}

/** Abrégés + classe CSS pour la couleur du nom de compétence (aligné sur les teintes session caractéristiques). */
const ABILITY_SKILL_DISPLAY: Record<AbilityScoreFormKey, { abbr: string; colorClass: string }> = {
  strength: { abbr: 'For.', colorClass: 'character-skill-ability-for' },
  dexterity: { abbr: 'Dex.', colorClass: 'character-skill-ability-dex' },
  constitution: { abbr: 'Con.', colorClass: 'character-skill-ability-con' },
  intelligence: { abbr: 'Int.', colorClass: 'character-skill-ability-int' },
  wisdom: { abbr: 'Sag.', colorClass: 'character-skill-ability-sag' },
  charisma: { abbr: 'Cha.', colorClass: 'character-skill-ability-cha' },
}

type CharacterDetail = {
  id: number
  name: string
  race?: string | null
  class?: string | null
  level?: number | null
  background?: string | null
  alignment?: string | null
  experiencePoints?: number | null
  hitPoints?: number | null
  hitPointsMax?: number | null
  currentHitPoints?: number | null
  hitDice?: string | null
  hitDiceRemaining?: number | null
  armorClass?: number | null
  speed?: number | null
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
  description?: string | null
  notes?: string | null
  skills?: Array<{
    skill: string
    mastery: 'NOT_PROFICIENT' | 'PROFICIENT' | 'EXPERTISE'
  }>
  savingThrows?: Array<{
    ability: string
    proficient: boolean
  }>
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function getModifier(scoreRaw: string): number {
  const score = Number(scoreRaw)
  if (Number.isNaN(score)) return 0
  return Math.floor((score - 10) / 2)
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod)
}

export function CharacterCharacteristicsTab(props: {
  characterId: string
  token: string
  onNameLoaded?: (name: string) => void
  sessionView?: boolean
  sessionId?: string
}) {
  const { characterId, token, onNameLoaded, sessionView = false, sessionId } = props
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    race: '',
    class: '',
    level: '',
    background: '',
    alignment: '',
    experiencePoints: '',
    hitPointsMax: '',
    currentHitPoints: '',
    hitDice: '',
    hitDiceRemaining: '',
    armorClass: '',
    speed: '',
    strength: '',
    dexterity: '',
    constitution: '',
    intelligence: '',
    wisdom: '',
    charisma: '',
    description: '',
    notes: '',
  })

  const [skillsState, setSkillsState] = useState<Record<string, { proficient: boolean; expertise: boolean }>>(() =>
    DND_5E_SKILLS_FR.reduce<Record<string, { proficient: boolean; expertise: boolean }>>((acc, item) => {
      acc[item.key] = { proficient: false, expertise: false }
      return acc
    }, {}),
  )

  const [savingThrowsState, setSavingThrowsState] = useState<Record<string, { proficient: boolean }>>(() =>
    ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].reduce<
      Record<string, { proficient: boolean }>
    >((acc, key) => {
      acc[key] = { proficient: false }
      return acc
    }, {}),
  )

  useEffect(() => {
    async function loadCharacter() {
      setLoading(true)
      try {
        const response = await apiGet<{ success: boolean; character: CharacterDetail }>(`/api/characters/${characterId}`, token)
        const c = response.character

        setForm({
          name: c.name ?? '',
          race: c.race ?? '',
          class: c.class ?? '',
          level: c.level != null ? String(c.level) : '',
          background: c.background ?? '',
          alignment: c.alignment ?? '',
          experiencePoints: c.experiencePoints != null ? String(c.experiencePoints) : '',
          hitPointsMax:
            c.hitPointsMax != null ? String(c.hitPointsMax) : c.hitPoints != null ? String(c.hitPoints) : '',
          currentHitPoints:
            c.currentHitPoints != null
              ? String(c.currentHitPoints)
              : c.hitPointsMax != null
                ? String(c.hitPointsMax)
                : c.hitPoints != null
                  ? String(c.hitPoints)
                  : '',
          hitDice: c.hitDice ?? '',
          hitDiceRemaining: c.hitDiceRemaining != null ? String(c.hitDiceRemaining) : '',
          armorClass: c.armorClass != null ? String(c.armorClass) : '',
          speed: c.speed != null ? String(c.speed) : '',
          strength: c.strength != null ? String(c.strength) : '',
          dexterity: c.dexterity != null ? String(c.dexterity) : '',
          constitution: c.constitution != null ? String(c.constitution) : '',
          intelligence: c.intelligence != null ? String(c.intelligence) : '',
          wisdom: c.wisdom != null ? String(c.wisdom) : '',
          charisma: c.charisma != null ? String(c.charisma) : '',
          description: c.description ?? '',
          notes: c.notes ?? '',
        })

        onNameLoaded?.(c.name ?? '')

        if (Array.isArray(c.skills)) {
          setSkillsState(
            DND_5E_SKILLS_FR.reduce<Record<string, { proficient: boolean; expertise: boolean }>>((acc, item) => {
              const found = c.skills?.find((skillEntry) => skillEntry.skill === item.key)
              if (found?.mastery === 'EXPERTISE') acc[item.key] = { proficient: true, expertise: true }
              else if (found?.mastery === 'PROFICIENT') acc[item.key] = { proficient: true, expertise: false }
              else acc[item.key] = { proficient: false, expertise: false }
              return acc
            }, {}),
          )
        }

        if (Array.isArray(c.savingThrows)) {
          setSavingThrowsState((prev) => {
            const next = { ...prev }
            for (const entry of c.savingThrows ?? []) {
              if (!entry || typeof entry !== 'object') continue
              const ability = typeof entry.ability === 'string' ? entry.ability.trim().toUpperCase() : ''
              if (!ability) continue
              next[ability] = { proficient: Boolean((entry as { proficient?: boolean }).proficient) }
            }
            return next
          })
        }

        if (sessionView && sessionId) {
          try {
            const stateRes = await apiGet<{
              success: boolean
              state: {
                current_hit_points?: number | null
                hit_dice_remaining?: number | null
              }
            }>(`/api/sessions/${sessionId}/characters/${characterId}/state`, token)
            setForm((prev) => ({
              ...prev,
              currentHitPoints:
                stateRes.state?.current_hit_points != null
                  ? String(stateRes.state.current_hit_points)
                  : prev.currentHitPoints,
              hitDiceRemaining:
                stateRes.state?.hit_dice_remaining != null
                  ? String(stateRes.state.hit_dice_remaining)
                  : prev.hitDiceRemaining,
            }))
          } catch {
            // ignore: fallback already set from character values
          }
        }
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadCharacter()
  }, [characterId, token, onNameLoaded, sessionView, sessionId, showSnackbar])

  const proficiencyBonus = useMemo(() => {
    const levelNumber = Number(form.level)
    if (Number.isNaN(levelNumber) || levelNumber < 1) return 2
    return Math.ceil(levelNumber / 4) + 1
  }, [form.level])

  const proficientSkillsSummary = useMemo(() => {
    const rows: Array<{
      key: string
      label: string
      kind: 'proficient' | 'expertise'
      total: number
      abilityAbbr: string
      abilityColorClass: string
    }> = []
    for (const item of DND_5E_SKILLS_FR) {
      const st = skillsState[item.key] ?? { proficient: false, expertise: false }
      if (!st.proficient && !st.expertise) continue
      const abilityKey = SKILL_ABILITY_KEY[item.key]
      const display = abilityKey ? ABILITY_SKILL_DISPLAY[abilityKey] : null
      const mod = abilityKey ? getModifier(form[abilityKey]) : 0
      const pbAdd = st.expertise ? 2 * proficiencyBonus : proficiencyBonus
      rows.push({
        key: item.key,
        label: item.label,
        kind: st.expertise ? 'expertise' : 'proficient',
        total: mod + pbAdd,
        abilityAbbr: display?.abbr ?? '—',
        abilityColorClass: display?.colorClass ?? '',
      })
    }
    return rows
  }, [skillsState, form, proficiencyBonus])

  const skillsSummaryUnderAbilities = (
    <details className="character-skills-accordion">
      <summary className="character-skills-accordion-summary">Mes compétences</summary>
      <div className="character-skills-accordion-panel">
        {proficientSkillsSummary.length === 0 ? (
          <p className="character-skills-summary-empty">Aucune compétence maîtrisée ou en expertise.</p>
        ) : (
          <ul className="character-skills-summary-list">
            {proficientSkillsSummary.map((row) => (
              <li key={row.key} className="character-skills-summary-row">
                <div className="character-skills-summary-name-block">
                  <span className={`character-skills-summary-name ${row.abilityColorClass}`.trim()}>{row.label}</span>
                  <span className="character-skills-summary-ability-abbr">{row.abilityAbbr}</span>
                </div>
                <span
                  className={`character-skills-summary-badge ${row.kind === 'expertise' ? 'is-expertise' : 'is-proficient'}`}
                >
                  {row.kind === 'expertise' ? 'Expertise' : 'Maîtrise'}
                </span>
                <span className="character-skills-summary-total">{formatModifier(row.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  )

  async function handleSaveCharacteristics(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      if (sessionView && sessionId) {
        await apiPut(
          `/api/sessions/${sessionId}/characters/${characterId}/state`,
          {
            currentHitPoints: numberOrUndefined(form.currentHitPoints),
            hitDiceRemaining: numberOrUndefined(form.hitDiceRemaining),
          },
          token,
        )
        await apiPut(
          `/api/characters/${characterId}`,
          {
            strength: numberOrUndefined(form.strength),
            dexterity: numberOrUndefined(form.dexterity),
            constitution: numberOrUndefined(form.constitution),
            intelligence: numberOrUndefined(form.intelligence),
            wisdom: numberOrUndefined(form.wisdom),
            charisma: numberOrUndefined(form.charisma),
            savingThrows: ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].map((ability) => ({
              ability,
              proficient: Boolean(savingThrowsState[ability]?.proficient),
            })),
          },
          token,
        )
        showSnackbar({ message: 'État de jeu enregistré pour cette campagne.', severity: 'success' })
        return
      }

      await apiPut(
        `/api/characters/${characterId}`,
        {
          name: form.name.trim(),
          race: form.race.trim() || undefined,
          class: form.class.trim() || undefined,
          level: numberOrUndefined(form.level),
          background: form.background.trim() || undefined,
          alignment: form.alignment.trim() || undefined,
          experiencePoints: numberOrUndefined(form.experiencePoints),
          hitPointsMax: numberOrUndefined(form.hitPointsMax),
          currentHitPoints: numberOrUndefined(form.currentHitPoints),
          hitDice: form.hitDice.trim() || undefined,
          hitDiceRemaining: numberOrUndefined(form.hitDiceRemaining),
          armorClass: numberOrUndefined(form.armorClass),
          speed: numberOrUndefined(form.speed),
          strength: numberOrUndefined(form.strength),
          dexterity: numberOrUndefined(form.dexterity),
          constitution: numberOrUndefined(form.constitution),
          intelligence: numberOrUndefined(form.intelligence),
          wisdom: numberOrUndefined(form.wisdom),
          charisma: numberOrUndefined(form.charisma),
          description: form.description.trim() || undefined,
          notes: form.notes.trim() || undefined,
          skills: DND_5E_SKILLS_FR.map((item) => {
            const entry = skillsState[item.key]
            let mastery: 'NOT_PROFICIENT' | 'PROFICIENT' | 'EXPERTISE' = 'NOT_PROFICIENT'
            if (entry?.expertise) mastery = 'EXPERTISE'
            else if (entry?.proficient) mastery = 'PROFICIENT'
            return { skill: item.key, mastery }
          }),
          savingThrows: ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].map((ability) => ({
            ability,
            proficient: Boolean(savingThrowsState[ability]?.proficient),
          })),
        },
        token,
      )
      showSnackbar({ message: 'Personnage enregistré avec succès.', severity: 'success' })
      onNameLoaded?.(form.name.trim())
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de sauvegarde',
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Chargement...</p>

  return (
    <form className="login-form" onSubmit={handleSaveCharacteristics}>
      {sessionView ? (
        <div className="session-character-meta-row">
          <div>
            <strong>Classe</strong>
            <div>{form.class?.trim() ? form.class : '—'}</div>
          </div>
          <div>
            <strong>Race</strong>
            <div>{form.race?.trim() ? form.race : '—'}</div>
          </div>
          <div>
            <strong>Niveau</strong>
            <div>{form.level?.trim() ? form.level : '—'}</div>
          </div>
        </div>
      ) : (
        <>
          <h4>Identite</h4>
          <label htmlFor="char-name">Nom</label>
          <input id="char-name" type="text" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />

          <label htmlFor="char-race">Race</label>
          <input id="char-race" type="text" list="dnd-races" value={form.race} onChange={(e) => setForm((p) => ({ ...p, race: e.target.value }))} />
          <datalist id="dnd-races">
            {DND_5E_RACES.map((race) => (
              <option key={race} value={race} />
            ))}
          </datalist>

          <label htmlFor="char-class">Classe</label>
          <input id="char-class" type="text" list="dnd-classes" value={form.class} onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))} />
          <datalist id="dnd-classes">
            {DND_5E_CLASSES.map((klass) => (
              <option key={klass} value={klass} />
            ))}
          </datalist>

          <label htmlFor="char-level">Niveau</label>
          <input id="char-level" type="number" min={1} value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} />
        </>
      )}

      {!sessionView ? (
        <>
          <label htmlFor="char-background">Background</label>
          <input
            id="char-background"
            type="text"
            value={form.background}
            onChange={(e) => setForm((p) => ({ ...p, background: e.target.value }))}
          />

          <label htmlFor="char-alignment">Alignement</label>
          <input
            id="char-alignment"
            type="text"
            value={form.alignment}
            onChange={(e) => setForm((p) => ({ ...p, alignment: e.target.value }))}
          />
        </>
      ) : null}

      {sessionView ? (
        <>
          <div className="session-game-panel">
            <div className="session-game-row session-game-row-hp">
              <strong>PDV</strong>
              <div className="session-game-split">
                <input
                  id="char-hp-current"
                  type="number"
                  value={form.currentHitPoints}
                  onChange={(e) => setForm((p) => ({ ...p, currentHitPoints: e.target.value }))}
                />
                <span>/</span>
                <span className="session-game-static-value">{form.hitPointsMax?.trim() ? form.hitPointsMax : '—'}</span>
              </div>
            </div>
            <div className="session-game-row session-game-row-dice">
              <strong>Dvie</strong>
              <div className="session-game-split">
                <input
                  id="char-hit-dice-remaining"
                  type="number"
                  value={form.hitDiceRemaining}
                  onChange={(e) => setForm((p) => ({ ...p, hitDiceRemaining: e.target.value }))}
                />
                <span>/</span>
                <span className="session-game-static-value">
                  {form.hitDice?.trim() ? form.hitDice.trim() : '—'}
                </span>
              </div>
            </div>
            <div className="session-game-row session-game-row-ac">
              <strong>Classe d'armure</strong>
              <span>{form.armorClass?.trim() ? form.armorClass : '—'}</span>
            </div>
            <div className="session-game-row session-game-row-prof">
              <strong>Maîtrise</strong>
              <span>{formatModifier(proficiencyBonus)}</span>
            </div>
          </div>

          <h4 className="session-ability-title">Caractéristiques</h4>
          <div className="session-ability-grid">
            {[
              { key: 'strength', label: 'FOR.', ability: 'STRENGTH', colorClass: 'session-ability-strength' },
              { key: 'intelligence', label: 'INT.', ability: 'INTELLIGENCE', colorClass: 'session-ability-intelligence' },
              { key: 'dexterity', label: 'DEX.', ability: 'DEXTERITY', colorClass: 'session-ability-dexterity' },
              { key: 'wisdom', label: 'SAG.', ability: 'WISDOM', colorClass: 'session-ability-wisdom' },
              { key: 'constitution', label: 'CON.', ability: 'CONSTITUTION', colorClass: 'session-ability-constitution' },
              { key: 'charisma', label: 'CHA.', ability: 'CHARISMA', colorClass: 'session-ability-charisma' },
            ].map((row) => (
              <div key={row.key} className={`session-ability-item ${row.colorClass}`}>
                <div className="session-ability-name">{row.label}</div>
                <div className="session-ability-mod">
                  {formatModifier(getModifier((form as Record<string, string>)[row.key]))}
                </div>
                <div className="session-ability-value-prof">
                  <span className="session-ability-raw-value">
                    {(form as Record<string, string>)[row.key]?.trim() ? (form as Record<string, string>)[row.key] : '—'}
                  </span>
                  <label aria-label={`${row.label} maîtrisé`}>
                    <input
                      type="checkbox"
                      checked={Boolean(savingThrowsState[row.ability]?.proficient)}
                      disabled
                      readOnly
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          {skillsSummaryUnderAbilities}
        </>
      ) : null}

      {!sessionView ? (
        <>
          <h4>Caracteristiques (D&D 5e)</h4>
          <div className="ability-grid">
            {[
              { key: 'strength', label: 'Force', ability: 'STRENGTH' },
              { key: 'dexterity', label: 'Dexterite', ability: 'DEXTERITY' },
              { key: 'constitution', label: 'Constitution', ability: 'CONSTITUTION' },
              { key: 'intelligence', label: 'Intelligence', ability: 'INTELLIGENCE' },
              { key: 'wisdom', label: 'Sagesse', ability: 'WISDOM' },
              { key: 'charisma', label: 'Charisme', ability: 'CHARISMA' },
            ].map((row) => (
              <Fragment key={row.key}>
                <label htmlFor={`char-${row.key}`} className="ability-label">
                  {row.label} ({formatModifier(getModifier((form as Record<string, string>)[row.key]))})
                </label>
                <input
                  id={`char-${row.key}`}
                  type="number"
                  value={(form as Record<string, string>)[row.key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [row.key]: event.target.value }))}
                />
                <label className="skill-check" aria-label={`${row.label} proficient`}>
                  <input
                    type="checkbox"
                    checked={Boolean(savingThrowsState[row.ability]?.proficient)}
                    onChange={(event) =>
                      setSavingThrowsState((prev) => ({
                        ...prev,
                        [row.ability]: { proficient: event.target.checked },
                      }))
                    }
                  />
                </label>
              </Fragment>
            ))}
          </div>
          {skillsSummaryUnderAbilities}
        </>
      ) : null}

      {!sessionView ? (
        <>
          <h4>Competences</h4>
          <div className="table-wrap">
            <table className="table inventory-items-table">
              <thead>
                <tr>
                  <th>Compétence</th>
                  <th>Proficient</th>
                  <th>Expertise</th>
                </tr>
              </thead>
              <tbody>
                {DND_5E_SKILLS_FR.map((skillItem) => {
                  const skillState = skillsState[skillItem.key] ?? { proficient: false, expertise: false }
                  return (
                    <tr key={skillItem.key}>
                      <td data-label="Compétence">{skillItem.label}</td>
                      <td data-label="Proficient">
                        <label className="skill-check">
                          <input
                            type="checkbox"
                            checked={skillState.proficient}
                            onChange={(event) => {
                              const nextProficient = event.target.checked
                              setSkillsState((prev) => ({
                                ...prev,
                                [skillItem.key]: {
                                  proficient: nextProficient,
                                  expertise: nextProficient ? prev[skillItem.key]?.expertise ?? false : false,
                                },
                              }))
                            }}
                          />
                        </label>
                      </td>
                      <td data-label="Expertise">
                        <label className="skill-check">
                          <input
                            type="checkbox"
                            checked={skillState.expertise}
                            onChange={(event) =>
                              setSkillsState((prev) => ({
                                ...prev,
                                [skillItem.key]: {
                                  proficient: event.target.checked ? true : prev[skillItem.key]?.proficient ?? false,
                                  expertise: event.target.checked,
                                },
                              }))
                            }
                          />
                        </label>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <button className="btn" type="submit" disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}

