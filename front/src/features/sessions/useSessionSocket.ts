import { useCallback, useEffect, useRef } from 'react'
import { getWsApiBaseUrl } from '../../shared/api/client'

/** WebSocket de session avec reconnexion automatique. Retourne une fonction d'envoi (sans effet si déconnecté). */
export function useSessionSocket(path: string, sessionId: number, token: string, onMessage: (data: unknown) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const handlerRef = useRef(onMessage)
  useEffect(() => {
    handlerRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (stopped) return
      const params = new URLSearchParams({ sessionId: String(sessionId), token })
      const ws = new WebSocket(`${getWsApiBaseUrl()}${path}?${params.toString()}`)
      wsRef.current = ws
      ws.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data as string))
        } catch {
          /* message illisible : ignoré */
        }
      }
      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null
        if (!stopped) timer = setTimeout(connect, 2500)
      }
      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [path, sessionId, token])

  return useCallback((msg: unknown) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
  }, [])
}
