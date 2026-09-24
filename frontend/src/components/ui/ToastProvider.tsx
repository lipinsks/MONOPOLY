import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../lib/css'
import { ToastContext, type ToastApi, type ToastTone } from './toast-context'
import styles from './Toast.module.css'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

const TOAST_DURATION = 4500
const MAX_VISIBLE = 3

const ICONS: Record<ToastTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  success: <CircleCheck aria-hidden="true" />,
  error: <CircleAlert aria-hidden="true" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const regionRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)
  const shownCount = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [
        ...current.filter((toast) => toast.message !== message).slice(-(MAX_VISIBLE - 1)),
        { id, message, tone },
      ])
      window.setTimeout(() => dismiss(id), TOAST_DURATION)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      info: (message) => show(message, 'info'),
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  )

  useLayoutEffect(() => {
    const region = regionRef.current
    const previous = shownCount.current
    shownCount.current = toasts.length
    if (!region || typeof region.showPopover !== 'function') return
    const isOpen = region.matches(':popover-open')
    if (toasts.length === 0) {
      if (isOpen) region.hidePopover()
      return
    }
    if (toasts.length > previous || !isOpen) {
      if (isOpen) region.hidePopover()
      region.showPopover()
    }
  }, [toasts.length])

  return (
    <ToastContext value={api}>
      {children}
      <div ref={regionRef} popover="manual" className={styles.region} aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(styles.toast, styles[toast.tone])}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <span className={styles.icon}>{ICONS[toast.tone]}</span>
            <p className={styles.message}>{toast.message}</p>
            <button type="button" className={styles.dismiss} onClick={() => dismiss(toast.id)} aria-label="Zamknij">
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
