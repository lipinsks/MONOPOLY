import { Package } from 'lucide-react'
import type { CardDeck } from '../../api/types'
import { cx } from '../../lib/css'
import styles from './DrawnCard.module.css'

interface DrawnCardProps {
  deck: CardDeck | null
  text: string
  compact?: boolean
}

export function DrawnCard({ deck, text, compact = false }: DrawnCardProps) {
  const isChest = deck === 'chest'
  return (
    <figure className={cx(styles.card, isChest ? styles.chest : styles.chance, compact && styles.compact)}>
      <figcaption className={styles.deck}>
        {isChest ? <Package aria-hidden="true" /> : <span className={styles.mark}>?</span>}
        {deck === null ? 'Karta' : isChest ? 'Kasa Społeczna' : 'Szansa'}
      </figcaption>
      <p className={styles.text}>{text}</p>
    </figure>
  )
}
