import { getAbilityModifier, getProficiencyBonus, formatModifier } from '../../../shared/utils/dndFormulas'
import { CATEGORY_LABELS, type FeatureCategory } from '../components/CharacterFeaturesTab'
import { translateItemCategory, translateItemType } from '../../../shared/inventory/itemDisplayLabels'

/** Libellés FR des compétences — dupliqué depuis CharacterCharacteristicsTab (voir skill 2d10-dnd-rules). */
const DND_5E_SKILLS_FR: Array<{ key: string; label: string; abilityKey: PdfAbilityKey; abilityAbbr: string }> = [
  { key: 'ACROBATICS', label: 'Acrobaties', abilityKey: 'dexterity', abilityAbbr: 'Dex' },
  { key: 'ANIMAL_HANDLING', label: 'Dressage', abilityKey: 'wisdom', abilityAbbr: 'Sag' },
  { key: 'ARCANA', label: 'Arcanes', abilityKey: 'intelligence', abilityAbbr: 'Int' },
  { key: 'ATHLETICS', label: 'Athlétisme', abilityKey: 'strength', abilityAbbr: 'For' },
  { key: 'DECEPTION', label: 'Supercherie', abilityKey: 'charisma', abilityAbbr: 'Cha' },
  { key: 'HISTORY', label: 'Histoire', abilityKey: 'intelligence', abilityAbbr: 'Int' },
  { key: 'INSIGHT', label: 'Perspicacité', abilityKey: 'wisdom', abilityAbbr: 'Sag' },
  { key: 'INTIMIDATION', label: 'Intimidation', abilityKey: 'charisma', abilityAbbr: 'Cha' },
  { key: 'INVESTIGATION', label: 'Investigation', abilityKey: 'intelligence', abilityAbbr: 'Int' },
  { key: 'MEDICINE', label: 'Médecine', abilityKey: 'wisdom', abilityAbbr: 'Sag' },
  { key: 'NATURE', label: 'Nature', abilityKey: 'intelligence', abilityAbbr: 'Int' },
  { key: 'PERCEPTION', label: 'Perception', abilityKey: 'wisdom', abilityAbbr: 'Sag' },
  { key: 'PERFORMANCE', label: 'Représentation', abilityKey: 'charisma', abilityAbbr: 'Cha' },
  { key: 'PERSUASION', label: 'Persuasion', abilityKey: 'charisma', abilityAbbr: 'Cha' },
  { key: 'RELIGION', label: 'Religion', abilityKey: 'intelligence', abilityAbbr: 'Int' },
  { key: 'SLEIGHT_OF_HAND', label: 'Escamotage', abilityKey: 'dexterity', abilityAbbr: 'Dex' },
  { key: 'STEALTH', label: 'Discrétion', abilityKey: 'dexterity', abilityAbbr: 'Dex' },
  { key: 'SURVIVAL', label: 'Survie', abilityKey: 'wisdom', abilityAbbr: 'Sag' },
]

const ABILITY_ORDER: Array<{ key: PdfAbilityKey; label: string; savingKey: string }> = [
  { key: 'strength', label: 'Force', savingKey: 'STRENGTH' },
  { key: 'dexterity', label: 'Dextérité', savingKey: 'DEXTERITY' },
  { key: 'constitution', label: 'Constitution', savingKey: 'CONSTITUTION' },
  { key: 'intelligence', label: 'Intelligence', savingKey: 'INTELLIGENCE' },
  { key: 'wisdom', label: 'Sagesse', savingKey: 'WISDOM' },
  { key: 'charisma', label: 'Charisme', savingKey: 'CHARISMA' },
]

