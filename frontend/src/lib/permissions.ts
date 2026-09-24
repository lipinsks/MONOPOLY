import type { GameState, PlayerState } from '../api/types'

export interface Viewer {
  role: number | null
  isHost: boolean
}

export function currentPlayerOf(state: GameState): PlayerState {
  return (
    state.players[state.current_player_id] ??
    state.players.find((player) => player.name === state.current_player) ??
    state.players[0]
  )
}

function isGameOver(state: GameState): boolean {
  return state.game_over_reason !== null
}

export function canAdminister(state: GameState, viewer: Viewer): boolean {
  return viewer.isHost || !state.enforce_permissions
}

export function canControlTurn(state: GameState, viewer: Viewer): boolean {
  if (viewer.role === null || isGameOver(state)) return false
  const current = currentPlayerOf(state)
  if (!current.is_human || current.is_bankrupt) return false
  return !state.enforce_permissions || current.id === viewer.role
}

export function canManageProperties(state: GameState, viewer: Viewer, owner: PlayerState): boolean {
  return owner.id === state.current_player_id && canControlTurn(state, viewer)
}

export function canProposeTrade(state: GameState, viewer: Viewer): boolean {
  if (state.active_trade !== null || !canControlTurn(state, viewer)) return false
  return state.players.some((player) => player.id !== state.current_player_id && !player.is_bankrupt)
}

export function canRespondToTrade(state: GameState, viewer: Viewer): boolean {
  const trade = state.active_trade
  if (!trade || viewer.role === null) return false
  const target = state.players.find((player) => player.id === trade.to_id)
  return Boolean(target?.is_human && target.id === viewer.role)
}
