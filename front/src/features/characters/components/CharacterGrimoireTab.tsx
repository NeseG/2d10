import { useEffect, useMemo, useRef, useState } from 'react'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
import type { AuthUser } from '../../../shared/types'
import { SpellDetailsModal, type SpellDetail } from '../../spells/components/SpellDetailsModal'
import { RemoveFromGrimoireConfirmModal, SpellEditModal, type EditGrimoireFormState } from '../../spells/components/SpellEditModal'

type CharacterSpellSlot = {
  level: number
  slotsMax: number
}

type AbilityName = 'STRENGTH' | 'DEXTERITY' | 'CONSTITUTION' | 'INTELLIGENCE' | 'WISDOM' | 'CHARISMA'

const SPELLCASTING_ABILITY_OPTIONS: Array<{ value: AbilityName; label: string }> = [
  { value: 'STRENGTH', label: 'FOR' },
  { value: 'DEXTERITY', label: 'DEX' },
  { value: 'CONSTITUTION', label: 'CON' },
  { value: 'INTELLIGENCE', label: 'INT' },
  { value: 'WISDOM', label: 'SAG' },
  { value: 'CHARISMA', label: 'CHA' },
]

function abilityScoreKeyFromName(ability: AbilityName): 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma' {
  switch (ability) {
    case 'STRENGTH':
      return 'strength'
    case 'DEXTERITY':
      return 'dexterity'
    case 'CONSTITUTION':
      return 'constitution'
    case 'INTELLIGENCE':
      return 'intelligence'
    case 'WISDOM':
      return 'wisdom'
    case 'CHARISMA':
      return 'charisma'
  }
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function getProficiencyBonus(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0
  return 2 + Math.floor((level - 1) / 4)
}

type GrimoireEntry = {
  id: number
  character_id: number
  spell_id: number
  spell_index: string | null
  spell_name: string | null
  spell_level: number | null
  spell_school: string | null
  is_prepared: boolean
  is_known: boolean
  times_prepared: number
  times_cast: number
  notes: string | null
  learned_at: string | null
  created_at: string | null
  updated_at: string | null
  description: string | null
  casting_time: string | null
  range: string | null
  components: string | null
  duration: string | null
  higher_level: string | null
  ritual: boolean | null
  concentration: boolean | null
}

type Dnd5eSpellListItem = {
  id: number
  index: string
  name: string
  level: number | null
  school: string | null
}

const SPELL_SCHOOL_SUGGESTIONS = [
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
]

function parseStoredLiveSlots(raw: string | null): Record<number, boolean[]> {
  if (!raw) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<number, boolean[]> = {}
    for (const [k, v] of Object.entries(o)) {
      const lvl = Number.parseInt(k, 10)
      if (Number.isNaN(lvl) || lvl < 1 || lvl > 9) continue
      if (!Array.isArray(v)) continue
      const booleans = v.filter((x) => typeof x === 'boolean') as boolean[]
      if (booleans.length === v.length) out[lvl] = booleans
    }
    return out
  } catch {
    return {}
  }
}

function normalizeLiveSlotState(
  prev: Record<number, boolean[]>,
  maxByLevel: Record<number, number>,
): Record<number, boolean[]> {
  const next: Record<number, boolean[]> = {}
  for (let lvl = 1; lvl <= 9; lvl += 1) {
    const max = maxByLevel[lvl] ?? 0
    if (max <= 0) continue
    const cur = prev[lvl] ?? []
    const arr: boolean[] = []
    for (let i = 0; i < max; i += 1) {
      arr.push(i < cur.length ? Boolean(cur[i]) : false)
    }
    next[lvl] = arr
  }
  return next
}

function grimoireLevelTitle(level: number): string {
  if (level === 0) return 'Tour de magie'
  return `Niveau ${level}`
}

