import type { InputHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/css'
import styles from './Field.module.css'

interface FieldProps {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cx(styles.field, className)}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className={styles.error}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  )
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  prefix?: string
}

export function TextInput({ invalid, prefix, className, ...rest }: TextInputProps) {
  if (prefix) {
    return (
      <span className={cx(styles.affixed, invalid && styles.invalid, className)}>
        <span className={styles.prefix} aria-hidden="true">
          {prefix}
        </span>
        <input className={styles.bare} aria-invalid={invalid || undefined} {...rest} />
      </span>
    )
  }
  return (
    <input
      className={cx(styles.input, invalid && styles.invalid, className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}
