import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../../shared/api/client'
import { CampaignCharacterNotesModal } from '../../notes/components/CampaignCharacterNotesModal'

type CampaignRef = {
  id: number
  name?: string | null
  status?: string | null
  currentPlayers?: number | null
  maxPlayers?: number | null
  current_players?: number | null
  max_players?: number | null
}

type CharacterDetail = {
  id: number
  campaignCharacters?: Array<{ campaign?: CampaignRef | null }>
}

export function CharacterNotesTab(props: { characterId: string; token: string }) {
  const { characterId, token } = props
  const [loading, setLoading] = useState(false)
  const [character, setCharacter] = useState<CharacterDetail | null>(null)

  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRef | null>(null)
  const modalOpen = selectedCampaign != null

  useEffect(() => {
    async function load() {
      if (!characterId) return
      setLoading(true)
      try {
        const res = await apiGet<{ success: boolean; character: CharacterDetail }>(`/api/characters/${characterId}`, token)
        setCharacter(res.character ?? null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [characterId, token])

  const campaigns = useMemo(() => {
    const rows = Array.isArray(character?.campaignCharacters) ? character!.campaignCharacters! : []
    const mapped = rows
      .map((r) => r.campaign)
      .filter((c): c is CampaignRef => Boolean(c && typeof c.id === 'number'))
    mapped.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fr', { sensitivity: 'base' }))
    return mapped
  }, [character?.campaignCharacters])

  return (
    <div>
      {loading ? <p>Chargement…</p> : null}
      {!loading && campaigns.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Aucune campagne liée à ce personnage.</p>
      ) : null}

      {!loading && campaigns.length > 0 ? (
        <div className="notes-campaign-list">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Status</th>
                  <th>Joueurs</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="clickable-row"
                    title="Cliquer pour ouvrir les notes"
                    onClick={() => setSelectedCampaign(c)}
                  >
                    <td>{c.name ?? `Campagne #${c.id}`}</td>
                    <td>{c.status ?? '—'}</td>
                    <td>
                      {c.currentPlayers ?? c.current_players ?? '—'}
                      {c.maxPlayers ?? c.max_players ? ` / ${c.maxPlayers ?? c.max_players}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <CampaignCharacterNotesModal
        open={modalOpen}
        token={token}
        campaign={selectedCampaign}
        characterId={characterId}
        onClose={() => setSelectedCampaign(null)}
      />
    </div>
  )
}

