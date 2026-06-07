import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const COUNTUP_MAX_SECONDS = 360 * 60 // 6 hours in seconds

export function useTimer(durationMinutes: number, mode: 'countdown' | 'countup' = 'countdown', onComplete?: () => void) {
  const totalSeconds = mode === 'countdown' ? durationMinutes * 60 : COUNTUP_MAX_SECONDS
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [round, setRound] = useState(1)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    if (!isRunning) return

    if (mode === 'countdown' && elapsed >= totalSeconds) return
    if (mode === 'countup' && elapsed >= COUNTUP_MAX_SECONDS) return

    const timer = window.setInterval(() => {
      setElapsed((value) => {
        if (mode === 'countdown') return Math.min(totalSeconds, value + 1)
        return Math.min(COUNTUP_MAX_SECONDS, value + 1)
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isRunning, elapsed, totalSeconds, mode])

  // Check for completion
  useEffect(() => {
    if (mode === 'countdown' && elapsed >= totalSeconds && !hasCompletedRef.current) {
      hasCompletedRef.current = true
      onComplete?.()
    }
  }, [elapsed, totalSeconds, mode, onComplete])

  const timeLeft = mode === 'countdown' ? totalSeconds - elapsed : COUNTUP_MAX_SECONDS - elapsed

  const progress = useMemo(
    () => Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100)),
    [elapsed, totalSeconds],
  )

  const formatted = useMemo(() => {
    const displaySeconds = mode === 'countdown' ? timeLeft : elapsed
    const minutes = Math.floor(displaySeconds / 60)
    const seconds = displaySeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [timeLeft, elapsed, mode])

  const isComplete = mode === 'countdown' ? elapsed >= totalSeconds : elapsed >= COUNTUP_MAX_SECONDS

  const reset = useCallback(() => {
    setElapsed(0)
    setIsRunning(true)
    hasCompletedRef.current = false
  }, [])

  const skip = useCallback(() => {
    setRound((value) => value + 1)
    setElapsed(0)
    setIsRunning(true)
    hasCompletedRef.current = false
  }, [])

  return {
    formatted,
    isComplete,
    isRunning,
    progress,
    reset,
    round,
    setIsRunning,
    skip,
    timeLeft,
    totalSeconds,
  }
}
