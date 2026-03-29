import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'
import { useState } from 'react'

export function LoginPage() {
  const { loginWithCredentials } = useAuth()
  const { showSnackbar } = useSnackbar()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@2d10.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      await loginWithCredentials(email.trim(), password)
      navigate('/')
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Connexion impossible',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Connexion 2d10</h1>
        <p>Utilise les identifiants backend pour ouvrir la session.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </section>
    </main>
  )
}
