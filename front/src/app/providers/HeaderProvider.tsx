import { createContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type HeaderSessionInfo = {
  title: string
  campaignName?: string | null
  sessionDate?: string | null
}

type HeaderContextValue = {
  sessionInfo: HeaderSessionInfo | null
  setSessionInfo: (info: HeaderSessionInfo | null) => void
}

export const HeaderContext = createContext<HeaderContextValue | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [sessionInfo, setSessionInfo] = useState<HeaderSessionInfo | null>(null)

  const value = useMemo<HeaderContextValue>(() => ({ sessionInfo, setSessionInfo }), [sessionInfo])

  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
}

