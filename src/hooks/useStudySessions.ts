import { useCallback, useState, useEffect } from 'react'
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
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null)

  // Load sessions from API on mount
  useEffect(() => {
    if (isLoggedIn()) {
      api.getSessions().then((result) => {
        setSessions(result.sessions)
      }).catch(console.error)
    }
  }, [])

  const startSession = useCallback((sceneName: string) => {
    if (isLoggedIn()) {
      api.createSession({ scene_name: sceneName }).then((result) => {
        setCurrentSessionId(result.session.id)
      }).catch(console.error)
    }
  }, [])

  const endSession = useCallback((duration: number, goal?: string) => {
    if (isLoggedIn() && currentSessionId) {
      api.updateSession(currentSessionId, { duration, goal }).then(() => {
        // Refresh sessions list
        api.getSessions().then((result) => {
          setSessions(result.sessions)
        }).catch(console.error)
        setCurrentSessionId(null)
      }).catch(console.error)
    }
  }, [currentSessionId])

  return {
    sessions,
    startSession,
    endSession,
    currentSessionId,
  }
}
