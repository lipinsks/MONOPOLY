import type { TileState } from '../../api/types'
import { groupColor } from '../../lib/board'
import { cssVars, cx } from '../../lib/css'
import styles from './TileChip.module.css'

export function TileChip({ tile, className }: { tile: TileState; className?: string }) {
  return (
    <span className={cx(styles.chip, className)} style={cssVars({ band: groupColor(tile.group) })}>
      <span className={styles.band} aria-hidden="true" />
      <span className={styles.name}>{tile.name}</span>
      {tile.is_mortgaged && <span className={styles.flag}>zastaw</span>}
    </span>
  )
}
