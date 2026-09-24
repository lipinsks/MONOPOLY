import { useCallback, useState } from 'react'
import { readStorage, writeStorage } from '../lib/storage'

export type ThemePreference = 'system' | 'dark' | 'light'

const STORAGE_KEY = 'monopoly_theme'

function readPreference(): ThemePreference {
  const stored = readStorage(STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : 'system'
}

function applyPreference(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference
}

export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState(readPreference)

  const update = useCallback((next: ThemePreference) => {
    writeStorage(STORAGE_KEY, next)
    applyPreference(next)
    setPreference(next)
  }, [])

  return [preference, update]
}
