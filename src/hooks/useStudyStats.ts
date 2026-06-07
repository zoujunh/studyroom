import { useCallback, useState, useEffect } from 'react'
import { api } from '../utils/api'
import { isLoggedIn } from '../utils/auth'

interface StudyStats {
  todayMinutes: number
  totalMinutes: number
  completedPomodoros: number
  streak: number
}

export function useStudyStats() {
  const [stats, setStats] = useState<StudyStats>({
    todayMinutes: 0,
    totalMinutes: 0,
    completedPomodoros: 0,
    streak: 0,
  })

  // Load stats from API on mount
  useEffect(() => {
    if (isLoggedIn()) {
      api.getStats().then((result) => {
        setStats({
          todayMinutes: result.stats.today_minutes,
          totalMinutes: result.stats.total_minutes,
          completedPomodoros: result.stats.completed_pomodoros,
          streak: result.stats.streak,
        })
      }).catch(console.error)
    }
  }, [])

  const recordPomodoro = useCallback((durationMinutes: number) => {
    if (isLoggedIn()) {
      api.recordPomodoro(durationMinutes).then(() => {
        // Refresh stats
        api.getStats().then((result) => {
          setStats({
            todayMinutes: result.stats.today_minutes,
            totalMinutes: result.stats.total_minutes,
            completedPomodoros: result.stats.completed_pomodoros,
            streak: result.stats.streak,
          })
        }).catch(console.error)
      }).catch(console.error)
    }
  }, [])

  const recordBreak = useCallback((reason: string) => {
    if (isLoggedIn()) {
      api.recordBreak(reason).catch(console.error)
    }
  }, [])

  return {
    stats,
    recordPomodoro,
    recordBreak,
  }
}