/** Humanise une clé camelCase de ressource de classe (ex. bardicInspiration -> Bardic Inspiration). */
function humanizeResourceKey(key: string): string {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export type PdfAbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export type PdfFeature = {
  id: number
  category: FeatureCategory
  name: string
  description?: string | null
}

export type PdfInventoryItem = {
  id: number
  name: string
  quantity: number
  is_equipped: boolean
  weight?: number | null
  type?: string | null
  category?: string | null
}

export type PdfPurse = {
  copper_pieces: number
  silver_pieces: number
  electrum_pieces: number
  gold_pieces: number
  platinum_pieces: number
}

export type PdfGrimoireEntry = {
  id: number
  spell_name: string | null
  spell_level: number | null
  spell_school: string | null
  is_prepared: boolean
  is_known: boolean
  ritual: boolean | null
  concentration: boolean | null
}

export type CharacterSheetPdfData = {
  name: string
  race: string | null
  class: string | null
  archetype: string | null
  level: number | null
  background: string | null
  alignment: string | null
  experiencePoints: number | null
  hitPointsMax: number | null
  currentHitPoints: number | null
  hitDice: string | null
  hitDiceRemaining: number | null
  armorClass: number | null
  speed: number | null
  strength: number | null
  dexterity: number | null
  constitution: number | null
  intelligence: number | null
  wisdom: number | null
  charisma: number | null
  description: string | null
  notes: string | null
  destiny: number | null
  classResources: Record<string, number> | null
  skills: Array<{ skill: string; mastery: 'NOT_PROFICIENT' | 'PROFICIENT' | 'EXPERTISE' }>
  savingThrows: Array<{ ability: string; proficient: boolean }>
  spellSlots: Array<{ level: number; slotsMax: number }>
  spellcastingAbility: PdfAbilityKey | null
  features: PdfFeature[]
  inventory: PdfInventoryItem[]
  purse: PdfPurse | null
  totalWeight: number | null
  grimoire: PdfGrimoireEntry[]
}

function scoreOf(data: CharacterSheetPdfData, key: PdfAbilityKey): number {
  return data[key] ?? 10
}

export function CharacterSheetPdfLayout({ data }: { data: CharacterSheetPdfData }) {
  const level = data.level ?? 1
  const proficiencyBonus = getProficiencyBonus(level)
  const dexMod = getAbilityModifier(scoreOf(data, 'dexterity'))
  const wisMod = getAbilityModifier(scoreOf(data, 'wisdom'))
  const passivePerception = 10 + wisMod + (data.skills.some((s) => s.skill === 'PERCEPTION' && s.mastery !== 'NOT_PROFICIENT') ? proficiencyBonus * (data.skills.find((s) => s.skill === 'PERCEPTION')?.mastery === 'EXPERTISE' ? 2 : 1) : 0)

  const savingByAbility = new Map(data.savingThrows.map((st) => [st.ability, st.proficient]))
  const skillsByKey = new Map(data.skills.map((s) => [s.skill, s.mastery]))

  const classResourceEntries = Object.entries(data.classResources ?? {}).filter(([, v]) => typeof v === 'number')

  const featuresByCategory = new Map<FeatureCategory, PdfFeature[]>()
  for (const feature of data.features) {
    const list = featuresByCategory.get(feature.category) ?? []
    list.push(feature)
    featuresByCategory.set(feature.category, list)
  }

  const equippedWeapons = data.inventory.filter(
    (item) => item.is_equipped && String(item.type ?? '').toLowerCase() === 'weapon',
  )

  const spellsByLevel = new Map<number, PdfGrimoireEntry[]>()
  for (const entry of data.grimoire) {
    const lvl = entry.spell_level ?? 0
    const list = spellsByLevel.get(lvl) ?? []
    list.push(entry)
    spellsByLevel.set(lvl, list)
  }
  const spellLevelsSorted = Array.from(spellsByLevel.keys()).sort((a, b) => a - b)

  const spellcastingMod = data.spellcastingAbility ? getAbilityModifier(scoreOf(data, data.spellcastingAbility)) : null
  const spellSlotsSorted = [...data.spellSlots].filter((s) => s.slotsMax > 0).sort((a, b) => a.level - b.level)

  return (
    <div className="pdf-sheet">
    <div className="pdf-segment">
      <header className="pdf-sheet-header">
        <h1>{data.name || 'Personnage sans nom'}</h1>
        <div className="pdf-identity-line">
          <span>{data.race || '—'}</span>
          <span>
            {data.class || '—'}
            {data.archetype ? ` (${data.archetype})` : ''}
          </span>
          <span>Niveau {level}</span>
          <span>{data.background || '—'}</span>
          <span>{data.alignment || '—'}</span>
          <span>{data.experiencePoints != null ? `${data.experiencePoints} PX` : '0 PX'}</span>
          {data.destiny != null ? <span>Point(s) de destin : {data.destiny}</span> : null}
        </div>
      </header>

      <section className="pdf-sheet-grid">
        <div className="pdf-col pdf-col-abilities">
          <h2>Caractéristiques</h2>
          <div className="pdf-ability-grid">
            {ABILITY_ORDER.map(({ key, label }) => {
              const score = scoreOf(data, key)
              const mod = getAbilityModifier(score)
              return (
                <div className="pdf-ability-box" key={key}>
                  <div className="pdf-ability-label">{label}</div>
                  <div className="pdf-ability-mod">{formatModifier(mod)}</div>
                  <div className="pdf-ability-score">{score}</div>
                </div>
              )
            })}
          </div>

          <h2>Jets de sauvegarde</h2>
          <div className="pdf-list">
            {ABILITY_ORDER.map(({ key, label, savingKey }) => {
              const proficient = Boolean(savingByAbility.get(savingKey))
              const mod = getAbilityModifier(scoreOf(data, key)) + (proficient ? proficiencyBonus : 0)
              return (
                <div className="pdf-list-row" key={savingKey}>
                  <span className={`pdf-dot ${proficient ? 'pdf-dot-filled' : ''}`} />
                  <span className="pdf-list-mod">{formatModifier(mod)}</span>
                  <span className="pdf-list-name">{label}</span>
                </div>
              )
            })}
          </div>

          <h2>Combat</h2>
          <div className="pdf-combat-row">
            <div className="pdf-combat-box">
              <div className="pdf-combat-label">CA</div>
              <div className="pdf-combat-value">{data.armorClass ?? '—'}</div>
            </div>
            <div className="pdf-combat-box">
              <div className="pdf-combat-label">Initiative</div>
              <div className="pdf-combat-value">{formatModifier(dexMod)}</div>
            </div>
            <div className="pdf-combat-box">
              <div className="pdf-combat-label">Vitesse</div>
              <div className="pdf-combat-value">{data.speed != null ? `${data.speed} m` : '—'}</div>
            </div>
          </div>
          <div className="pdf-combat-row">
            <div className="pdf-combat-box pdf-combat-box-wide">
              <div className="pdf-combat-label">Points de vie</div>
              <div className="pdf-combat-value">
                {data.currentHitPoints ?? '—'} / {data.hitPointsMax ?? '—'}
              </div>
            </div>
            <div className="pdf-combat-box pdf-combat-box-wide">
              <div className="pdf-combat-label">Dés de vie</div>
              <div className="pdf-combat-value">
                {data.hitDiceRemaining ?? '—'} / {data.hitDice || '—'}
              </div>
            </div>
          </div>
          <div className="pdf-list-row">
            <span className="pdf-list-name">Bonus de maîtrise</span>
            <span className="pdf-list-mod">{formatModifier(proficiencyBonus)}</span>
          </div>

          {classResourceEntries.length > 0 ? (
            <>
              <h2>Ressources de classe</h2>
              <div className="pdf-list">
                {classResourceEntries.map(([key, value]) => (
                  <div className="pdf-list-row" key={key}>
                    <span className="pdf-list-name">{humanizeResourceKey(key)}</span>
                    <span className="pdf-list-mod">{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="pdf-col pdf-col-skills">
          <h2>Compétences</h2>
          <div className="pdf-list">
            {DND_5E_SKILLS_FR.map(({ key, label, abilityKey, abilityAbbr }) => {
              const mastery = skillsByKey.get(key) ?? 'NOT_PROFICIENT'
              const proficient = mastery !== 'NOT_PROFICIENT'
              const expertise = mastery === 'EXPERTISE'
              const mod = getAbilityModifier(scoreOf(data, abilityKey)) + (proficient ? proficiencyBonus * (expertise ? 2 : 1) : 0)
              return (
                <div className="pdf-list-row" key={key}>
                  <span className={`pdf-dot ${expertise ? 'pdf-dot-double' : proficient ? 'pdf-dot-filled' : ''}`} />
                  <span className="pdf-list-mod">{formatModifier(mod)}</span>
                  <span className="pdf-list-name">
                    {label} <em>({abilityAbbr})</em>
                  </span>
                </div>
              )
            })}
          </div>
          <div className="pdf-list-row">
            <span className="pdf-list-name">Perception passive</span>
            <span className="pdf-list-mod">{passivePerception}</span>
          </div>

          {equippedWeapons.length > 0 ? (
            <>
              <h2>Armes équipées</h2>
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Qté</th>
                  </tr>
                </thead>
                <tbody>
                  {equippedWeapons.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      </section>
    </div>

      {featuresByCategory.size > 0 ? (
        <div className="pdf-segment">
        <section className="pdf-section">
          <h2>Traits &amp; capacités</h2>
          {CATEGORY_LABELS.filter((cat) => featuresByCategory.has(cat.value)).map((cat) => (
            <div key={cat.value} className="pdf-feature-category">
              <h3>{cat.label}</h3>
              {(featuresByCategory.get(cat.value) ?? []).map((feature) => (
                <div className="pdf-feature" key={feature.id}>
                  <div className="pdf-feature-name">{feature.name}</div>
                  {feature.description ? <p className="pdf-feature-desc">{feature.description}</p> : null}
                </div>
              ))}
            </div>
          ))}
        </section>
        </div>
      ) : null}

      <div className="pdf-segment">
      <section className="pdf-section">
        <h2>Inventaire</h2>
        {data.purse ? (
          <div className="pdf-purse-row">
            <span>PP : {data.purse.platinum_pieces}</span>
            <span>PO : {data.purse.gold_pieces}</span>
            <span>PE : {data.purse.electrum_pieces}</span>
            <span>PA : {data.purse.silver_pieces}</span>
            <span>PC : {data.purse.copper_pieces}</span>
            {data.totalWeight != null ? <span>Poids total : {data.totalWeight} kg</span> : null}
          </div>
        ) : null}
        {data.inventory.length > 0 ? (
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Qté</th>
                <th>Poids</th>
                <th>Équipé</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{translateItemType(item.type) || translateItemCategory(item.category) || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.weight != null ? `${item.weight} kg` : '—'}</td>
                  <td>{item.is_equipped ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Inventaire vide.</p>
        )}
      </section>
      </div>

      {data.grimoire.length > 0 || data.description || data.notes ? (
      <div className="pdf-segment">
      {data.grimoire.length > 0 ? (
        <section className="pdf-section">
          <h2>Grimoire</h2>
          {data.spellcastingAbility ? (
            <p className="pdf-spellcasting-line">
              Caractéristique d'incantation :{' '}
              {ABILITY_ORDER.find((a) => a.key === data.spellcastingAbility)?.label ?? data.spellcastingAbility} (mod{' '}
              {formatModifier(spellcastingMod ?? 0)}, DD {8 + proficiencyBonus + (spellcastingMod ?? 0)}, Attaque{' '}
              {formatModifier(proficiencyBonus + (spellcastingMod ?? 0))})
            </p>
          ) : null}
          {spellSlotsSorted.length > 0 ? (
            <div className="pdf-purse-row">
              {spellSlotsSorted.map((slot) => (
                <span key={slot.level}>
                  Niv.{slot.level} : {slot.slotsMax}
                </span>
              ))}
            </div>
          ) : null}
          {spellLevelsSorted.map((lvl) => (
            <div key={lvl} className="pdf-feature-category">
              <h3>{lvl === 0 ? 'Sorts mineurs' : `Niveau ${lvl}`}</h3>
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>École</th>
                    <th>Préparé</th>
                    <th>Autres</th>
                  </tr>
                </thead>
                <tbody>
                  {(spellsByLevel.get(lvl) ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.spell_name || '—'}</td>
                      <td>{entry.spell_school || '—'}</td>
                      <td>{entry.is_prepared ? 'Oui' : 'Non'}</td>
                      <td>
                        {[entry.ritual ? 'Rituel' : null, entry.concentration ? 'Concentration' : null]
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ) : null}

      {data.description || data.notes ? (
        <section className="pdf-section">
          {data.description ? (
            <>
              <h2>Description</h2>
              <p className="pdf-freetext">{data.description}</p>
            </>
          ) : null}
          {data.notes ? (
            <>
              <h2>Notes</h2>
              <p className="pdf-freetext">{data.notes}</p>
            </>
          ) : null}
        </section>
      ) : null}
      </div>
      ) : null}
    </div>
  )
}
