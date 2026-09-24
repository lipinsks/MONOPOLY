import { createElement } from 'react'
import { readableOn, safeColor } from '../lib/color'
import { cssVars, cx } from '../lib/css'
import { tokenIcon } from '../lib/players'
import styles from './PlayerToken.module.css'

interface PlayerTokenProps {
  playerId: number
  color: string
  size?: number
  muted?: boolean
  className?: string
}

export function PlayerToken({ playerId, color, size = 32, muted = false, className }: PlayerTokenProps) {
  const fill = safeColor(color)
  return (
    <span
      className={cx(styles.token, muted && styles.muted, className)}
      style={{ ...cssVars({ token: fill, 'token-ink': readableOn(fill) }), width: size, height: size }}
      aria-hidden="true"
    >
      {createElement(tokenIcon(playerId), { size: Math.round(size * 0.54), strokeWidth: 2.3 })}
    </span>
  )
}
