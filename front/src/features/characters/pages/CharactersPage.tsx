import { Card } from '../../../shared/components/Card'
import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import type { Character } from '../../../shared/types'
import { useNavigate } from 'react-router-dom'

type CharacterRow = Character & {
  ownerUsername?: string | null
}

export function CharactersPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [race, setRace] = useState('')
  const [characterClass, setCharacterClass] = useState('')
  const [level, setLevel] = useState('')

  async function loadCharacters() {
    try {
      const response = await apiGet<{
        success: boolean
        characters: Array<{
          id: number
          name: string
          class: string
          race: string
          level: number
          user?: { username?: string | null } | null
        }>
      }>('/api/characters', token)
      setCharacters(
        response.characters.map((c) => ({
          id: c.id,
          name: c.name,
          className: c.class,
          race: c.race,
          level: c.level,
          ownerUsername: c.user?.username ?? null,
        })),
      )
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de chargement',
        severity: 'error',
      })
    }
  }

  useEffect(() => {
    void loadCharacters()
  }, [token, showSnackbar])

  function resetForm() {
    setName('')
    setRace('')
    setCharacterClass('')
    setLevel('')
  }

  async function handleCreateCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      const trimmedName = name.trim()
      const trimmedRace = race.trim()
      const trimmedClass = characterClass.trim()
      const parsedLevel = level.trim() === '' ? undefined : Number(level)

      const payload = {
        name: trimmedName,
        ...(trimmedRace ? { race: trimmedRace } : {}),
        ...(trimmedClass ? { class: trimmedClass } : {}),
        ...(parsedLevel !== undefined && !Number.isNaN(parsedLevel) ? { level: parsedLevel } : {}),
      }

      await apiPost('/api/characters', payload, token)
      setIsModalOpen(false)
      resetForm()
      await loadCharacters()
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur lors de la création',
        severity: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card title="Mes personnages">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button className="btn" type="button" onClick={() => setIsModalOpen(true)}>
          Créer un personnage
        </button>
      </div>
      <div className="table-wrap">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Joueur</th>
              <th>Classe</th>
              <th>Race</th>
              <th>Niveau</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {characters.map((character) => (
              <tr key={character.id}>
                <td data-label="Nom">{character.name}</td>
                <td data-label="Joueur">{character.ownerUsername ?? '—'}</td>
                <td data-label="Classe">{character.className}</td>
                <td data-label="Race">{character.race}</td>
                <td data-label="Niveau">{character.level}</td>
                <td data-label="Actions">
                  <button
                    className="btn btn-small"
                    type="button"
                    onClick={() => navigate(`/characters/${character.id}/edit`)}
                  >
                    Éditer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Nouveau personnage</h3>
            <form className="login-form" onSubmit={handleCreateCharacter}>
              <label htmlFor="character-name">Nom</label>
              <input
                id="character-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <label htmlFor="character-race">Race</label>
              <input
                id="character-race"
                type="text"
                value={race}
                onChange={(event) => setRace(event.target.value)}
              />

              <label htmlFor="character-class">Classe</label>
              <input
                id="character-class"
                type="text"
                value={characterClass}
                onChange={(event) => setCharacterClass(event.target.value)}
              />

              <label htmlFor="character-level">Niveau</label>
              <input
                id="character-level"
                type="number"
                min={1}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn" type="submit" disabled={isSaving}>
                  {isSaving ? 'Sauvegarde...' : 'Créer'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false)
                    resetForm()
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
