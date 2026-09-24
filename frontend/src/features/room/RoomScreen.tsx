import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigate } from '../../app/router'
import { ScreenMessage } from '../../components/ScreenMessage'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/toast-context'
import { isHostOf } from '../../lib/session'
import { GameScreen } from '../game/GameScreen'
import { SetupScreen } from '../setup/SetupScreen'
import { useRoomState } from './useRoomState'

const backToLobby = (
  <Button icon={<ArrowLeft />} onClick={() => navigate({ name: 'lobby' })}>
    Wróć do lobby
  </Button>
)

export function RoomScreen({ roomId }: { roomId: string }) {
  const room = useRoomState(roomId)
  const [isHost] = useState(() => isHostOf(roomId))
  const toast = useToast()
  const missing = room.status === 'missing'

  useEffect(() => {
    if (!missing) return
    toast.info('Ten pokój już nie istnieje.')
    navigate({ name: 'lobby' })
  }, [missing, toast])

  if (!room.state) {
    return (
      <ScreenMessage
        busy={!missing}
        title={missing ? 'Pokój nie istnieje' : 'Łączę z pokojem…'}
        description={room.offline ? 'Serwer nie odpowiada. Próbuję ponownie.' : undefined}
        actions={backToLobby}
      />
    )
  }

  if (!room.state.game_started) {
    return isHost ? (
      <SetupScreen roomId={roomId} roomName={room.state.room_name} onStarted={room.refresh} />
    ) : (
      <ScreenMessage
        busy
        title={room.state.room_name}
        description="Czekamy, aż gospodarz pokoju ustawi skład i rozpocznie grę."
        actions={backToLobby}
      />
    )
  }

  return <GameScreen roomId={roomId} state={room.state} offline={room.offline} refresh={room.refresh} />
}
