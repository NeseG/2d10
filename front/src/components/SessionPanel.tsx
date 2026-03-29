import type { AuthUser } from '../types/auth'

type SessionPanelProps = {
  apiBaseUrl: string
  token: string
  currentUser: AuthUser | null
  isLoadingProfile: boolean
  onLoadProfile: () => void
  onClearSession: () => void
}

export function SessionPanel({
  apiBaseUrl,
  token,
  currentUser,
  isLoadingProfile,
  onLoadProfile,
  onClearSession,
}: SessionPanelProps) {
  return (
    <section className="card session-card">
      <h2>Session</h2>
      <p>
        <strong>API:</strong> <code>{apiBaseUrl}</code>
      </p>
      <p>
        <strong>Token:</strong> {token ? `${token.slice(0, 24)}...` : 'Aucun token en mémoire'}
      </p>
      <div className="session-actions">
        <button type="button" onClick={onLoadProfile} disabled={!token || isLoadingProfile}>
          {isLoadingProfile ? 'Chargement...' : 'Charger mon profil'}
        </button>
        <button type="button" className="secondary" onClick={onClearSession}>
          Effacer la session locale
        </button>
      </div>

      {currentUser && (
        <div className="profile">
          <h3>Profil connecté</h3>
          <p>
            <strong>Username:</strong> {currentUser.username}
          </p>
          <p>
            <strong>Email:</strong> {currentUser.email}
          </p>
          {currentUser.role_name && (
            <p>
              <strong>Role:</strong> {currentUser.role_name}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
