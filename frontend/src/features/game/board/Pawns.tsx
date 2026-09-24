import { useCallback, useLayoutEffect, useRef } from 'react'
import type { PlayerState, TileState } from '../../../api/types'
import { usePrefersReducedMotion } from '../../../hooks/useMediaQuery'
import {
  JAIL_TILE,
  pawnAnchor,
  pawnPlacements,
  planMotion,
  toPercent,
  type MotionSegment,
  type Point,
} from '../../../lib/board'
import { safeColor } from '../../../lib/color'
import { cssVars, cx } from '../../../lib/css'
import { PawnFigure } from './PawnFigure'
import styles from './Pawns.module.css'

const STEP_DURATION = 190
const MAX_WALK_DURATION = 1800
const JUMP_DURATION = 680
const RISE = 'cubic-bezier(0.2, 0.7, 0.4, 1)'
const FALL = 'cubic-bezier(0.6, 0, 0.8, 0.3)'

const STEP_FIGURE: Keyframe[] = [
  { transform: 'translateY(0) scale(1, 1)' },
  { transform: 'translateY(0) scale(1.08, 0.9)', offset: 0.12, easing: RISE },
  { transform: 'translateY(-36%) scale(0.95, 1.06)', offset: 0.5, easing: FALL },
  { transform: 'translateY(0) scale(1.08, 0.9)', offset: 0.88 },
  { transform: 'translateY(0) scale(1, 1)' },
]

const STEP_SHADOW: Keyframe[] = [
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(1)', opacity: 1, offset: 0.12, easing: RISE },
  { transform: 'scale(0.62)', opacity: 0.45, offset: 0.5, easing: FALL },
  { transform: 'scale(1)', opacity: 1, offset: 0.88 },
  { transform: 'scale(1)', opacity: 1 },
]

const JUMP_FIGURE: Keyframe[] = [
  { transform: 'translateY(0) rotate(0deg) scale(1, 1)' },
  { transform: 'translateY(0) rotate(0deg) scale(1.1, 0.86)', offset: 0.1, easing: RISE },
  { transform: 'translateY(-125%) rotate(-16deg) scale(1.04, 1.04)', offset: 0.5, easing: FALL },
  { transform: 'translateY(0) rotate(0deg) scale(1.1, 0.88)', offset: 0.9 },
  { transform: 'translateY(0) rotate(0deg) scale(1, 1)' },
]

const JUMP_SHADOW: Keyframe[] = [
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(1)', opacity: 1, offset: 0.1, easing: RISE },
  { transform: 'scale(0.35)', opacity: 0.25, offset: 0.5, easing: FALL },
  { transform: 'scale(1)', opacity: 1, offset: 0.9 },
  { transform: 'scale(1)', opacity: 1 },
]

interface PawnLayerProps {
  players: PlayerState[]
  board: TileState[]
  currentId: number
  diceSum: number | null
  detailed: boolean
  onMotionChange: (playerId: number, moving: boolean) => void
}

export function PawnLayer({ players, board, currentId, diceSum, detailed, onMotionChange }: PawnLayerProps) {
  const reducedMotion = usePrefersReducedMotion()
  const active = players.filter((player) => !player.is_bankrupt)
  const placements = pawnPlacements(active)

  return (
    <div className={styles.layer} aria-hidden="true">
      {active.map((player) => (
        <Pawn
          key={player.id}
          player={player}
          rest={placements.get(player.id) ?? pawnAnchor(player.position, player.in_jail)}
          current={player.id === currentId}
          board={board}
          diceSum={diceSum}
          detailed={detailed}
          reducedMotion={reducedMotion}
          onMotionChange={onMotionChange}
        />
      ))}
    </div>
  )
}

interface PawnParts {
  element: HTMLElement
  figure: HTMLElement
  shadow: HTMLElement
}

interface PawnSpot {
  position: number
  inJail: boolean
  rest: Point
}

