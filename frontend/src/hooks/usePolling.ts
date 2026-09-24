import { useCallback, useEffect, useRef } from 'react'

const HIDDEN_TAB_INTERVAL = 4000

type PollTask = (signal: AbortSignal) => Promise<void>

export function usePolling(task: PollTask, intervalMs: number): () => Promise<void> {
  const taskRef = useRef(task)
  const triggerRef = useRef<() => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    taskRef.current = task
  }, [task])

  useEffect(() => {
    const controller = new AbortController()
    let timer = 0
    let inFlight: Promise<void> | null = null
    let queued: Promise<void> | null = null

    const schedule = () => {
      window.clearTimeout(timer)
      if (controller.signal.aborted) return
      const delay = document.hidden ? Math.max(intervalMs, HIDDEN_TAB_INTERVAL) : intervalMs
      timer = window.setTimeout(execute, delay)
    }

    const execute = (): Promise<void> => {
      window.clearTimeout(timer)
      const run = taskRef
        .current(controller.signal)
        .catch(() => undefined)
        .finally(() => {
          inFlight = null
          schedule()
        })
      inFlight = run
      return run
    }

    const trigger = (): Promise<void> => {
      if (!inFlight) return execute()
      queued ??= inFlight.then(() => {
        queued = null
        return execute()
      })
      return queued
    }

    const handleVisibility = () => {
      if (!document.hidden) void trigger()
    }

    triggerRef.current = trigger
    document.addEventListener('visibilitychange', handleVisibility)
    void execute()

    return () => {
      controller.abort()
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      triggerRef.current = () => Promise.resolve()
    }
  }, [intervalMs])

  return useCallback(() => triggerRef.current(), [])
}
