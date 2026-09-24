import { Package } from 'lucide-react'
import type { CardDeck } from '../../../api/types'
import { DicePair } from '../../../components/Dice'
import { LogoPlate } from '../../../components/Logo'
import { cx } from '../../../lib/css'
import { DrawnCard } from '../DrawnCard'
import { useGame } from '../GameContext'
import { TurnPanel } from '../TurnPanel'
import styles from './BoardCenter.module.css'

export function BoardCenter({ withPanel }: { withPanel: boolean }) {
  return (
    <div className={cx(styles.center, withPanel && styles.withPanel)}>
      <DeckSpot deck="chest" />
      <DeckSpot deck="chance" />
      <div className={styles.content}>
        <LogoPlate size="sm" className={styles.logo} />
        {withPanel ? <TurnPanel variant="card" /> : <CompactStatus />}
      </div>
    </div>
  )
}

function DeckSpot({ deck }: { deck: CardDeck }) {
  return (
    <div className={cx(styles.deck, styles[deck])} aria-hidden="true">
      {deck === 'chance' ? <span className={styles.deckMark}>?</span> : <Package className={styles.deckIcon} />}
      <span className={styles.deckLabel}>{deck === 'chance' ? 'Szansa' : 'Kasa Społeczna'}</span>
    </div>
  )
}

function CompactStatus() {
  const { state } = useGame()
  if (!state.turn_dice && !state.turn_card) return null
  return (
    <div className={styles.compact}>
      {state.turn_dice && <DicePair dice={state.turn_dice} rollKey={state.roll_count} size="calc(var(--u) * 0.72)" />}
      {state.turn_card && <DrawnCard deck={state.turn_card_type} text={state.turn_card} compact />}
    </div>
  )
}
