import { useCallback, useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { getToken, isLoggedIn } from '../utils/auth'

interface StudySession {
  id: number
  start_time: string
  end_time: string | null
  duration_minutes: number
  goal: string | null
  scene_name: string | null
  status: string
  created_at: string
}

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const activeSessionIdRef = useRef<number | null>(null)

  // Load sessions from API on mount
  useEffect(() => {
    if (isLoggedIn()) {
      api.getSessions().then((result) => {
        setSessions(result.sessions)
      }).catch(console.error)
    }
  }, [])

  const startSession = useCallback((goal?: string, sceneName?: string) => {
    if (!isLoggedIn()) return

    startTimeRef.current = Date.now()

    api.startSession({ goal, scene_name: sceneName })
      .then((result) => {
        activeSessionIdRef.current = result.session.id
        setActiveSessionId(result.session.id)
      })
      .catch((err) => {
        console.error('创建学习记录失败:', err)
      })
  }, [])

  const endSession = useCallback((goal?: string, sceneName?: string) => {
    if (!isLoggedIn()) return

    const elapsedMs = Date.now() - startTimeRef.current
    const durationMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
    const sessionId = activeSessionIdRef.current

    if (sessionId) {
      activeSessionIdRef.current = null
      setActiveSessionId(null)

      const body = JSON.stringify({
        duration_minutes: durationMinutes,
        goal: goal || undefined,
      })
      const token = getToken()

      // 用 fetch keepalive（浏览器保证页面卸载时也会发出）
      fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        keepalive: true,
      }).catch(console.error)

      // 延迟刷新列表
      setTimeout(() => {
        api.getSessions().then((result) => {
          setSessions(result.sessions)
        }).catch(console.error)
      }, 500)
    } else if (durationMinutes > 0) {
      api.createSession({ duration: durationMinutes, goal, scene_name: sceneName })
        .then(() => {
          api.getSessions().then((result) => {
            setSessions(result.sessions)
          }).catch(console.error)
        }).catch(console.error)
    }
  }, [])

  // 页面关闭/卸载时自动保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeSessionIdRef.current && startTimeRef.current > 0) {
        const elapsedMs = Date.now() - startTimeRef.current
        const durationMinutes = Math.max(0, Math.floor(elapsedMs / 60000))
        const body = JSON.stringify({ duration_minutes: durationMinutes })
        const token = getToken()
        fetch(`/api/sessions/${activeSessionIdRef.current}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
          keepalive: true,
        })
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return {
    sessions,
    activeSessionId,
    startSession,
    endSession,
  }
}
