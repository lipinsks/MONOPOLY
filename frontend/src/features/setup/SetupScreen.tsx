import { ArrowLeft, Bot, Check, Play, Plus, Trash2, UserRound } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import { navigate } from '../../app/router'
import { PlayerToken } from '../../components/PlayerToken'
import { Button, IconButton } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Field'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useToast } from '../../components/ui/toast-context'
import { cx } from '../../lib/css'
import { countOf, WORDS } from '../../lib/format'
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, normalizeName, PLAYER_COLORS } from '../../lib/players'
import { saveRole } from '../../lib/session'
import styles from './SetupScreen.module.css'

interface DraftPlayer {
  key: number
  name: string
  color: string
  isAi: boolean
}

type PlayerKind = 'human' | 'bot'

const KIND_OPTIONS = [
  { value: 'human', label: 'Człowiek', icon: <UserRound /> },
  { value: 'bot', label: 'Bot', icon: <Bot /> },
] as const

const GENERATED_NAME = /^(Gracz|Bot) \d+$/

function generatedName(index: number, isAi: boolean): string {
  return `${isAi ? 'Bot' : 'Gracz'} ${index + 1}`
}

function initialPlayers(): DraftPlayer[] {
  return [0, 1].map((index) => ({
    key: index,
    name: generatedName(index, false),
    color: PLAYER_COLORS[index],
    isAi: false,
  }))
}

function validate(players: DraftPlayer[]): Map<number, string> {
  const errors = new Map<number, string>()
  const taken = new Set<string>()
  for (const player of players) {
    const name = normalizeName(player.name)
    if (!name) {
      errors.set(player.key, 'Wpisz nazwę gracza.')
      continue
    }
    const comparable = name.toLocaleLowerCase('pl-PL')
    if (taken.has(comparable)) errors.set(player.key, 'Ta nazwa jest już zajęta.')
    taken.add(comparable)
  }
  return errors
}

interface SetupScreenProps {
  roomId: string
  roomName: string
  onStarted: () => Promise<void>
}

