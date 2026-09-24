import { cx } from '../lib/css'
import styles from './Logo.module.css'

export function LogoPlate({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <span className={cx(styles.plate, styles[size], className)}>Monopoly</span>
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cx(styles.mark, className)} aria-hidden="true">
      M
    </span>
  )
}
