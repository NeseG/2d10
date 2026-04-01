import { apiGet, apiPost } from '../../../shared/api/client'
import type { AuthUser, UserRole } from '../../../shared/types'

type LoginResponse = {
  message: string
  token: string
  user: {
    id: number
    username: string
    email: string
    role_name: UserRole
  }
}

type RegisterResponse = {
  message: string
  token: string
  user: {
    id: number
    username: string
    email: string
    role_id: number
    created_at: string
  }
}

type ProfileResponse = {
  user: {
    id: number
    username: string
    email: string
    role_name: UserRole
  }
}

function normalizeUser(user: {
  id: number
  username: string
  email: string
  role_name: UserRole
}): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role_name,
  }
}

export async function login(payload: { email: string; password: string }) {
  const response = await apiPost<LoginResponse>('/api/auth/login', payload)
  return {
    token: response.token,
    user: normalizeUser(response.user),
  }
}

export async function register(payload: { username: string; email: string; password: string }) {
  const response = await apiPost<RegisterResponse>('/api/auth/register', payload)
  return {
    token: response.token,
  }
}

export async function fetchProfile(token: string): Promise<AuthUser> {
  const response = await apiGet<ProfileResponse>('/api/auth/profile', token)
  return normalizeUser(response.user)
}
