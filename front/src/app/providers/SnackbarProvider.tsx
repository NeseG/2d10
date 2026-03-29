import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type SnackbarSeverity = 'success' | 'error' | 'info'

export type ShowSnackbarOptions = {
  message: string
  severity?: SnackbarSeverity
  /** Durée avant disparition (ms). Défaut selon le type. */
  durationMs?: number
}

type SnackbarItem = {
  id: string
  message: string
  severity: SnackbarSeverity
}

const DEFAULT_DURATION_MS: Record<SnackbarSeverity, number> = {
  success: 4500,
  error: 7000,
  info: 5000,
}

type SnackbarContextValue = {
  showSnackbar: (options: ShowSnackbarOptions) => void
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([])

  const showSnackbar = useCallback((options: ShowSnackbarOptions) => {
    const severity = options.severity ?? 'info'
    const durationMs = options.durationMs ?? DEFAULT_DURATION_MS[severity]
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const item: SnackbarItem = { id, message: options.message, severity }

    setItems((prev) => [...prev, item])

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, durationMs)
  }, [])

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div className="snackbar-stack" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`snackbar snackbar--${item.severity}`} role="status">
            {item.message}
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  )
}

export function useSnackbarContext(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) {
    throw new Error('useSnackbarContext must be used within SnackbarProvider')
  }
  return ctx
}
