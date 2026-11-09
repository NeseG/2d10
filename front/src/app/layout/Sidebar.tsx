import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { CalendarDays, Castle, House, LibraryBig, LogOut, Radio, Settings, UserRound, UsersRound } from 'lucide-react'
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
  icon: LucideIcon
  roles?: UserRole[]
}

const navItemsCore: NavItem[] = [
  { to: '/', label: 'Accueil', icon: House },
  { to: '/characters', label: 'Mes personnages', icon: UserRound },
  { to: '/users', label: 'Gestion utilisateurs', icon: UsersRound, roles: ['admin'] },
  { to: '/campaigns', label: 'Gestion campagnes', icon: Castle, roles: ['admin', 'gm'] },
  { to: '/referentiel', label: 'Référentiel', icon: LibraryBig, roles: ['admin', 'gm'] },
  { to: '/sessions', label: 'Gestion sessions', icon: CalendarDays },
]

const navItemOptions: NavItem = { to: '/options', label: 'Options', icon: Settings }
const navItemSessionLive: NavItem = { to: '/session-live', label: 'Session en cours', icon: Radio }

export function Sidebar({ role, hasJoinedSession = false, isOpen = true, onNavigate, onLogout }: SidebarProps) {
  const coreFiltered = navItemsCore.filter((item) => !item.roles || item.roles.includes(role))
  const computedItems = hasJoinedSession
    ? [...coreFiltered, navItemSessionLive, navItemOptions]
    : [...coreFiltered, navItemOptions]

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <h2 className="sidebar-title">
        <img src="/favicon.svg" alt="" className="sidebar-logo" />
        2d10
      </h2>
      <nav className="sidebar-nav">
        {computedItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <item.icon size={18} aria-hidden="true" className="nav-link-icon" />
              <span>{item.label}</span>
              {item.to === '/session-live' ? <span className="nav-link-live-dot" aria-label="en direct" /> : null}
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
          <LogOut size={16} aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
