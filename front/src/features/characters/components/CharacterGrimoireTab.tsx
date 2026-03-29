import { useEffect, useState } from 'react'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiDelete, apiGet, apiPost, apiPut } from '../../../shared/api/client'
import type { AuthUser } from '../../../shared/types'

type CharacterSpellSlot = {
  level: number
  slotsMax: number
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

type SpellDetail = {
  id: number
  index?: string
  name: string
  level?: number | null
  school?: string | null
  castingTime?: string | null
  range?: string | null
  components?: string | null
  duration?: string | null
  description?: string | null
  higherLevel?: string | null
  ritual?: boolean | null
  concentration?: boolean | null
  raw?: unknown
}

type Dnd5eSpellListItem = {
  id: number
  index: string
  name: string
  level: number | null
  school: string | null
}

export function CharacterGrimoireTab(props: { characterId: string; token: string; user: AuthUser | null }) {
  const { characterId, token, user } = props
  const { showSnackbar } = useSnackbar()

  const [spellSlotsDraft, setSpellSlotsDraft] = useState<Record<number, { slotsMax: string }>>(() =>
    Array.from({ length: 10 }, (_, level) => level).reduce<Record<number, { slotsMax: string }>>((acc, lvl) => {
      acc[lvl] = { slotsMax: '0' }
      return acc
    }, {}),
  )
  const [spellSlotsSaving, setSpellSlotsSaving] = useState(false)

  const [grimoireLoaded, setGrimoireLoaded] = useState(false)
  const [grimoireLoading, setGrimoireLoading] = useState(false)
  const [grimoireItems, setGrimoireItems] = useState<GrimoireEntry[]>([])

  const [isCreateSpellModalOpen, setIsCreateSpellModalOpen] = useState(false)
  const [createSpellSaving, setCreateSpellSaving] = useState(false)
  const [newSpellForm, setNewSpellForm] = useState({ name: '', level: '0', description: '' })

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
  const [editGrimoireForm, setEditGrimoireForm] = useState({
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
        const response = await apiGet<{ success: boolean; character: { spellSlots?: Array<{ level: number; slotsMax: number }> } }>(
          `/api/characters/${characterId}`,
          token,
        )
        const slots = Array.isArray(response.character?.spellSlots) ? response.character.spellSlots : []
        const slotsMap: Record<number, { slotsMax: string }> = {}
        for (let lvl = 0; lvl <= 9; lvl += 1) {
          const found = slots.find((s) => s.level === lvl)
          slotsMap[lvl] = { slotsMax: found?.slotsMax != null ? String(found.slotsMax) : '0' }
        }
        setSpellSlotsDraft(slotsMap)
      } catch {
        // ignore
      }
    }
    void loadSlots()
  }, [characterId, token])

  async function handleSaveSpellSlots(event: React.FormEvent) {
    event.preventDefault()
    setSpellSlotsSaving(true)
    try {
      const payload: CharacterSpellSlot[] = Array.from({ length: 10 }, (_, lvl) => lvl).map((lvl) => {
        const row = spellSlotsDraft[lvl] ?? { slotsMax: '0' }
        const max = Number.parseInt(String(row.slotsMax).trim(), 10)
        return { level: lvl, slotsMax: Number.isNaN(max) ? 0 : Math.max(0, max) }
      })

      await apiPut(`/api/characters/${characterId}`, { spellSlots: payload }, token)
      showSnackbar({ message: 'Emplacements de sorts enregistrés.', severity: 'success' })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde emplacements',
        severity: 'error',
      })
    } finally {
      setSpellSlotsSaving(false)
    }
  }

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
        { name, level, description: newSpellForm.description.trim() || undefined },
        token,
      )
      await apiPost(`/api/grimoire/${characterId}/spells`, { spell_id: created.item.id, is_known: true }, token)

      setIsCreateSpellModalOpen(false)
      setNewSpellForm({ name: '', level: '0', description: '' })
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

  return (
    <div>
      <h4>Emplacements de sorts</h4>
      <form className="login-form" onSubmit={handleSaveSpellSlots}>
        <div className="responsive-table">
          <table className="inventory-items-table">
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, lvl) => (
                <tr key={lvl}>
                  <td data-label="Niveau">{lvl}</td>
                  <td data-label="Max">
                    <input
                      type="number"
                      className="inventory-qty-input"
                      min={0}
                      value={spellSlotsDraft[lvl]?.slotsMax ?? '0'}
                      onChange={(event) => setSpellSlotsDraft((prev) => ({ ...prev, [lvl]: { slotsMax: event.target.value } }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn" type="submit" disabled={spellSlotsSaving}>
          {spellSlotsSaving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <h4 style={{ marginTop: '1rem' }}>Sorts</h4>
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

      {grimoireLoading ? <p>Chargement…</p> : null}
      {!grimoireLoading && grimoireItems.length === 0 ? <p>Aucun sort dans le grimoire.</p> : null}

      {!grimoireLoading && grimoireItems.length > 0 ? (
        <div className="responsive-table">
          <table className="inventory-items-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Niveau</th>
                <th>Préparé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grimoireItems.map((entry) => (
                <tr key={entry.id} className="clickable-row" onClick={() => void openSpellDetailsModal(entry.spell_id)}>
                  <td data-label="Nom">{entry.spell_name ?? '—'}</td>
                  <td data-label="Niveau">{entry.spell_level ?? '—'}</td>
                  <td data-label="Préparé">{entry.is_prepared ? 'Oui' : 'Non'}</td>
                  <td data-label="Actions">
                    <button
                      className="btn btn-secondary btn-small"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void openEditGrimoireEntry(entry)
                      }}
                    >
                      Éditer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isCreateSpellModalOpen && (
        <div className="modal-backdrop" onClick={() => (!createSpellSaving ? setIsCreateSpellModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Créer un sort</h3>
            <form className="login-form" onSubmit={handleCreateSpell}>
              <label htmlFor="new-spell-name">Nom</label>
              <input id="new-spell-name" type="text" required value={newSpellForm.name} onChange={(event) => setNewSpellForm((prev) => ({ ...prev, name: event.target.value }))} />

              <label htmlFor="new-spell-level">Niveau</label>
              <input id="new-spell-level" type="number" min={0} max={9} value={newSpellForm.level} onChange={(event) => setNewSpellForm((prev) => ({ ...prev, level: event.target.value }))} />

              <label htmlFor="new-spell-desc">Description</label>
              <textarea id="new-spell-desc" rows={4} value={newSpellForm.description} onChange={(event) => setNewSpellForm((prev) => ({ ...prev, description: event.target.value }))} />

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

      {isImportSpellModalOpen && (
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
          </div>
        </div>
      )}

      {isEditGrimoireModalOpen && (
        <div className="modal-backdrop" onClick={() => (!editGrimoireSaving ? setIsEditGrimoireModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Éditer le sort</h3>
            <form className="login-form" onSubmit={handleSaveGrimoireEntry}>
              <h4>Sort</h4>
              <label htmlFor="edit-spell-name">Nom</label>
              <input id="edit-spell-name" type="text" required value={editGrimoireForm.name} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, name: event.target.value }))} />

              <label htmlFor="edit-spell-level">Niveau</label>
              <input id="edit-spell-level" type="number" min={0} max={9} value={editGrimoireForm.level} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, level: event.target.value }))} />

              <label htmlFor="edit-spell-school">École</label>
              <input id="edit-spell-school" type="text" value={editGrimoireForm.school} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, school: event.target.value }))} />

              <label htmlFor="edit-spell-casting">Casting time</label>
              <input id="edit-spell-casting" type="text" value={editGrimoireForm.castingTime} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, castingTime: event.target.value }))} />

              <label htmlFor="edit-spell-range">Range</label>
              <input id="edit-spell-range" type="text" value={editGrimoireForm.range} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, range: event.target.value }))} />

              <label htmlFor="edit-spell-components">Components</label>
              <input id="edit-spell-components" type="text" value={editGrimoireForm.components} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, components: event.target.value }))} />

              <label htmlFor="edit-spell-duration">Duration</label>
              <input id="edit-spell-duration" type="text" value={editGrimoireForm.duration} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, duration: event.target.value }))} />

              <label htmlFor="edit-spell-desc">Description</label>
              <textarea id="edit-spell-desc" rows={5} value={editGrimoireForm.description} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, description: event.target.value }))} />

              <label htmlFor="edit-spell-higher">Higher level</label>
              <textarea id="edit-spell-higher" rows={3} value={editGrimoireForm.higherLevel} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, higherLevel: event.target.value }))} />

              <label className="skill-check">
                <input type="checkbox" checked={editGrimoireForm.ritual} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, ritual: event.target.checked }))} />
                Rituel
              </label>

              <label className="skill-check">
                <input type="checkbox" checked={editGrimoireForm.concentration} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, concentration: event.target.checked }))} />
                Concentration
              </label>

              <label htmlFor="edit-spell-raw">Raw (JSON)</label>
              <textarea id="edit-spell-raw" rows={6} value={editGrimoireForm.rawJson} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, rawJson: event.target.value }))} />

              <h4>Grimoire</h4>
              <label className="skill-check">
                <input type="checkbox" checked={editGrimoireForm.is_known} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, is_known: event.target.checked }))} />
                Connu
              </label>

              <label className="skill-check">
                <input type="checkbox" checked={editGrimoireForm.is_prepared} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, is_prepared: event.target.checked }))} />
                Préparé
              </label>

              <label htmlFor="grimoire-notes">Notes</label>
              <textarea id="grimoire-notes" rows={4} value={editGrimoireForm.notes} onChange={(event) => setEditGrimoireForm((p) => ({ ...p, notes: event.target.value }))} />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" type="submit" disabled={editGrimoireSaving}>
                  {editGrimoireSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={editGrimoireSaving}
                  onClick={() => setRemoveFromGrimoireConfirmOpen(true)}
                >
                  Supprimer du grimoire
                </button>
                <button className="btn btn-secondary" type="button" disabled={editGrimoireSaving} onClick={() => setIsEditGrimoireModalOpen(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeFromGrimoireConfirmOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!removingFromGrimoire) setRemoveFromGrimoireConfirmOpen(false)
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Supprimer du grimoire</h3>
            <p>Confirmer la suppression de ce sort du grimoire ?</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn" type="button" disabled={removingFromGrimoire} onClick={() => void handleRemoveFromGrimoire()}>
                {removingFromGrimoire ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button className="btn btn-secondary" type="button" disabled={removingFromGrimoire} onClick={() => setRemoveFromGrimoireConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {isSpellDetailsModalOpen && (
        <div className="modal-backdrop" onClick={() => (!spellDetailsLoading ? setIsSpellDetailsModalOpen(false) : null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Détails du sort</h3>
            {spellDetailsLoading ? <p>Chargement…</p> : null}
            {!spellDetailsLoading && spellDetails ? (
              <div className="item-details">
                <p>
                  <strong>Index</strong> {spellDetails.index ?? '—'}
                </p>
                <p>
                  <strong>Nom</strong> {spellDetails.name}
                </p>
                <p>
                  <strong>Niveau</strong> {spellDetails.level ?? '—'}
                </p>
                <p>
                  <strong>École</strong> {spellDetails.school ?? '—'}
                </p>
                <p>
                  <strong>Casting time</strong> {spellDetails.castingTime ?? '—'}
                </p>
                <p>
                  <strong>Range</strong> {spellDetails.range ?? '—'}
                </p>
                <p>
                  <strong>Components</strong> {spellDetails.components ?? '—'}
                </p>
                <p>
                  <strong>Duration</strong> {spellDetails.duration ?? '—'}
                </p>
                <p>
                  <strong>Description</strong> {spellDetails.description?.trim() ? spellDetails.description : '—'}
                </p>
                <p>
                  <strong>Higher level</strong> {spellDetails.higherLevel?.trim() ? spellDetails.higherLevel : '—'}
                </p>
                <p>
                  <strong>Rituel</strong> {spellDetails.ritual ? 'Oui' : 'Non'}
                </p>
                <p>
                  <strong>Concentration</strong> {spellDetails.concentration ? 'Oui' : 'Non'}
                </p>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" type="button" disabled={spellDetailsLoading} onClick={() => setIsSpellDetailsModalOpen(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

