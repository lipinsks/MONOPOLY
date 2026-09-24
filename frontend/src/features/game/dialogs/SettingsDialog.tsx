import { Monitor, Moon, Power, RotateCcw, Sun } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { api, errorMessage } from '../../../api/client'
import { navigate } from '../../../app/router'
import { Button } from '../../../components/ui/Button'
import { useConfirm } from '../../../components/ui/confirm-context'
import { Dialog } from '../../../components/ui/Dialog'
import { Field, TextInput } from '../../../components/ui/Field'
import { SegmentedControl, type SegmentOption } from '../../../components/ui/SegmentedControl'
import { useToast } from '../../../components/ui/toast-context'
import { useTheme, type ThemePreference } from '../../../hooks/useTheme'
import { formatSeconds } from '../../../lib/format'
import { canAdminister } from '../../../lib/permissions'
import { useGame } from '../GameContext'
import styles from './SettingsDialog.module.css'

const THEME_OPTIONS: readonly SegmentOption<ThemePreference>[] = [
  { value: 'system', label: 'System', icon: <Monitor /> },
  { value: 'light', label: 'Jasny', icon: <Sun /> },
  { value: 'dark', label: 'Ciemny', icon: <Moon /> },
]

const MIN_TURNS = 10
const MAX_TURNS = 1000
const MAX_AI_DELAY = 5

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Ustawienia" size="sm">
      <SettingsContent onClose={onClose} />
    </Dialog>
  )
}

function SettingsContent({ onClose }: { onClose: () => void }) {
  const { state, roomId, viewer } = useGame()
  const toast = useToast()
  const confirm = useConfirm()
  const [theme, setTheme] = useTheme()
  const [delay, setDelay] = useState(state.ai_delay)
  const [turns, setTurns] = useState(String(state.max_turns))
  const savedDelay = useRef(state.ai_delay)
  const delayId = useId()
  const turnsId = useId()

  useEffect(() => {
    if (delay === savedDelay.current) return
    const timer = window.setTimeout(() => {
      savedDelay.current = delay
      api.updateSettings(roomId, { ai_delay: delay }).catch((error: unknown) => toast.error(errorMessage(error)))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [delay, roomId, toast])

  const parsedTurns = Number(turns)
  const turnsError =
    !Number.isInteger(parsedTurns) || parsedTurns < MIN_TURNS || parsedTurns > MAX_TURNS
      ? `Podaj liczbę od ${MIN_TURNS} do ${MAX_TURNS}.`
      : null

  async function saveTurns() {
    if (turnsError || parsedTurns === state.max_turns) return
    try {
      await api.updateSettings(roomId, { max_turns: parsedTurns })
      toast.success(`Limit ustawiony na ${parsedTurns} tur.`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function restart() {
    const confirmed = await confirm({
      title: 'Zacząć grę od nowa?',
      message: 'Gotówka, posiadłości i pozycje pionków wrócą do stanu początkowego. Skład graczy zostaje.',
      confirmLabel: 'Zagraj od nowa',
    })
    if (!confirmed) return
    try {
      await api.restart(roomId)
      toast.success('Nowa gra rozpoczęta.')
      onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function closeRoom() {
    const confirmed = await confirm({
      title: 'Zamknąć pokój?',
      message: 'Gra zniknie dla wszystkich graczy. Tego nie da się cofnąć.',
      confirmLabel: 'Zamknij pokój',
    })
    if (!confirmed) return
    try {
      await api.closeRoom(roomId)
      toast.info('Pokój został zamknięty.')
      navigate({ name: 'lobby' })
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className={styles.content}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Wygląd</h3>
        <SegmentedControl
          label="Motyw"
          value={theme}
          options={THEME_OPTIONS}
          onChange={setTheme}
          className={styles.fullWidth}
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Rozgrywka</h3>
        <div className={styles.field}>
          <div className={styles.rangeHeader}>
            <label htmlFor={delayId} className={styles.label}>
              Tempo botów
            </label>
            <output htmlFor={delayId} className={styles.value}>
              {delay === 0 ? 'Bez przerwy' : formatSeconds(delay)}
            </output>
          </div>
          <input
            id={delayId}
            type="range"
            min={0}
            max={MAX_AI_DELAY}
            step={0.5}
            value={delay}
            onChange={(event) => setDelay(Number(event.target.value))}
            className={styles.range}
          />
          <p className={styles.help}>Przerwa między ruchami botów. Mniej to szybsza gra.</p>
        </div>

        <Field label="Limit tur" htmlFor={turnsId} error={turnsError} hint="Po tylu turach wygrywa najbogatszy gracz.">
          <TextInput
            id={turnsId}
            inputMode="numeric"
            value={turns}
            invalid={Boolean(turnsError)}
            onChange={(event) => setTurns(event.target.value.replace(/\D/g, '').slice(0, 4))}
            onBlur={saveTurns}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveTurns()
            }}
          />
        </Field>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Pokój</h3>
        <div className={styles.dangerZone}>
          {canAdminister(state, viewer) && (
            <Button icon={<RotateCcw />} onClick={restart} block>
              Zagraj od nowa
            </Button>
          )}
          <Button variant="danger" icon={<Power />} onClick={closeRoom} block>
            Zamknij pokój
          </Button>
        </div>
      </section>
    </div>
  )
}
