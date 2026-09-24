import { useCallback, useRef, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { GameState } from '../../api/types'
import { usePolling } from '../../hooks/usePolling'

const STATE_POLL_INTERVAL = 500
const FAILURES_BEFORE_OFFLINE = 3

export type RoomStatus = 'loading' | 'ready' | 'missing'

interface Snapshot {
  status: RoomStatus
  state: GameState | null
}

export interface RoomConnection extends Snapshot {
  offline: boolean
  refresh: () => Promise<void>
}

export function useRoomState(roomId: string): RoomConnection {
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: 'loading', state: null })
  const [failures, setFailures] = useState(0)
  const lastPayload = useRef<string | null>(null)

  const poll = useCallback(
    async (signal: AbortSignal) => {
      try {
        const payload = await api.fetchStateText(roomId, signal)
        setFailures(0)
        if (payload === lastPayload.current) return
        lastPayload.current = payload
        setSnapshot({ status: 'ready', state: JSON.parse(payload) as GameState })
      } catch (error) {
        if (signal.aborted) return
        if (error instanceof ApiError && error.status === 404) {
          lastPayload.current = null
          setSnapshot((current) => (current.status === 'missing' ? current : { status: 'missing', state: null }))
          return
        }
        setFailures((count) => count + 1)
      }
    },
    [roomId],
  )

  const refresh = usePolling(poll, STATE_POLL_INTERVAL)
  return { ...snapshot, offline: failures >= FAILURES_BEFORE_OFFLINE, refresh }
}
