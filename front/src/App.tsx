import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthUser = {
  id: number
  username: string
  email: string
  role_name?: string
  created_at?: string
}

type ApiAuthResponse = {
  message: string
  token: string
  user: AuthUser
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

function App() {
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loadingAction, setLoadingAction] = useState<'login' | 'register' | 'profile' | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function callAuthEndpoint(path: string, payload: Record<string, string>): Promise<ApiAuthResponse> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = (await response.json()) as ApiAuthResponse | { error?: string }

    if (!response.ok) {
      throw new Error((body as { error?: string }).error ?? 'Une erreur est survenue.')
    }

    return body as ApiAuthResponse
  }

  async function fetchProfile(currentToken: string) {
    setLoadingAction('profile')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      })
      const body = (await response.json()) as { user?: AuthUser; error?: string }

      if (!response.ok || !body.user) {
        throw new Error(body.error ?? 'Impossible de récupérer le profil.')
      }

      setCurrentUser(body.user)
      setSuccessMessage('Profil chargé avec succès.')
    } catch (error) {
      setCurrentUser(null)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingAction('login')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await callAuthEndpoint('/api/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      })
      setToken(result.token)
      setCurrentUser(result.user)
      setSuccessMessage(result.message)
      setLoginPassword('')
    } catch (error) {
      setCurrentUser(null)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingAction('register')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await callAuthEndpoint('/api/auth/register', {
        username: registerUsername.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      })
      setToken(result.token)
      setCurrentUser(result.user)
      setSuccessMessage(result.message)
      setRegisterPassword('')
    } catch (error) {
      setCurrentUser(null)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue.')
    } finally {
      setLoadingAction(null)
    }
  }

  function clearSession() {
    setToken('')
    setCurrentUser(null)
    setSuccessMessage('Session locale effacée.')
    setErrorMessage('')
  }

  return (
    <main className="auth-page">
      <header>
        <h1>2d10 - Authentification</h1>
        <p className="subtitle">Inscription et connexion via l'API backend.</p>
      </header>

      {errorMessage && <p className="message error">{errorMessage}</p>}
      {successMessage && <p className="message success">{successMessage}</p>}

      <section className="forms-grid">
        <article className="card">
          <h2>Connexion</h2>
          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />

            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />

            <button type="submit" disabled={loadingAction === 'login'}>
              {loadingAction === 'login' ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Inscription</h2>
          <form onSubmit={handleRegister}>
            <label htmlFor="register-username">Nom d'utilisateur</label>
            <input
              id="register-username"
              type="text"
              value={registerUsername}
              onChange={(event) => setRegisterUsername(event.target.value)}
              required
            />

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={registerEmail}
              onChange={(event) => setRegisterEmail(event.target.value)}
              required
            />

            <label htmlFor="register-password">Mot de passe</label>
            <input
              id="register-password"
              type="password"
              value={registerPassword}
              onChange={(event) => setRegisterPassword(event.target.value)}
              required
              minLength={6}
            />

            <button type="submit" disabled={loadingAction === 'register'}>
              {loadingAction === 'register' ? 'Inscription...' : "S'inscrire"}
            </button>
          </form>
        </article>
      </section>

      <section className="card session-card">
        <h2>Session</h2>
        <p>
          <strong>API:</strong> <code>{API_BASE_URL}</code>
        </p>
        <p>
          <strong>Token:</strong>{' '}
          {token ? `${token.slice(0, 24)}...` : 'Aucun token en mémoire'}
        </p>
        <div className="session-actions">
          <button
            type="button"
            onClick={() => fetchProfile(token)}
            disabled={!token || loadingAction === 'profile'}
          >
            {loadingAction === 'profile' ? 'Chargement...' : 'Charger mon profil'}
          </button>
          <button type="button" className="secondary" onClick={clearSession}>
            Effacer la session locale
          </button>
        </div>

        {currentUser && (
          <div className="profile">
            <h3>Profil connecté</h3>
            <p>
              <strong>Username:</strong> {currentUser.username}
            </p>
            <p>
              <strong>Email:</strong> {currentUser.email}
            </p>
            {currentUser.role_name && (
              <p>
                <strong>Role:</strong> {currentUser.role_name}
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
