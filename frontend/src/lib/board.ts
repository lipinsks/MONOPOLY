import type { ColorGroup, PlayerState, TileGroup, TileState, TileType } from '../api/types'

const CORNER_SIZE = 1.6
export const BOARD_UNITS = CORNER_SIZE * 2 + 9
const TILE_COUNT = 40
export const JAIL_TILE = 10

export type BoardSide = 'bottom' | 'left' | 'top' | 'right'

export interface Point {
  x: number
  y: number
}

export interface GridCell {
  row: number
  column: number
}

export interface Rect extends Point {
  width: number
  height: number
}

export const COLOR_GROUPS: readonly ColorGroup[] = [
  'saddlebrown',
  'lightblue',
  'mediumvioletred',
  'darkorange',
  'red',
  'gold',
  'green',
  'blue',
]

export const GROUP_ORDER: readonly TileGroup[] = [...COLOR_GROUPS, 'railroad', 'utility']

export const GROUP_COLORS: Record<TileGroup, string> = {
  saddlebrown: '#8b4a2c',
  lightblue: '#a3d8f0',
  mediumvioletred: '#d23a87',
  darkorange: '#f18a22',
  red: '#dc2a2f',
  gold: '#f3cf2c',
  green: '#1f9a55',
  blue: '#1f5fb4',
  railroad: '#2a332e',
  utility: '#7f8d88',
}

export const GROUP_NAMES: Record<TileGroup, string> = {
  saddlebrown: 'Brązowe',
  lightblue: 'Błękitne',
  mediumvioletred: 'Różowe',
  darkorange: 'Pomarańczowe',
  red: 'Czerwone',
  gold: 'Żółte',
  green: 'Zielone',
  blue: 'Granatowe',
  railroad: 'Koleje',
  utility: 'Przedsiębiorstwa',
}

export function isColorGroup(group: TileGroup | null): group is ColorGroup {
  return group !== null && group !== 'railroad' && group !== 'utility'
}

export function groupColor(group: TileGroup | null): string {
  return group ? GROUP_COLORS[group] : GROUP_COLORS.utility
}

export function isOwnable(tile: Pick<TileState, 'type'>): boolean {
  return tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility'
}

export function isCorner(index: number): boolean {
  return index % 10 === 0
}

export function tileSide(index: number): BoardSide {
  if (index < 10) return 'bottom'
  if (index < 20) return 'left'
  if (index < 30) return 'top'
  return 'right'
}

export function tileCell(index: number): GridCell {
  if (index <= 10) return { row: 11, column: 11 - index }
  if (index <= 20) return { row: 21 - index, column: 1 }
  if (index <= 30) return { row: 1, column: index - 19 }
  return { row: index - 29, column: 11 }
}

function trackStart(line: number): number {
  return line === 1 ? 0 : CORNER_SIZE + line - 2
}

function trackSize(line: number): number {
  return line === 1 || line === 11 ? CORNER_SIZE : 1
}

function tileRect(index: number): Rect {
  const { row, column } = tileCell(index)
  return { x: trackStart(column), y: trackStart(row), width: trackSize(column), height: trackSize(row) }
}

