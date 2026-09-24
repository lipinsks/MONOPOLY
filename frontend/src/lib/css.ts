import type { CSSProperties } from 'react'

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function cssVars(variables: Record<string, string | number | null | undefined>): CSSProperties {
  const style: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(variables)) {
    if (value !== null && value !== undefined) style[`--${name}`] = value
  }
  return style as CSSProperties
}
