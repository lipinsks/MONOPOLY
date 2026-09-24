import type { PlayerState, TileState } from '../../../api/types'
import { PlayerToken } from '../../../components/PlayerToken'
import { Dialog } from '../../../components/ui/Dialog'
import { isOwnable } from '../../../lib/board'
import { countOf, formatMoney, WORDS } from '../../../lib/format'
import { canManageProperties } from '../../../lib/permissions'
import { useGame } from '../GameContext'
import { PropertyActions } from '../PropertyActions'
import { DeedCard } from './DeedCard'
import styles from './DeedDialog.module.css'

interface DeedDialogProps {
  tileId: number | null
  onClose: () => void
}

function statusText(tile: TileState, owner: PlayerState | null): string {
  if (!isOwnable(tile)) return ''
  if (!owner) return `Wolne pole do kupienia za ${formatMoney(tile.price ?? 0)}`
  const extras = []
  if (tile.houses === 5) extras.push('Stoi hotel')
  else if (tile.houses > 0) extras.push(`Zabudowa: ${countOf(tile.houses, WORDS.house)}`)
  if (tile.is_mortgaged) extras.push('Pole zastawione')
  return extras.join(' · ')
}

export function DeedDialog({ tileId, onClose }: DeedDialogProps) {
  const { state, viewer, playerById } = useGame()
  const tile = tileId === null ? null : (state.board[tileId] ?? null)
  const owner = tile ? playerById(tile.owner_id) : null
  const manageable = owner !== null && canManageProperties(state, viewer, owner)

  return (
    <Dialog
      open={tile !== null}
      onClose={onClose}
      title={tile?.name}
      description={tile ? statusText(tile, owner) || undefined : undefined}
      size="sm"
    >
      {tile && (
        <div className={styles.content}>
          <DeedCard tile={tile} board={state.board} />
          {owner && (
            <div className={styles.owner}>
              <PlayerToken playerId={owner.id} color={owner.color} size={28} />
              <span className={styles.ownerText}>
                <span className={styles.ownerLabel}>Właściciel</span>
                <span className={styles.ownerName}>{owner.name}</span>
              </span>
            </div>
          )}
          {owner && manageable && <PropertyActions tile={tile} owner={owner} size="md" />}
        </div>
      )}
    </Dialog>
  )
}