function animateSegment(parts: PawnParts, origin: Point, points: Point[], kind: MotionSegment['kind']): Promise<void> {
  const steps = points.length
  const stepDuration = kind === 'jump' ? JUMP_DURATION : Math.min(STEP_DURATION, MAX_WALK_DURATION / steps)
  const frames = [origin, ...points].map((point) => ({
    left: `${toPercent(point.x)}%`,
    top: `${toPercent(point.y)}%`,
  }))
  const move = parts.element.animate(frames, {
    duration: stepDuration * steps,
    easing: kind === 'jump' ? 'cubic-bezier(0.45, 0, 0.25, 1)' : 'linear',
    fill: 'forwards',
  })
  const hop = { duration: stepDuration, iterations: steps }
  parts.figure.animate(kind === 'jump' ? JUMP_FIGURE : STEP_FIGURE, hop)
  parts.shadow.animate(kind === 'jump' ? JUMP_SHADOW : STEP_SHADOW, hop)
  return move.finished.then(
    () => undefined,
    () => undefined,
  )
}

async function playSegments(
  parts: PawnParts,
  origin: Point,
  destination: Point,
  segments: MotionSegment[],
): Promise<void> {
  let start = origin
  for (const [segmentIndex, segment] of segments.entries()) {
    const lastSegment = segmentIndex === segments.length - 1
    const points = segment.tiles.map((tile, index) =>
      lastSegment && index === segment.tiles.length - 1 ? destination : pawnAnchor(tile, false),
    )
    await animateSegment(parts, start, points, segment.kind)
    if (!parts.element.isConnected) return
    start = points[points.length - 1]
  }
}

function stopAnimations(parts: PawnParts): void {
  for (const node of [parts.element, parts.figure, parts.shadow]) {
    for (const animation of node.getAnimations()) animation.cancel()
  }
}

interface PawnProps {
  player: PlayerState
  rest: Point
  current: boolean
  board: TileState[]
  diceSum: number | null
  detailed: boolean
  reducedMotion: boolean
  onMotionChange: (playerId: number, moving: boolean) => void
}

function Pawn({ player, rest, current, board, diceSum, detailed, reducedMotion, onMotionChange }: PawnProps) {
  const initialSpot: PawnSpot = { position: player.position, inJail: player.in_jail, rest }
  const elementRef = useRef<HTMLDivElement>(null)
  const figureRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLSpanElement>(null)
  const shown = useRef(initialSpot)
  const target = useRef(initialSpot)
  const animating = useRef(false)
  const environment = useRef({ board, diceSum, reducedMotion, onMotionChange })
  const playerId = player.id
  const { position, in_jail: inJail } = player
  const { x: restX, y: restY } = rest

  useLayoutEffect(() => {
    environment.current = { board, diceSum, reducedMotion, onMotionChange }
  })

  const advance = useCallback(async () => {
    const element = elementRef.current
    const figure = figureRef.current
    const shadow = shadowRef.current
    if (animating.current) return
    if (!element || !figure || !shadow) {
      shown.current = target.current
      return
    }

    const parts = { element, figure, shadow }
    animating.current = true
    let reported = false
    while (element.isConnected) {
      const goal = target.current
      const from = shown.current
      const { board: tiles, diceSum: sum, reducedMotion: instant } = environment.current
      const sentToJail = goal.inJail && !from.inJail && goal.position === JAIL_TILE
      const segments = instant
        ? []
        : planMotion(from.position, goal.position, sentToJail, sum, (index) => tiles[index]?.type)
      if (segments.length === 0) {
        shown.current = goal
        break
      }
      if (!reported) {
        element.dataset.moving = 'true'
        environment.current.onMotionChange(playerId, true)
        reported = true
      }
      await playSegments(parts, from.rest, goal.rest, segments)
      stopAnimations(parts)
      shown.current = goal
      if (target.current === goal) break
    }
    animating.current = false
    if (reported) {
      delete element.dataset.moving
      environment.current.onMotionChange(playerId, false)
    }
  }, [playerId])

  useLayoutEffect(() => {
    target.current = { position, inJail, rest: { x: restX, y: restY } }
    void advance()
  }, [position, inJail, restX, restY, advance])

  return (
    <div
      ref={elementRef}
      className={cx(styles.pawn, current && styles.current)}
      style={{
        left: `${toPercent(restX)}%`,
        top: `${toPercent(restY)}%`,
        ...cssVars({ pawn: safeColor(player.color), depth: Math.round(restY * 10) }),
      }}
    >
      <span ref={shadowRef} className={styles.shadow} />
      {current && <span className={styles.ring} />}
      <div ref={figureRef} className={styles.figure}>
        <PawnFigure playerId={player.id} color={player.color} emblem={detailed} className={styles.svg} />
      </div>
    </div>
  )
}
