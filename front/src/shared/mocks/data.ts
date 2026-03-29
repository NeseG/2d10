import type { Campaign, Character, GameSession, AuthUser } from '../types'

export const demoUsers: AuthUser[] = [
  { id: 1, username: 'Admin', email: 'admin@2d10.com', role: 'admin' },
  { id: 3, username: 'GameMaster', email: 'gm@2d10.com', role: 'gm' },
  { id: 2, username: 'PlayerOne', email: 'user@2d10.com', role: 'user' },
]

export const mockCharacters: Character[] = [
  { id: 1, name: 'Aragorn', className: 'Ranger', level: 5, race: 'Human' },
  { id: 2, name: 'Lyra', className: 'Wizard', level: 4, race: 'Elf' },
  { id: 3, name: 'Brunn', className: 'Cleric', level: 3, race: 'Dwarf' },
]

export const mockCampaigns: Campaign[] = [
  { id: 1, name: 'La Cité Perdue', status: 'active', players: 4 },
  { id: 2, name: 'Temple des Cendres', status: 'paused', players: 3 },
]

export const mockSessions: GameSession[] = [
  { id: 1, campaignName: 'La Cité Perdue', date: '2026-03-10', attendance: 4 },
  { id: 2, campaignName: 'Temple des Cendres', date: '2026-03-17', attendance: 2 },
]
