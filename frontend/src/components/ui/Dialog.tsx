import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from '../../lib/css'
import { IconButton } from './Button'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  label?: string
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
  children?: ReactNode
  dismissible?: boolean
  bodyClassName?: string
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  label,
  size = 'md',
  footer,
  children,
  dismissible = true,
  bodyClassName,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      const target =
        dialog.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog.querySelector<HTMLElement>('[data-dialog-panel]')
      target?.focus({ preventScroll: true })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx(styles.dialog, styles[size])}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={title ? undefined : label}
      onCancel={(event) => {
        event.preventDefault()
        if (dismissible) onClose()
      }}
      onClose={() => {
        if (open) onClose()
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className={styles.panel} tabIndex={-1} data-dialog-panel>
          {(title || dismissible) && (
            <header className={cx(styles.header, !title && styles.headerBare)}>
              {title && (
                <div className={styles.heading}>
                  <h2 id={titleId} className={styles.title}>
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className={styles.description}>
                      {description}
                    </p>
                  )}
                </div>
              )}
              {dismissible && (
                <IconButton label="Zamknij" icon={<X />} size="sm" className={styles.close} onClick={onClose} />
              )}
            </header>
          )}
          <div className={cx(styles.body, bodyClassName)}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
