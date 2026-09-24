import type { PlayerState, PropertyActionType, TileGroup, TileState } from '../api/types'
import { GROUP_ORDER, isColorGroup } from './board'

function tilesInGroup(board: readonly TileState[], group: TileGroup | null): TileState[] {
  return group ? board.filter((tile) => tile.group === group) : []
}

function ownsFullSet(board: readonly TileState[], ownerId: number, group: TileGroup | null): boolean {
  if (!isColorGroup(group)) return false
  const tiles = tilesInGroup(board, group)
  return tiles.length > 0 && tiles.every((tile) => tile.owner_id === ownerId)
}

export function unmortgageCost(tile: TileState): number {
  return Math.floor((tile.mortgage ?? 0) * 1.1)
}

function houseSalePrice(tile: TileState): number {
  return Math.floor((tile.house_cost ?? 0) / 2)
}

export type Rent = { kind: 'fixed'; amount: number; doubled: boolean } | { kind: 'dice'; multiplier: number }

function ownedInGroup(board: readonly TileState[], ownerId: number, group: TileGroup): number {
  return board.filter((tile) => tile.group === group && tile.owner_id === ownerId).length
}

export function currentRent(board: readonly TileState[], tile: TileState): Rent | null {
  if (tile.owner_id === null || tile.is_mortgaged) return null
  if (tile.type === 'property' && tile.rents) {
    const base = tile.rents[tile.houses] ?? 0
    const doubled = tile.houses === 0 && ownsFullSet(board, tile.owner_id, tile.group)
    return { kind: 'fixed', amount: doubled ? base * 2 : base, doubled }
  }
  if (tile.type === 'railroad' && tile.rents) {
    const count = ownedInGroup(board, tile.owner_id, 'railroad')
    return { kind: 'fixed', amount: tile.rents[count - 1] ?? 0, doubled: false }
  }
  if (tile.type === 'utility') {
    return { kind: 'dice', multiplier: ownedInGroup(board, tile.owner_id, 'utility') >= 2 ? 10 : 4 }
  }
  return null
}

export interface PropertyAction {
  type: PropertyActionType
  amount: number
  affordable: boolean
}

export function groupHasBuildings(board: readonly TileState[], tile: TileState): boolean {
  return tilesInGroup(board, tile.group).some((groupTile) => groupTile.houses > 0)
}

export function propertyActions(board: readonly TileState[], tile: TileState, owner: PlayerState): PropertyAction[] {
  if (tile.is_mortgaged) {
    const cost = unmortgageCost(tile)
    return [{ type: 'UNMORTGAGE', amount: cost, affordable: owner.money >= cost }]
  }

  const actions: PropertyAction[] = []
  const group = tilesInGroup(board, tile.group)

  if (tile.type === 'property' && tile.house_cost !== null) {
    const levels = group.map((groupTile) => groupTile.houses)
    const canGrow =
      ownsFullSet(board, owner.id, tile.group) &&
      !group.some((groupTile) => groupTile.is_mortgaged) &&
      tile.houses < 5 &&
      tile.houses === Math.min(...levels)
    if (canGrow) {
      actions.push({ type: 'BUILD', amount: tile.house_cost, affordable: owner.money >= tile.house_cost })
    }
    if (tile.houses > 0 && tile.houses === Math.max(...levels)) {
      actions.push({ type: 'SELL_HOUSE', amount: houseSalePrice(tile), affordable: true })
    }
  }

  if (!groupHasBuildings(board, tile)) {
    actions.push({ type: 'MORTGAGE', amount: tile.mortgage ?? 0, affordable: true })
  }

  return actions
}

export function tradableTiles(board: readonly TileState[], playerId: number): TileState[] {
  return board.filter((tile) => tile.owner_id === playerId && tile.houses === 0)
}

function tileValue(tile: TileState): number {
  const price = tile.price ?? 0
  if (tile.is_mortgaged) return price - unmortgageCost(tile)
  return price + tile.houses * (tile.house_cost ?? 0)
}

export function netWorth(board: readonly TileState[], player: PlayerState): number {
  return board.reduce((total, tile) => (tile.owner_id === player.id ? total + tileValue(tile) : total), player.money)
}

export function rankPlayers(board: readonly TileState[], players: readonly PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (a.is_bankrupt !== b.is_bankrupt) return a.is_bankrupt ? 1 : -1
    return netWorth(board, b) - netWorth(board, a)
  })
}

export interface GroupHolding {
  group: TileGroup
  owned: number
  total: number
}

export function groupHoldings(board: readonly TileState[], playerId: number): GroupHolding[] {
  return GROUP_ORDER.map((group) => {
    const tiles = tilesInGroup(board, group)
    return { group, owned: tiles.filter((tile) => tile.owner_id === playerId).length, total: tiles.length }
  }).filter((holding) => holding.owned > 0)
}
