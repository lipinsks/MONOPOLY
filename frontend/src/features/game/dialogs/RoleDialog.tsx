import { Check, Eye } from 'lucide-react'
import { PlayerToken } from '../../../components/PlayerToken'
import { Dialog } from '../../../components/ui/Dialog'
import type { StoredRole } from '../../../lib/session'
import { useGame } from '../GameContext'
import styles from './RoleDialog.module.css'

interface RoleDialogProps {
  open: boolean
  required: boolean
  onSelect: (role: StoredRole) => void
  onClose: () => void
}

export function RoleDialog({ open, required, onSelect, onClose }: RoleDialogProps) {
  const { state, viewer } = useGame()
  const humans = state.players.filter((player) => player.is_human)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!required}
      title="Kim grasz?"
      description="Wybierz swojego gracza, żeby wykonywać ruchy. Zmienisz to w każdej chwili w górnym pasku."
      size="sm"
    >
      <div className={styles.options}>
        {humans.map((player) => {
          const selected = viewer.role === player.id
          return (
            <button
              key={player.id}
              type="button"
              className={styles.option}
              aria-pressed={selected}
              onClick={() => onSelect(player.id)}
            >
              <PlayerToken playerId={player.id} color={player.color} size={34} muted={player.is_bankrupt} />
              <span className={styles.text}>
                <span className={styles.name}>{player.name}</span>
                {player.is_bankrupt && <span className={styles.meta}>Bankrut</span>}
              </span>
              {selected && <Check className={styles.check} aria-hidden="true" />}
            </button>
          )
        })}
        <button
          type="button"
          className={styles.option}
          aria-pressed={viewer.role === null && !required}
          onClick={() => onSelect('spectator')}
        >
          <span className={styles.spectator} aria-hidden="true">
            <Eye />
          </span>
          <span className={styles.text}>
            <span className={styles.name}>Tylko oglądam</span>
            <span className={styles.meta}>Widzisz całą grę, ale nie wykonujesz ruchów.</span>
          </span>
        </button>
      </div>
    </Dialog>
  )
}