export function tileCenter(index: number): Point {
  const rect = tileRect(index)
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

export function toPercent(units: number): number {
  return (units / BOARD_UNITS) * 100
}

export function shortTileName(name: string): string {
  return name
    .replace(/^Kolej\s+/i, '')
    .replace(/\s+(Avenue|Place|Gardens)$/i, '')
    .trim()
}

const NARROW_WORD_LIMIT = 9

export function compactTileName(name: string, narrow: boolean): string {
  const short = shortTileName(name)
  if (!narrow) return short
  return short
    .split(' ')
    .map((word) => (word.length > NARROW_WORD_LIMIT ? `${word.slice(0, NARROW_WORD_LIMIT - 2)}.` : word))
    .join(' ')
}

const COLUMN_GAP = 0.44
const ROW_GAP = 0.3

const FOOTING: Record<BoardSide, Point> = {
  bottom: { x: 0, y: 0.5 },
  top: { x: 0, y: 0.02 },
  left: { x: -0.4, y: 0.3 },
  right: { x: 0.4, y: 0.3 },
}

const CORNER_FOOTING: Point = { x: 0, y: 0.3 }

const JAIL_CELL_FOOTING: Point = { x: 1.08, y: 11.42 }

const JAIL_VISITOR_SLOTS: readonly Point[] = [
  { x: 0.82, y: 12.04 },
  { x: 1.3, y: 12.04 },
  { x: 0.34, y: 12.04 },
  { x: 0.27, y: 11.58 },
  { x: 0.27, y: 11.16 },
  { x: 0.27, y: 10.8 },
]

type Arrangement = 'column' | 'row' | 'grid'

function arrangementFor(index: number, inJail: boolean): Arrangement {
  if (index === JAIL_TILE && inJail) return 'column'
  if (isCorner(index)) return 'grid'
  const side = tileSide(index)
  return side === 'bottom' || side === 'top' ? 'column' : 'row'
}

function clusterOffsets(count: number, arrangement: Arrangement): Point[] {
  if (count <= 1) return [{ x: 0, y: 0 }]
  const perLine = arrangement === 'grid' ? Math.min(3, count) : 2
  const lines = Math.ceil(count / perLine)
  return Array.from({ length: count }, (_, index) => {
    const line = Math.floor(index / perLine)
    const itemsInLine = line === lines - 1 ? count - line * perLine : perLine
    const slot = (index % perLine) - (itemsInLine - 1) / 2
    const depth = line - (lines - 1) / 2
    return arrangement === 'row'
      ? { x: depth * COLUMN_GAP, y: slot * ROW_GAP }
      : { x: slot * COLUMN_GAP, y: depth * ROW_GAP }
  })
}

export function pawnAnchor(index: number, inJail: boolean): Point {
  if (index === JAIL_TILE) return inJail ? JAIL_CELL_FOOTING : JAIL_VISITOR_SLOTS[0]
  const center = tileCenter(index)
  const footing = isCorner(index) ? CORNER_FOOTING : FOOTING[tileSide(index)]
  return { x: center.x + footing.x, y: center.y + footing.y }
}

type PawnInput = Pick<PlayerState, 'id' | 'position' | 'in_jail'>

export function pawnPlacements(players: readonly PawnInput[]): Map<number, Point> {
  const groups = new Map<string, PawnInput[]>()
  for (const player of [...players].sort((a, b) => a.id - b.id)) {
    const inCell = player.position === JAIL_TILE && player.in_jail
    const key = `${player.position}:${inCell ? 'cell' : 'tile'}`
    const members = groups.get(key)
    if (members) members.push(player)
    else groups.set(key, [player])
  }

  const placements = new Map<number, Point>()
  for (const members of groups.values()) {
    const { position, in_jail: inJail } = members[0]
    if (position === JAIL_TILE && !inJail) {
      members.forEach((member, index) =>
        placements.set(member.id, JAIL_VISITOR_SLOTS[index % JAIL_VISITOR_SLOTS.length]),
      )
      continue
    }
    const anchor = pawnAnchor(position, inJail)
    const offsets = clusterOffsets(members.length, arrangementFor(position, inJail))
    members.forEach((member, index) =>
      placements.set(member.id, { x: anchor.x + offsets[index].x, y: anchor.y + offsets[index].y }),
    )
  }
  return placements
}

export interface MotionSegment {
  kind: 'walk' | 'jump'
  tiles: number[]
}

function forwardPath(from: number, to: number): number[] {
  const steps = (to - from + TILE_COUNT) % TILE_COUNT
  return Array.from({ length: steps }, (_, index) => (from + index + 1) % TILE_COUNT)
}

const JAIL_TRIGGERS: ReadonlySet<TileType> = new Set<TileType>(['go_to_jail', 'chance', 'chest'])

export function planMotion(
  from: number,
  to: number,
  sentToJail: boolean,
  diceSum: number | null,
  tileTypeAt: (index: number) => TileType | undefined,
): MotionSegment[] {
  if (sentToJail) {
    if (diceSum) {
      const landing = (from + diceSum) % TILE_COUNT
      const landingType = tileTypeAt(landing)
      if (landing !== to && landingType && JAIL_TRIGGERS.has(landingType)) {
        return [
          { kind: 'walk', tiles: forwardPath(from, landing) },
          { kind: 'jump', tiles: [to] },
        ]
      }
    }
    return from === to ? [] : [{ kind: 'jump', tiles: [to] }]
  }
  if (from === to) return []
  return [{ kind: 'walk', tiles: forwardPath(from, to) }]
}
