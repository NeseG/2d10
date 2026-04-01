import type { ApiAuthResponse, AuthUser } from '../types/auth'
import { getApiBaseUrl } from '../shared/api/client'

export { getApiBaseUrl }

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function login(payload: { email: string; password: string }) {
  return callAuthEndpoint('/api/auth/login', payload)
}

export async function register(payload: {
  username: string
  email: string
  password: string
}) {
  return callAuthEndpoint('/api/auth/register', payload)
}

export async function fetchProfile(token: string): Promise<AuthUser> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await parseJson<{ user?: AuthUser; error?: string }>(response)
  if (!response.ok || !body.user) {
    throw new Error(body.error ?? 'Impossible de récupérer le profil.')
  }

  return body.user
}

async function callAuthEndpoint(
  path: string,
  payload: Record<string, string>,
): Promise<ApiAuthResponse> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await parseJson<ApiAuthResponse | { error?: string }>(response)
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? 'Une erreur est survenue.')
  }

  return body as ApiAuthResponse
}
