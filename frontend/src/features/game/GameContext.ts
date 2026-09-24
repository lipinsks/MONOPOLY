import { createContext, useContext } from 'react'
import type { GameAction, GameState, PlayerState } from '../../api/types'
import type { Viewer } from '../../lib/permissions'

export interface GameContextValue {
  roomId: string
  state: GameState
  viewer: Viewer
  current: PlayerState
  me: PlayerState | null
  pending: string | null
  pawnsMoving: boolean
  run: (action: GameAction) => Promise<boolean>
  playerById: (id: number | null | undefined) => PlayerState | null
  openTile: (tileId: number) => void
  openTrade: (targetId?: number) => void
  openRename: (playerId: number) => void
  openSummary: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const game = useContext(GameContext)
  if (!game) throw new Error('useGame must be used within GameContext')
  return game
}

export function actionKey(action: GameAction): string {
  if ('tile_id' in action) return `${action.action}:${action.tile_id}`
  if (action.action === 'RESPOND_TRADE') return `${action.action}:${action.accept}`
  return action.action
}
