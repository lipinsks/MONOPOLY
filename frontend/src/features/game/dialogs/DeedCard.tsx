import {
  ArrowBigLeft,
  CircleParking,
  Droplets,
  Gem,
  Lightbulb,
  Lock,
  Package,
  Receipt,
  Siren,
  TrainFront,
  type LucideIcon,
} from 'lucide-react'
import { createElement } from 'react'
import type { TileState } from '../../../api/types'
import { groupColor } from '../../../lib/board'
import { readableOn } from '../../../lib/color'
import { cssVars, cx } from '../../../lib/css'
import { formatMoney } from '../../../lib/format'
import { currentRent } from '../../../lib/rules'
import styles from './DeedCard.module.css'

interface DeedCardProps {
  tile: TileState
  board: TileState[]
}

export function DeedCard({ tile, board }: DeedCardProps) {
  switch (tile.type) {
    case 'property':
      return <PropertyDeed tile={tile} board={board} />
    case 'railroad':
      return <RailroadDeed tile={tile} board={board} />
    case 'utility':
      return <UtilityDeed tile={tile} board={board} />
    default:
      return <InfoCard tile={tile} />
  }
}

interface RentRow {
  label: string
  value: number | undefined
}

function RentTable({ rows, activeIndex, doubled }: { rows: RentRow[]; activeIndex: number; doubled?: boolean }) {
  return (
    <dl className={styles.rents}>
      {rows.map((row, index) => (
        <div key={row.label} className={cx(styles.row, index === activeIndex && styles.active)}>
          <dt>{row.label}</dt>
          <dd>
            {formatMoney(row.value ?? 0)}
            {index === activeIndex && doubled && <span className={styles.doubled}>×2</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Costs({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className={styles.costs}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PropertyDeed({ tile, board }: DeedCardProps) {
  const color = groupColor(tile.group)
  const rents = tile.rents ?? []
  const rent = currentRent(board, tile)
  const activeIndex = tile.owner_id === null || tile.is_mortgaged ? -1 : tile.houses
  const houseCost = formatMoney(tile.house_cost ?? 0)

  return (
    <article className={styles.deed}>
      <header className={styles.header} style={cssVars({ header: color, 'header-ink': readableOn(color, 0.2) })}>
        <span className={styles.kind}>Akt własności</span>
        <h3 className={styles.name}>{tile.name}</h3>
      </header>
      <RentTable
        rows={[
          { label: 'Czynsz', value: rents[0] },
          { label: 'Z 1 domem', value: rents[1] },
          { label: 'Z 2 domami', value: rents[2] },
          { label: 'Z 3 domami', value: rents[3] },
          { label: 'Z 4 domami', value: rents[4] },
          { label: 'Z hotelem', value: rents[5] },
        ]}
        activeIndex={activeIndex}
        doubled={rent?.kind === 'fixed' && rent.doubled}
      />
      <p className={styles.note}>Komplet działek w jednym kolorze podwaja czynsz za niezabudowane pola.</p>
      <Costs
        items={[
          ['Cena działki', formatMoney(tile.price ?? 0)],
          ['Dom', houseCost],
          ['Hotel', `${houseCost} + 4 domy`],
          ['Zastaw', formatMoney(tile.mortgage ?? 0)],
        ]}
      />
    </article>
  )
}

function ownedInGroup(board: TileState[], tile: TileState): number {
  if (tile.owner_id === null) return 0
  return board.filter((other) => other.group === tile.group && other.owner_id === tile.owner_id).length
}

function RailroadDeed({ tile, board }: DeedCardProps) {
  const rents = tile.rents ?? []
  const activeIndex = tile.is_mortgaged ? -1 : ownedInGroup(board, tile) - 1
  return (
    <article className={styles.deed}>
      <header className={cx(styles.header, styles.neutral)}>
        <TrainFront className={styles.headerIcon} aria-hidden="true" />
        <h3 className={styles.name}>{tile.name}</h3>
      </header>
      <RentTable
        rows={[
          { label: 'Czynsz', value: rents[0] },
          { label: 'Gdy masz 2 koleje', value: rents[1] },
          { label: 'Gdy masz 3 koleje', value: rents[2] },
          { label: 'Gdy masz 4 koleje', value: rents[3] },
        ]}
        activeIndex={activeIndex}
      />
      <Costs
        items={[
          ['Cena', formatMoney(tile.price ?? 0)],
          ['Zastaw', formatMoney(tile.mortgage ?? 0)],
        ]}
      />
    </article>
  )
}

function UtilityDeed({ tile, board }: DeedCardProps) {
  const owned = tile.is_mortgaged ? 0 : ownedInGroup(board, tile)
  const Icon = /wod/i.test(tile.name) ? Droplets : Lightbulb
  return (
    <article className={styles.deed}>
      <header className={cx(styles.header, styles.neutral)}>
        {createElement(Icon, { className: styles.headerIcon, 'aria-hidden': true })}
        <h3 className={styles.name}>{tile.name}</h3>
      </header>
      <div className={styles.rules}>
        <p className={cx(styles.rule, owned === 1 && styles.active)}>
          Jeśli właściciel ma jedno przedsiębiorstwo, czynsz to <strong>4× suma oczek</strong> na kościach.
        </p>
        <p className={cx(styles.rule, owned >= 2 && styles.active)}>
          Jeśli ma oba, czynsz to <strong>10× suma oczek</strong>.
        </p>
      </div>
      <Costs
        items={[
          ['Cena', formatMoney(tile.price ?? 0)],
          ['Zastaw', formatMoney(tile.mortgage ?? 0)],
        ]}
      />
    </article>
  )
}

function infoFor(tile: TileState): { icon: LucideIcon; tone: string; text: string } {
  switch (tile.type) {
    case 'start':
      return {
        icon: ArrowBigLeft,
        tone: 'var(--brand)',
        text: 'Za każde przejście przez START dostajesz z banku $200.',
      }
    case 'jail':
      return {
        icon: Lock,
        tone: '#e0862a',
        text: 'Kto tu tylko staje, jest w odwiedzinach. Z więzienia wychodzisz, płacąc $50, używając karty albo wyrzucając dublet (masz na to 3 próby).',
      }
    case 'free_parking':
      return {
        icon: CircleParking,
        tone: 'var(--brand)',
        text: 'Tu nic się nie dzieje. Chwila oddechu przed kolejnym okrążeniem.',
      }
    case 'go_to_jail':
      return {
        icon: Siren,
        tone: '#1f5fb4',
        text: 'Idziesz prosto do więzienia i nie dostajesz $200 za przejście przez START.',
      }
    case 'chance':
      return {
        icon: Package,
        tone: 'var(--chance)',
        text: 'Wyciągasz kartę Szansy. Może przynieść pieniądze albo kłopoty.',
      }
    case 'chest':
      return { icon: Package, tone: 'var(--chest)', text: 'Wyciągasz kartę z Kasy Społecznej.' }
    case 'tax':
      return {
        icon: /luksus/i.test(tile.name) ? Gem : Receipt,
        tone: '#5a3e8c',
        text: `Płacisz bankowi ${formatMoney(tile.amount ?? 0)}.`,
      }
    default:
      return { icon: Package, tone: 'var(--text-muted)', text: '' }
  }
}

function InfoCard({ tile }: { tile: TileState }) {
  const info = infoFor(tile)
  return (
    <article className={styles.info} style={cssVars({ tone: info.tone })}>
      <span className={styles.infoIcon} aria-hidden="true">
        {tile.type === 'chance' ? <span className={styles.question}>?</span> : createElement(info.icon)}
      </span>
      <p className={styles.infoText}>{info.text}</p>
    </article>
  )
}
