import { KeyRound, Minus, Plus, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import type { PlayerState, TileState } from '../../../api/types'
import { PlayerToken } from '../../../components/PlayerToken'
import { Button, IconButton } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Field, TextInput } from '../../../components/ui/Field'
import { useToast } from '../../../components/ui/toast-context'
import { cx } from '../../../lib/css'
import { formatMoney } from '../../../lib/format'
import { tradableTiles } from '../../../lib/rules'
import { useGame } from '../GameContext'
import { TileChip } from '../TileChip'
import styles from './TradeDialog.module.css'

interface TradeDialogProps {
  open: boolean
  initialTargetId: number | null
  onClose: () => void
}

export function TradeDialog({ open, initialTargetId, onClose }: TradeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nowa oferta wymiany"
      description="Zaznacz, co oddajesz i czego oczekujesz. Druga strona może przyjąć albo odrzucić ofertę."
      size="lg"
      bodyClassName={styles.body}
    >
      <TradeForm initialTargetId={initialTargetId} onDone={onClose} />
    </Dialog>
  )
}

interface OfferDraft {
  tiles: number[]
  money: string
  cards: number
}

const EMPTY_DRAFT: OfferDraft = { tiles: [], money: '', cards: 0 }

function parseAmount(value: string): number {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0
}

