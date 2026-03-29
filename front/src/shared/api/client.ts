const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export function getApiBaseUrl() {
  return API_BASE_URL
}

/** Évite un plantage `JSON.parse` si le serveur renvoie du HTML (404 SPA, mauvaise URL, route API manquante). */
async function readApiJson<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) {
    return {} as T & { error?: string }
  }
  if (trimmed.startsWith('<!') || trimmed.startsWith('<')) {
    throw new Error(
      'Réponse HTML au lieu de JSON : URL API incorrecte ou route backend absente (ex. redémarrer le serveur après mise à jour, vérifier VITE_API_BASE_URL).',
    )
  }
  try {
    return JSON.parse(text) as T & { error?: string }
  } catch {
    throw new Error(`Réponse non JSON (${response.status}) : ${trimmed.slice(0, 100)}`)
  }
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await readApiJson<T>(response)
  if (!response.ok) {
    throw new Error(body.error ?? `Erreur API (${response.status})`)
  }

  return body
}

export async function apiPost<T>(
  path: string,
  payload: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const body = await readApiJson<T>(response)
  if (!response.ok) {
    throw new Error(body.error ?? `Erreur API (${response.status})`)
  }

  return body
}

export async function apiPut<T>(
  path: string,
  payload: Record<string, unknown>,
  token: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const body = await readApiJson<T>(response)
  if (!response.ok) {
    throw new Error(body.error ?? `Erreur API (${response.status})`)
  }

  return body
}

export async function apiDelete<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await readApiJson<T>(response)
  if (!response.ok) {
    throw new Error(body.error ?? `Erreur API (${response.status})`)
  }

  return body
}
