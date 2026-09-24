import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { api, errorMessage } from '../../../api/client'
import { navigate } from '../../../app/router'
import { PlayerToken } from '../../../components/PlayerToken'
import { Button } from '../../../components/ui/Button'
import { useConfirm } from '../../../components/ui/confirm-context'
import { Dialog } from '../../../components/ui/Dialog'
import { useToast } from '../../../components/ui/toast-context'
import { cx } from '../../../lib/css'
import { countOf, formatMoney, WORDS } from '../../../lib/format'
import { canAdminister } from '../../../lib/permissions'
import { netWorth, rankPlayers } from '../../../lib/rules'
import { useGame } from '../GameContext'
import styles from './GameOverDialog.module.css'

export function GameOverDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, viewer, roomId } = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const ranking = rankPlayers(state.board, state.players)
  const champion = ranking[0]

  async function playAgain() {
    const confirmed = await confirm({
      title: 'Zagrać jeszcze raz?',
      message: 'Zaczniecie od nowa w tym samym składzie.',
      confirmLabel: 'Nowa gra',
    })
    if (!confirmed) return
    try {
      await api.restart(roomId)
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={champion ? `Wygrywa ${champion.name}!` : 'Koniec gry'}
      description={
        state.game_over_reason === 'turn_limit'
          ? `Rozegrano ${countOf(state.max_turns, WORDS.turn)}. O zwycięstwie decyduje majątek.`
          : 'Wszyscy pozostali gracze zbankrutowali.'
      }
      size="sm"
      footer={
        <>
          <Button icon={<ArrowLeft />} onClick={() => navigate({ name: 'lobby' })}>
            Lobby
          </Button>
          {canAdminister(state, viewer) && (
            <Button variant="primary" icon={<RotateCcw />} onClick={playAgain}>
              Zagraj ponownie
            </Button>
          )}
        </>
      }
    >
      <ol className={styles.ranking}>
        {ranking.map((player, index) => (
          <li key={player.id} className={cx(styles.rank, index === 0 && styles.first)}>
            <span className={styles.place}>{index === 0 ? <Trophy aria-label="1. miejsce" /> : index + 1}</span>
            <PlayerToken playerId={player.id} color={player.color} size={30} muted={player.is_bankrupt} />
            <span className={styles.name}>{player.name}</span>
            <span className={styles.worth}>
              {player.is_bankrupt ? 'Bankrut' : formatMoney(netWorth(state.board, player))}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.footnote}>Majątek to gotówka i wartość posiadłości razem z budynkami.</p>
    </Dialog>
  )
}
