import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Car, Cog, Dog, FlaskRound, Pickaxe, RotateCcw, Shapes, Shield, Sword } from 'lucide-react'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet, apiPut, apiPutFormData, getApiBaseUrl } from '../../../shared/api/client'
import { ItemDetailsModal, type ItemDetail } from '../../inventory/components/ItemDetailsModal'
import type { AuthUser } from '../../../shared/types'
import { CharacterIdentityAccordion } from './CharacterIdentityAccordion'

function getItemTypeIcon(typeValue?: string | null): { icon: React.ReactNode; label: string } {
  const t = String(typeValue ?? '')
    .trim()
    .toLowerCase()
  if (!t) return { icon: <Shapes size={18} aria-hidden="true" />, label: 'other' }

  if (t === 'armor') return { icon: <Shield size={18} aria-hidden="true" />, label: 'armor' }
  if (t === 'weapon') return { icon: <Sword size={18} aria-hidden="true" />, label: 'weapon' }
  if (t === 'gear') return { icon: <Cog size={18} aria-hidden="true" />, label: 'gear' }
  if (t === 'tool') return { icon: <Pickaxe size={18} aria-hidden="true" />, label: 'tool' }
  if (t === 'mount') return { icon: <Dog size={18} aria-hidden="true" />, label: 'mount' }
  if (t === 'vehicle') return { icon: <Car size={18} aria-hidden="true" />, label: 'vehicle' }
  if (t === 'ammunition') return { icon: <RotateCcw size={18} aria-hidden="true" />, label: 'ammunition' }
  if (t === 'consumable') return { icon: <FlaskRound size={18} aria-hidden="true" />, label: 'consumable' }

  return { icon: <Shapes size={18} aria-hidden="true" />, label: t }
}

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
  userId?: number | null
  user?: { id: number; username: string; email: string } | null
  name: string
  race?: string | null
  class?: string | null
  archetype?: string | null
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
  avatar_url?: string | null
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

type CharacteristicsFormFields = {
  name: string
  race: string
  class: string
  archetype: string
  level: string
  background: string
  alignment: string
  experiencePoints: string
  hitPointsMax: string
  currentHitPoints: string
  hitDice: string
  hitDiceRemaining: string
  armorClass: string
  speed: string
  strength: string
  dexterity: string
  constitution: string
  intelligence: string
  wisdom: string
  charisma: string
  description: string
  notes: string
}

type SkillsStateMap = Record<string, { proficient: boolean; expertise: boolean }>
type SavingThrowsStateMap = Record<string, { proficient: boolean }>

function buildCharacteristicsPersistSnapshot(
  characterId: string,
  sessionView: boolean,
  sessionId: string | undefined,
  form: CharacteristicsFormFields,
  skillsState: SkillsStateMap,
  savingThrowsState: SavingThrowsStateMap,
): string {
  const st = ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].map((ability) => [
    ability,
    Boolean(savingThrowsState[ability]?.proficient),
  ])
  if (sessionView && sessionId) {
    return JSON.stringify({
      mode: 'sv',
      characterId,
      sessionId,
      currentHitPoints: form.currentHitPoints,
      hitDiceRemaining: form.hitDiceRemaining,
      strength: form.strength,
      dexterity: form.dexterity,
      constitution: form.constitution,
      intelligence: form.intelligence,
      wisdom: form.wisdom,
      charisma: form.charisma,
      st,
    })
  }
  const skillsPayload = DND_5E_SKILLS_FR.map((item) => {
    const entry = skillsState[item.key]
    let mastery: 'N' | 'P' | 'E' = 'N'
    if (entry?.expertise) mastery = 'E'
    else if (entry?.proficient) mastery = 'P'
    return [item.key, mastery] as const
  })
  return JSON.stringify({
    mode: 'full',
    characterId,
    name: form.name,
    race: form.race,
    class: form.class,
    archetype: form.archetype,
    level: form.level,
    background: form.background,
    alignment: form.alignment,
    experiencePoints: form.experiencePoints,
    hitPointsMax: form.hitPointsMax,
    currentHitPoints: form.currentHitPoints,
    hitDice: form.hitDice,
    hitDiceRemaining: form.hitDiceRemaining,
    armorClass: form.armorClass,
    speed: form.speed,
    strength: form.strength,
    dexterity: form.dexterity,
    constitution: form.constitution,
    intelligence: form.intelligence,
    wisdom: form.wisdom,
    charisma: form.charisma,
    description: form.description,
    notes: form.notes,
    skills: skillsPayload,
    st,
  })
}

