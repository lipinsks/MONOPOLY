import { ArrowLeftRight, ArrowRight, Check, KeyRound, LoaderCircle, X } from 'lucide-react'
import type { TileState } from '../../../api/types'
import { PlayerToken } from '../../../components/PlayerToken'
import { Button } from '../../../components/ui/Button'
import { cx } from '../../../lib/css'
import { countOf, formatMoney, WORDS } from '../../../lib/format'
import { canRespondToTrade } from '../../../lib/permissions'
import { useGame } from '../GameContext'
import { TileChip } from '../TileChip'
import styles from './TradeOfferPanel.module.css'

export function TradeOfferPanel({ floating = false }: { floating?: boolean }) {
  const { state, viewer, run, pending, playerById } = useGame()
  const trade = state.active_trade
  if (!trade) return null

  const from = playerById(trade.from_id)
  const to = playerById(trade.to_id)
  const respond = canRespondToTrade(state, viewer)
  const condensed = floating && !respond
  const tilesFor = (ids: number[]) =>
    ids.map((id) => state.board[id]).filter((tile): tile is TileState => Boolean(tile))

  return (
    <section
      className={cx(
        styles.panel,
        floating && styles.floating,
        condensed && styles.condensed,
        respond && styles.actionable,
      )}
      aria-label="Oferta wymiany"
      aria-live="polite"
    >
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <ArrowLeftRight />
        </span>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>{respond ? 'Masz ofertę wymiany' : 'Trwa wymiana'}</p>
          <p className={styles.parties}>
            {from && <PlayerToken playerId={from.id} color={from.color} size={20} />}
            <span>{trade.from}</span>
            <ArrowRight className={styles.arrow} aria-hidden="true" />
            {to && <PlayerToken playerId={to.id} color={to.color} size={20} />}
            <span>{trade.to}</span>
          </p>
        </div>
      </header>

      {!condensed && (
        <div className={styles.sides}>
          <TradeSide
            title={respond ? 'Otrzymujesz' : `${trade.to} dostaje`}
            tiles={tilesFor(trade.offer_tile_ids)}
            money={trade.offer_money}
            cards={trade.offer_cards}
          />
          <TradeSide
            title={respond ? 'Oddajesz' : `${trade.to} oddaje`}
            tiles={tilesFor(trade.request_tile_ids)}
            money={trade.request_money}
            cards={trade.request_cards}
          />
        </div>
      )}

      {respond ? (
        <div className={styles.actions}>
          <Button
            icon={<X />}
            loading={pending === 'RESPOND_TRADE:false'}
            disabled={pending !== null}
            onClick={() => run({ action: 'RESPOND_TRADE', accept: false })}
          >
            Odrzuć
          </Button>
          <Button
            variant="positive"
            icon={<Check />}
            loading={pending === 'RESPOND_TRADE:true'}
            disabled={pending !== null}
            onClick={() => run({ action: 'RESPOND_TRADE', accept: true })}
          >
            Akceptuj
          </Button>
        </div>
      ) : (
        <p className={styles.waiting}>
          <LoaderCircle className={styles.spinner} aria-hidden="true" />
          Czekamy na decyzję gracza {trade.to}
        </p>
      )}
    </section>
  )
}

interface TradeSideProps {
  title: string
  tiles: TileState[]
  money: number
  cards: number
}

function TradeSide({ title, tiles, money, cards }: TradeSideProps) {
  const empty = tiles.length === 0 && money <= 0 && cards <= 0
  return (
    <div className={styles.side}>
      <p className={styles.sideTitle}>{title}</p>
      {empty ? (
        <p className={styles.nothing}>Nic</p>
      ) : (
        <ul className={styles.items}>
          {tiles.map((tile) => (
            <li key={tile.id}>
              <TileChip tile={tile} />
            </li>
          ))}
          {money > 0 && <li className={styles.money}>{formatMoney(money)}</li>}
          {cards > 0 && (
            <li className={styles.cards}>
              <KeyRound aria-hidden="true" />
              {countOf(cards, WORDS.card)} wyjścia z więzienia
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
