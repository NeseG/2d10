import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GSI_SRC = 'https://accounts.google.com/gsi/client'

type GoogleIdApi = {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

/** Bouton Google Identity Services : connecte ou crée le compte au premier passage. */
export function GoogleSignInButton({ text = 'signin_with' }: { text?: 'signin_with' | 'signup_with' }) {
  const { loginWithGoogleCredential } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    function render() {
      const api = window.google?.accounts.id
      if (!api || !containerRef.current) return
      api.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        callback: async ({ credential }) => {
          try {
            await loginWithGoogleCredential(credential)
            navigate('/')
          } catch (err) {
            showSnackbar({
              message: err instanceof Error ? err.message : 'Connexion Google impossible',
              severity: 'error',
            })
          }
        },
      })
      api.renderButton(containerRef.current, { theme: 'outline', size: 'large', text, locale: 'fr' })
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (window.google?.accounts) {
      render()
      return
    }
    if (!script) {
      script = document.createElement('script')
      script.src = GSI_SRC
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', render)
    return () => script?.removeEventListener('load', render)
  }, [loginWithGoogleCredential, navigate, showSnackbar, text])

  if (!GOOGLE_CLIENT_ID) return null
  return <div className="login-google" ref={containerRef} />
}
