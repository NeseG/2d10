import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Backpack, BookMarked, Clover, Map, MessageCircle, ScrollText, Swords, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet, getApiBaseUrl } from '../../../shared/api/client'
import {
  CharacterCharacteristicsTab,
  DEFAULT_SESSION_LIVE_ACCORDIONS,
  type SessionLiveAccordionState,
} from '../../characters/components/CharacterCharacteristicsTab'
import { CharacterInventoryTab } from '../../characters/components/CharacterInventoryTab'
import { CharacterGrimoireTab } from '../../characters/components/CharacterGrimoireTab'
import {
  CharacterFeaturesTab,
  DEFAULT_SESSION_LIVE_TRAITS_ACCORDIONS,
  type FeatureCategory,
  type SessionLiveTraitsAccordionState,
} from '../../characters/components/CharacterFeaturesTab'
import { SessionLiveChat } from '../components/SessionLiveChat'
import { SessionCampaignNotesTab } from '../components/SessionCampaignNotesTab'
import { SessionInitiativeTrackerTab } from '../components/SessionInitiativeTrackerTab'
import { SessionMapTab } from '../components/SessionMapTab'
import { useHeader } from '../../../app/hooks/useHeader'

type JoinedSession = {
  id: number
  title: string
  campaign_name?: string | null
  session_date?: string | null
}

type SessionAttendance = {
  id: number
  character_id: number
  character_name?: string | null
  character_user_id?: number | null
}

type SessionDetail = {
  id: number
  title?: string | null
  campaign_name?: string | null
  session_date?: string | null
  campaign_id?: number | null
  gm_id?: number | null
  attendance?: SessionAttendance[]
}

function SessionLiveCharacterHeading(props: { characterId: string; label: string; avatarUrl?: string }) {
  const { characterId, label, avatarUrl } = props
  const resolvedAvatarUrl = avatarUrl
    ? `${getApiBaseUrl()}${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`
    : ''
  return (
    <div className="session-live-character-title-row">
      <div className="session-live-character-avatar">
        {resolvedAvatarUrl ? <img src={resolvedAvatarUrl} alt={`Avatar de ${label}`} /> : <span>{(label.trim()[0] || '?').toUpperCase()}</span>}
      </div>
      <h4 className="session-live-character-panel-title">{label}</h4>
      <Link
        to={`/characters/${characterId}/edit`}
        className="session-live-character-edit-link"
        title="Éditer le personnage"
        aria-label="Éditer le personnage"
      >
        Éditer
      </Link>
    </div>
  )
}

function hasJoinedSessionInStorage(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem('joined_session')
  if (!raw) return false
  try {
    const s = JSON.parse(raw) as { id?: unknown }
    return typeof s?.id === 'number' && Number.isFinite(s.id)
  } catch {
    return false
  }
}

