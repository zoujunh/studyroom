import { useCallback, useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { isLoggedIn } from '../utils/auth'

interface StudySession {
  id: number
  start_time: string
  duration_minutes: number
  goal: string | null
  scene_name: string | null
  created_at: string
}

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const startTimeRef = useRef<number>(0)

  // Load sessions from API on mount
  useEffect(() => {
    if (isLoggedIn()) {
      api.getSessions().then((result) => {
        setSessions(result.sessions)
      }).catch(console.error)
    }
  }, [])

  const startSession = useCallback(() => {
    startTimeRef.current = Date.now()
  }, [])

  const endSession = useCallback((goal?: string, sceneName?: string) => {
    if (!isLoggedIn()) return
    
    const duration = Math.floor((Date.now() - startTimeRef.current) / 60000)
    if (duration <= 0) return
    
    // Create record on exit
    api.createSession({ duration, goal, scene_name: sceneName })
      .then(() => {
        // Refresh sessions list
        api.getSessions().then((result) => {
          setSessions(result.sessions)
        }).catch(console.error)
      })
      .catch(() => {
        console.error('创建学习记录失败，重试中...')
        // Retry once
        setTimeout(() => {
          api.createSession({ duration, goal, scene_name: sceneName }).catch(console.error)
        }, 2000)
      })
  }, [])

  return {
    sessions,
    startSession,
    endSession,
  }
}
