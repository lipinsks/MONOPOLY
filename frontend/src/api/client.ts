import type { GameAction, PlayerSetup, RoomSettings, RoomSummary } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Coś poszło nie tak. Spróbuj ponownie.'
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError('Brak połączenia z serwerem.', 0)
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Serwer zwrócił błąd ${response.status}.`
    throw new ApiError(message, response.status)
  }
  return response
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await send(path, { signal })
  return (await response.json()) as T
}

async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await send(path, { method: 'POST', body: JSON.stringify(body) })
  return (await response.json()) as T
}

function roomPath(roomId: string, endpoint: string): string {
  return `/api/${encodeURIComponent(roomId)}/${endpoint}`
}

export const api = {
  async listRooms(signal?: AbortSignal): Promise<RoomSummary[]> {
    const data = await getJson<{ rooms: RoomSummary[] }>('/api/rooms', signal)
    return data.rooms
  },

  async createRoom(name: string): Promise<string> {
    const data = await postJson<{ room_id: string }>('/api/rooms/create', { name })
    return data.room_id
  },

  async fetchStateText(roomId: string, signal?: AbortSignal): Promise<string> {
    const response = await send(roomPath(roomId, 'state'), { signal })
    return response.text()
  },

  async setup(roomId: string, players: PlayerSetup[]): Promise<void> {
    await postJson(roomPath(roomId, 'setup'), { players })
  },

  async restart(roomId: string): Promise<void> {
    await postJson(roomPath(roomId, 'restart'))
  },

  async updateSettings(roomId: string, settings: RoomSettings): Promise<void> {
    await postJson(roomPath(roomId, 'settings'), settings)
  },

  async closeRoom(roomId: string): Promise<void> {
    await postJson(roomPath(roomId, 'settings'), { end_game: true })
  },

  async act(roomId: string, action: GameAction): Promise<void> {
    await postJson(roomPath(roomId, 'action'), action)
  },
}
