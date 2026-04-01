import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { useState } from 'react'

export function RegisterPage() {
  const { registerWithCredentials, isAuthenticated } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      await registerWithCredentials(username.trim(), email.trim(), password)
      navigate('/')
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Inscription impossible',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Inscription 2d10</h1>
        <p>Crée un compte pour accéder à l’application.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Nom d’utilisateur</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoComplete="username"
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <div className="login-actions">
          <Link className="btn btn-secondary" to="/login">
            J’ai déjà un compte
          </Link>
        </div>
      </section>
    </main>
  )
}

