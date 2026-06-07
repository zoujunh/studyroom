import { getToken, setToken, setUser } from './auth'

const API_BASE = '/api'  // Relative path, works with same-origin serving

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '请求失败')
  }

  return response.json()
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const result = await request<{
      token: string
      user: { id: number; username: string }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setToken(result.token)
    setUser(result.user)
    return result
  },

  register: async (username: string, password: string) => {
    const result = await request<{
      token: string
      user: { id: number; username: string }
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setToken(result.token)
    setUser(result.user)
    return result
  },

  getMe: () => request<{ id: number; username: string }>('/auth/me'),

  // Settings
  getSettings: () => request<{ settings: { background_photo: string; music_volume: number; ambient_volume: number; timer_mode: string; duration: number } }>('/settings'),
  updateSettings: (settings: { background_photo: string; music_volume: number; ambient_volume: number; timer_mode: string; duration: number }) =>
    request<{ message: string }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Stats
  getStats: () => request<{ stats: { today_minutes: number; total_minutes: number; completed_pomodoros: number; streak: number } }>('/stats'),
  updateStats: (stats: Record<string, unknown>) =>
    request<{ message: string }>('/stats', {
      method: 'PUT',
      body: JSON.stringify(stats),
    }),
  recordPomodoro: (duration: number) =>
    request<{ message: string }>('/stats/pomodoro', {
      method: 'POST',
      body: JSON.stringify({ duration }),
    }),
  recordBreak: (reason: string) =>
    request<{ message: string }>('/stats/break', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Plans
  getPlans: () => request<{ plans: Array<{ id: number; title: string; time: string; completed: boolean }> }>('/plans'),
  createPlan: (title: string, time: string) =>
    request<{ message: string; plan: { id: number; title: string; time: string; completed: boolean } }>('/plans', {
      method: 'POST',
      body: JSON.stringify({ title, time }),
    }),
  updatePlan: (id: number, completed: boolean) =>
    request<{ message: string }>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    }),
  deletePlan: (id: number) =>
    request<{ message: string }>(`/plans/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: () => request<{ sessions: Array<{ id: number; start_time: string; duration_minutes: number; goal: string | null; scene_name: string | null; created_at: string }> }>('/sessions'),
  createSession: (data: { duration?: number; goal?: string; scene_name?: string }) =>
    request<{ message: string; session: { id: number; duration?: number; goal?: string; scene_name?: string } }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSession: (id: number, data: { duration?: number; goal?: string }) =>
    request<{ message: string }>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
