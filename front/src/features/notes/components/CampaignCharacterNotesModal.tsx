import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPut } from '../../../shared/api/client'
import { WysiwygEditor } from './WysiwygEditor'

type CampaignRef = { id: number; name?: string | null; status?: string | null }

export function CampaignCharacterNotesModal(props: {
  open: boolean
  token: string
  campaign: CampaignRef | null
  characterId: string
  onClose: () => void
}) {
  const { open, token, campaign, characterId, onClose } = props

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [value, setValue] = useState('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    async function load() {
      if (!open || !campaign?.id) return
      setLoading(true)
      try {
        const res = await apiGet<{ success: boolean; notes_wysiwyg: string }>(
          `/api/campaigns/${campaign.id}/characters/${characterId}/notes-wysiwyg`,
          token,
        )
        setValue(String(res.notes_wysiwyg ?? ''))
        setLoadedOnce(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [open, token, campaign?.id, characterId])

  function scheduleSave(next: string) {
    if (!loadedOnce || !campaign?.id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void persist(next)
    }, 450)
  }

  async function persist(next: string) {
    if (!campaign?.id) return
    setSaving(true)
    try {
      await apiPut(
        `/api/campaigns/${campaign.id}/characters/${characterId}/notes-wysiwyg`,
        { notes_wysiwyg: next },
        token,
      )
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={() => (!saving ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="item-details-header">
          <div>
            <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
              {campaign?.name ?? (campaign?.id != null ? `Campagne #${campaign.id}` : 'Campagne')}
            </div>
            <div className="item-details-header-submeta">
              {loading ? 'Chargement…' : saving ? 'Enregistrement…' : ' '}
            </div>
          </div>
          <div className="item-details-header-meta">
            <span className="item-details-header-type">{campaign?.status ?? '—'}</span>
          </div>
        </div>

        <WysiwygEditor
          valueHtml={value}
          disabled={loading}
          placeholder="Notes de campagne pour ce personnage…"
          onChangeHtml={(next) => {
            setValue(next)
            scheduleSave(next)
          }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" type="button" disabled={saving} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

