import { WifiOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameState, PlayerState } from '../../api/types'
import { useElementSize } from '../../hooks/useElementSize'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cssVars } from '../../lib/css'
import { canControlTurn, canProposeTrade, currentPlayerOf, type Viewer } from '../../lib/permissions'
import { isHostOf, readRole, saveRole, type StoredRole } from '../../lib/session'
import { Board } from './board/Board'
import { BoardCenter } from './board/BoardCenter'
import { DeedDialog } from './dialogs/DeedDialog'
import { GameOverDialog } from './dialogs/GameOverDialog'
import { RenameDialog } from './dialogs/RenameDialog'
import { RoleDialog } from './dialogs/RoleDialog'
import { SettingsDialog } from './dialogs/SettingsDialog'
import { TradeDialog } from './dialogs/TradeDialog'
import { GameContext, type GameContextValue } from './GameContext'
import styles from './GameScreen.module.css'
import { PlayersPanel } from './panels/PlayersPanel'
import { SidePanel, type SideTab } from './panels/SidePanel'
import { TradeOfferPanel } from './panels/TradeOfferPanel'
import { TopBar } from './TopBar'
import { TurnPanel } from './TurnPanel'
import { useGameActions } from './useGameActions'

type Layout = 'wide' | 'medium' | 'narrow'

type OpenDialog =
  | { kind: 'tile'; tileId: number }
  | { kind: 'trade'; targetId: number | null }
  | { kind: 'rename'; playerId: number }
  | { kind: 'settings' }
  | { kind: 'role' }
  | { kind: 'summary' }
  | null

const PANEL_IN_BOARD_MIN_SIZE = 560
const BOARD_FRAME_ALLOWANCE = 0.985

function useLayout(): Layout {
  const wide = useMediaQuery('(min-width: 1280px)')
  const medium = useMediaQuery('(min-width: 900px)')
  return wide ? 'wide' : medium ? 'medium' : 'narrow'
}

interface GameScreenProps {
  roomId: string
  state: GameState
  offline: boolean
  refresh: () => Promise<void>
}

