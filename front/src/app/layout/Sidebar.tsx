import { NavLink } from 'react-router-dom'
import type { UserRole } from '../../shared/types'

type SidebarProps = {
  role: UserRole
  hasJoinedSession?: boolean
  isOpen?: boolean
  onNavigate?: () => void
  onLogout: () => void
}

type NavItem = {
  to: string
  label: string
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'Accueil' },
  { to: '/characters', label: 'Mes personnages' },
  { to: '/users', label: 'Gestion utilisateurs', roles: ['admin'] },
  { to: '/campaigns', label: 'Gestion campagnes', roles: ['admin', 'gm'] },
  { to: '/sessions', label: 'Gestion sessions' },
]

export function Sidebar({ role, hasJoinedSession = false, isOpen = true, onNavigate, onLogout }: SidebarProps) {
  const computedItems = hasJoinedSession
    ? [...navItems, { to: '/session-live', label: 'Session en cours' }]
    : navItems

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <h2 className="sidebar-title">2d10</h2>
      <nav className="sidebar-nav">
        {computedItems
          .filter((item) => !item.roles || item.roles.includes(role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-footer">
        <button
          className="btn btn-secondary sidebar-logout"
          type="button"
          onClick={() => {
            onNavigate?.()
            onLogout()
          }}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
