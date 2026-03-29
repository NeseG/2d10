type RegisterFormProps = {
  username: string
  email: string
  password: string
  isLoading: boolean
  onUsernameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function RegisterForm({
  username,
  email,
  password,
  isLoading,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: RegisterFormProps) {
  return (
    <article className="card">
      <h2>Inscription</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="register-username">Nom d'utilisateur</label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          required
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          required
        />

        <label htmlFor="register-password">Mot de passe</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          minLength={6}
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Inscription...' : "S'inscrire"}
        </button>
      </form>
    </article>
  )
}