export function GameScreen({ roomId, state, offline, refresh }: GameScreenProps) {
  const [storedRole, setStoredRole] = useState<StoredRole | null>(() => readRole(roomId))
  const [isHost] = useState(() => isHostOf(roomId))
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [dismissedSummary, setDismissedSummary] = useState<string | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('players')
  const [propertiesOwner, setPropertiesOwner] = useState<number | null>(null)
  const [movingPawns, setMovingPawns] = useState<ReadonlySet<number>>(() => new Set())
  const { pending, run } = useGameActions(roomId, refresh)
  const layout = useLayout()
  const [stageRef, stageSize] = useElementSize<HTMLElement>()
  const [dockRef, dockSize] = useElementSize<HTMLDivElement>()

  const humans = state.players.filter((player) => player.is_human)
  const role = typeof storedRole === 'number' && humans.some((player) => player.id === storedRole) ? storedRole : null
  const viewer = useMemo<Viewer>(() => ({ role, isHost }), [role, isHost])
  const current = currentPlayerOf(state)
  const me = role === null ? null : (state.players.find((player) => player.id === role) ?? null)
  const pawnsMoving = state.players.some((player) => movingPawns.has(player.id) && !player.is_bankrupt)

  const available = layout === 'narrow' ? stageSize.width : Math.min(stageSize.width, stageSize.height)
  const boardSize = Math.floor(available * BOARD_FRAME_ALLOWANCE)
  const turnPanelPlacement = boardSize >= PANEL_IN_BOARD_MIN_SIZE ? 'board' : layout === 'narrow' ? 'dock' : 'side'

  const roleRequired = storedRole === null && humans.length > 0
  const summaryKey = state.game_over_reason ? `${state.game_over_reason}:${state.turns}:${state.winner ?? ''}` : null
  const summaryOpen =
    dialog?.kind === 'summary' ||
    (summaryKey !== null && summaryKey !== dismissedSummary && !roleRequired && dialog === null)
  const myTurn = me !== null && me.id === current.id && canControlTurn(state, viewer)

  const handleMotionChange = useCallback((playerId: number, moving: boolean) => {
    setMovingPawns((previous) => {
      if (previous.has(playerId) === moving) return previous
      const next = new Set(previous)
      if (moving) next.add(playerId)
      else next.delete(playerId)
      return next
    })
  }, [])

  const playerById = useCallback(
    (id: number | null | undefined): PlayerState | null =>
      id === null || id === undefined ? null : (state.players.find((player) => player.id === id) ?? null),
    [state.players],
  )

  const contextValue = useMemo<GameContextValue>(
    () => ({
      roomId,
      state,
      viewer,
      current,
      me,
      pending,
      pawnsMoving,
      run,
      playerById,
      openTile: (tileId) => setDialog({ kind: 'tile', tileId }),
      openTrade: (targetId) => setDialog({ kind: 'trade', targetId: targetId ?? null }),
      openRename: (playerId) => setDialog({ kind: 'rename', playerId }),
      openSummary: () => setDialog({ kind: 'summary' }),
    }),
    [roomId, state, viewer, current, me, pending, pawnsMoving, run, playerById],
  )

  useEffect(() => {
    document.title = myTurn ? `Twój ruch · ${state.room_name}` : `${state.room_name} · Monopoly Online`
  }, [myTurn, state.room_name])

  useEffect(
    () => () => {
      document.title = 'Monopoly Online'
    },
    [],
  )

  const closeDialog = () => setDialog(null)

  const chooseRole = (next: StoredRole) => {
    saveRole(roomId, next)
    setStoredRole(next)
    setDialog(null)
  }

  const closeSummary = () => {
    setDismissedSummary(summaryKey)
    setDialog(null)
  }

  return (
    <GameContext value={contextValue}>
      <div
        className={styles.screen}
        data-layout={layout}
        style={cssVars({ 'dock-height': turnPanelPlacement === 'dock' ? `${dockSize.height}px` : '0px' })}
      >
        <TopBar
          compact={layout === 'narrow'}
          onOpenSettings={() => setDialog({ kind: 'settings' })}
          onOpenRole={() => setDialog({ kind: 'role' })}
        />

        {offline && (
          <p className={styles.offline} role="status">
            <WifiOff aria-hidden="true" />
            Brak połączenia z serwerem. Próbuję ponownie…
          </p>
        )}

        <main className={styles.main}>
          {layout === 'wide' && (
            <aside className={styles.left}>
              <PlayersPanel />
            </aside>
          )}

          <section ref={stageRef} className={styles.stage} aria-label="Plansza">
            {boardSize > 0 && (
              <Board size={boardSize} onMotionChange={handleMotionChange}>
                <BoardCenter withPanel={turnPanelPlacement === 'board'} />
              </Board>
            )}
          </section>

          <aside className={styles.right}>
            {turnPanelPlacement === 'side' && <TurnPanel variant="card" />}
            {layout !== 'narrow' && <TradeOfferPanel />}
            <SidePanel
              tab={sideTab}
              onTabChange={setSideTab}
              includePlayers={layout !== 'wide'}
              propertiesOwner={propertiesOwner}
              onPropertiesOwnerChange={setPropertiesOwner}
            />
          </aside>
        </main>

        {layout === 'narrow' && <TradeOfferPanel floating />}

        {turnPanelPlacement === 'dock' && (
          <div ref={dockRef} className={styles.dock}>
            <TurnPanel variant="dock" />
          </div>
        )}

        <DeedDialog tileId={dialog?.kind === 'tile' ? dialog.tileId : null} onClose={closeDialog} />
        <TradeDialog
          open={dialog?.kind === 'trade' && canProposeTrade(state, viewer)}
          initialTargetId={dialog?.kind === 'trade' ? dialog.targetId : null}
          onClose={closeDialog}
        />
        <RenameDialog playerId={dialog?.kind === 'rename' ? dialog.playerId : null} onClose={closeDialog} />
        <SettingsDialog open={dialog?.kind === 'settings'} onClose={closeDialog} />
        <RoleDialog
          open={roleRequired || dialog?.kind === 'role'}
          required={roleRequired}
          onSelect={chooseRole}
          onClose={closeDialog}
        />
        <GameOverDialog open={summaryOpen} onClose={closeSummary} />
      </div>
    </GameContext>
  )
}
