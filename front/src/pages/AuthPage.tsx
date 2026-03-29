import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSnackbar } from '../app/hooks/useSnackbar'
import { LoginForm } from '../components/LoginForm'
import { RegisterForm } from '../components/RegisterForm'
import { SessionPanel } from '../components/SessionPanel'
import { fetchProfile, getApiBaseUrl, login, register } from '../services/authApi'
import type { AuthUser, LoadingAction } from '../types/auth'

export function AuthPage() {
  const { showSnackbar } = useSnackbar()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [token, setToken] = useState('')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null)

  async function handleLoadProfile() {
    setLoadingAction('profile')

    try {
      const user = await fetchProfile(token)
      setCurrentUser(user)
      showSnackbar({ message: 'Profil chargé avec succès.', severity: 'success' })
    } catch (error) {
      setCurrentUser(null)
      showSnackbar({
        message: error instanceof Error ? error.message : 'Erreur inconnue.',
        severity: 'error',
      })
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingAction('login')

    try {
      const result = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      })
      setToken(result.token)
      setCurrentUser(result.user)
      showSnackbar({ message: result.message, severity: 'success' })
      setLoginPassword('')
    } catch (error) {
      setCurrentUser(null)
      showSnackbar({
        message: error instanceof Error ? error.message : 'Erreur inconnue.',
        severity: 'error',
      })
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingAction('register')

    try {
      const result = await register({
        username: registerUsername.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      })
      setToken(result.token)
      setCurrentUser(result.user)
      showSnackbar({ message: result.message, severity: 'success' })
      setRegisterPassword('')
    } catch (error) {
      setCurrentUser(null)
      showSnackbar({
        message: error instanceof Error ? error.message : 'Erreur inconnue.',
        severity: 'error',
      })
    } finally {
      setLoadingAction(null)
    }
  }

  function clearSession() {
    setToken('')
    setCurrentUser(null)
    showSnackbar({ message: 'Session locale effacée.', severity: 'info' })
  }

  return (
    <main className="auth-page">
      <header>
        <h1>2d10 - Authentification</h1>
        <p className="subtitle">Inscription et connexion via l'API backend.</p>
      </header>

      <section className="forms-grid">
        <LoginForm
          email={loginEmail}
          password={loginPassword}
          isLoading={loadingAction === 'login'}
          onEmailChange={setLoginEmail}
          onPasswordChange={setLoginPassword}
          onSubmit={handleLogin}
        />

        <RegisterForm
          username={registerUsername}
          email={registerEmail}
          password={registerPassword}
          isLoading={loadingAction === 'register'}
          onUsernameChange={setRegisterUsername}
          onEmailChange={setRegisterEmail}
          onPasswordChange={setRegisterPassword}
          onSubmit={handleRegister}
        />
      </section>

      <SessionPanel
        apiBaseUrl={getApiBaseUrl()}
        token={token}
        currentUser={currentUser}
        isLoadingProfile={loadingAction === 'profile'}
        onLoadProfile={handleLoadProfile}
        onClearSession={clearSession}
      />
    </main>
  )
}