export function LiveSessionPage() {
  const { token, user, isLoading: authLoading } = useAuth()
  const { setSessionInfo } = useHeader()
  const { showSnackbar } = useSnackbar()
  /** True dès qu’il y a session jointe + token : évite un écran vide avant `user` (profil auth) ou avant la fin du GET session. */
  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem('auth_token') && hasJoinedSessionInStorage()),
  )
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null)
  const [sessionLoadFailed, setSessionLoadFailed] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('')
  const [mainTab, setMainTab] = useState<'character' | 'chat' | 'initiative' | 'map'>('character')
  const [characterSubTab, setCharacterSubTab] = useState<
    'characteristic' | 'inventory' | 'grimoire' | 'traits' | 'notes'
  >(
    'characteristic',
  )

  const raw = localStorage.getItem('joined_session')
  let session: JoinedSession | null = null
  if (raw) {
    try {
      session = JSON.parse(raw) as JoinedSession
    } catch {
      session = null
    }
  }

  useEffect(() => {
    async function loadSessionDetail() {
      if (!session) {
        setLoading(false)
        setSessionLoadFailed(false)
        return
      }
      if (!token) {
        setLoading(false)
        return
      }
      if (!user) {
        if (!authLoading) setLoading(false)
        return
      }
      setLoading(true)
      try {
        setSessionLoadFailed(false)
        const response = await apiGet<{ success: boolean; session: SessionDetail }>(`/api/sessions/${session.id}`, token)
        const detail = response.session
        setSessionDetail(detail)
        setSessionInfo({
          title: detail.title ?? session.title,
          campaignName: detail.campaign_name ?? session.campaign_name ?? null,
          sessionDate: detail.session_date ?? session.session_date ?? null,
        })
        const attendance = Array.isArray(detail.attendance) ? detail.attendance : []
        const isOwner = user.role === 'admin' || user.role === 'gm' || detail.gm_id === user.id
        const mine = attendance.filter((entry) => entry.character_user_id === user.id)
        const initial = isOwner ? attendance[0] : mine[0]
        if (initial) {
          setSelectedCharacterId(String(initial.character_id))
          setSelectedCharacterName(initial.character_name ?? '')
        } else {
          setSelectedCharacterId('')
          setSelectedCharacterName('')
        }
      } catch (err) {
        setSessionDetail(null)
        setSessionLoadFailed(true)
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement de la session',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    void loadSessionDetail()
    return () => setSessionInfo(null)
  }, [session?.id, token, user?.id, user, authLoading, setSessionInfo, showSnackbar])

  const isSessionOwner = useMemo(() => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'gm') return true
    return sessionDetail?.gm_id === user.id
  }, [sessionDetail?.gm_id, user])

  const accessibleCharacters = useMemo(() => {
    if (!user || !sessionDetail?.attendance) return []
    return isSessionOwner
      ? sessionDetail.attendance
      : sessionDetail.attendance.filter((entry) => entry.character_user_id === user.id)
  }, [isSessionOwner, sessionDetail?.attendance, user?.id])

  /** Admin ou MJ assigné à cette session : bandeau horizontal de fiches (plusieurs « colonnes » mobile). */
  const useGmCharacterStrip = useMemo(() => {
    if (!user || !sessionDetail || accessibleCharacters.length < 2) return false
    return user.role === 'admin' || sessionDetail.gm_id === user.id
  }, [user, sessionDetail, accessibleCharacters.length])

  const [characterDisplayNames, setCharacterDisplayNames] = useState<Record<string, string>>({})
  const [characterAvatarUrls, setCharacterAvatarUrls] = useState<Record<string, string>>({})
  const [sessionAccordionByCharacterId, setSessionAccordionByCharacterId] = useState<
    Record<string, SessionLiveAccordionState>
  >({})
  const [traitsAccordionByCharacterId, setTraitsAccordionByCharacterId] = useState<
    Record<string, SessionLiveTraitsAccordionState>
  >({})

  const getSessionLiveAccordions = useCallback(
    (characterId: string) => sessionAccordionByCharacterId[characterId] ?? DEFAULT_SESSION_LIVE_ACCORDIONS,
    [sessionAccordionByCharacterId],
  )

  const patchSessionLiveAccordions = useCallback(
    (characterId: string, patch: Partial<SessionLiveAccordionState>) => {
      setSessionAccordionByCharacterId((prev) => ({
        ...prev,
        [characterId]: { ...DEFAULT_SESSION_LIVE_ACCORDIONS, ...prev[characterId], ...patch },
      }))
    },
    [],
  )

  const getSessionLiveTraitsAccordions = useCallback(
    (characterId: string) =>
      traitsAccordionByCharacterId[characterId] ?? DEFAULT_SESSION_LIVE_TRAITS_ACCORDIONS,
    [traitsAccordionByCharacterId],
  )

  const patchSessionLiveTraitsAccordions = useCallback(
    (characterId: string, patch: Partial<Record<FeatureCategory, boolean>>) => {
      setTraitsAccordionByCharacterId((prev) => ({
        ...prev,
        [characterId]: { ...DEFAULT_SESSION_LIVE_TRAITS_ACCORDIONS, ...prev[characterId], ...patch },
      }))
    },
    [],
  )

  useEffect(() => {
    setCharacterDisplayNames((prev) => {
      const next: Record<string, string> = { ...prev }
      const allowed = new Set<string>()
      for (const e of accessibleCharacters) {
        const id = String(e.character_id)
        allowed.add(id)
        if (next[id] === undefined) next[id] = e.character_name ?? ''
      }
      for (const k of Object.keys(next)) {
        if (!allowed.has(k)) delete next[k]
      }
      return next
    })
  }, [accessibleCharacters])

  /** Dock fixe en bas : marge scrollable pour ne pas masquer le contenu sous la barre d’onglets. */
  const showBottomCharacterDock =
    Boolean(session) &&
    !loading &&
    sessionDetail &&
    accessibleCharacters.length > 0 &&
    mainTab === 'character'

  const showPageLoading = Boolean(
    session && token && (authLoading || !user || loading),
  )
  const showSessionTabs = Boolean(
    session && user && !authLoading && !loading && sessionDetail,
  )
  const showSessionLoadError = Boolean(
    session && token && user && !authLoading && !loading && sessionLoadFailed,
  )

  return (
    <div
      className={`session-live-page${showBottomCharacterDock ? ' session-live-page--dock-offset' : ''}${useGmCharacterStrip && mainTab === 'character' ? ' session-live-page--gm-strip' : ''}`}
    >
      <Card title="">
        {!session ? <p>Aucune session rejointe.</p> : null}

        {session ? (
          <>
            {showPageLoading ? <p>Chargement…</p> : null}

            {showSessionLoadError ? (
              <p style={{ marginTop: '0.75rem' }}>
                Impossible de charger cette session. Vérifie ta connexion ou réessaie depuis la liste des sessions.
              </p>
            ) : null}

          {showSessionTabs ? (
            <>
              <div className="tabs-row session-tabs-primary session-tabs-primary-sticky">
                <button
                  className={`tab-btn ${mainTab === 'character' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setMainTab('character')}
                  title="Character"
                  aria-label="Character"
                >
                  <User size={22} aria-hidden="true" />
                </button>
                <button
                  className={`tab-btn ${mainTab === 'chat' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setMainTab('chat')}
                  title="Chat"
                  aria-label="Chat"
                >
                  <MessageCircle size={22} aria-hidden="true" />
                </button>
                <button
                  className={`tab-btn ${mainTab === 'initiative' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setMainTab('initiative')}
                  title="Initiative"
                  aria-label="Initiative"
                >
                  <Swords size={22} aria-hidden="true" />
                </button>
                <button
                  className={`tab-btn ${mainTab === 'map' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setMainTab('map')}
                  title="Carte"
                  aria-label="Carte"
                >
                  <Map size={22} aria-hidden="true" />
                </button>
              </div>

              {mainTab === 'chat' && user ? (
                <div className="session-live-content session-live-chat-panel" style={{ marginTop: '0.75rem' }}>
                  <SessionLiveChat sessionId={session.id} token={token} currentUserId={user.id} />
                </div>
              ) : null}

              {mainTab === 'initiative' ? (
                <div className="session-live-content" style={{ marginTop: '0.75rem' }}>
                  <SessionInitiativeTrackerTab
                    sessionId={session.id}
                    token={token}
                    isOwner={isSessionOwner}
                    quickAddCharacters={sessionDetail?.attendance ?? []}
                  />
                </div>
              ) : null}

              {mainTab === 'map' ? (
                <div className="session-live-content" style={{ marginTop: '0.75rem' }}>
                  <SessionMapTab
                    sessionId={session.id}
                    token={token}
                    isOwner={isSessionOwner}
                    campaignId={sessionDetail?.campaign_id ?? null}
                  />
                </div>
              ) : null}

              {mainTab === 'character' && accessibleCharacters.length === 0 ? (
                <p style={{ marginTop: '0.75rem' }}>
                  Ton compte n&apos;a pas encore de personnage associé à cette session.
                </p>
              ) : null}

              {mainTab === 'character' && accessibleCharacters.length > 0 ? (
                <>
              {!useGmCharacterStrip && accessibleCharacters.length > 1 ? (
                <div className="login-form" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="session-character-select">Personnage</label>
                  <select
                    id="session-character-select"
                    value={selectedCharacterId}
                    onChange={(event) => {
                      const value = event.target.value
                      const found = accessibleCharacters.find((entry) => String(entry.character_id) === value)
                      setSelectedCharacterId(value)
                      setSelectedCharacterName(found?.character_name ?? '')
                    }}
                  >
                    {accessibleCharacters.map((entry) => (
                      <option key={entry.id} value={entry.character_id}>
                        {entry.character_name ?? `Personnage #${entry.character_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {useGmCharacterStrip ? (
                <div className="session-live-characters-strip">
                  {accessibleCharacters.map((entry) => {
                    const cid = String(entry.character_id)
                    const title =
                      characterDisplayNames[cid]?.trim() ||
                      entry.character_name?.trim() ||
                      `Personnage #${entry.character_id}`
                    return (
                      <div key={entry.id} className="session-live-character-panel">
                        <div className="session-live-content session-live-character-panel-inner">
                          <SessionLiveCharacterHeading
                            characterId={cid}
                            label={title}
                            avatarUrl={characterAvatarUrls[cid] ?? ''}
                          />

                          {characterSubTab === 'characteristic' ? (
                            <CharacterCharacteristicsTab
                              characterId={cid}
                              token={token}
                              sessionView
                              sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : undefined}
                              sessionLiveAccordions={getSessionLiveAccordions(cid)}
                              onSessionLiveAccordionsChange={(p) => patchSessionLiveAccordions(cid, p)}
                              onNameLoaded={(name) =>
                                setCharacterDisplayNames((p) => ({ ...p, [cid]: name }))
                              }
                              onAvatarLoaded={(avatarUrl) =>
                                setCharacterAvatarUrls((p) => ({ ...p, [cid]: avatarUrl }))
                              }
                            />
                          ) : null}
                          {characterSubTab === 'inventory' ? (
                            <CharacterInventoryTab characterId={cid} token={token} />
                          ) : null}
                          {characterSubTab === 'grimoire' ? (
                            <CharacterGrimoireTab
                              characterId={cid}
                              token={token}
                              user={user}
                              sessionView
                              sessionId={
                                sessionDetail?.id != null ? String(sessionDetail.id) : session ? String(session.id) : undefined
                              }
                            />
                          ) : null}
                          {characterSubTab === 'traits' ? (
                            <CharacterFeaturesTab
                              characterId={cid}
                              token={token}
                              sessionView
                              sessionTraitsAccordions={getSessionLiveTraitsAccordions(cid)}
                              onSessionTraitsAccordionsChange={(p) => patchSessionLiveTraitsAccordions(cid, p)}
                            />
                          ) : null}
                          {characterSubTab === 'notes' ? (
                            <SessionCampaignNotesTab
                              token={token}
                              campaignId={sessionDetail?.campaign_id ?? null}
                              characterId={cid}
                            />
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : selectedCharacterId ? (
                <div className="session-live-content" style={{ marginTop: '0.75rem' }}>
                  <SessionLiveCharacterHeading
                    characterId={selectedCharacterId}
                    label={selectedCharacterName || 'Mon personnage'}
                    avatarUrl={characterAvatarUrls[selectedCharacterId] ?? ''}
                  />
                  {characterSubTab === 'characteristic' ? (
                    <CharacterCharacteristicsTab
                      characterId={selectedCharacterId}
                      token={token}
                      sessionView
                      sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : undefined}
                      sessionLiveAccordions={getSessionLiveAccordions(selectedCharacterId)}
                      onSessionLiveAccordionsChange={(p) =>
                        patchSessionLiveAccordions(selectedCharacterId, p)
                      }
                      onNameLoaded={(name) => setSelectedCharacterName(name)}
                      onAvatarLoaded={(avatarUrl) =>
                        setCharacterAvatarUrls((p) => ({ ...p, [selectedCharacterId]: avatarUrl }))
                      }
                    />
                  ) : null}
                  {characterSubTab === 'inventory' ? <CharacterInventoryTab characterId={selectedCharacterId} token={token} /> : null}
                  {characterSubTab === 'grimoire' ? (
                    <CharacterGrimoireTab
                      characterId={selectedCharacterId}
                      token={token}
                      user={user}
                      sessionView
                      sessionId={sessionDetail?.id != null ? String(sessionDetail.id) : session ? String(session.id) : undefined}
                    />
                  ) : null}
                  {characterSubTab === 'traits' ? (
                    <CharacterFeaturesTab
                      characterId={selectedCharacterId}
                      token={token}
                      sessionView
                      sessionTraitsAccordions={getSessionLiveTraitsAccordions(selectedCharacterId)}
                      onSessionTraitsAccordionsChange={(p) => patchSessionLiveTraitsAccordions(selectedCharacterId, p)}
                    />
                  ) : null}
                  {characterSubTab === 'notes' ? (
                    <SessionCampaignNotesTab
                      token={token}
                      campaignId={sessionDetail?.campaign_id ?? null}
                      characterId={selectedCharacterId}
                    />
                  ) : null}
                </div>
              ) : null}

              {mainTab === 'character' ? (
                <div className="session-subtabs-dock open">
                  <button
                    className={`tab-btn ${characterSubTab === 'characteristic' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('characteristic')
                    }}
                    title="Characteristic"
                    aria-label="Characteristic"
                  >
                    <Activity size={22} aria-hidden="true" />
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'inventory' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('inventory')
                    }}
                    title="Inventory"
                    aria-label="Inventory"
                  >
                    <Backpack size={22} aria-hidden="true" />
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'grimoire' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('grimoire')
                    }}
                    title="Grimoire"
                    aria-label="Grimoire"
                  >
                    <BookMarked size={22} aria-hidden="true" />
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'traits' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('traits')
                    }}
                    title="Traits"
                    aria-label="Traits"
                  >
                    <Clover size={22} aria-hidden="true" />
                  </button>
                  <button
                    className={`tab-btn ${characterSubTab === 'notes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setCharacterSubTab('notes')
                    }}
                    title="Notes"
                    aria-label="Notes"
                  >
                    <ScrollText size={22} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
                </>
              ) : null}
            </>
          ) : null}
          </>
        ) : null}
      </Card>
    </div>
  )
}

