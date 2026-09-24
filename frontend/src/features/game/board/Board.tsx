import type { ReactNode } from 'react'
import { cssVars } from '../../../lib/css'
import { useGame } from '../GameContext'
import styles from './Board.module.css'
import { PawnLayer } from './Pawns'
import { Tile } from './Tile'

const COMPACT_BELOW = 620

interface BoardProps {
  size: number
  children: ReactNode
  onMotionChange: (playerId: number, moving: boolean) => void
}

export function Board({ size, children, onMotionChange }: BoardProps) {
  const { state, openTile, playerById } = useGame()
  const compact = size < COMPACT_BELOW
  const buyTileId = state.human_action === 'BUY' ? state.buy_tile_id : null
  const diceSum = state.turn_dice ? state.turn_dice[0] + state.turn_dice[1] : null

  return (
    <div className={styles.board} style={cssVars({ 'board-size': `${size}px` })}>
      {state.board.map((tile) => (
        <Tile
          key={tile.id}
          tile={tile}
          owner={playerById(tile.owner_id)}
          compact={compact}
          highlighted={tile.id === buyTileId}
          onSelect={openTile}
        />
      ))}
      <div className={styles.center}>{children}</div>
      <PawnLayer
        players={state.players}
        board={state.board}
        currentId={state.current_player_id}
        diceSum={diceSum}
        detailed={!compact}
        onMotionChange={onMotionChange}
      />
    </div>
  )
}
