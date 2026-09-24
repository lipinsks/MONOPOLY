import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/css'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'positive' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  trailingIcon?: ReactNode
  loading?: boolean
  block?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : icon}
      {children !== undefined && children !== null && children !== false && (
        <span className={styles.label}>{children}</span>
      )}
      {trailingIcon}
    </button>
  )
}

interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'trailingIcon'> {
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, variant = 'ghost', className, ...rest }: IconButtonProps) {
  return (
    <Button
      {...rest}
      variant={variant}
      icon={icon}
      className={cx(styles.iconOnly, className)}
      aria-label={label}
      title={label}
    />
  )
}
