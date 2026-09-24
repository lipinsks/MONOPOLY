import { ArrowLeftRight, ArrowRight, BadgeDollarSign, Dices, HandCoins, KeyRound, Lock, Trophy } from 'lucide-react'
import type { GameState, PlayerState, TileState } from '../../api/types'
import { DicePair } from '../../components/Dice'
import { PlayerToken } from '../../components/PlayerToken'
import { Button } from '../../components/ui/Button'
import { groupColor } from '../../lib/board'
import { cssVars, cx } from '../../lib/css'
import { countOf, formatMoney, WORDS } from '../../lib/format'
import { canControlTurn, canRespondToTrade } from '../../lib/permissions'
import { DrawnCard } from './DrawnCard'
import { useGame } from './GameContext'
import styles from './TurnPanel.module.css'

const JAIL_FEE = 50

type TurnStep = 'roll' | 'jail' | 'buy' | 'end'

type TurnView =
  { kind: 'over' } | { kind: 'moving' } | { kind: 'trade' } | { kind: 'watch' } | { kind: 'act'; step: TurnStep }

function resolveView(state: GameState, current: PlayerState, controlling: boolean, moving: boolean): TurnView {
  if (state.game_over_reason) return { kind: 'over' }
  if (moving) return { kind: 'moving' }
  if (state.active_trade) return { kind: 'trade' }
  if (!controlling) return { kind: 'watch' }
  if (state.human_action === 'BUY') return { kind: 'act', step: 'buy' }
  if (state.human_action === 'ACKNOWLEDGE') return { kind: 'act', step: 'end' }
  return { kind: 'act', step: current.in_jail ? 'jail' : 'roll' }
}

interface TurnPanelProps {
  variant: 'card' | 'dock'
}

export function TurnPanel({ variant }: TurnPanelProps) {
  const { state, viewer, current, me, pawnsMoving } = useGame()
  const view = resolveView(state, current, canControlTurn(state, viewer), pawnsMoving)
  const winner = state.winner ? (state.players.find((player) => player.name === state.winner) ?? null) : null
  const featured = view.kind === 'over' && winner ? winner : current
  const dock = variant === 'dock'

  const eyebrow =
    view.kind === 'over'
      ? 'Koniec gry'
      : me?.id === current.id
        ? 'Twój ruch'
        : current.is_human
          ? 'Ruch gracza'
          : 'Ruch bota'

  const title = view.kind === 'over' ? (winner ? `Wygrywa ${winner.name}` : 'Limit tur osiągnięty') : current.name

  return (
    <section className={cx(styles.panel, styles[variant])} aria-label="Przebieg tury">
      <header className={styles.header}>
        <PlayerToken playerId={featured.id} color={featured.color} size={dock ? 34 : 42} />
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.title}>{title}</h2>
        </div>
        {state.turn_dice && view.kind !== 'over' && (
          <DicePair dice={state.turn_dice} rollKey={state.roll_count} size={dock ? 30 : 40} />
        )}
      </header>
      <TurnBody view={view} dock={dock} />
    </section>
  )
}

function TurnBody({ view, dock }: { view: TurnView; dock: boolean }) {
  const { state, current } = useGame()
  const card =
    state.turn_card && view.kind !== 'over' ? (
      <DrawnCard deck={state.turn_card_type} text={state.turn_card} compact={dock} />
    ) : null

  switch (view.kind) {
    case 'over':
      return <GameOverBody />
    case 'moving':
      return (
        <>
          {card}
          <p className={cx(styles.message, styles.muted)}>Pionek w drodze…</p>
        </>
      )
    case 'trade':
      return <TradeStatus />
    case 'watch':
      return (
        <>
          {card}
          <p className={styles.message}>{state.latest_log}</p>
          {current.is_human ? (
            <p className={styles.note}>Czekamy na ruch gracza {current.name}.</p>
          ) : (
            <p className={styles.thinking}>
              <span className={styles.dots} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              Bot planuje ruch
            </p>
          )}
        </>
      )
    case 'act':
      return (
        <>
          {card}
          {!(dock && view.step === 'buy') && (
            <p className={styles.message}>{state.turn_message.trim() || state.latest_log}</p>
          )}
          {(view.step === 'roll' || view.step === 'jail') && state.latest_log && (
            <p className={styles.note}>Ostatnio: {state.latest_log}</p>
          )}
          <StepActions step={view.step} dock={dock} />
        </>
      )
  }
}

