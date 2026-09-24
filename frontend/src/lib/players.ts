import { Car, Cat, Crown, Dog, Rocket, Ship, type LucideIcon } from 'lucide-react'

export const PLAYER_COLORS: readonly string[] = [
  '#e5484d',
  '#3e7bfa',
  '#23a26b',
  '#f5a524',
  '#8e5cf7',
  '#ec4f9c',
  '#12a5a0',
  '#46525e',
]

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6
export const MAX_NAME_LENGTH = 20

const TOKENS: readonly LucideIcon[] = [Car, Dog, Ship, Cat, Crown, Rocket]

export function tokenIcon(playerId: number): LucideIcon {
  return TOKENS[playerId % TOKENS.length]
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}
