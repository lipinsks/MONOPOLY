import { useMemo, useSyncExternalStore } from 'react'

export type Route = { name: 'lobby' } | { name: 'room'; roomId: string }

const ROOM_HASH = /^#\/room\/([\w-]+)$/

function parseHash(hash: string): Route {
  const match = ROOM_HASH.exec(hash)
  return match ? { name: 'room', roomId: match[1] } : { name: 'lobby' }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return useMemo(() => parseHash(hash), [hash])
}

export function navigate(route: Route): void {
  window.location.hash = route.name === 'room' ? `/room/${route.roomId}` : '/'
}
