import { readStorage, writeStorage } from './storage'

export type StoredRole = number | 'spectator'

const hostKey = (roomId: string) => `monopoly_host_${roomId}`
const roleKey = (roomId: string) => `monopoly_role_${roomId}`

export function isHostOf(roomId: string): boolean {
  return readStorage(hostKey(roomId)) === 'true'
}

export function markAsHost(roomId: string): void {
  writeStorage(hostKey(roomId), 'true')
}

export function readRole(roomId: string): StoredRole | null {
  const raw = readStorage(roleKey(roomId))
  if (raw === null) return null
  if (raw === 'spectator') return 'spectator'
  const id = Number(raw)
  return Number.isInteger(id) && id >= 0 ? id : null
}

export function saveRole(roomId: string, role: StoredRole): void {
  writeStorage(roleKey(roomId), String(role))
}
