import { ChevronDown, Eye, LogOut, Settings } from 'lucide-react'
import { navigate } from '../../app/router'
import { LogoMark } from '../../components/Logo'
import { PlayerToken } from '../../components/PlayerToken'
import { Button, IconButton } from '../../components/ui/Button'
import { useGame } from './GameContext'
import styles from './TopBar.module.css'

interface TopBarProps {
  compact: boolean
  onOpenSettings: () => void
  onOpenRole: () => void
}

export function TopBar({ compact, onOpenSettings, onOpenRole }: TopBarProps) {
  const { state, me } = useGame()
  const turn = Math.min(state.turns + 1, state.max_turns)

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <LogoMark />
        <div className={styles.room}>
          <p className={styles.roomName}>{state.room_name}</p>
          <p className={styles.meta}>
            Tura {turn} z {state.max_turns}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.role} onClick={onOpenRole} aria-label="Zmień, kim grasz">
          {me ? (
            <PlayerToken playerId={me.id} color={me.color} size={26} />
          ) : (
            <span className={styles.spectator} aria-hidden="true">
              <Eye />
            </span>
          )}
          <span className={styles.roleText}>
            {!compact && <span className={styles.roleLabel}>Grasz jako</span>}
            <span className={styles.roleName}>{me?.name ?? 'Widz'}</span>
          </span>
          <ChevronDown className={styles.chevron} aria-hidden="true" />
        </button>
        <IconButton label="Ustawienia" icon={<Settings />} onClick={onOpenSettings} />
        {compact ? (
          <IconButton label="Wróć do lobby" icon={<LogOut />} onClick={() => navigate({ name: 'lobby' })} />
        ) : (
          <Button variant="ghost" icon={<LogOut />} onClick={() => navigate({ name: 'lobby' })}>
            Lobby
          </Button>
        )}
      </div>
    </header>
  )
}
