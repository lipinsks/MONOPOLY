import { createElement, useId } from 'react'
import { darken, lighten, safeColor } from '../../../lib/color'
import { tokenIcon } from '../../../lib/players'

interface PawnFigureProps {
  playerId: number
  color: string
  emblem: boolean
  className?: string
}

export function PawnFigure({ playerId, color, emblem, className }: PawnFigureProps) {
  const id = `pawn${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const base = safeColor(color)
  const highlight = lighten(base, 0.72)
  const light = lighten(base, 0.32)
  const shade = darken(base, 0.32)
  const deep = darken(base, 0.55)

  return (
    <svg className={className} viewBox="0 0 100 150" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-side`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={light} />
          <stop offset="0.38" stopColor={base} />
          <stop offset="0.78" stopColor={shade} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={highlight} />
          <stop offset="0.55" stopColor={light} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
        <radialGradient id={`${id}-head`} cx="0.36" cy="0.3" r="0.78">
          <stop offset="0" stopColor={highlight} />
          <stop offset="0.3" stopColor={light} />
          <stop offset="0.62" stopColor={base} />
          <stop offset="1" stopColor={deep} />
        </radialGradient>
      </defs>

      <g stroke={deep} strokeOpacity="0.55" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M8 124v10a42 9 0 0 0 84 0v-10z" fill={`url(#${id}-side)`} />
        <ellipse cx="50" cy="124" rx="42" ry="9" fill={`url(#${id}-top)`} />
        <path d="M19 124C23 106 34 90 39 64h22c5 26 16 42 20 60a31 7 0 0 1-62 0z" fill={`url(#${id}-side)`} />
        <ellipse cx="50" cy="64" rx="18" ry="5.5" fill={`url(#${id}-top)`} />
        <circle cx="50" cy="39" r="25" fill={`url(#${id}-head)`} />
      </g>

      <path
        d="M29 116c3-16 9-30 13-48"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.38"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <ellipse cx="41" cy="29" rx="8.5" ry="5.5" fill="#ffffff" fillOpacity="0.6" transform="rotate(-35 41 29)" />

      {emblem && (
        <g>
          <circle cx="50" cy="104" r="15.5" fill="#fbf8ef" stroke={deep} strokeWidth="2" />
          {createElement(tokenIcon(playerId), {
            x: 40,
            y: 94,
            width: 20,
            height: 20,
            color: deep,
            strokeWidth: 2.6,
          })}
        </g>
      )}
    </svg>
  )
}
