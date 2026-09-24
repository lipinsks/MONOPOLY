import { useCallback, useRef, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { GameAction } from '../../api/types'
import { useToast } from '../../components/ui/toast-context'
import { actionKey } from './GameContext'

export function useGameActions(roomId: string, refresh: () => Promise<void>) {
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)
  const busy = useRef(false)

  const run = useCallback(
    async (action: GameAction): Promise<boolean> => {
      if (busy.current) return false
      busy.current = true
      setPending(actionKey(action))
      try {
        await api.act(roomId, action)
        return true
      } catch (error) {
        toast.error(errorMessage(error))
        return false
      } finally {
        await refresh()
        busy.current = false
        setPending(null)
      }
    },
    [roomId, refresh, toast],
  )

  return { pending, run }
}