function TradeForm({ initialTargetId, onDone }: { initialTargetId: number | null; onDone: () => void }) {
  const { state, current, run, pending } = useGame()
  const toast = useToast()
  const partners = state.players.filter((player) => player.id !== current.id && !player.is_bankrupt)
  const [targetId, setTargetId] = useState(
    () => partners.find((player) => player.id === initialTargetId)?.id ?? partners[0]?.id ?? null,
  )
  const [give, setGive] = useState<OfferDraft>(EMPTY_DRAFT)
  const [take, setTake] = useState<OfferDraft>(EMPTY_DRAFT)

  const target = partners.find((player) => player.id === targetId) ?? null
  const myTiles = tradableTiles(state.board, current.id)
  const theirTiles = target ? tradableTiles(state.board, target.id) : []

  const offerTileIds = give.tiles.filter((id) => myTiles.some((tile) => tile.id === id))
  const requestTileIds = take.tiles.filter((id) => theirTiles.some((tile) => tile.id === id))
  const offerMoney = parseAmount(give.money)
  const requestMoney = parseAmount(take.money)
  const offerCards = Math.min(give.cards, current.get_out_of_jail_cards)
  const requestCards = target ? Math.min(take.cards, target.get_out_of_jail_cards) : 0

  const giveMoneyError = offerMoney > current.money ? `Masz tylko ${formatMoney(current.money)}.` : null
  const takeMoneyError =
    target && requestMoney > target.money ? `${target.name} ma tylko ${formatMoney(target.money)}.` : null
  const isEmpty =
    offerTileIds.length + requestTileIds.length === 0 &&
    offerMoney + requestMoney === 0 &&
    offerCards + requestCards === 0
  const canSend = target !== null && !isEmpty && !giveMoneyError && !takeMoneyError

  const selectTarget = (playerId: number) => {
    setTargetId(playerId)
    setTake(EMPTY_DRAFT)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend || !target) return
    const sent = await run({
      action: 'PROPOSE_TRADE',
      from_player: current.name,
      target_player: target.name,
      offer_tile_ids: offerTileIds,
      request_tile_ids: requestTileIds,
      offer_money: offerMoney,
      request_money: requestMoney,
      offer_cards: offerCards,
      request_cards: requestCards,
    })
    if (sent) {
      toast.success(`Oferta wysłana do gracza ${target.name}.`)
      onDone()
    }
  }

  if (partners.length === 0) {
    return <p className={styles.empty}>Nie ma z kim handlować: wszyscy pozostali gracze zbankrutowali.</p>
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.partners} role="radiogroup" aria-label="Z kim wymieniasz">
        {partners.map((player) => (
          <button
            key={player.id}
            type="button"
            role="radio"
            aria-checked={player.id === targetId}
            className={styles.partner}
            onClick={() => selectTarget(player.id)}
          >
            <PlayerToken playerId={player.id} color={player.color} size={26} />
            <span className={styles.partnerText}>
              <span className={styles.partnerName}>{player.name}</span>
              <span className={styles.partnerMoney}>{formatMoney(player.money)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className={styles.columns}>
        <OfferColumn
          title="Dajesz"
          owner={current}
          tiles={myTiles}
          draft={give}
          onChange={setGive}
          moneyError={giveMoneyError}
          emptyText="Nie masz posiadłości bez budynków."
        />
        {target && (
          <OfferColumn
            title="Chcesz dostać"
            owner={target}
            tiles={theirTiles}
            draft={take}
            onChange={setTake}
            moneyError={takeMoneyError}
            emptyText={`${target.name} nie ma posiadłości, które można wymienić.`}
          />
        )}
      </div>

      <footer className={styles.footer}>
        <p className={styles.hint}>
          {isEmpty ? 'Dodaj do oferty co najmniej jedną rzecz.' : 'Zabudowanych działek nie można wymieniać.'}
        </p>
        <div className={styles.footerActions}>
          <Button onClick={onDone}>Anuluj</Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Send />}
            disabled={!canSend || pending !== null}
            loading={pending === 'PROPOSE_TRADE'}
          >
            Wyślij ofertę
          </Button>
        </div>
      </footer>
    </form>
  )
}

interface OfferColumnProps {
  title: string
  owner: PlayerState
  tiles: TileState[]
  draft: OfferDraft
  onChange: (draft: OfferDraft) => void
  moneyError: string | null
  emptyText: string
}

function OfferColumn({ title, owner, tiles, draft, onChange, moneyError, emptyText }: OfferColumnProps) {
  const moneyId = useId()
  const toggleTile = (tileId: number) =>
    onChange({
      ...draft,
      tiles: draft.tiles.includes(tileId) ? draft.tiles.filter((id) => id !== tileId) : [...draft.tiles, tileId],
    })

  return (
    <section className={styles.column} aria-label={`${title}: ${owner.name}`}>
      <header className={styles.columnHeader}>
        <p className={styles.columnTitle}>{title}</p>
        <p className={styles.columnOwner}>
          <PlayerToken playerId={owner.id} color={owner.color} size={18} />
          {owner.name}
        </p>
      </header>

      {tiles.length === 0 ? (
        <p className={styles.noTiles}>{emptyText}</p>
      ) : (
        <ul className={styles.tiles}>
          {tiles.map((tile) => {
            const checked = draft.tiles.includes(tile.id)
            return (
              <li key={tile.id}>
                <label className={cx(styles.tileOption, checked && styles.tileChecked)}>
                  <input type="checkbox" checked={checked} onChange={() => toggleTile(tile.id)} />
                  <TileChip tile={tile} />
                  <span className={styles.tilePrice}>{formatMoney(tile.price ?? 0)}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <Field label="Gotówka" htmlFor={moneyId} error={moneyError}>
        <TextInput
          id={moneyId}
          prefix="$"
          inputMode="numeric"
          placeholder="0"
          value={draft.money}
          invalid={Boolean(moneyError)}
          onChange={(event) => onChange({ ...draft, money: event.target.value.replace(/\D/g, '').slice(0, 6) })}
        />
      </Field>

      {owner.get_out_of_jail_cards > 0 && (
        <div className={styles.cards}>
          <span className={styles.cardsLabel}>
            <KeyRound aria-hidden="true" />
            Karty wyjścia z więzienia
          </span>
          <span className={styles.stepper}>
            <IconButton
              size="sm"
              variant="secondary"
              label="Mniej kart"
              icon={<Minus />}
              disabled={draft.cards <= 0}
              onClick={() => onChange({ ...draft, cards: draft.cards - 1 })}
            />
            <output className={styles.stepperValue}>{draft.cards}</output>
            <IconButton
              size="sm"
              variant="secondary"
              label="Więcej kart"
              icon={<Plus />}
              disabled={draft.cards >= owner.get_out_of_jail_cards}
              onClick={() => onChange({ ...draft, cards: draft.cards + 1 })}
            />
          </span>
        </div>
      )}
    </section>
  )
}