function getModifier(scoreRaw: string): number {
  const score = Number(scoreRaw)
  if (Number.isNaN(score)) return 0
  return Math.floor((score - 10) / 2)
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod)
}

/** Propriétés d’arme D&D 5e : tableau `[{ name }]` ou objet `{ properties: [...] }` (import SRD). */
function formatDnDWeaponPropertyNames(raw: unknown): string {
  const names: string[] = []
  const pushFromArray = (arr: unknown) => {
    if (!Array.isArray(arr)) return
    for (const p of arr) {
      if (p && typeof p === 'object' && typeof (p as { name?: unknown }).name === 'string') {
        const n = (p as { name: string }).name.trim()
        if (n) names.push(n)
      }
    }
  }
  if (raw == null) return '—'
  if (Array.isArray(raw)) {
    pushFromArray(raw)
    return names.length ? names.join(', ') : '—'
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    pushFromArray(obj.properties)
    if (names.length) return names.join(', ')
  }
  return '—'
}

function formatItemDamageLine(damage: string | null | undefined, damageType: string | null | undefined): string {
  const d = String(damage ?? '').trim()
  const t = String(damageType ?? '').trim()
  if (!d && !t) return '—'
  if (d && t) return `${d} (${t})`
  return d || t
}

type InventoryLineForSession = {
  id: number
  item_id?: number | null
  name?: string | null
  type?: string | null
  category?: string | null
  is_equipped?: boolean
  properties?: unknown
  quantity?: number
}

type SessionEquippedWeaponRow = {
  id: number
  item_id: number | null
  name: string
  damage: string
  propertiesLabel: string
}

function isEquippedWeaponRow(row: InventoryLineForSession): boolean {
  const t = String(row.type || '')
    .trim()
    .toLowerCase()
  return t === 'weapon' && Boolean(row.is_equipped)
}

function isEquippedNonWeaponRow(row: InventoryLineForSession): boolean {
  if (!row.is_equipped) return false
  const t = String(row.type || '')
    .trim()
    .toLowerCase()
  return t !== 'weapon' && t !== 'consumable' && t !== 'ammunition'
}

function isConsumableRow(row: InventoryLineForSession): boolean {
  if (!row.is_equipped) return false
  const t = String(row.type || '')
    .trim()
    .toLowerCase()
  return t === 'consumable' || t === 'ammunition'
}

type SessionConsumableRow = {
  id: number
  item_id: number | null
  name: string
  quantity: number
  categoryLabel: string
}

type SessionEquippedOtherRow = {
  id: number
  item_id: number | null
  name: string
  typeLabel: string
  categoryLabel: string
}

/** Accordéons session live (souvent pilotés par la page pour survivre aux changements d’onglet). */
export type SessionLiveAccordionState = {
  skills: boolean
  weapons: boolean
  consumables: boolean
  items: boolean
}

export const DEFAULT_SESSION_LIVE_ACCORDIONS: SessionLiveAccordionState = {
  skills: false,
  weapons: true,
  consumables: true,
  items: true,
}

