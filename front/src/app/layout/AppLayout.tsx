import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from './Sidebar'
import { useEffect, useState } from 'react'
import { HeaderProvider } from '../providers/HeaderProvider'
import { HeaderTopbarSession } from './HeaderTopbarSession'

export function AppLayout() {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasJoinedSession, setHasJoinedSession] = useState(() => Boolean(localStorage.getItem('joined_session')))

  useEffect(() => {
    const refreshJoinedSession = () => setHasJoinedSession(Boolean(localStorage.getItem('joined_session')))
    window.addEventListener('storage', refreshJoinedSession)
    window.addEventListener('joined-session-changed', refreshJoinedSession as EventListener)
    return () => {
      window.removeEventListener('storage', refreshJoinedSession)
      window.removeEventListener('joined-session-changed', refreshJoinedSession as EventListener)
    }
  }, [])

  if (!user) return null

  return (
    <HeaderProvider>
      <div className="app-shell">
        <Sidebar
          role={user.role}
          hasJoinedSession={hasJoinedSession}
          isOpen={mobileMenuOpen}
          onNavigate={() => setMobileMenuOpen(false)}
          onLogout={logout}
        />
        {mobileMenuOpen && <button className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)} />}
        <div className="app-content">
          <header className="topbar">
            <div className="topbar-user">
              <button
                className="burger-btn"
                type="button"
                aria-label="Ouvrir le menu"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                ☰
              </button>
              <strong>{user.username}</strong> <span className="badge">{user.role}</span>
            </div>
            <HeaderTopbarSession />
          </header>
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    </HeaderProvider>
  )
}
