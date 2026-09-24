import { ConfirmProvider } from '../components/ui/ConfirmProvider'
import { ToastProvider } from '../components/ui/ToastProvider'
import { LobbyScreen } from '../features/lobby/LobbyScreen'
import { RoomScreen } from '../features/room/RoomScreen'
import { useRoute } from './router'

export function App() {
  const route = useRoute()
  return (
    <ToastProvider>
      <ConfirmProvider>
        {route.name === 'room' ? <RoomScreen key={route.roomId} roomId={route.roomId} /> : <LobbyScreen />}
      </ConfirmProvider>
    </ToastProvider>
  )
}
