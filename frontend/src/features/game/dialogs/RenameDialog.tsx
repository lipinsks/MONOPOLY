import { useId, useState, type FormEvent } from 'react'
import type { PlayerState } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Field, TextInput } from '../../../components/ui/Field'
import { MAX_NAME_LENGTH, normalizeName } from '../../../lib/players'
import { useGame } from '../GameContext'
import styles from './RenameDialog.module.css'

interface RenameDialogProps {
  playerId: number | null
  onClose: () => void
}

export function RenameDialog({ playerId, onClose }: RenameDialogProps) {
  const { state } = useGame()
  const player = playerId === null ? null : (state.players.find((candidate) => candidate.id === playerId) ?? null)

  return (
    <Dialog open={player !== null} onClose={onClose} title="Zmień nazwę gracza" size="sm">
      {player && <RenameForm player={player} onDone={onClose} />}
    </Dialog>
  )
}

function RenameForm({ player, onDone }: { player: PlayerState; onDone: () => void }) {
  const { state, run, pending } = useGame()
  const [name, setName] = useState(player.name)
  const inputId = useId()
  const normalized = normalizeName(name)
  const comparable = normalized.toLocaleLowerCase('pl-PL')
  const taken = state.players.some(
    (other) => other.id !== player.id && other.name.toLocaleLowerCase('pl-PL') === comparable,
  )
  const error = !normalized ? 'Wpisz nazwę.' : taken ? 'Ta nazwa jest już zajęta.' : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (error) return
    if (normalized === player.name) {
      onDone()
      return
    }
    const renamed = await run({ action: 'RENAME_PLAYER', player_index: player.id, new_name: normalized })
    if (renamed) onDone()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Field label="Nowa nazwa" htmlFor={inputId} error={error}>
        <TextInput
          id={inputId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          data-autofocus
          invalid={Boolean(error)}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      {state.active_trade && <p className={styles.note}>Zmiana nazwy anuluje trwającą wymianę.</p>}
      <div className={styles.actions}>
        <Button onClick={onDone}>Anuluj</Button>
        <Button type="submit" variant="primary" disabled={Boolean(error)} loading={pending === 'RENAME_PLAYER'}>
          Zapisz
        </Button>
      </div>
    </form>
  )
}
