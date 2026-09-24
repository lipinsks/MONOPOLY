import type { PlayerState } from '../../../api/types'
import { safeColor } from '../../../lib/color'
import { cssVars, cx } from '../../../lib/css'
import { useGame } from '../GameContext'
import styles from './HistoryPanel.module.css'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitByPlayers(text: string, players: PlayerState[]): Array<string | PlayerState> {
  const names = players
    .map((player) => player.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  if (names.length === 0) return [text]
  const byName = new Map(players.map((player) => [player.name, player]))
  const pattern = new RegExp(`(${names.map(escapeRegExp).join('|')})`, 'g')
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => byName.get(part) ?? part)
}

export function HistoryPanel() {
  const { state } = useGame()

  if (state.history_logs.length === 0) {
    return <p className={styles.empty}>Nic się jeszcze nie wydarzyło.</p>
  }

  return (
    <ol className={styles.list}>
      {state.history_logs.map((entry, index) => (
        <li key={`${index}:${entry}`} className={cx(styles.entry, index === 0 && styles.latest)}>
          <span className={styles.marker} aria-hidden="true" />
          <p className={styles.text}>
            {splitByPlayers(entry, state.players).map((part, partIndex) =>
              typeof part === 'string' ? (
                part
              ) : (
                <span key={partIndex} className={styles.player} style={cssVars({ player: safeColor(part.color) })}>
                  {part.name}
                </span>
              ),
            )}
          </p>
        </li>
      ))}
    </ol>
  )
}
