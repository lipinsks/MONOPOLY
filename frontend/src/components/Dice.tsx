import { countOf, WORDS } from '../lib/format'
import { cssVars, cx } from '../lib/css'
import styles from './Dice.module.css'

const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const CELLS = Array.from({ length: 9 }, (_, index) => index)

function Die({ value, delay }: { value: number; delay: number }) {
  const pips = PIPS[value] ?? []
  return (
    <span className={styles.die} style={cssVars({ delay: `${delay}ms` })}>
      {CELLS.map((cell) => (
        <span key={cell} className={cx(styles.pip, pips.includes(cell) && styles.visible)} />
      ))}
    </span>
  )
}

interface DicePairProps {
  dice: readonly [number, number]
  rollKey: number
  size?: number | string
}

export function DicePair({ dice, rollKey, size = 40 }: DicePairProps) {
  const [first, second] = dice
  const label = `Wyrzucono ${first} i ${second}, razem ${countOf(first + second, WORDS.pip)}`
  return (
    <span
      key={rollKey}
      className={styles.pair}
      style={cssVars({ size: typeof size === 'number' ? `${size}px` : size })}
      role="img"
      aria-label={label}
    >
      <Die value={first} delay={0} />
      <Die value={second} delay={70} />
    </span>
  )
}