export function SetupScreen({ roomId, roomName, onStarted }: SetupScreenProps) {
  const [players, setPlayers] = useState(initialPlayers)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const errors = validate(players)
  const bots = players.filter((player) => player.isAi).length
  const humans = players.length - bots
  const summary = [humans > 0 && countOf(humans, WORDS.person), bots > 0 && countOf(bots, WORDS.bot)]
    .filter(Boolean)
    .join(' i ')

  const update = (key: number, patch: Partial<DraftPlayer>) =>
    setPlayers(players.map((player) => (player.key === key ? { ...player, ...patch } : player)))

  const changeKind = (key: number, kind: PlayerKind) =>
    setPlayers(
      players.map((player, index) => {
        if (player.key !== key) return player
        const isAi = kind === 'bot'
        const name = GENERATED_NAME.test(player.name) ? generatedName(index, isAi) : player.name
        return { ...player, isAi, name }
      }),
    )

  const addPlayer = () => {
    if (players.length >= MAX_PLAYERS) return
    const color = PLAYER_COLORS.find((candidate) => !players.some((player) => player.color === candidate))
    setPlayers([
      ...players,
      {
        key: Math.max(...players.map((player) => player.key)) + 1,
        name: generatedName(players.length, false),
        color: color ?? PLAYER_COLORS[0],
        isAi: false,
      },
    ])
  }

  const removePlayer = (key: number) => {
    if (players.length <= MIN_PLAYERS) return
    setPlayers(players.filter((player) => player.key !== key))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || errors.size > 0) return
    setBusy(true)
    const payload = players.map((player) => ({
      name: normalizeName(player.name),
      color: player.color,
      is_ai: player.isAi,
    }))
    try {
      await api.setup(roomId, payload)
      const firstHuman = payload.findIndex((player) => !player.is_ai)
      saveRole(roomId, firstHuman >= 0 ? firstHuman : 'spectator')
      await onStarted()
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <main className={styles.screen}>
      <form className={styles.column} onSubmit={handleSubmit} noValidate>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft />}
          onClick={() => navigate({ name: 'lobby' })}
          className={styles.back}
        >
          Lobby
        </Button>

        <header className={styles.header}>
          <p className={styles.eyebrow}>Nowa gra</p>
          <h1 className={styles.title}>{roomName}</h1>
          <p className={styles.lead}>
            Ustaw skład przy stole. Boty grają same, a ludzie wykonują ruchy na swoich urządzeniach albo na zmianę na
            jednym.
          </p>
        </header>

        <section className={styles.card} aria-labelledby="setup-players-title">
          <div className={styles.cardHeader}>
            <h2 id="setup-players-title" className={styles.cardTitle}>
              Gracze
            </h2>
            <span className={styles.counter}>
              {players.length} z {MAX_PLAYERS}
            </span>
          </div>

          <ol className={styles.players}>
            {players.map((player, index) => (
              <li key={player.key}>
                <PlayerRow
                  player={player}
                  index={index}
                  error={errors.get(player.key)}
                  takenColors={players.filter((other) => other.key !== player.key).map((other) => other.color)}
                  canRemove={players.length > MIN_PLAYERS}
                  onChange={(patch) => update(player.key, patch)}
                  onKindChange={(kind) => changeKind(player.key, kind)}
                  onRemove={() => removePlayer(player.key)}
                />
              </li>
            ))}
          </ol>

          {players.length < MAX_PLAYERS && (
            <Button icon={<Plus />} onClick={addPlayer} className={styles.add}>
              Dodaj gracza
            </Button>
          )}
        </section>

        <footer className={styles.footer}>
          <p className={styles.summary}>Przy stole: {summary}</p>
          <Button type="submit" variant="primary" size="lg" icon={<Play />} loading={busy} disabled={errors.size > 0}>
            Rozpocznij grę
          </Button>
        </footer>
      </form>
    </main>
  )
}

interface PlayerRowProps {
  player: DraftPlayer
  index: number
  error: string | undefined
  takenColors: string[]
  canRemove: boolean
  onChange: (patch: Partial<DraftPlayer>) => void
  onKindChange: (kind: PlayerKind) => void
  onRemove: () => void
}

function PlayerRow({ player, index, error, takenColors, canRemove, onChange, onKindChange, onRemove }: PlayerRowProps) {
  const inputId = useId()
  return (
    <div className={styles.row}>
      <PlayerToken playerId={index} color={player.color} size={42} className={styles.token} />
      <div className={styles.rowMain}>
        <div className={styles.rowTop}>
          <label htmlFor={inputId} className="visually-hidden">
            Nazwa gracza {index + 1}
          </label>
          <TextInput
            id={inputId}
            value={player.name}
            invalid={Boolean(error)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            onChange={(event) => onChange({ name: event.target.value })}
            className={styles.name}
          />
          <SegmentedControl
            label={`Rodzaj gracza ${index + 1}`}
            value={player.isAi ? 'bot' : 'human'}
            options={KIND_OPTIONS}
            onChange={onKindChange}
            className={styles.kind}
          />
          <IconButton
            label={`Usuń gracza ${index + 1}`}
            icon={<Trash2 />}
            onClick={onRemove}
            disabled={!canRemove}
            className={styles.remove}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.swatches} role="radiogroup" aria-label={`Kolor gracza ${index + 1}`}>
          {PLAYER_COLORS.map((color) => {
            const selected = color === player.color
            const taken = takenColors.includes(color)
            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={taken ? 'Kolor zajęty' : 'Wybierz kolor'}
                disabled={taken}
                className={cx(styles.swatch, taken && styles.swatchTaken)}
                style={{ background: color }}
                onClick={() => onChange({ color })}
              >
                {selected && <Check aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
