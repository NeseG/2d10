import { Card } from '../../../shared/components/Card'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { apiGet } from '../../../shared/api/client'

type DashboardCounts = {
  characters: number
  campaigns: number
  sessions: number
  users: number | null
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
    </div>
  )
}
