import type { ReactNode } from 'react'
import { cx } from '../../lib/css'
import styles from './Tabs.module.css'

export interface TabItem<T extends string> {
  id: T
  label: string
  icon?: ReactNode
  badge?: ReactNode
}

interface TabsProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  idPrefix: string
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, label, idPrefix, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cx(styles.list, className)}>
      {items.map((item) => (
        <button
          key={item.id}
          id={`${idPrefix}-tab-${item.id}`}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          aria-controls={`${idPrefix}-panel-${item.id}`}
          className={styles.tab}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge !== undefined && <span className={styles.badge}>{item.badge}</span>}
        </button>
      ))}
    </div>
  )
}
