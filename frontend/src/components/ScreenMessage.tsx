import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoPlate } from './Logo'
import styles from './ScreenMessage.module.css'

interface ScreenMessageProps {
  title: string
  description?: ReactNode
  busy?: boolean
  actions?: ReactNode
}

export function ScreenMessage({ title, description, busy = false, actions }: ScreenMessageProps) {
  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <LogoPlate size="sm" />
        {busy && <LoaderCircle className={styles.spinner} aria-hidden="true" />}
        <div className={styles.text}>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </main>
  )
}
