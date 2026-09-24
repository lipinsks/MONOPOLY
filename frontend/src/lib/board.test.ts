import { describe, expect, it } from 'vitest'
import type { TileType } from '../api/types'
import { BOARD_UNITS, compactTileName, pawnPlacements, planMotion, shortTileName, tileCell, tileCenter } from './board'

const tileTypes =
  (special: Record<number, TileType>) =>
  (index: number): TileType =>
    special[index] ?? 'property'

describe('tileCell', () => {
  it('puts the four corners in the grid corners', () => {
    expect(tileCell(0)).toEqual({ row: 11, column: 11 })
    expect(tileCell(10)).toEqual({ row: 11, column: 1 })
    expect(tileCell(20)).toEqual({ row: 1, column: 1 })
    expect(tileCell(30)).toEqual({ row: 1, column: 11 })
  })

  it('walks every side in the order of play', () => {
    expect(tileCell(1)).toEqual({ row: 11, column: 10 })
    expect(tileCell(11)).toEqual({ row: 10, column: 1 })
    expect(tileCell(21)).toEqual({ row: 1, column: 2 })
    expect(tileCell(39)).toEqual({ row: 10, column: 11 })
  })
})

describe('tileCenter', () => {
  it('accounts for the larger corner tiles', () => {
    const start = tileCenter(0)
    expect(start.x).toBeCloseTo(BOARD_UNITS - 0.8)
    expect(start.y).toBeCloseTo(BOARD_UNITS - 0.8)
    const first = tileCenter(1)
    expect(first.x).toBeCloseTo(10.1)
    expect(first.y).toBeCloseTo(11.4)
  })
})

describe('planMotion', () => {
  it('walks forward across START', () => {
    expect(planMotion(38, 3, false, 5, tileTypes({}))).toEqual([{ kind: 'walk', tiles: [39, 0, 1, 2, 3] }])
  })

  it('does nothing when the pawn stays put', () => {
    expect(planMotion(5, 5, false, null, tileTypes({}))).toEqual([])
  })

  it('walks onto the go to jail tile before jumping to the cell', () => {
    expect(planMotion(24, 10, true, 6, tileTypes({ 30: 'go_to_jail' }))).toEqual([
      { kind: 'walk', tiles: [25, 26, 27, 28, 29, 30] },
      { kind: 'jump', tiles: [10] },
    ])
  })

  it('jumps straight to jail when the dice do not explain the move', () => {
    expect(planMotion(14, 10, true, 8, tileTypes({}))).toEqual([{ kind: 'jump', tiles: [10] }])
  })
})

describe('pawnPlacements', () => {
  it('spreads pawns that share a tile', () => {
    const placements = pawnPlacements([
      { id: 0, position: 5, in_jail: false },
      { id: 1, position: 5, in_jail: false },
    ])
    expect(placements.get(0)).not.toEqual(placements.get(1))
  })

  it('keeps prisoners in the cell and visitors outside it', () => {
    const placements = pawnPlacements([
      { id: 0, position: 10, in_jail: true },
      { id: 1, position: 10, in_jail: false },
    ])
    const prisoner = placements.get(0)
    const visitor = placements.get(1)
    expect(prisoner && visitor && prisoner.y < visitor.y).toBe(true)
  })
})

describe('shortTileName', () => {
  it('drops street suffixes and the railroad prefix', () => {
    expect(shortTileName('North Carolina Avenue')).toBe('North Carolina')
    expect(shortTileName('Kolej Reading')).toBe('Reading')
    expect(shortTileName('Marvin Gardens')).toBe('Marvin')
    expect(shortTileName('Boardwalk')).toBe('Boardwalk')
  })
})

describe('compactTileName', () => {
  it('abbreviates long words only on narrow tiles', () => {
    expect(compactTileName('Connecticut Avenue', true)).toBe('Connect.')
    expect(compactTileName('Connecticut Avenue', false)).toBe('Connecticut')
    expect(compactTileName('Kentucky Avenue', true)).toBe('Kentucky')
  })
})
