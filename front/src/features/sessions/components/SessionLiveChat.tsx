import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPostFormData, getApiBaseUrl } from '../../../shared/api/client'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

export type SessionChatMessage = {
  id: number
  user_id: number
  display_name: string
  body: string
  created_at: string
  image_url?: string | null
}

function buildChatWebSocketUrl(sessionId: number, token: string): string {
  const base = getApiBaseUrl()
  const wsBase = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const params = new URLSearchParams({
    sessionId: String(sessionId),
    token,
  })
  return `${wsBase}/api/ws/session-chat?${params.toString()}`
}

function ChatImageAttachment(props: { imageUrl: string; token: string; onOpen?: (src: string) => void }) {
  const { imageUrl, token, onOpen } = props
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    const fullUrl = `${getApiBaseUrl()}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`

    void fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('load')
        return r.blob()
      })
      .then((b) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        setSrc(objectUrl)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          setSrc(null)
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl, token])

  if (failed) {
    return <span className="session-live-chat-image-error">Image indisponible</span>
  }
  if (!src) {
    return <span className="session-live-chat-image-loading">Chargement image…</span>
  }
  return (
    <button
      type="button"
      className="session-live-chat-image-click"
      onClick={() => onOpen?.(src)}
      aria-label="Afficher l’image en grand"
    >
      <img src={src} alt="" className="session-live-chat-image" loading="lazy" />
    </button>
  )
}

