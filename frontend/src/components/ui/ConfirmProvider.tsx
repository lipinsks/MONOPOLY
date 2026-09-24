import { useCallback, useState, type ReactNode } from 'react'
import { Button } from './Button'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context'
import { Dialog } from './Dialog'
import styles from './ConfirmProvider.module.css'

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed)
    setPending(null)
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title}
        size="sm"
        footer={
          pending && (
            <>
              <Button onClick={() => settle(false)}>{pending.cancelLabel ?? 'Anuluj'}</Button>
              <Button variant="primary" onClick={() => settle(true)} data-autofocus>
                {pending.confirmLabel ?? 'Potwierdź'}
              </Button>
            </>
          )
        }
      >
        {pending?.message && <p className={styles.message}>{pending.message}</p>}
      </Dialog>
    </ConfirmContext>
  )
}