export function CharacterCharacteristicsTab(props: {
  characterId: string
  token: string
  user?: AuthUser | null
  onNameLoaded?: (name: string) => void
  onAvatarLoaded?: (avatarUrl: string) => void
  sessionView?: boolean
  sessionId?: string
  sessionLiveAccordions?: SessionLiveAccordionState
  onSessionLiveAccordionsChange?: (patch: Partial<SessionLiveAccordionState>) => void
}) {
  const {
    characterId,
    token,
    user,
    onNameLoaded,
    onAvatarLoaded,
    sessionView = false,
    sessionId,
    sessionLiveAccordions,
    onSessionLiveAccordionsChange,
  } = props
  const { showSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const lastPersistedKeyRef = useRef('')
  const wasLoadingRef = useRef(true)

  const canEditOwner = !sessionView && (user?.role === 'admin' || user?.role === 'gm')
  const [ownerUserId, setOwnerUserId] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; username: string; email: string; role_name?: string | null }>>([])

  const [form, setForm] = useState({
    name: '',
    race: '',
    class: '',
    archetype: '',
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

  const formRef = useRef(form)
  const skillsStateRef = useRef(skillsState)
  const savingThrowsStateRef = useRef(savingThrowsState)
  formRef.current = form
  skillsStateRef.current = skillsState
  savingThrowsStateRef.current = savingThrowsState

  const onNameLoadedRef = useRef(onNameLoaded)
  onNameLoadedRef.current = onNameLoaded
  const onAvatarLoadedRef = useRef(onAvatarLoaded)
  onAvatarLoadedRef.current = onAvatarLoaded

  const [sessionEquippedWeapons, setSessionEquippedWeapons] = useState<SessionEquippedWeaponRow[]>([])
  const [sessionConsumables, setSessionConsumables] = useState<SessionConsumableRow[]>([])
  const [sessionEquippedOtherItems, setSessionEquippedOtherItems] = useState<SessionEquippedOtherRow[]>([])
  const [isWeaponItemDetailsOpen, setIsWeaponItemDetailsOpen] = useState(false)
  const [weaponItemDetailsLoading, setWeaponItemDetailsLoading] = useState(false)
  const [weaponItemDetails, setWeaponItemDetails] = useState<ItemDetail | null>(null)
  const [sessionConsumableQtyDraft, setSessionConsumableQtyDraft] = useState<Record<number, string>>({})
  const [savingConsumableQtyId, setSavingConsumableQtyId] = useState<number | null>(null)
  const [fallbackSessionLiveAccordions, setFallbackSessionLiveAccordions] =
    useState<SessionLiveAccordionState>(DEFAULT_SESSION_LIVE_ACCORDIONS)

  const effectiveSessionLiveAccordions =
    sessionLiveAccordions !== undefined ? sessionLiveAccordions : fallbackSessionLiveAccordions

  const patchSessionLiveAccordions = useCallback(
    (patch: Partial<SessionLiveAccordionState>) => {
      if (onSessionLiveAccordionsChange) {
        onSessionLiveAccordionsChange(patch)
      } else {
        setFallbackSessionLiveAccordions((prev) => ({ ...prev, ...patch }))
      }
    },
    [onSessionLiveAccordionsChange],
  )

  useEffect(() => {
    if (!sessionView) return
    setSavingConsumableQtyId(null)
  }, [characterId, sessionView])

  useEffect(() => {
    if (!sessionView) return
    setSessionConsumableQtyDraft((prev) => {
      const next: Record<number, string> = { ...prev }
      for (const c of sessionConsumables) {
        next[c.id] = prev[c.id] !== undefined ? prev[c.id] : String(c.quantity)
      }
      for (const k of Object.keys(next)) {
        const id = Number(k)
        if (!Number.isFinite(id) || !sessionConsumables.some((x) => x.id === id)) delete next[id]
      }
      return next
    })
  }, [sessionConsumables, sessionView])

  const persistCharacteristicsPayload = useCallback(
    async (f: CharacteristicsFormFields, sk: SkillsStateMap, sv: SavingThrowsStateMap) => {
      if (sessionView && sessionId) {
        await apiPut(
          `/api/sessions/${sessionId}/characters/${characterId}/state`,
          {
            currentHitPoints: numberOrUndefined(f.currentHitPoints),
            hitDiceRemaining: numberOrUndefined(f.hitDiceRemaining),
          },
          token,
        )
        await apiPut(
          `/api/characters/${characterId}`,
          {
            strength: numberOrUndefined(f.strength),
            dexterity: numberOrUndefined(f.dexterity),
            constitution: numberOrUndefined(f.constitution),
            intelligence: numberOrUndefined(f.intelligence),
            wisdom: numberOrUndefined(f.wisdom),
            charisma: numberOrUndefined(f.charisma),
            savingThrows: ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].map((ability) => ({
              ability,
              proficient: Boolean(sv[ability]?.proficient),
            })),
          },
          token,
        )
        return
      }

      await apiPut(
        `/api/characters/${characterId}`,
        {
          ...(canEditOwner && ownerUserId.trim()
            ? { userId: Number.parseInt(ownerUserId.trim(), 10) }
            : {}),
          name: f.name.trim(),
          race: f.race.trim() || undefined,
          class: f.class.trim() || undefined,
          archetype: f.archetype.trim() || undefined,
          level: numberOrUndefined(f.level),
          background: f.background.trim() || undefined,
          alignment: f.alignment.trim() || undefined,
          experiencePoints: numberOrUndefined(f.experiencePoints),
          hitPointsMax: numberOrUndefined(f.hitPointsMax),
          currentHitPoints: numberOrUndefined(f.currentHitPoints),
          hitDice: f.hitDice.trim() || undefined,
          hitDiceRemaining: numberOrUndefined(f.hitDiceRemaining),
          armorClass: numberOrUndefined(f.armorClass),
          speed: numberOrUndefined(f.speed),
          strength: numberOrUndefined(f.strength),
          dexterity: numberOrUndefined(f.dexterity),
          constitution: numberOrUndefined(f.constitution),
          intelligence: numberOrUndefined(f.intelligence),
          wisdom: numberOrUndefined(f.wisdom),
          charisma: numberOrUndefined(f.charisma),
          description: f.description.trim() || undefined,
          notes: f.notes.trim() || undefined,
          skills: DND_5E_SKILLS_FR.map((item) => {
            const entry = sk[item.key]
            let mastery: 'NOT_PROFICIENT' | 'PROFICIENT' | 'EXPERTISE' = 'NOT_PROFICIENT'
            if (entry?.expertise) mastery = 'EXPERTISE'
            else if (entry?.proficient) mastery = 'PROFICIENT'
            return { skill: item.key, mastery }
          }),
          savingThrows: ['STRENGTH', 'DEXTERITY', 'CONSTITUTION', 'INTELLIGENCE', 'WISDOM', 'CHARISMA'].map((ability) => ({
            ability,
            proficient: Boolean(sv[ability]?.proficient),
          })),
        },
        token,
      )
      onNameLoadedRef.current?.(f.name.trim())
    },
    [characterId, sessionView, sessionId, token, canEditOwner, ownerUserId],
  )

  useEffect(() => {
    async function loadCharacter() {
      setLoading(true)
      if (!sessionView) {
        setSessionEquippedWeapons([])
        setSessionConsumables([])
        setSessionEquippedOtherItems([])
      }
      try {
        const inventoryPromise = sessionView
          ? apiGet<{ inventory: InventoryLineForSession[] }>(`/api/inventory/${characterId}`, token).catch(() => null)
          : Promise.resolve(null)

        const response = await apiGet<{ success: boolean; character: CharacterDetail }>(`/api/characters/${characterId}`, token)
        const c = response.character
        setAvatarUrl(c.avatar_url ?? '')

        setForm({
          name: c.name ?? '',
          race: c.race ?? '',
          class: c.class ?? '',
          archetype: c.archetype ?? '',
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

        if (!sessionView) {
          const existingOwnerId =
            c.userId != null
              ? String(c.userId)
              : c.user?.id != null
                ? String(c.user.id)
                : ''
          setOwnerUserId(existingOwnerId)
        }

        onNameLoadedRef.current?.(c.name ?? '')
        onAvatarLoadedRef.current?.(c.avatar_url ?? '')

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

        if (sessionView) {
          const invRes = await inventoryPromise
          const lines = invRes?.inventory ?? []
          const weaponLines = lines.filter(isEquippedWeaponRow)
          const rows: SessionEquippedWeaponRow[] = await Promise.all(
            weaponLines.map(async (line) => {
              let damage = '—'
              if (line.item_id != null) {
                try {
                  const itRes = await apiGet<{
                    item: { damage?: string | null; damageType?: string | null }
                  }>(`/api/items/${line.item_id}`, token)
                  damage = formatItemDamageLine(itRes.item?.damage, itRes.item?.damageType)
                } catch {
                  /* dégâts indisponibles */
                }
              }
              return {
                id: line.id,
                item_id: line.item_id != null ? line.item_id : null,
                name: line.name?.trim() ? line.name : '—',
                damage,
                propertiesLabel: formatDnDWeaponPropertyNames(line.properties),
              }
            }),
          )
          setSessionEquippedWeapons(rows)

          const consumableLines = lines.filter(isConsumableRow).sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' }),
          )
          setSessionConsumables(
            consumableLines.map((line) => ({
              id: line.id,
              item_id: line.item_id != null ? line.item_id : null,
              name: line.name?.trim() ? line.name : '—',
              quantity: typeof line.quantity === 'number' && line.quantity >= 0 ? line.quantity : 1,
              categoryLabel: line.category?.trim() ? line.category : '—',
            })),
          )

          const otherLines = lines.filter(isEquippedNonWeaponRow).sort((a, b) =>
            String(a.name || '').localeCompare(String(b.name || ''), 'fr', { sensitivity: 'base' }),
          )
          setSessionEquippedOtherItems(
            otherLines.map((line) => ({
              id: line.id,
              item_id: line.item_id != null ? line.item_id : null,
              name: line.name?.trim() ? line.name : '—',
              typeLabel: line.type?.trim() ? String(line.type) : '—',
              categoryLabel: line.category?.trim() ? line.category : '—',
            })),
          )
        }
      } catch (err) {
        if (sessionView) {
          setSessionEquippedWeapons([])
          setSessionConsumables([])
          setSessionEquippedOtherItems([])
        }
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadCharacter()
  }, [characterId, token, sessionView, sessionId, showSnackbar])

  useEffect(() => {
    if (!canEditOwner) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiGet<{
          success: boolean
          users: Array<{ id: number; username: string; email: string; role_name?: string | null }>
        }>('/api/users', token)
        if (cancelled) return
        setAvailableUsers(Array.isArray(res.users) ? res.users : [])
      } catch (err) {
        if (cancelled) return
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement des utilisateurs',
          severity: 'error',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canEditOwner, token, showSnackbar])

  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      lastPersistedKeyRef.current = buildCharacteristicsPersistSnapshot(
        characterId,
        sessionView,
        sessionId,
        form as CharacteristicsFormFields,
        skillsState,
        savingThrowsState,
      )
      wasLoadingRef.current = false
    } else if (loading) {
      wasLoadingRef.current = true
    }
  }, [loading, characterId, sessionView, sessionId, form, skillsState, savingThrowsState])

  useEffect(() => {
    if (loading) return
    const key = buildCharacteristicsPersistSnapshot(
      characterId,
      sessionView,
      sessionId,
      form as CharacteristicsFormFields,
      skillsState,
      savingThrowsState,
    )
    if (key === lastPersistedKeyRef.current) return
    if (!sessionView && !form.name.trim()) return

    const timer = setTimeout(() => {
      void (async () => {
        const f = formRef.current as CharacteristicsFormFields
        const sk = skillsStateRef.current
        const sv = savingThrowsStateRef.current
        if (!sessionView && !f.name.trim()) return
        const k = buildCharacteristicsPersistSnapshot(characterId, sessionView, sessionId, f, sk, sv)
        if (k === lastPersistedKeyRef.current) return
        try {
          await persistCharacteristicsPayload(f, sk, sv)
          lastPersistedKeyRef.current = k
        } catch (err) {
          showSnackbar({
            message: err instanceof Error ? err.message : 'Erreur de sauvegarde',
            severity: 'error',
          })
        }
      })()
    }, 450)
    return () => clearTimeout(timer)
  }, [
    form,
    skillsState,
    savingThrowsState,
    loading,
    characterId,
    sessionView,
    sessionId,
    showSnackbar,
    persistCharacteristicsPayload,
  ])

  useEffect(() => {
    return () => {
      const f = formRef.current as CharacteristicsFormFields
      const sk = skillsStateRef.current
      const sv = savingThrowsStateRef.current
      const k = buildCharacteristicsPersistSnapshot(characterId, sessionView, sessionId, f, sk, sv)
      if (k === lastPersistedKeyRef.current) return
      if (!sessionView && !f.name.trim()) return
      void (async () => {
        try {
          await persistCharacteristicsPayload(f, sk, sv)
          lastPersistedKeyRef.current = k
        } catch {
          /* démontage / navigation */
        }
      })()
    }
  }, [characterId, sessionView, sessionId, persistCharacteristicsPayload])

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

  async function openSessionItemDetailsModal(itemId: number) {
    setIsWeaponItemDetailsOpen(true)
    setWeaponItemDetails(null)
    setWeaponItemDetailsLoading(true)
    try {
      const res = await apiGet<{ item: ItemDetail }>(`/api/items/${itemId}`, token)
      setWeaponItemDetails(res.item)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors du chargement de l'objet",
        severity: 'error',
      })
    } finally {
      setWeaponItemDetailsLoading(false)
    }
  }

  async function handleSessionConsumableQuantityBlur(inventoryLineId: number) {
    const raw = sessionConsumableQtyDraft[inventoryLineId] ?? ''
    const parsed = Number.parseInt(String(raw).trim(), 10)
    const row = sessionConsumables.find((x) => x.id === inventoryLineId)
    if (!row) return

    if (Number.isNaN(parsed) || parsed < 0) {
      setSessionConsumableQtyDraft((d) => ({ ...d, [inventoryLineId]: String(row.quantity) }))
      showSnackbar({
        message: 'La quantité doit être un entier au moins égal à 0.',
        severity: 'error',
      })
      return
    }

    if (parsed === row.quantity) {
      setSessionConsumableQtyDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
      return
    }

    setSavingConsumableQtyId(inventoryLineId)
    try {
      await persistSessionConsumableQuantity(inventoryLineId, parsed, row.quantity)
    } finally {
      setSavingConsumableQtyId(null)
    }
  }

  async function handleSessionConsumableQuantityStep(inventoryLineId: number, delta: number) {
    const row = sessionConsumables.find((x) => x.id === inventoryLineId)
    if (!row || savingConsumableQtyId === inventoryLineId) return
    const currentDraft = Number.parseInt(String(sessionConsumableQtyDraft[inventoryLineId] ?? row.quantity).trim(), 10)
    const safeCurrent = Number.isNaN(currentDraft) ? row.quantity : currentDraft
    const nextQuantity = Math.max(0, safeCurrent + delta)
    setSessionConsumableQtyDraft((d) => ({ ...d, [inventoryLineId]: String(nextQuantity) }))
    setSavingConsumableQtyId(inventoryLineId)
    try {
      await persistSessionConsumableQuantity(inventoryLineId, nextQuantity, row.quantity)
    } finally {
      setSavingConsumableQtyId(null)
    }
  }

  async function persistSessionConsumableQuantity(inventoryLineId: number, parsed: number, fallbackQuantity: number) {
    try {
      await apiPut(`/api/inventory/${characterId}/items/${inventoryLineId}`, { quantity: parsed }, token)
      setSessionConsumables((prev) => prev.map((c) => (c.id === inventoryLineId ? { ...c, quantity: parsed } : c)))
      setSessionConsumableQtyDraft((d) => ({ ...d, [inventoryLineId]: String(parsed) }))
    } catch (err) {
      setSessionConsumableQtyDraft((d) => ({ ...d, [inventoryLineId]: String(fallbackQuantity) }))
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la quantité.',
        severity: 'error',
      })
    }
  }

  async function handleAvatarFileChange(file: File | null) {
    if (!file || sessionView) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await apiPutFormData<{ success: boolean; avatar_url?: string | null }>(
        `/api/characters/${characterId}/avatar`,
        fd,
        token,
      )
      const nextAvatarUrl = res.avatar_url ?? ''
      setAvatarUrl(nextAvatarUrl)
      onAvatarLoadedRef.current?.(nextAvatarUrl)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors de l'envoi de l'avatar",
        severity: 'error',
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const skillsAccordionPanel = (
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
  )

  const skillsSummaryUnderAbilities = sessionView ? (
    <details
      className="character-skills-accordion"
      open={effectiveSessionLiveAccordions.skills}
      onToggle={(e) => patchSessionLiveAccordions({ skills: e.currentTarget.open })}
    >
      <summary className="character-skills-accordion-summary">Mes compétences</summary>
      {skillsAccordionPanel}
    </details>
  ) : null

  if (loading) return <p>Chargement...</p>

  return (
    <form
      className="login-form"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
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
        <CharacterIdentityAccordion
          form={{
            name: form.name,
            race: form.race,
            class: form.class,
            archetype: form.archetype,
            level: form.level,
            experiencePoints: form.experiencePoints,
            background: form.background,
            description: form.description,
            alignment: form.alignment,
          }}
          setForm={(updater) =>
            setForm((prev) => ({
              ...prev,
              ...updater({
                name: prev.name,
                race: prev.race,
                class: prev.class,
                archetype: prev.archetype,
                level: prev.level,
                experiencePoints: prev.experiencePoints,
                background: prev.background,
                description: prev.description,
                alignment: prev.alignment,
              }),
            }))
          }
          avatarUrl={
            avatarUrl
              ? `${getApiBaseUrl()}${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`
              : ''
          }
          avatarUploading={avatarUploading}
          onAvatarFileChange={(file) => {
            void handleAvatarFileChange(file)
          }}
          canEditOwner={canEditOwner}
          ownerUserId={ownerUserId}
          setOwnerUserId={setOwnerUserId}
          availableUsers={availableUsers.map((u) => ({ id: u.id, username: u.username, email: u.email }))}
        />
      )}

      {!sessionView ? (
        <>
          <datalist id="dnd-races">
            {DND_5E_RACES.map((race) => (
              <option key={race} value={race} />
            ))}
          </datalist>
          <datalist id="dnd-classes">
            {DND_5E_CLASSES.map((klass) => (
              <option key={klass} value={klass} />
            ))}
          </datalist>
        </>
      ) : null}

      {!sessionView ? (
        <details className="character-skills-accordion" open>
          <summary className="character-skills-accordion-summary">Combat</summary>
          <div className="character-skills-accordion-panel">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 0.75rem' }}>
              <div>
                <label htmlFor="char-hp-max">PDV max</label>
                <input
                  id="char-hp-max"
                  type="number"
                  min={0}
                  value={form.hitPointsMax}
                  onChange={(e) => setForm((p) => ({ ...p, hitPointsMax: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="char-ac">Classe d&apos;armure</label>
                <input
                  id="char-ac"
                  type="number"
                  min={0}
                  value={form.armorClass}
                  onChange={(e) => setForm((p) => ({ ...p, armorClass: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="char-hit-dice">Dés de vie</label>
                <input
                  id="char-hit-dice"
                  type="text"
                  placeholder="ex: 1d8"
                  value={form.hitDice}
                  onChange={(e) => setForm((p) => ({ ...p, hitDice: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </details>
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

          <div className="session-live-inventory-accordions">
            <details
              className="character-skills-accordion session-weapons-section"
              open={effectiveSessionLiveAccordions.weapons}
              onToggle={(e) => patchSessionLiveAccordions({ weapons: e.currentTarget.open })}
            >
              <summary className="character-skills-accordion-summary session-weapons-title">Armes</summary>
              <div className="character-skills-accordion-panel">
                {sessionEquippedWeapons.length === 0 ? (
                  <p className="session-weapons-empty">Aucune arme équipée.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table inventory-items-table session-weapons-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Dégâts</th>
                          <th>Propriétés</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionEquippedWeapons.map((w) => (
                          <tr
                            key={w.id}
                            className={
                              w.item_id != null ? 'clickable-row session-weapons-row' : 'session-weapons-row'
                            }
                            onClick={() => {
                              if (w.item_id != null) void openSessionItemDetailsModal(w.item_id)
                            }}
                          >
                            <td data-label="Nom">
                              <span className="inventory-item-name">
                                <span className="inventory-item-type-icon" title="weapon" aria-label="weapon">
                                  {getItemTypeIcon('weapon').icon}
                                </span>
                                <span>{w.name}</span>
                              </span>
                            </td>
                            <td data-label="Dégâts">{w.damage}</td>
                            <td data-label="Propriétés">{w.propertiesLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>

            <details
              className="character-skills-accordion session-consumables-section"
              open={effectiveSessionLiveAccordions.consumables}
              onToggle={(e) => patchSessionLiveAccordions({ consumables: e.currentTarget.open })}
            >
              <summary className="character-skills-accordion-summary session-consumables-title">Consommables</summary>
              <div className="character-skills-accordion-panel">
                {sessionConsumables.length === 0 ? (
                  <p className="session-consumables-empty">Aucun consommable dans l&apos;inventaire.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table inventory-items-table session-consumables-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Qté</th>
                          <th>Catégorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionConsumables.map((c) => (
                          <tr
                            key={c.id}
                            className={
                              c.item_id != null ? 'clickable-row session-consumables-row' : 'session-consumables-row'
                            }
                            onClick={() => {
                              if (c.item_id != null) void openSessionItemDetailsModal(c.item_id)
                            }}
                          >
                            <td data-label="Nom">
                              <span className="inventory-item-name">
                                <span className="inventory-item-type-icon" title="consumable" aria-label="consumable">
                                  {getItemTypeIcon('consumable').icon}
                                </span>
                                <span>{c.name}</span>
                              </span>
                            </td>
                            <td data-label="Qté" onClick={(e) => e.stopPropagation()}>
                              <div className="inventory-qty-control">
                                <button
                                  type="button"
                                  className="inventory-qty-step"
                                  disabled={savingConsumableQtyId === c.id}
                                  onClick={() => void handleSessionConsumableQuantityStep(c.id, -1)}
                                  aria-label={`Diminuer la quantité de ${c.name}`}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  className="inventory-qty-input"
                                  min={0}
                                  disabled={savingConsumableQtyId === c.id}
                                  value={sessionConsumableQtyDraft[c.id] ?? String(c.quantity)}
                                  onChange={(e) =>
                                    setSessionConsumableQtyDraft((d) => ({ ...d, [c.id]: e.target.value }))
                                  }
                                  onBlur={() => void handleSessionConsumableQuantityBlur(c.id)}
                                  onKeyDown={(e) => {
                                    e.stopPropagation()
                                    if (e.key === 'Enter') {
                                      ;(e.target as HTMLInputElement).blur()
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Quantité — ${c.name}`}
                                />
                                <button
                                  type="button"
                                  className="inventory-qty-step"
                                  disabled={savingConsumableQtyId === c.id}
                                  onClick={() => void handleSessionConsumableQuantityStep(c.id, 1)}
                                  aria-label={`Augmenter la quantité de ${c.name}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td data-label="Catégorie">{c.categoryLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>

            <details
              className="character-skills-accordion session-items-section"
              open={effectiveSessionLiveAccordions.items}
              onToggle={(e) => patchSessionLiveAccordions({ items: e.currentTarget.open })}
            >
              <summary className="character-skills-accordion-summary session-items-title">Items</summary>
              <div className="character-skills-accordion-panel">
                {sessionEquippedOtherItems.length === 0 ? (
                  <p className="session-items-empty">Aucun autre objet équipé.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table inventory-items-table session-items-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Type</th>
                          <th>Catégorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionEquippedOtherItems.map((it) => (
                          <tr
                            key={it.id}
                            className={it.item_id != null ? 'clickable-row session-items-row' : 'session-items-row'}
                            onClick={() => {
                              if (it.item_id != null) void openSessionItemDetailsModal(it.item_id)
                            }}
                          >
                            <td data-label="Nom">
                              <span className="inventory-item-name">
                                <span className="inventory-item-type-icon" title={it.typeLabel ?? 'other'} aria-label={it.typeLabel ?? 'other'}>
                                  {getItemTypeIcon(it.typeLabel).icon}
                                </span>
                                <span>{it.name}</span>
                              </span>
                            </td>
                            <td data-label="Type">{it.typeLabel}</td>
                            <td data-label="Catégorie">{it.categoryLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          </div>
        </>
      ) : null}

      {!sessionView ? (
        <details className="character-skills-accordion" open>
          <summary className="character-skills-accordion-summary">Caractéristiques</summary>
          <div className="character-skills-accordion-panel">
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
          </div>
        </details>
      ) : null}

      {!sessionView ? (
        <details className="character-skills-accordion">
          <summary className="character-skills-accordion-summary">Compétences</summary>
          <div className="character-skills-accordion-panel">
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
          </div>
        </details>
      ) : null}

      <ItemDetailsModal
        open={isWeaponItemDetailsOpen}
        loading={weaponItemDetailsLoading}
        itemDetails={weaponItemDetails}
        onClose={() => setIsWeaponItemDetailsOpen(false)}
      />
    </form>
  )
}

