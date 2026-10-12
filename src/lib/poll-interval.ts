'use client'

import { useCallback, useSyncExternalStore } from 'react'

export const POLL_INTERVAL_OPTIONS = [
  { label: '15 seconds', value: 15 },
  { label: '30 seconds (default)', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: 'Manual only (off)', value: 0 },
] as const

export const DEFAULT_POLL_INTERVAL_SEC = 30
const STORAGE_KEY = 'crm_poll_interval_sec'
const EVENT_NAME = 'crm-poll-interval-change'

export function getSavedPollIntervalSec(): number {
  if (typeof window === 'undefined') return DEFAULT_POLL_INTERVAL_SEC
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = parseInt(raw, 10)
      if (!isNaN(parsed) && parsed >= 0) return parsed
    }
  } catch {
    // ignore
  }
  return DEFAULT_POLL_INTERVAL_SEC
}

export function setSavedPollIntervalSec(seconds: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, String(seconds))
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: seconds }))
  } catch {
    // ignore
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT_NAME, callback)
    window.removeEventListener('storage', callback)
  }
}

/**
 * Hook to read and update the poll / auto-refresh interval across all tabs and components.
 */
export function usePollInterval(): [number, (sec: number) => void] {
  const intervalSec = useSyncExternalStore(subscribe, getSavedPollIntervalSec, () => DEFAULT_POLL_INTERVAL_SEC)
  const update = useCallback((sec: number) => {
    setSavedPollIntervalSec(sec)
  }, [])
  return [intervalSec, update]
}
