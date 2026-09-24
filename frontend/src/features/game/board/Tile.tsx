import {
  ArrowBigLeft,
  CircleParking,
  Droplets,
  Gem,
  Lightbulb,
  Package,
  Receipt,
  Siren,
  TrainFront,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { PlayerState, TileState } from '../../../api/types'
import { safeColor } from '../../../lib/color'
import { cssVars, cx } from '../../../lib/css'
import { compactTileName, groupColor, isCorner, tileCell, tileSide } from '../../../lib/board'
import { countOf, formatMoney, WORDS } from '../../../lib/format'
import styles from './Tile.module.css'

interface TileProps {
  tile: TileState
  owner: PlayerState | null
  compact: boolean
  highlighted: boolean
  onSelect: (tileId: number) => void
}

function describeTile(tile: TileState, owner: PlayerState | null): string {
  const parts = [tile.name]
  if (tile.price !== null) parts.push(`cena ${formatMoney(tile.price)}`)
  if (owner) parts.push(`właściciel ${owner.name}`)
  if (tile.houses === 5) parts.push('hotel')
  else if (tile.houses > 0) parts.push(countOf(tile.houses, WORDS.house))
  if (tile.is_mortgaged) parts.push('zastawiona')
  return parts.join(', ')
}

function TileGlyph({ tile }: { tile: TileState }) {
  switch (tile.type) {
    case 'railroad':
      return <TrainFront className={styles.glyph} aria-hidden="true" />
    case 'utility':
      return /wod/i.test(tile.name) ? (
        <Droplets className={cx(styles.glyph, styles.water)} aria-hidden="true" />
      ) : (
        <Lightbulb className={cx(styles.glyph, styles.power)} aria-hidden="true" />
      )
    case 'chance':
      return (
        <span className={styles.question} aria-hidden="true">
          ?
        </span>
      )
    case 'chest':
      return <Package className={cx(styles.glyph, styles.chest)} aria-hidden="true" />
    case 'tax':
      return /luksus/i.test(tile.name) ? (
        <Gem className={cx(styles.glyph, styles.tax)} aria-hidden="true" />
      ) : (
        <Receipt className={cx(styles.glyph, styles.tax)} aria-hidden="true" />
      )
    default:
      return null
  }
}

function Buildings({ count }: { count: number }) {
  if (count <= 0) return null
  if (count >= 5) {
    return (
      <svg className={styles.hotel} viewBox="0 0 20 11" aria-hidden="true">
        <path d="M1 3.2 3.2 1h13.6L19 3.2V10H1z" />
      </svg>
    )
  }
  return Array.from({ length: count }, (_, index) => (
    <svg key={index} className={styles.house} viewBox="0 0 11 11" aria-hidden="true">
      <path d="M1 4.8 5.5 1 10 4.8V10H1z" />
    </svg>
  ))
}

function footerFor(tile: TileState): string | null {
  if (tile.price !== null) return formatMoney(tile.price)
  if (tile.type === 'tax' && tile.amount !== null) return formatMoney(tile.amount)
  return null
}

export function Tile({ tile, owner, compact, highlighted, onSelect }: TileProps) {
  const { row, column } = tileCell(tile.id)
  const style: CSSProperties = {
    gridRow: row,
    gridColumn: column,
    ...cssVars({
      band: tile.type === 'property' ? groupColor(tile.group) : null,
      owner: owner ? safeColor(owner.color) : null,
    }),
  }

  if (isCorner(tile.id)) {
    return (
      <button
        type="button"
        className={cx(styles.tile, styles.corner, compact && styles.compact)}
        style={style}
        onClick={() => onSelect(tile.id)}
        aria-label={tile.name}
      >
        <CornerContent tile={tile} compact={compact} />
      </button>
    )
  }

  const side = tileSide(tile.id)
  const footer = footerFor(tile)
  const showName = !compact || tile.type === 'property'
  const narrow = side === 'bottom' || side === 'top'

  return (
    <button
      type="button"
      className={cx(
        styles.tile,
        styles[side],
        compact && styles.compact,
        owner && styles.owned,
        tile.is_mortgaged && styles.mortgaged,
        highlighted && styles.highlighted,
      )}
      style={style}
      onClick={() => onSelect(tile.id)}
      aria-label={describeTile(tile, owner)}
    >
      {tile.type === 'property' && (
        <span className={styles.band}>
          <Buildings count={tile.houses} />
        </span>
      )}
      <span className={styles.body}>
        {showName && <span className={styles.name}>{compact ? compactTileName(tile.name, narrow) : tile.name}</span>}
        <TileGlyph tile={tile} />
        {footer && <span className={styles.price}>{footer}</span>}
      </span>
      {owner && <span className={styles.ownerMark} />}
    </button>
  )
}

function CornerContent({ tile, compact }: { tile: TileState; compact: boolean }): ReactNode {
  switch (tile.type) {
    case 'start':
      return (
        <span className={styles.start}>
          {!compact && <span className={styles.cornerCaption}>Pobierasz $200 za przejście</span>}
          <span className={styles.startLabel}>{tile.name}</span>
          <ArrowBigLeft className={styles.startArrow} aria-hidden="true" />
        </span>
      )
    case 'jail':
      return (
        <>
          <span className={styles.jailCell}>
            <span className={styles.jailLabel}>{tile.name}</span>
          </span>
          <span className={styles.visiting}>Tylko odwiedziny</span>
        </>
      )
    case 'free_parking':
      return (
        <span className={styles.cornerStack}>
          <CircleParking className={cx(styles.cornerIcon, styles.parking)} aria-hidden="true" />
          <span className={styles.cornerLabel}>{tile.name}</span>
        </span>
      )
    case 'go_to_jail':
      return (
        <span className={styles.cornerStack}>
          <Siren className={cx(styles.cornerIcon, styles.police)} aria-hidden="true" />
          <span className={styles.cornerLabel}>{tile.name}</span>
        </span>
      )
    default:
      return <span className={styles.cornerLabel}>{tile.name}</span>
  }
}
