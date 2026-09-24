import { Info } from 'lucide-react'
import type { PlayerState, TileState } from '../../../api/types'
import { PlayerToken } from '../../../components/PlayerToken'
import { GROUP_COLORS, GROUP_NAMES, GROUP_ORDER, isColorGroup } from '../../../lib/board'
import { countOf, formatMoney, WORDS } from '../../../lib/format'
import { canManageProperties } from '../../../lib/permissions'
import { currentRent, netWorth, unmortgageCost } from '../../../lib/rules'
import { useGame } from '../GameContext'
import { PropertyActions } from '../PropertyActions'
import styles from './PropertiesPanel.module.css'

interface PropertiesPanelProps {
  ownerId: number | null
  onOwnerChange: (playerId: number) => void
}

export function PropertiesPanel({ ownerId, onOwnerChange }: PropertiesPanelProps) {
  const { state, viewer, me, current } = useGame()
  const owner = state.players.find((player) => player.id === (ownerId ?? me?.id ?? current.id)) ?? current
  const owned = state.board.filter((tile) => tile.owner_id === owner.id)
  const manageable = canManageProperties(state, viewer, owner)
  const groups = GROUP_ORDER.map((group) => ({
    group,
    tiles: owned.filter((tile) => tile.group === group),
    total: state.board.filter((tile) => tile.group === group).length,
  })).filter((entry) => entry.tiles.length > 0)

  return (
    <div className={styles.panel}>
      <div className={styles.picker} role="radiogroup" aria-label="Posiadłości gracza">
        {state.players.map((player) => (
          <button
            key={player.id}
            type="button"
            role="radio"
            aria-checked={player.id === owner.id}
            className={styles.pick}
            onClick={() => onOwnerChange(player.id)}
          >
            <PlayerToken playerId={player.id} color={player.color} size={20} muted={player.is_bankrupt} />
            <span>{player.name}</span>
          </button>
        ))}
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>Gotówka</dt>
          <dd>{formatMoney(owner.money)}</dd>
        </div>
        <div>
          <dt>Majątek</dt>
          <dd>{formatMoney(netWorth(state.board, owner))}</dd>
        </div>
        <div>
          <dt>Karty wyjścia</dt>
          <dd>{owner.get_out_of_jail_cards}</dd>
        </div>
      </dl>

      {manageable ? (
        <p className={styles.hint}>
          <Info aria-hidden="true" />
          Twoja tura: możesz budować, sprzedawać i zastawiać.
        </p>
      ) : (
        me?.id === owner.id &&
        !state.game_over_reason && (
          <p className={styles.hintMuted}>
            <Info aria-hidden="true" />
            Budować i zastawiać możesz w swojej turze.
          </p>
        )
      )}

      {groups.length === 0 ? (
        <p className={styles.empty}>{owner.name} nie ma jeszcze żadnych posiadłości.</p>
      ) : (
        groups.map(({ group, tiles, total }) => (
          <section key={group} className={styles.group}>
            <header className={styles.groupHeader}>
              <span className={styles.swatch} style={{ background: GROUP_COLORS[group] }} aria-hidden="true" />
              <h3 className={styles.groupName}>{GROUP_NAMES[group]}</h3>
              {isColorGroup(group) && tiles.length === total && <span className={styles.complete}>Komplet</span>}
              <span className={styles.groupCount}>
                {tiles.length} z {total}
              </span>
            </header>
            <ul className={styles.rows}>
              {tiles.map((tile) => (
                <li key={tile.id}>
                  <PropertyRow tile={tile} owner={owner} manageable={manageable} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function describeHolding(tile: TileState, board: TileState[]): string {
  if (tile.is_mortgaged) return `Zastawiona, wykup za ${formatMoney(unmortgageCost(tile))}`
  const parts: string[] = []
  if (tile.houses === 5) parts.push('hotel')
  else if (tile.houses > 0) parts.push(countOf(tile.houses, WORDS.house))
  const rent = currentRent(board, tile)
  if (rent?.kind === 'fixed') parts.push(`czynsz ${formatMoney(rent.amount)}${rent.doubled ? ' (komplet)' : ''}`)
  if (rent?.kind === 'dice') parts.push(`czynsz ${rent.multiplier}× suma oczek`)
  const text = parts.join(', ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function PropertyRow({ tile, owner, manageable }: { tile: TileState; owner: PlayerState; manageable: boolean }) {
  const { state, openTile } = useGame()
  return (
    <div className={styles.row}>
      <button type="button" className={styles.rowButton} onClick={() => openTile(tile.id)}>
        <span className={styles.rowName}>{tile.name}</span>
        <span className={styles.rowMeta}>{describeHolding(tile, state.board)}</span>
      </button>
      {manageable && <PropertyActions tile={tile} owner={owner} />}
    </div>
  )
}
