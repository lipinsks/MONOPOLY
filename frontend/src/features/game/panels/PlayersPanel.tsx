import { ArrowLeftRight, Bot, KeyRound, Lock, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { PlayerState } from '../../../api/types'
import { PlayerToken } from '../../../components/PlayerToken'
import { Button, IconButton } from '../../../components/ui/Button'
import { GROUP_COLORS, GROUP_NAMES, isColorGroup } from '../../../lib/board'
import { safeColor } from '../../../lib/color'
import { cssVars, cx } from '../../../lib/css'
import { countOf, formatDelta, formatMoney, WORDS } from '../../../lib/format'
import { canAdminister, canProposeTrade } from '../../../lib/permissions'
import { groupHoldings, type GroupHolding } from '../../../lib/rules'
import { useGame } from '../GameContext'
import styles from './PlayersPanel.module.css'

export function PlayersPanel({ inTabs = false }: { inTabs?: boolean }) {
  const { state, viewer, openTrade } = useGame()
  const tradeAllowed = canProposeTrade(state, viewer)
  const active = state.players.filter((player) => !player.is_bankrupt).length

  return (
    <section className={styles.panel} aria-label="Gracze">
      <header className={styles.header}>
        {inTabs ? (
          <p className={styles.subtitle}>W grze: {countOf(active, WORDS.player)}</p>
        ) : (
          <h2 className={styles.title}>Gracze</h2>
        )}
        <Button
          size="sm"
          icon={<ArrowLeftRight />}
          disabled={!tradeAllowed}
          onClick={() => openTrade()}
          title={tradeAllowed ? undefined : 'Wymianę można zaproponować w swojej turze.'}
        >
          Wymiana
        </Button>
      </header>
      <ul className={styles.list}>
        {state.players.map((player) => (
          <li key={player.id}>
            <PlayerCard player={player} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function PlayerCard({ player }: { player: PlayerState }) {
  const { state, viewer, me, openRename, openTrade } = useGame()
  const isCurrent = player.id === state.current_player_id && !state.game_over_reason
  const holdings = groupHoldings(state.board, player.id)
  const canRename = player.is_human && canAdminister(state, viewer)
  const canTrade = canProposeTrade(state, viewer) && player.id !== state.current_player_id && !player.is_bankrupt

  return (
    <article
      className={cx(styles.card, isCurrent && styles.current, player.is_bankrupt && styles.bankrupt)}
      style={cssVars({ player: safeColor(player.color) })}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <PlayerToken playerId={player.id} color={player.color} size={40} muted={player.is_bankrupt} />
      <div className={styles.main}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{player.name}</h3>
          {me?.id === player.id && <span className={styles.you}>Ty</span>}
          {!player.is_human && (
            <span className={styles.bot}>
              <Bot aria-hidden="true" />
              Bot
            </span>
          )}
        </div>
        <Money value={player.money} />
        {holdings.length > 0 && <Holdings holdings={holdings} />}
        <Status player={player} isCurrent={isCurrent} />
      </div>
      {(canRename || canTrade) && (
        <div className={styles.actions}>
          {canTrade && (
            <IconButton
              size="sm"
              label={`Zaproponuj wymianę: ${player.name}`}
              icon={<ArrowLeftRight />}
              onClick={() => openTrade(player.id)}
            />
          )}
          {canRename && (
            <IconButton
              size="sm"
              label={`Zmień nazwę: ${player.name}`}
              icon={<Pencil />}
              onClick={() => openRename(player.id)}
            />
          )}
        </div>
      )}
    </article>
  )
}

function Money({ value }: { value: number }) {
  const [tracked, setTracked] = useState({ value, delta: 0, key: 0 })
  if (tracked.value !== value) {
    setTracked({ value, delta: value - tracked.value, key: tracked.key + 1 })
  }

  return (
    <p className={styles.moneyRow}>
      <span className={cx(styles.money, value < 0 && styles.negative)}>{formatMoney(value)}</span>
      {tracked.delta !== 0 && (
        <span key={tracked.key} className={cx(styles.delta, tracked.delta > 0 ? styles.gain : styles.loss)}>
          {formatDelta(tracked.delta)}
        </span>
      )}
    </p>
  )
}

function Holdings({ holdings }: { holdings: GroupHolding[] }) {
  return (
    <div className={styles.holdings}>
      {holdings.map((holding) => (
        <span
          key={holding.group}
          className={cx(styles.set, isColorGroup(holding.group) && holding.owned === holding.total && styles.complete)}
          style={cssVars({ set: GROUP_COLORS[holding.group] })}
          title={`${GROUP_NAMES[holding.group]}: ${holding.owned} z ${holding.total}`}
        >
          {Array.from({ length: holding.total }, (_, index) => (
            <span key={index} className={cx(styles.cell, index < holding.owned && styles.filled)} />
          ))}
        </span>
      ))}
    </div>
  )
}

function Status({ player, isCurrent }: { player: PlayerState; isCurrent: boolean }) {
  const chips = []
  if (player.is_bankrupt) {
    chips.push(
      <span key="bankrupt" className={cx(styles.chip, styles.chipDanger)}>
        Bankrut
      </span>,
    )
  } else {
    if (isCurrent) {
      chips.push(
        <span key="turn" className={cx(styles.chip, styles.chipAccent)}>
          <span className={styles.pulse} aria-hidden="true" />
          Teraz gra
        </span>,
      )
    }
    if (player.in_jail) {
      chips.push(
        <span key="jail" className={cx(styles.chip, styles.chipWarning)}>
          <Lock aria-hidden="true" />W więzieniu
        </span>,
      )
    }
  }
  if (player.get_out_of_jail_cards > 0) {
    chips.push(
      <span key="cards" className={styles.chip} title="Karty wyjścia z więzienia">
        <KeyRound aria-hidden="true" />
        {countOf(player.get_out_of_jail_cards, WORDS.card)}
      </span>,
    )
  }
  return chips.length > 0 ? <div className={styles.status}>{chips}</div> : null
}
