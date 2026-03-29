export type AuthUser = {
  id: number
  username: string
  email: string
  role_name?: string
  created_at?: string
}

export type ApiAuthResponse = {
  message: string
  token: string
  user: AuthUser
}

export type LoadingAction = 'login' | 'register' | 'profile' | null
