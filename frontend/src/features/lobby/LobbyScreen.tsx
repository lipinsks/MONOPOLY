import { ArrowRight, Plus, Users, WifiOff } from 'lucide-react'
import { useCallback, useId, useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import type { RoomSummary } from '../../api/types'
import { navigate } from '../../app/router'
import { LogoPlate } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Field'
import { useToast } from '../../components/ui/toast-context'
import { usePolling } from '../../hooks/usePolling'
import { COLOR_GROUPS, GROUP_COLORS } from '../../lib/board'
import { countOf, WORDS } from '../../lib/format'
import { normalizeName } from '../../lib/players'
import { markAsHost } from '../../lib/session'
import styles from './LobbyScreen.module.css'

const ROOMS_POLL_INTERVAL = 2000

function useRoomList() {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const list = await api.listRooms(signal)
      setRooms((current) => (current && JSON.stringify(current) === JSON.stringify(list) ? current : list))
      setFailed(false)
    } catch {
      if (!signal.aborted) setFailed(true)
    }
  }, [])

  usePolling(poll, ROOMS_POLL_INTERVAL)
  return { rooms, failed }
}

export function LobbyScreen() {
  const { rooms, failed } = useRoomList()

  return (
    <main className={styles.screen}>
      <div className={styles.column}>
        <header className={styles.hero}>
          <LogoPlate size="lg" />
          <p className={styles.tagline}>
            Załóż pokój albo dołącz do istniejącego. Graj ze znajomymi przy jednej planszy lub dodaj boty sterowane
            przez wytrenowany model.
          </p>
          <div className={styles.strip} aria-hidden="true">
            {COLOR_GROUPS.map((group) => (
              <span key={group} style={{ background: GROUP_COLORS[group] }} />
            ))}
          </div>
        </header>

        <CreateRoomCard />
        <RoomList rooms={rooms} failed={failed} />
      </div>
    </main>
  )
}

function CreateRoomCard() {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const inputId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const roomId = await api.createRoom(normalizeName(name))
      markAsHost(roomId)
      navigate({ name: 'room', roomId })
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(false)
    }
  }

  return (
    <section className={styles.card} aria-labelledby={`${inputId}-title`}>
      <div className={styles.cardHeader}>
        <h2 id={`${inputId}-title`} className={styles.cardTitle}>
          Nowy pokój
        </h2>
        <p className={styles.cardDescription}>Zostaniesz gospodarzem i ustawisz skład gry.</p>
      </div>
      <form className={styles.createForm} onSubmit={handleSubmit}>
        <label htmlFor={inputId} className="visually-hidden">
          Nazwa pokoju
        </label>
        <TextInput
          id={inputId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nazwa pokoju, np. Piątkowa partia"
          maxLength={40}
          autoComplete="off"
        />
        <Button type="submit" variant="primary" loading={busy} icon={<Plus />}>
          Utwórz pokój
        </Button>
      </form>
    </section>
  )
}

function RoomList({ rooms, failed }: { rooms: RoomSummary[] | null; failed: boolean }) {
  return (
    <section className={styles.rooms} aria-labelledby="rooms-title">
      <div className={styles.roomsHeader}>
        <h2 id="rooms-title" className={styles.roomsTitle}>
          Otwarte pokoje
          {rooms && <span className={styles.count}>{rooms.length}</span>}
        </h2>
        {failed ? (
          <span className={styles.offline}>
            <WifiOff aria-hidden="true" />
            Brak połączenia
          </span>
        ) : (
          <span className={styles.live}>
            <span className={styles.liveDot} aria-hidden="true" />
            Na żywo
          </span>
        )}
      </div>

      {rooms === null ? (
        <ul className={styles.list} aria-busy="true">
          {[0, 1].map((index) => (
            <li key={index} className={styles.skeleton} />
          ))}
        </ul>
      ) : rooms.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nie ma jeszcze żadnego pokoju</p>
          <p className={styles.emptyText}>Utwórz pierwszy, a pojawi się tutaj dla wszystkich.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {rooms.map((room) => (
            <li key={room.id}>
              <RoomRow room={room} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function RoomRow({ room }: { room: RoomSummary }) {
  return (
    <div className={styles.room}>
      <span className={styles.roomIcon} data-started={room.started || undefined}>
        <Users aria-hidden="true" />
      </span>
      <div className={styles.roomInfo}>
        <p className={styles.roomName}>{room.name}</p>
        <p className={styles.roomMeta}>
          <span className={styles.statusDot} data-started={room.started || undefined} aria-hidden="true" />
          {room.started ? `Gra trwa · ${countOf(room.players_count, WORDS.player)}` : 'Czeka na start'}
        </p>
      </div>
      <Button
        size="sm"
        variant={room.started ? 'secondary' : 'primary'}
        trailingIcon={<ArrowRight />}
        onClick={() => navigate({ name: 'room', roomId: room.id })}
        aria-label={`Dołącz do pokoju ${room.name}`}
      >
        Dołącz
      </Button>
    </div>
  )
}
