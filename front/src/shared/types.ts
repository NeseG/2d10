export type UserRole = 'admin' | 'gm' | 'user'

export type AuthUser = {
  id: number
  username: string
  email: string
  role: UserRole
}

export type Character = {
  id: number
  name: string
  className: string
  level: number
  race: string
}

export type Campaign = {
  id: number
  name: string
  status: 'active' | 'paused' | 'done'
  players: number
}

export type GameSession = {
  id: number
  campaignName: string
  date: string
  attendance: number
}