export function CharacterGrimoireTab(props: {
  characterId: string
  token: string
  user: AuthUser | null
  sessionView?: boolean
  sessionId?: string
}) {
  const { characterId, token, user, sessionView = false, sessionId } = props
  const { showSnackbar } = useSnackbar()

  const [spellcastingAbility, setSpellcastingAbility] = useState<AbilityName | ''>('')
  const [characterLevel, setCharacterLevel] = useState<number | null>(null)
  const [abilityScores, setAbilityScores] = useState<Partial<Record<'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma', number>>>({})

  const [spellSlotsDraft, setSpellSlotsDraft] = useState<Record<number, { slotsMax: string }>>(() =>
    Array.from({ length: 10 }, (_, level) => level).reduce<Record<number, { slotsMax: string }>>((acc, lvl) => {
      acc[lvl] = { slotsMax: '0' }
      return acc
    }, {}),
  )
  const spellSlotsLoadedRef = useRef(false)
  const spellSlotsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [grimoireLoaded, setGrimoireLoaded] = useState(false)
  const [grimoireLoading, setGrimoireLoading] = useState(false)
  const [grimoireItems, setGrimoireItems] = useState<GrimoireEntry[]>([])

  const [isCreateSpellModalOpen, setIsCreateSpellModalOpen] = useState(false)
  const [createSpellSaving, setCreateSpellSaving] = useState(false)
  const [newSpellForm, setNewSpellForm] = useState({
    is_known: true,
    is_prepared: false,
    notes: '',
    name: '',
    level: '0',
    school: '',
    castingTime: '',
    range: '',
    components: '',
    duration: '',
    description: '',
    higherLevel: '',
    ritual: false,
    concentration: false,
  })

  const [isImportSpellModalOpen, setIsImportSpellModalOpen] = useState(false)
  const [dndSpellQuery, setDndSpellQuery] = useState('')
  const [dndSpellLoading, setDndSpellLoading] = useState(false)
  const [dndSpellItems, setDndSpellItems] = useState<Dnd5eSpellListItem[]>([])
  const [dndSpellPage, setDndSpellPage] = useState(1)
  const [dndSpellTotalPages, setDndSpellTotalPages] = useState(1)
  const [dndSpellAddingIndex, setDndSpellAddingIndex] = useState<string | null>(null)

  const [isEditGrimoireModalOpen, setIsEditGrimoireModalOpen] = useState(false)
  const [editGrimoireSaving, setEditGrimoireSaving] = useState(false)
  const [editGrimoireEntryId, setEditGrimoireEntryId] = useState<number | null>(null)
  const [editGrimoireSpellId, setEditGrimoireSpellId] = useState<number | null>(null)
  const [editGrimoireForm, setEditGrimoireForm] = useState<EditGrimoireFormState>({
    is_known: true,
    is_prepared: false,
    notes: '',
    name: '',
    level: '0',
    school: '',
    castingTime: '',
    range: '',
    components: '',
    duration: '',
    description: '',
    higherLevel: '',
    ritual: false,
    concentration: false,
    rawJson: '',
  })
  const [removeFromGrimoireConfirmOpen, setRemoveFromGrimoireConfirmOpen] = useState(false)
  const [removingFromGrimoire, setRemovingFromGrimoire] = useState(false)

  const [isSpellDetailsModalOpen, setIsSpellDetailsModalOpen] = useState(false)
  const [spellDetailsLoading, setSpellDetailsLoading] = useState(false)
  const [spellDetails, setSpellDetails] = useState<SpellDetail | null>(null)

  useEffect(() => {
    setGrimoireLoaded(false)
    setGrimoireItems([])
  }, [characterId])

  useEffect(() => {
    async function loadGrimoire() {
      if (!characterId || grimoireLoaded) return
      setGrimoireLoading(true)
      try {
        const result = await apiGet<{ success: boolean; grimoire: GrimoireEntry[] }>(`/api/grimoire/${characterId}`, token)
        setGrimoireItems(result.grimoire ?? [])
        setGrimoireLoaded(true)
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur chargement grimoire',
          severity: 'error',
        })
      } finally {
        setGrimoireLoading(false)
      }
    }
    void loadGrimoire()
  }, [characterId, grimoireLoaded, token, showSnackbar])

  useEffect(() => {
    async function loadSlots() {
      if (!characterId) return
      try {
        const response = await apiGet<{
          success: boolean
          character: {
            spellSlots?: Array<{ level: number; slotsMax: number }>
            level?: number | null
            strength?: number | null
            dexterity?: number | null
            constitution?: number | null
            intelligence?: number | null
            wisdom?: number | null
            charisma?: number | null
            spellcastingAbility?: AbilityName | null
            spellcasting_ability?: AbilityName | null
          }
        }>(
          `/api/characters/${characterId}`,
          token,
        )
        const slots = Array.isArray(response.character?.spellSlots) ? response.character.spellSlots : []
        const slotsMap: Record<number, { slotsMax: string }> = {}
        for (let lvl = 0; lvl <= 9; lvl += 1) {
          const found = slots.find((s) => s.level === lvl)
          slotsMap[lvl] = { slotsMax: found?.slotsMax != null ? String(found.slotsMax) : '0' }
        }
        spellSlotsLoadedRef.current = false
        setSpellSlotsDraft(slotsMap)
        spellSlotsLoadedRef.current = true

        const ability = (response.character?.spellcastingAbility ?? response.character?.spellcasting_ability) ?? null
        setSpellcastingAbility(ability ? ability : '')
        setCharacterLevel(response.character?.level != null ? Number(response.character.level) : null)
        setAbilityScores({
          strength: response.character?.strength ?? undefined,
          dexterity: response.character?.dexterity ?? undefined,
          constitution: response.character?.constitution ?? undefined,
          intelligence: response.character?.intelligence ?? undefined,
          wisdom: response.character?.wisdom ?? undefined,
          charisma: response.character?.charisma ?? undefined,
        })
      } catch {
        // ignore
      }
    }
    void loadSlots()
  }, [characterId, token])

  const spellcastingStats = useMemo(() => {
    if (!spellcastingAbility) return null
    const level = characterLevel
    const pb = level != null ? getProficiencyBonus(level) : null
    const scoreKey = abilityScoreKeyFromName(spellcastingAbility)
    const score = abilityScores[scoreKey]
    const mod = typeof score === 'number' && Number.isFinite(score) ? getModifier(score) : null
    if (pb == null || mod == null) {
      return { pb, mod, dc: null as number | null, attackBonus: null as number | null }
    }
    return { pb, mod, dc: 8 + pb + mod, attackBonus: pb + mod }
  }, [spellcastingAbility, abilityScores, characterLevel])

  async function handleSpellcastingAbilityChange(next: AbilityName | '') {
    setSpellcastingAbility(next)
    if (sessionView || !characterId) return
    try {
      await apiPut(`/api/characters/${characterId}`, { spellcasting_ability: next || null }, token)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : "Erreur lors de la mise à jour de la caractéristique d'incantation",
        severity: 'error',
      })
    }
  }

  useEffect(() => {
    return () => {
      if (spellSlotsSaveTimerRef.current) clearTimeout(spellSlotsSaveTimerRef.current)
    }
  }, [])

  /** v2 : non coché par défaut ; coché = emplacement dépensé (clé nouvelle pour ne pas mélanger l’ancien sens). */
  const liveSlotsStorageKey =
    sessionView && characterId ? `grimoire-live-slots-v2:${sessionId ?? 'no-session'}:${characterId}` : null

  const slotsMaxByLevel = useMemo(() => {
    const m: Record<number, number> = {}
    for (let l = 0; l <= 9; l += 1) {
      const v = Number.parseInt(String(spellSlotsDraft[l]?.slotsMax ?? '0').trim(), 10)
      m[l] = Number.isNaN(v) ? 0 : Math.max(0, Math.min(99, v))
    }
    return m
  }, [spellSlotsDraft])

  const spellsGroupedByLevel = useMemo(() => {
    const map = new Map<number, GrimoireEntry[]>()
    for (let i = 0; i <= 9; i += 1) map.set(i, [])
    for (const e of grimoireItems) {
      const raw = e.spell_level
      const L = raw != null ? Math.min(9, Math.max(0, raw)) : 0
      map.get(L)!.push(e)
    }
    for (let i = 0; i <= 9; i += 1) {
      map.get(i)!.sort((a, b) =>
        (a.spell_name ?? '').localeCompare(b.spell_name ?? '', 'fr', { sensitivity: 'base' }),
      )
    }
    return map
  }, [grimoireItems])

  const preparedSpellsCount = useMemo(
    () => grimoireItems.filter((entry) => Boolean(entry.is_prepared)).length,
    [grimoireItems],
  )

  const [liveSlotSpend, setLiveSlotSpend] = useState<Record<number, boolean[]>>({})

  useEffect(() => {
    if (!sessionView || !liveSlotsStorageKey) return
    const stored = parseStoredLiveSlots(localStorage.getItem(liveSlotsStorageKey))
    setLiveSlotSpend(normalizeLiveSlotState(stored, slotsMaxByLevel))
  }, [sessionView, liveSlotsStorageKey, characterId, slotsMaxByLevel])

  function toggleLiveSlot(level: number, index: number) {
    if (!liveSlotsStorageKey || level < 1 || level > 9) return
    setLiveSlotSpend((prev) => {
      const max = slotsMaxByLevel[level] ?? 0
      const base = prev[level] ?? Array.from({ length: max }, () => false)
      const arr = [...base]
      if (index < 0 || index >= arr.length) return prev
      arr[index] = !arr[index]
      const next = { ...prev, [level]: arr }
      try {
        localStorage.setItem(liveSlotsStorageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  async function handleSaveSpellSlots(event: React.FormEvent) {
    event.preventDefault()
    if (!characterId) return
    try {
      const payload: CharacterSpellSlot[] = Array.from({ length: 10 }, (_, lvl) => lvl).map((lvl) => {
        const row = spellSlotsDraft[lvl] ?? { slotsMax: '0' }
        const max = Number.parseInt(String(row.slotsMax).trim(), 10)
        return { level: lvl, slotsMax: Number.isNaN(max) ? 0 : Math.max(0, max) }
      })

      await apiPut(`/api/characters/${characterId}`, { spellSlots: payload }, token)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde emplacements',
        severity: 'error',
      })
    }
  }

  useEffect(() => {
    if (sessionView || !spellSlotsLoadedRef.current || !characterId) return
    if (spellSlotsSaveTimerRef.current) clearTimeout(spellSlotsSaveTimerRef.current)
    spellSlotsSaveTimerRef.current = setTimeout(() => {
      spellSlotsSaveTimerRef.current = null
      void handleSaveSpellSlots({ preventDefault() {} } as React.FormEvent)
    }, 500)
  }, [spellSlotsDraft, sessionView, characterId])

  async function handleCreateSpell(event: React.FormEvent) {
    event.preventDefault()
    setCreateSpellSaving(true)
    try {
      const name = newSpellForm.name.trim()
      const level = Number.parseInt(newSpellForm.level, 10)
      if (!name) {
        showSnackbar({ message: 'Le nom est requis.', severity: 'error' })
        return
      }
      if (Number.isNaN(level) || level < 0 || level > 9) {
        showSnackbar({ message: 'Le niveau doit être entre 0 et 9.', severity: 'error' })
        return
      }

      const created = await apiPost<{ item: { id: number } }>(
        `/api/spells`,
        {
          name,
          level,
          school: newSpellForm.school.trim() || undefined,
          castingTime: newSpellForm.castingTime.trim() || undefined,
          range: newSpellForm.range.trim() || undefined,
          components: newSpellForm.components.trim() || undefined,
          duration: newSpellForm.duration.trim() || undefined,
          description: newSpellForm.description.trim() || undefined,
          higherLevel: newSpellForm.higherLevel.trim() || undefined,
          ritual: Boolean(newSpellForm.ritual),
          concentration: Boolean(newSpellForm.concentration),
        },
        token,
      )
      await apiPost(
        `/api/grimoire/${characterId}/spells`,
        {
          spell_id: created.item.id,
          is_known: Boolean(newSpellForm.is_known),
          is_prepared: Boolean(newSpellForm.is_prepared),
          notes: newSpellForm.notes.trim() || undefined,
        },
        token,
      )

      setIsCreateSpellModalOpen(false)
      setNewSpellForm({
        is_known: true,
        is_prepared: false,
        notes: '',
        name: '',
        level: '0',
        school: '',
        castingTime: '',
        range: '',
        components: '',
        duration: '',
        description: '',
        higherLevel: '',
        ritual: false,
        concentration: false,
      })
      setGrimoireLoaded(false)
      showSnackbar({ message: 'Sort créé et ajouté au grimoire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création sort',
        severity: 'error',
      })
    } finally {
      setCreateSpellSaving(false)
    }
  }

  async function loadDndSpells(params: { q: string; page: number }) {
    setDndSpellLoading(true)
    try {
      const res = await apiGet<{ items: Dnd5eSpellListItem[]; pagination: { page: number; totalPages: number } }>(
        `/api/dnd5e/spells?q=${encodeURIComponent(params.q)}&page=${params.page}&limit=20`,
        token,
      )
      setDndSpellItems(res.items ?? [])
      setDndSpellPage(res.pagination?.page ?? params.page)
      setDndSpellTotalPages(res.pagination?.totalPages ?? 1)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement sorts importés',
        severity: 'error',
      })
    } finally {
      setDndSpellLoading(false)
    }
  }

  async function openImportSpellModal() {
    setIsImportSpellModalOpen(true)
    setDndSpellQuery('')
    setDndSpellItems([])
    setDndSpellPage(1)
    setDndSpellTotalPages(1)
    await loadDndSpells({ q: '', page: 1 })
  }

  async function handleAddImportedSpell(index: string) {
    setDndSpellAddingIndex(index)
    try {
      await apiPost(`/api/dnd5e/characters/${characterId}/grimoire`, { spell_index: index }, token)
      setGrimoireLoaded(false)
      showSnackbar({ message: 'Sort importé ajouté au grimoire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur ajout sort importé',
        severity: 'error',
      })
    } finally {
      setDndSpellAddingIndex(null)
    }
  }

  // L'endpoint back est protégé admin/gm; on masque aussi le bouton côté UI.
  const canImport = user?.role === 'admin' || user?.role === 'gm'

  async function openSpellDetailsModal(spellId: number) {
    setSpellDetailsLoading(true)
    setSpellDetails(null)
    setIsSpellDetailsModalOpen(true)
    try {
      const res = await apiGet<{ item: SpellDetail }>(`/api/spells/${spellId}`, token)
      setSpellDetails(res.item)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement sort',
        severity: 'error',
      })
    } finally {
      setSpellDetailsLoading(false)
    }
  }

  async function openEditGrimoireEntry(entry: GrimoireEntry) {
    setEditGrimoireEntryId(entry.id)
    setEditGrimoireSpellId(entry.spell_id)
    setEditGrimoireForm({
      is_known: Boolean(entry.is_known),
      is_prepared: Boolean(entry.is_prepared),
      notes: entry.notes ?? '',
      name: entry.spell_name ?? '',
      level: entry.spell_level != null ? String(entry.spell_level) : '0',
      school: entry.spell_school ?? '',
      castingTime: entry.casting_time ?? '',
      range: entry.range ?? '',
      components: entry.components ?? '',
      duration: entry.duration ?? '',
      description: entry.description ?? '',
      higherLevel: entry.higher_level ?? '',
      ritual: Boolean(entry.ritual),
      concentration: Boolean(entry.concentration),
      rawJson: '',
    })
    setIsEditGrimoireModalOpen(true)

    try {
      const res = await apiGet<{ item: SpellDetail }>(`/api/spells/${entry.spell_id}`, token)
      const s = res.item
      setEditGrimoireForm((prev) => ({
        ...prev,
        name: s.name ?? prev.name,
        level: s.level != null ? String(s.level) : prev.level,
        school: s.school ?? prev.school,
        castingTime: s.castingTime ?? prev.castingTime,
        range: s.range ?? prev.range,
        components: s.components ?? prev.components,
        duration: s.duration ?? prev.duration,
        description: s.description ?? prev.description,
        higherLevel: s.higherLevel ?? prev.higherLevel,
        ritual: Boolean(s.ritual),
        concentration: Boolean(s.concentration),
        rawJson: s.raw != null ? JSON.stringify(s.raw, null, 2) : '',
      }))
    } catch {
      // ignore
    }
  }

  async function handleSaveGrimoireEntry(event: React.FormEvent) {
    event.preventDefault()
    if (editGrimoireEntryId == null || editGrimoireSpellId == null) return
    setEditGrimoireSaving(true)
    try {
      const parsedLevel = Number.parseInt(editGrimoireForm.level, 10)
      if (Number.isNaN(parsedLevel) || parsedLevel < 0 || parsedLevel > 9) {
        showSnackbar({ message: 'Le niveau doit être entre 0 et 9.', severity: 'error' })
        return
      }

      let raw: unknown | undefined = undefined
      if (editGrimoireForm.rawJson.trim()) {
        try {
          raw = JSON.parse(editGrimoireForm.rawJson)
        } catch {
          showSnackbar({ message: 'raw doit être un JSON valide.', severity: 'error' })
          return
        }
      } else {
        raw = null
      }

      await apiPut(
        `/api/spells/${editGrimoireSpellId}`,
        {
          name: editGrimoireForm.name.trim(),
          level: parsedLevel,
          school: editGrimoireForm.school.trim() || null,
          castingTime: editGrimoireForm.castingTime.trim() || null,
          range: editGrimoireForm.range.trim() || null,
          components: editGrimoireForm.components.trim() || null,
          duration: editGrimoireForm.duration.trim() || null,
          description: editGrimoireForm.description.trim() || null,
          higherLevel: editGrimoireForm.higherLevel.trim() || null,
          ritual: Boolean(editGrimoireForm.ritual),
          concentration: Boolean(editGrimoireForm.concentration),
          raw,
        },
        token,
      )

      await apiPut(
        `/api/grimoire/${characterId}/spells/${editGrimoireEntryId}`,
        {
          is_known: editGrimoireForm.is_known,
          is_prepared: editGrimoireForm.is_prepared,
          notes: editGrimoireForm.notes.trim() || undefined,
        },
        token,
      )

      setIsEditGrimoireModalOpen(false)
      setEditGrimoireEntryId(null)
      setEditGrimoireSpellId(null)
      setGrimoireLoaded(false)
      showSnackbar({ message: 'Sort et entrée grimoire enregistrés.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde sort',
        severity: 'error',
      })
    } finally {
      setEditGrimoireSaving(false)
    }
  }

  async function handleRemoveFromGrimoire() {
    if (editGrimoireEntryId == null) return
    setRemovingFromGrimoire(true)
    try {
      await apiDelete(`/api/grimoire/${characterId}/spells/${editGrimoireEntryId}`, token)
      setRemoveFromGrimoireConfirmOpen(false)
      setIsEditGrimoireModalOpen(false)
      setEditGrimoireEntryId(null)
      setEditGrimoireSpellId(null)
      setGrimoireLoaded(false)
      showSnackbar({ message: 'Sort retiré du grimoire.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur suppression sort',
        severity: 'error',
      })
    } finally {
      setRemovingFromGrimoire(false)
    }
  }

  async function handleTogglePrepared(entry: GrimoireEntry, nextPrepared: boolean) {
    try {
      await apiPut(
        `/api/grimoire/${characterId}/spells/${entry.id}`,
        {
          is_known: Boolean(entry.is_known),
          is_prepared: nextPrepared,
          notes: entry.notes ?? undefined,
        },
        token,
      )
      setGrimoireItems((prev) =>
        prev.map((item) => (item.id === entry.id ? { ...item, is_prepared: nextPrepared } : item)),
      )
      showSnackbar({ message: nextPrepared ? 'Sort préparé.' : 'Sort non préparé.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur mise à jour préparation du sort',
        severity: 'error',
      })
    }
  }

  return (
    <div>
      {sessionView ? (
        <div className="grimoire-session-live">
          {grimoireLoading ? <p>Chargement…</p> : null}
          {!grimoireLoading ? (
            <div className="grimoire-session-levels">
              {Array.from({ length: 10 }, (_, level) => {
                const spellsAtLevel = spellsGroupedByLevel.get(level) ?? []
                const maxSlots = slotsMaxByLevel[level] ?? 0
                const show = level === 0 ? true : spellsAtLevel.length > 0 || maxSlots > 0
                if (!show) return null
                return (
                  <details key={level} className="grimoire-session-level">
                    <summary className="grimoire-session-level-summary">
                      <span className="grimoire-session-level-title">{grimoireLevelTitle(level)}</span>
                      {level > 0 && maxSlots > 0 ? (
                        <span
                          className="grimoire-session-slot-boxes"
                          title="Cochez une case lorsque vous dépensez un emplacement de ce niveau."
                          onClick={(event) => event.preventDefault()}
                          role="group"
                          aria-label={`Emplacements de sort niveau ${level}`}
                        >
                          {Array.from({ length: maxSlots }, (_, i) => (
                            <input
                              key={i}
                              type="checkbox"
                              checked={liveSlotSpend[level]?.[i] ?? false}
                              onChange={() => toggleLiveSlot(level, i)}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Niveau ${level}, emplacement ${i + 1} sur ${maxSlots}`}
                            />
                          ))}
                        </span>
                      ) : null}
                    </summary>
                    <div className="grimoire-session-level-body">
                      {spellsAtLevel.length === 0 ? (
                        <p className="grimoire-session-empty">Aucun sort à ce niveau.</p>
                      ) : (
                        <ul className="grimoire-session-spell-list">
                          {spellsAtLevel.map((entry) => {
                            const casting = entry.casting_time?.trim()
                            const dur = entry.duration?.trim()
                            const hasMeta = Boolean(casting || dur)
                            return (
                              <li key={entry.id}>
                                <button
                                  type="button"
                                  className="grimoire-session-spell-row"
                                  onClick={() => void openSpellDetailsModal(entry.spell_id)}
                                >
                                  <span className="grimoire-session-spell-title">
                                    <span className="grimoire-session-spell-name">{entry.spell_name ?? '—'}</span>
                                    {entry.is_prepared ? (
                                      <span className="grimoire-session-prepared"> · préparé</span>
                                    ) : null}
                                  </span>
                                  {hasMeta ? (
                                    <span className="grimoire-session-spell-meta">
                                      {casting ? (
                                        <span className="grimoire-session-spell-meta-item">
                                          <span className="grimoire-session-spell-meta-label">Incantation</span>{' '}
                                          {casting}
                                        </span>
                                      ) : null}
                                      {dur ? (
                                        <span className="grimoire-session-spell-meta-item">
                                          <span className="grimoire-session-spell-meta-label">Durée</span>{' '}
                                          {dur}
                                        </span>
                                      ) : null}
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grimoire-spellcasting-panel" style={{ marginBottom: '0.75rem' }}>
            <label className="item-edit-form-row" htmlFor="spellcasting-ability-select">
              <span>Caractéristique d&apos;incantation</span>
              <select
                id="spellcasting-ability-select"
                value={spellcastingAbility}
                onChange={(event) => void handleSpellcastingAbilityChange((event.target.value as AbilityName) || '')}
                disabled={!characterId}
                className="grimoire-spellcasting-select"
              >
                <option value="">—</option>
                {SPELLCASTING_ABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grimoire-spellcasting-stats">
              <p className="grimoire-spellcasting-stat">
                <strong>DD de sauvegarde</strong>{' '}
                {spellcastingStats?.dc != null ? spellcastingStats.dc : '—'}{' '}
                <span className="grimoire-spellcasting-formula">
                  (= 8 + maîtrise {spellcastingStats?.pb != null ? spellcastingStats.pb : '—'} + modif{' '}
                  {spellcastingStats?.mod != null ? (spellcastingStats.mod >= 0 ? `+${spellcastingStats.mod}` : String(spellcastingStats.mod)) : '—'})
                </span>
              </p>
              <p className="grimoire-spellcasting-stat">
                <strong>Bonus d&apos;attaque</strong>{' '}
                {spellcastingStats?.attackBonus != null
                  ? spellcastingStats.attackBonus >= 0
                    ? `+${spellcastingStats.attackBonus}`
                    : String(spellcastingStats.attackBonus)
                  : '—'}{' '}
                <span className="grimoire-spellcasting-formula">
                  (= maîtrise {spellcastingStats?.pb != null ? spellcastingStats.pb : '—'} + modif{' '}
                  {spellcastingStats?.mod != null ? (spellcastingStats.mod >= 0 ? `+${spellcastingStats.mod}` : String(spellcastingStats.mod)) : '—'})
                </span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <button className="btn" type="button" onClick={() => setIsCreateSpellModalOpen(true)}>
              Créer un sort
            </button>
            {canImport && (
              <button className="btn btn-secondary" type="button" onClick={() => void openImportSpellModal()}>
                Importer un sort
              </button>
            )}
          </div>

          <p className="grimoire-summary-caption">
            {grimoireItems.length} sort{grimoireItems.length > 1 ? 's' : ''} dans le grimoire · {preparedSpellsCount} préparé
            {preparedSpellsCount > 1 ? 's' : ''}
          </p>

          {grimoireLoading ? <p>Chargement…</p> : null}

          {!grimoireLoading ? (
            <div className="grimoire-session-levels">
              {Array.from({ length: 10 }, (_, level) => {
                const spellsAtLevel = spellsGroupedByLevel.get(level) ?? []
                const maxSlots = spellSlotsDraft[level]?.slotsMax ?? '0'
                const show = level === 0 ? true : spellsAtLevel.length > 0 || Number.parseInt(maxSlots, 10) > 0
                if (!show) return null
                return (
                  <details key={level} className="grimoire-session-level" open={spellsAtLevel.length > 0}>
                    <summary className="grimoire-session-level-summary">
                      <span className="grimoire-session-level-title">{grimoireLevelTitle(level)}</span>
                      {level > 0 ? (
                        <span
                          className="grimoire-session-slot-boxes grimoire-edit-slot-boxes"
                          onClick={(event) => event.preventDefault()}
                          role="group"
                          aria-label={`Emplacements max niveau ${level}`}
                        >
                          <label className="grimoire-edit-slot-label" htmlFor={`grimoire-slot-max-${level}`}>
                            Emplacement
                          </label>
                          <input
                            id={`grimoire-slot-max-${level}`}
                            type="number"
                            min={0}
                            className="inventory-qty-input"
                            value={maxSlots}
                            onChange={(event) =>
                              setSpellSlotsDraft((prev) => ({ ...prev, [level]: { slotsMax: event.target.value } }))
                            }
                            onClick={(event) => event.stopPropagation()}
                          />
                        </span>
                      ) : null}
                    </summary>
                    <div className="grimoire-session-level-body">
                      {spellsAtLevel.length === 0 ? (
                        <p className="grimoire-session-empty">Aucun sort à ce niveau.</p>
                      ) : (
                        <ul className="grimoire-session-spell-list">
                          {spellsAtLevel.map((entry) => (
                              <li key={entry.id}>
                                <div className="grimoire-spell-admin-row">
                                  <button
                                    type="button"
                                    className="grimoire-session-spell-row"
                                    onClick={() => void openSpellDetailsModal(entry.spell_id)}
                                  >
                                    <span className="grimoire-session-spell-title">
                                      <span className="grimoire-session-spell-name">{entry.spell_name ?? '—'}</span>
                                    </span>
                                  </button>
                                  <label className="grimoire-inline-check">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(entry.is_prepared)}
                                      onChange={(event) => void handleTogglePrepared(entry, event.target.checked)}
                                      onClick={(event) => event.stopPropagation()}
                                    />
                                    Préparé
                                  </label>
                                  <button
                                    className="btn btn-secondary btn-small"
                                    type="button"
                                    onClick={() => void openEditGrimoireEntry(entry)}
                                  >
                                    Éditer
                                  </button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  </details>
                )
              })}
            </div>
          ) : null}
        </>
      )}

      {!sessionView && isCreateSpellModalOpen && (
        <div className="modal-backdrop" onClick={() => (!createSpellSaving ? setIsCreateSpellModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <label className="item-edit-title-field" htmlFor="new-spell-name">
              <span>Créer un sort</span>
              <input
                id="new-spell-name"
                type="text"
                required
                value={newSpellForm.name}
                onChange={(event) => setNewSpellForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <form className="login-form item-edit-form" onSubmit={handleCreateSpell}>
              <div className="item-edit-form-inline-pair spell-edit-level-school-row">
                <label className="item-edit-form-row" htmlFor="new-spell-level">
                  <span>Niveau</span>
                  <input
                    className="spell-edit-level-input"
                    id="new-spell-level"
                    type="number"
                    min={0}
                    max={9}
                    value={newSpellForm.level}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, level: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="new-spell-school">
                  <span>École</span>
                  <input
                    className="spell-edit-school-input"
                    id="new-spell-school"
                    type="text"
                    list="new-spell-school-suggestions"
                    value={newSpellForm.school}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, school: event.target.value }))}
                  />
                </label>
                <datalist id="new-spell-school-suggestions">
                  {SPELL_SCHOOL_SUGGESTIONS.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
              </div>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="new-spell-casting">
                  <span>Casting time</span>
                  <input
                    id="new-spell-casting"
                    type="text"
                    value={newSpellForm.castingTime}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, castingTime: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="new-spell-duration">
                  <span>Duration</span>
                  <input
                    id="new-spell-duration"
                    type="text"
                    value={newSpellForm.duration}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, duration: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-form-inline-pair">
                <label className="item-edit-form-row" htmlFor="new-spell-range">
                  <span>Range</span>
                  <input
                    id="new-spell-range"
                    type="text"
                    value={newSpellForm.range}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, range: event.target.value }))}
                  />
                </label>

                <label className="item-edit-form-row" htmlFor="new-spell-components">
                  <span>Components</span>
                  <input
                    id="new-spell-components"
                    type="text"
                    value={newSpellForm.components}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, components: event.target.value }))}
                  />
                </label>
              </div>

              <div className="item-edit-armor-checks">
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={newSpellForm.ritual}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, ritual: event.target.checked }))}
                  />
                  Rituel
                </label>
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={newSpellForm.concentration}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, concentration: event.target.checked }))}
                  />
                  Concentration
                </label>
              </div>

              <div className="item-edit-armor-checks">
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={newSpellForm.is_known}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, is_known: event.target.checked }))}
                  />
                  Connu
                </label>
                <label className="skill-check item-edit-inline-check">
                  <input
                    type="checkbox"
                    checked={newSpellForm.is_prepared}
                    onChange={(event) => setNewSpellForm((prev) => ({ ...prev, is_prepared: event.target.checked }))}
                  />
                  Préparé
                </label>
              </div>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="new-spell-desc">
                <span>Description</span>
                <textarea
                  id="new-spell-desc"
                  rows={4}
                  value={newSpellForm.description}
                  onChange={(event) => setNewSpellForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="new-spell-higher">
                <span>Higher level</span>
                <textarea
                  id="new-spell-higher"
                  rows={3}
                  value={newSpellForm.higherLevel}
                  onChange={(event) => setNewSpellForm((prev) => ({ ...prev, higherLevel: event.target.value }))}
                />
              </label>

              <label className="item-edit-form-row item-edit-form-row-textarea" htmlFor="new-spell-notes">
                <span>Notes</span>
                <textarea
                  id="new-spell-notes"
                  rows={4}
                  value={newSpellForm.notes}
                  onChange={(event) => setNewSpellForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" type="submit" disabled={createSpellSaving}>
                  {createSpellSaving ? 'Création…' : 'Créer'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={createSpellSaving} onClick={() => setIsCreateSpellModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!sessionView && isImportSpellModalOpen && (
        <div className="modal-backdrop" onClick={() => (!dndSpellLoading && dndSpellAddingIndex == null ? setIsImportSpellModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Importer un sort (D&D)</h3>
            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault()
                void loadDndSpells({ q: dndSpellQuery, page: 1 })
              }}
            >
              <label htmlFor="dnd-spell-search">Recherche</label>
              <input id="dnd-spell-search" type="text" placeholder="Ex. fireball, cure wounds…" value={dndSpellQuery} onChange={(event) => setDndSpellQuery(event.target.value)} disabled={dndSpellLoading} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" type="submit" disabled={dndSpellLoading}>
                  {dndSpellLoading ? 'Recherche…' : 'Rechercher'}
                </button>
                <button className="btn btn-secondary" type="button" disabled={dndSpellLoading} onClick={() => void loadDndSpells({ q: '', page: 1 })}>
                  Réinitialiser
                </button>
              </div>
            </form>

            {dndSpellLoading ? <p>Chargement…</p> : null}
            {!dndSpellLoading && dndSpellItems.length === 0 ? <p>Aucun résultat.</p> : null}

            {!dndSpellLoading && dndSpellItems.length > 0 ? (
              <div className="responsive-table">
                <table className="inventory-items-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Niveau</th>
                      <th>École</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dndSpellItems.map((s) => (
                      <tr key={s.index}>
                        <td data-label="Nom">{s.name}</td>
                        <td data-label="Niveau">{s.level ?? '—'}</td>
                        <td data-label="École">{s.school ?? '—'}</td>
                        <td>
                          <button className="btn btn-secondary btn-small" type="button" disabled={dndSpellAddingIndex === s.index} onClick={() => void handleAddImportedSpell(s.index)}>
                            {dndSpellAddingIndex === s.index ? 'Ajout…' : 'Ajouter'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" type="button" disabled={dndSpellLoading || dndSpellPage <= 1} onClick={() => void loadDndSpells({ q: dndSpellQuery, page: dndSpellPage - 1 })}>
                Précédent
              </button>
              <span>
                Page {dndSpellPage} / {dndSpellTotalPages}
              </span>
              <button className="btn btn-secondary" type="button" disabled={dndSpellLoading || dndSpellPage >= dndSpellTotalPages} onClick={() => void loadDndSpells({ q: dndSpellQuery, page: dndSpellPage + 1 })}>
                Suivant
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={dndSpellLoading || dndSpellAddingIndex != null}
                onClick={() => setIsImportSpellModalOpen(false)}
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {!sessionView && isEditGrimoireModalOpen && (
        <SpellEditModal
          open={isEditGrimoireModalOpen}
          saving={editGrimoireSaving}
          form={editGrimoireForm}
          setForm={setEditGrimoireForm}
          onSubmit={handleSaveGrimoireEntry}
          onClose={() => (!editGrimoireSaving ? setIsEditGrimoireModalOpen(false) : null)}
          onOpenRemoveConfirm={() => setRemoveFromGrimoireConfirmOpen(true)}
        />
      )}

      <RemoveFromGrimoireConfirmModal
        open={!sessionView && removeFromGrimoireConfirmOpen}
        removing={removingFromGrimoire}
        onClose={() => {
          if (!removingFromGrimoire) setRemoveFromGrimoireConfirmOpen(false)
        }}
        onConfirm={() => void handleRemoveFromGrimoire()}
      />

      <SpellDetailsModal
        open={isSpellDetailsModalOpen}
        loading={spellDetailsLoading}
        spellDetails={spellDetails}
        onClose={() => (!spellDetailsLoading ? setIsSpellDetailsModalOpen(false) : null)}
      />
    </div>
  )
}

