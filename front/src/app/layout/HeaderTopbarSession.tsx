import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useHeader } from '../hooks/useHeader'

export function HeaderTopbarSession() {
  const { sessionInfo } = useHeader()
  const location = useLocation()

  const shouldShow = useMemo(() => location.pathname.startsWith('/session-live'), [location.pathname])
  if (!shouldShow || !sessionInfo) return null

  return (
    <div className="topbar-session">
      <div className="topbar-session-title">{sessionInfo.title}</div>
      <div className="topbar-session-date">{sessionInfo.sessionDate ?? '—'}</div>
    </div>
  )
}