export function SessionLiveChat(props: {
  sessionId: number
  token: string
  currentUserId: number
}) {
  const { sessionId, token, currentUserId } = props
  const { showSnackbar } = useSnackbar()
  const [messages, setMessages] = useState<SessionChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const seenIds = useRef<Set<number>>(new Set())
  const listRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mergeMessage = useCallback((msg: SessionChatMessage) => {
    if (seenIds.current.has(msg.id)) return
    seenIds.current.add(msg.id)
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; messages: SessionChatMessage[] }>(
        `/api/sessions/${sessionId}/chat/messages?limit=80`,
        token,
      )
      const list = Array.isArray(res.messages) ? res.messages : []
      seenIds.current = new Set(list.map((m) => m.id))
      setMessages(list)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur chargement du chat',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }, [sessionId, token, showSnackbar])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped) return
      try {
        const url = buildChatWebSocketUrl(sessionId, token)
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string) as {
              type?: string
              message?: SessionChatMessage
            }
            if (data.type === 'chat_message' && data.message) mergeMessage(data.message)
          } catch {
            /* ignore */
          }
        }

        ws.onclose = () => {
          wsRef.current = null
          if (stopped) return
          reconnectTimerRef.current = setTimeout(connect, 3500)
        }

        ws.onerror = () => {
          try {
            ws.close()
          } catch {
            /* ignore */
          }
        }
      } catch {
        if (!stopped) reconnectTimerRef.current = setTimeout(connect, 3500)
      }
    }

    connect()

    return () => {
      stopped = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        try {
          wsRef.current.close()
        } catch {
          /* ignore */
        }
        wsRef.current = null
      }
    }
  }, [sessionId, token, mergeMessage])

  useEffect(() => {
    if (!lightboxSrc) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxSrc(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxSrc])

  const scrollMessagesToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  /** Afficher le dernier message : après layout + au prochain frame (contenu asynchrone). */
  useLayoutEffect(() => {
    if (loading) return
    scrollMessagesToBottom()
    const id = requestAnimationFrame(() => scrollMessagesToBottom())
    return () => cancelAnimationFrame(id)
  }, [loading, messages, scrollMessagesToBottom])

  /** Images et autres chargements qui agrandissent la liste : rester en bas si l’utilisateur y était déjà. */
  useEffect(() => {
    const el = listRef.current
    if (!el || loading) return
    let lastScrollHeight = el.scrollHeight
    const ro = new ResizeObserver(() => {
      const h = el.scrollHeight
      if (h > lastScrollHeight) {
        const wasNearBottom = lastScrollHeight - el.scrollTop - el.clientHeight < 12
        if (wasNearBottom) {
          el.scrollTop = el.scrollHeight
        }
      }
      lastScrollHeight = h
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, sessionId, messages.length])

  function clearImageSelection() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImagePreviewUrl(null)
    setImageFile(null)
  }

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  const acceptChatImageFile = useCallback(
    (f: File | null | undefined) => {
      if (!f) return
      if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.type)) {
        showSnackbar({ message: 'Formats acceptés : JPEG, PNG, GIF, WebP (max 5 Mo)', severity: 'error' })
        return
      }
      if (f.size > 5 * 1024 * 1024) {
        showSnackbar({ message: 'Image trop volumineuse (5 Mo max)', severity: 'error' })
        return
      }
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
      setImageFile(f)
    },
    [showSnackbar],
  )

  function handlePasteImage(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items?.length) return
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind !== 'file') continue
      const file = item.getAsFile()
      if (!file || !/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) continue
      e.preventDefault()
      acceptChatImageFile(file)
      return
    }
  }

  const canSend = Boolean((draft.trim() || imageFile) && !sending)

  async function handleSend(event: React.FormEvent) {
    event.preventDefault()
    if (!canSend) return
    setSending(true)
    try {
      if (imageFile) {
        const fd = new FormData()
        fd.append('image', imageFile)
        if (draft.trim()) fd.append('body', draft.trim())
        const res = await apiPostFormData<{ success: boolean; message: SessionChatMessage }>(
          `/api/sessions/${sessionId}/chat/messages/upload`,
          fd,
          token,
        )
        if (res.message) mergeMessage(res.message)
        setDraft('')
        clearImageSelection()
      } else {
        const text = draft.trim()
        const res = await apiPost<{ success: boolean; message: SessionChatMessage }>(
          `/api/sessions/${sessionId}/chat/messages`,
          { body: text },
          token,
        )
        if (res.message) mergeMessage(res.message)
        setDraft('')
      }
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Envoi impossible',
        severity: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="session-live-chat">
      <div className="session-live-chat-messages" ref={listRef} aria-live="polite">
        {loading ? <p className="session-live-chat-placeholder">Chargement du chat…</p> : null}
        {!loading && messages.length === 0 ? (
          <p className="session-live-chat-placeholder">Aucun message pour l’instant. Dis bonjour !</p>
        ) : null}
        {messages.map((m) => {
          const own = m.user_id === currentUserId
          const timeLabel = new Date(m.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div
              key={m.id}
              className={`session-live-chat-line${own ? ' session-live-chat-line--own' : ''}`}
            >
              <span className="session-live-chat-ts">{timeLabel}</span>
              <div className="session-live-chat-content">
                <div className="session-live-chat-content-line">
                  <span className="session-live-chat-author">{m.display_name}</span>
                  <span className="session-live-chat-colon">:</span>
                  {m.body?.trim() ? <span className="session-live-chat-body">{m.body}</span> : null}
                </div>
                {m.image_url ? (
                  <div className="session-live-chat-image-wrap">
                    <ChatImageAttachment imageUrl={m.image_url} token={token} onOpen={setLightboxSrc} />
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {lightboxSrc ? (
        <div className="modal-backdrop" onClick={() => setLightboxSrc(null)}>
          <div className="modal-card session-live-chat-lightbox" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxSrc} alt="" className="session-live-chat-lightbox-img" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setLightboxSrc(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {imagePreviewUrl ? (
        <div className="session-live-chat-preview">
          <img src={imagePreviewUrl} alt="" className="session-live-chat-preview-img" />
          <button type="button" className="btn btn-secondary btn-small" onClick={clearImageSelection}>
            Retirer l’image
          </button>
        </div>
      ) : null}
      <form
        className="session-live-chat-form"
        onSubmit={(e) => void handleSend(e)}
        onPaste={handlePasteImage}
      >
        <input
          type="text"
          className="session-live-chat-input"
          placeholder="Message"
          value={draft}
          maxLength={2000}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn session-live-chat-send" type="submit" disabled={!canSend}>
          Envoyer
        </button>
      </form>
    </div>
  )
}
