import { createContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser } from '../../shared/types'
import { fetchProfile, login } from '../../features/auth/services/authService'

type AuthContextValue = {
  user: AuthUser | null
  token: string
  isLoading: boolean
  isAuthenticated: boolean
  loginWithCredentials: (email: string, password: string) => Promise<void>
  refreshProfile: () => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>(() => localStorage.getItem('auth_token') ?? '')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    setIsLoading(true)
    fetchProfile(token)
      .then((nextUser) => setUser(nextUser))
      .catch(() => {
        setToken('')
        setUser(null)
        localStorage.removeItem('auth_token')
      })
      .finally(() => setIsLoading(false))
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      loginWithCredentials: async (email, password) => {
        setIsLoading(true)
        try {
          const { token: nextToken, user: nextUser } = await login({ email, password })
          setToken(nextToken)
          setUser(nextUser)
          localStorage.setItem('auth_token', nextToken)
        } finally {
          setIsLoading(false)
        }
      },
      refreshProfile: async () => {
        if (!token) return
        setIsLoading(true)
        try {
          const nextUser = await fetchProfile(token)
          setUser(nextUser)
        } finally {
          setIsLoading(false)
        }
      },
      logout: () => {
        setUser(null)
        setToken('')
        localStorage.removeItem('auth_token')
      },
    }),
    [isLoading, user, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
