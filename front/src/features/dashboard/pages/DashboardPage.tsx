import { Card } from '../../../shared/components/Card'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet } from '../../../shared/api/client'
import { Link } from 'react-router-dom'

type DashboardCounts = {
  characters: number
  campaigns: number
  sessions: number
  users: number | null
}

type JoinedSession = {
  id: number
  title: string
  campaign_name?: string | null
  session_date?: string | null
}

type DashboardSessionAttendance = {
  character_id: number
  character_name?: string | null
  character_user_id?: number | null
}

type DashboardSessionDetail = {
  id: number
  title?: string | null
  campaign_name?: string | null
  session_date?: string | null
  attendance?: DashboardSessionAttendance[]
}

export function DashboardPage() {
  const { user, token } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [counts, setCounts] = useState<DashboardCounts>({
    characters: 0,
    campaigns: 0,
    sessions: 0,
    users: null,
  })
  const [loading, setLoading] = useState(true)
  const [joinedSession, setJoinedSession] = useState<JoinedSession | null>(null)
  const [joinedSessionDetail, setJoinedSessionDetail] = useState<DashboardSessionDetail | null>(null)

  useEffect(() => {
    function syncJoinedSession() {
      const raw = localStorage.getItem('joined_session')
      if (!raw) {
        setJoinedSession(null)
        return
      }
      try {
        setJoinedSession(JSON.parse(raw) as JoinedSession)
      } catch {
        setJoinedSession(null)
      }
    }

    syncJoinedSession()
    window.addEventListener('joined-session-changed', syncJoinedSession)
    return () => window.removeEventListener('joined-session-changed', syncJoinedSession)
  }, [])

  useEffect(() => {
    async function loadDashboardCounts() {
      setLoading(true)
      try {
        const charactersPromise = apiGet<{
          success: boolean
          stats: { totalCharacters: number }
        }>('/api/characters/stats/overview', token)

        const campaignsPromise =
          user?.role === 'admin' || user?.role === 'gm'
            ? apiGet<{
                success: boolean
                stats: { total_campaigns: number }
              }>('/api/campaigns/stats/overview', token)
            : apiGet<{ success: boolean; campaigns: unknown[] }>('/api/campaigns', token)

        const sessionsPromise =
          user?.role === 'admin' || user?.role === 'gm'
            ? apiGet<{
                success: boolean
                stats: { total_sessions: number }
              }>('/api/sessions/stats/overview', token)
            : Promise.resolve({ success: true, stats: { total_sessions: 0 } })

        const usersPromise =
          user?.role === 'admin'
            ? apiGet<{ users: unknown[] }>('/api/admin/users', token)
            : Promise.resolve({ users: [] })

        const [charactersRes, campaignsRes, sessionsRes, usersRes] = await Promise.all([
          charactersPromise,
          campaignsPromise,
          sessionsPromise,
          usersPromise,
        ])

        const campaignsCount =
          'stats' in campaignsRes ? campaignsRes.stats.total_campaigns : campaignsRes.campaigns.length

        setCounts({
          characters: charactersRes.stats.totalCharacters,
          campaigns: campaignsCount,
          sessions: sessionsRes.stats.total_sessions,
          users: user?.role === 'admin' ? usersRes.users.length : null,
        })
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement du dashboard',
          severity: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    if (token && user) {
      void loadDashboardCounts()
    } else {
      setLoading(false)
    }
  }, [token, user, showSnackbar])

  useEffect(() => {
    async function loadJoinedSessionDetail() {
      if (!token || !joinedSession?.id) {
        setJoinedSessionDetail(null)
        return
      }
      try {
        const res = await apiGet<{ success: boolean; session: DashboardSessionDetail }>(
          `/api/sessions/${joinedSession.id}`,
          token,
        )
        setJoinedSessionDetail(res.session ?? null)
      } catch (err) {
        setJoinedSessionDetail(null)
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement de la session en cours',
          severity: 'error',
        })
      }
    }

    void loadJoinedSessionDetail()
  }, [joinedSession?.id, token, showSnackbar])

  const currentSessionCharacterName = useMemo(() => {
    if (!user || !joinedSessionDetail?.attendance) return ''
    const mine = joinedSessionDetail.attendance.find((entry) => entry.character_user_id === user.id)
    return mine?.character_name?.trim() ?? ''
  }, [joinedSessionDetail?.attendance, user])

  return (
    <div className="grid">
      <Card title="Bienvenue">
        <p>
          Bonjour <strong>{user?.username}</strong>, bienvenue sur le dashboard 2d10.
        </p>
      </Card>
      <Card title="Résumé rapide">
        <ul>
          <li>Personnages: {loading ? '...' : counts.characters}</li>
          <li>Campagnes: {loading ? '...' : counts.campaigns}</li>
          <li>Sessions: {loading ? '...' : counts.sessions}</li>
          <li>Utilisateurs: {loading ? '...' : counts.users ?? 'N/A'}</li>
        </ul>
      </Card>
      {joinedSession ? (
        <Card title="Session en cours">
          <div className="topbar-session" style={{ marginLeft: 0, justifyItems: 'start', textAlign: 'left' }}>
            <div className="topbar-session-title" style={{ maxWidth: '100%' }}>
              <span className="topbar-session-campaign">
                {joinedSessionDetail?.campaign_name ?? joinedSession.campaign_name ?? '—'}
              </span>
              <span className="topbar-session-session-name">
                {joinedSessionDetail?.title ?? joinedSession.title ?? '—'}
              </span>
            </div>
            <div className="topbar-session-date" style={{ maxWidth: '100%' }}>
              {joinedSessionDetail?.session_date ?? joinedSession.session_date ?? '—'}
            </div>
          </div>
          <p style={{ marginTop: '0.75rem', marginBottom: '0.9rem', color: 'var(--muted)' }}>
            {currentSessionCharacterName || '—'}
          </p>
          <Link className="btn" to="/session-live">
            Ouvrir la session
          </Link>
        </Card>
      ) : null}
    </div>
  )
}