function StepActions({ step, dock }: { step: TurnStep; dock: boolean }) {
  const { state, current, run, pending, openTile } = useGame()
  const busy = pending !== null
  const size = dock ? 'md' : 'lg'

  if (step === 'roll') {
    return (
      <div className={styles.actions}>
        <Button
          variant="primary"
          size={size}
          block
          icon={<Dices />}
          loading={pending === 'ROLL'}
          disabled={busy}
          onClick={() => run({ action: 'ROLL' })}
        >
          Rzuć kośćmi
        </Button>
      </div>
    )
  }

  if (step === 'jail') {
    return (
      <>
        <p className={styles.jail}>
          <Lock aria-hidden="true" />W więzieniu, próba {Math.min(current.jail_turns + 1, 3)} z 3
        </p>
        <div className={styles.actions}>
          <Button
            variant="primary"
            size={size}
            icon={<Dices />}
            loading={pending === 'JAIL_ROLL'}
            disabled={busy}
            onClick={() => run({ action: 'JAIL_ROLL' })}
          >
            Rzuć o dublet
          </Button>
          <Button
            size={size}
            icon={<BadgeDollarSign />}
            loading={pending === 'JAIL_PAY'}
            disabled={busy || current.money < JAIL_FEE}
            onClick={() => run({ action: 'JAIL_PAY' })}
          >
            Zapłać {formatMoney(JAIL_FEE)}
          </Button>
          {current.get_out_of_jail_cards > 0 && (
            <Button
              size={size}
              icon={<KeyRound />}
              loading={pending === 'JAIL_CARD'}
              disabled={busy}
              onClick={() => run({ action: 'JAIL_CARD' })}
            >
              Użyj karty
            </Button>
          )}
        </div>
      </>
    )
  }

  if (step === 'buy') {
    const tile = state.board[state.buy_tile_id ?? current.position]
    const price = tile.price ?? 0
    const shortfall = price - current.money
    return (
      <>
        <BuyOffer tile={tile} onOpen={() => openTile(tile.id)} />
        <div className={styles.actions}>
          <Button
            variant="positive"
            size={size}
            icon={<HandCoins />}
            loading={pending === 'BUY'}
            disabled={busy || shortfall > 0}
            onClick={() => run({ action: 'BUY' })}
          >
            Kup za {formatMoney(price)}
          </Button>
          <Button size={size} loading={pending === 'PASS'} disabled={busy} onClick={() => run({ action: 'PASS' })}>
            Nie kupuję
          </Button>
        </div>
        {shortfall > 0 && (
          <p className={styles.note}>
            Brakuje Ci {formatMoney(shortfall)}. Możesz zastawić posiadłości i wrócić do zakupu.
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <div className={styles.actions}>
        <Button
          variant="primary"
          size={size}
          block
          trailingIcon={<ArrowRight />}
          loading={pending === 'ACKNOWLEDGE'}
          disabled={busy}
          onClick={() => run({ action: 'ACKNOWLEDGE' })}
        >
          {state.extra_turn ? 'Dalej' : 'Zakończ turę'}
        </Button>
      </div>
      {state.extra_turn && <p className={styles.note}>Dublet! Po tym kroku rzucasz jeszcze raz.</p>}
    </>
  )
}

function rentSummary(tile: TileState): string {
  if (tile.type === 'utility') return 'Czynsz 4× lub 10× suma oczek'
  const base = tile.rents?.[0]
  return base === undefined ? '' : `Czynsz od ${formatMoney(base)}`
}

function BuyOffer({ tile, onOpen }: { tile: TileState; onOpen: () => void }) {
  return (
    <button type="button" className={styles.offer} onClick={onOpen} style={cssVars({ band: groupColor(tile.group) })}>
      <span className={styles.offerBand} aria-hidden="true" />
      <span className={styles.offerText}>
        <span className={styles.offerName}>{tile.name}</span>
        <span className={styles.offerMeta}>{rentSummary(tile)} · szczegóły</span>
      </span>
      <span className={styles.offerPrice}>{formatMoney(tile.price ?? 0)}</span>
    </button>
  )
}

function TradeStatus() {
  const { state, viewer, me } = useGame()
  const trade = state.active_trade
  if (!trade) return null
  const text = canRespondToTrade(state, viewer)
    ? `${trade.from} proponuje Ci wymianę. Odpowiedz w oknie oferty.`
    : me && trade.from_id === me.id
      ? `Czekasz na odpowiedź gracza ${trade.to}.`
      : `${trade.from} negocjuje wymianę z graczem ${trade.to}.`
  return (
    <div className={styles.withIcon}>
      <ArrowLeftRight aria-hidden="true" />
      <p className={styles.message}>{text}</p>
    </div>
  )
}

function GameOverBody() {
  const { state, openSummary } = useGame()
  return (
    <>
      <p className={styles.message}>
        {state.winner
          ? 'Pozostali gracze zbankrutowali.'
          : `Rozegrano ${countOf(state.max_turns, WORDS.turn)}. Wygrywa gracz z największym majątkiem.`}
      </p>
      <div className={styles.actions}>
        <Button icon={<Trophy />} onClick={openSummary}>
          Podsumowanie
        </Button>
      </div>
    </>
  )
}
