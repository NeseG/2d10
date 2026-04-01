import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPut } from '../../../shared/api/client'
import { WysiwygEditor } from '../../notes/components/WysiwygEditor'

export function SessionCampaignNotesTab(props: {
  token: string
  campaignId: number | null
  characterId: string
}) {
  const { token, campaignId, characterId } = props

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
      if (!campaignId || !characterId) return
      setLoading(true)
      try {
        const res = await apiGet<{ success: boolean; notes_wysiwyg: string }>(
          `/api/campaigns/${campaignId}/characters/${characterId}/notes-wysiwyg`,
          token,
        )
        setValue(String(res.notes_wysiwyg ?? ''))
        setLoadedOnce(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [token, campaignId, characterId])

  function scheduleSave(next: string) {
    if (!loadedOnce || !campaignId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void persist(next)
    }, 450)
  }

  async function persist(next: string) {
    if (!campaignId) return
    setSaving(true)
    try {
      await apiPut(
        `/api/campaigns/${campaignId}/characters/${characterId}/notes-wysiwyg`,
        { notes_wysiwyg: next },
        token,
      )
    } finally {
      setSaving(false)
    }
  }

  if (!campaignId) return <p style={{ color: 'var(--muted)' }}>Campagne introuvable pour cette session.</p>
  if (!characterId) return <p style={{ color: 'var(--muted)' }}>Aucun personnage sélectionné.</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <span style={{ color: 'var(--muted)' }}>{loading ? 'Chargement…' : saving ? 'Enregistrement…' : ' '}</span>
      </div>
      <WysiwygEditor
        valueHtml={value}
        disabled={loading}
        placeholder="Notes de campagne…"
        onChangeHtml={(next) => {
          setValue(next)
          scheduleSave(next)
        }}
      />
    </div>
  )
}

