import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet, apiPost } from '../../../shared/api/client'

type PetSummary = { id: number; name: string }

type CharacterWithPets = {
  masterCharacterId?: number | null
  masterCharacter?: { id: number; name: string } | null
  pets?: PetSummary[]
}

export function CharacterPetsTab(props: { characterId: string; token: string }) {
  const { characterId, token } = props
  const navigate = useNavigate()
  const { showSnackbar } = useSnackbar()

  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [pets, setPets] = useState<PetSummary[]>([])
  const [isCompanion, setIsCompanion] = useState(false)
  const [masterLabel, setMasterLabel] = useState<string | null>(null)
  const [masterId, setMasterId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!characterId) return
    setLoading(true)
    try {
      const res = await apiGet<{ success: boolean; character: CharacterWithPets }>(
        `/api/characters/${characterId}`,
        token,
      )
      const c = res.character
      setPets(Array.isArray(c?.pets) ? c.pets : [])
      setIsCompanion(Boolean(c?.masterCharacterId))
      setMasterId(c?.masterCharacter?.id ?? null)
      setMasterLabel(c?.masterCharacter?.name?.trim() || null)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement familiers',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [characterId, token, showSnackbar])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreatePet() {
    if (!characterId || creating) return
    setCreating(true)
    try {
      const res = await apiPost<{ success: boolean; character: { id: number } }>(
        `/api/characters/${characterId}/pets`,
        {},
        token,
      )
      const newId = res.character?.id
      showSnackbar({ message: 'Familier créé. Tu peux compléter sa fiche.', severity: 'success' })
      await load()
      if (newId != null) {
        navigate(`/characters/${newId}/edit`)
      }
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur création familier',
        severity: 'error',
      })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <p>Chargement…</p>
  }

  if (isCompanion) {
    return (
      <div className="character-pets-tab">
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Cette fiche est un familier ou compagnon
          {masterLabel ? (
            <>
              {' '}
              lié à <strong>{masterLabel}</strong>
            </>
          ) : null}
          .
        </p>
        {masterId != null ? (
          <Link className="btn btn-secondary" to={`/characters/${masterId}/edit`}>
            Ouvrir la fiche maître
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="character-pets-tab">
      <p style={{ marginTop: 0 }}>
        Un familier possède sa propre fiche (caractéristiques, inventaire, etc.). En session live, tu pourras
        basculer entre ton personnage et ses familiers comme entre plusieurs personnages.
      </p>
      <button className="btn" type="button" onClick={() => void handleCreatePet()} disabled={creating}>
        {creating ? 'Création…' : 'Créer un familier'}
      </button>

      {pets.length > 0 ? (
        <ul className="character-pets-list" style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
          {pets.map((p) => (
            <li key={p.id} style={{ marginBottom: '0.35rem' }}>
              <Link to={`/characters/${p.id}/edit`}>{p.name.trim() || `Personnage #${p.id}`}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--muted)', marginTop: '0.75rem' }}>Aucun familier pour l’instant.</p>
      )}
    </div>
  )
}
