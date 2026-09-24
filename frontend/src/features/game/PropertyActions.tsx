import { BadgeDollarSign, HousePlus, Landmark, Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PlayerState, PropertyActionType, TileState } from '../../api/types'
import { Button, type ButtonSize } from '../../components/ui/Button'
import { cx } from '../../lib/css'
import { formatDelta, formatMoney } from '../../lib/format'
import { groupHasBuildings, propertyActions, type PropertyAction } from '../../lib/rules'
import { useGame } from './GameContext'
import styles from './PropertyActions.module.css'

const ICONS: Record<PropertyActionType, ReactNode> = {
  BUILD: <HousePlus />,
  SELL_HOUSE: <BadgeDollarSign />,
  MORTGAGE: <Landmark />,
  UNMORTGAGE: <Undo2 />,
}

function actionLabel(action: PropertyAction, tile: TileState): string {
  switch (action.type) {
    case 'BUILD':
      return tile.houses === 4 ? 'Postaw hotel' : 'Postaw dom'
    case 'SELL_HOUSE':
      return tile.houses === 5 ? 'Sprzedaj hotel' : 'Sprzedaj dom'
    case 'MORTGAGE':
      return 'Zastaw'
    case 'UNMORTGAGE':
      return 'Wykup z zastawu'
  }
}

function actionAmount(action: PropertyAction): string {
  return action.type === 'SELL_HOUSE' || action.type === 'MORTGAGE'
    ? formatDelta(action.amount)
    : formatMoney(action.amount)
}

interface PropertyActionsProps {
  tile: TileState
  owner: PlayerState
  size?: ButtonSize
  className?: string
}

export function PropertyActions({ tile, owner, size = 'sm', className }: PropertyActionsProps) {
  const { state, run, pending } = useGame()
  const actions = propertyActions(state.board, tile, owner)
  const mortgageBlocked = !tile.is_mortgaged && groupHasBuildings(state.board, tile)

  return (
    <div className={cx(styles.actions, className)}>
      {actions.map((action) => (
        <Button
          key={action.type}
          size={size}
          variant={action.type === 'BUILD' ? 'positive' : 'secondary'}
          icon={ICONS[action.type]}
          loading={pending === `${action.type}:${tile.id}`}
          disabled={pending !== null || !action.affordable}
          title={action.affordable ? undefined : 'Za mało gotówki'}
          onClick={() => run({ action: action.type, tile_id: tile.id })}
        >
          {actionLabel(action, tile)}
          <span className={styles.amount}>{actionAmount(action)}</span>
        </Button>
      ))}
      {mortgageBlocked && tile.houses === 0 && (
        <p className={styles.note}>Zastaw wymaga sprzedaży budynków z całego koloru.</p>
      )}
    </div>
  )
}
