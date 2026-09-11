export type SceneId = 'morning' | 'rainy-cafe' | 'library' | 'ocean'

export interface StudyScene {
  id: SceneId
  name: string
  shortName: string
  description: string
  detail: string
  image: string
  tone: 'morning' | 'rain' | 'library' | 'ocean'
}

export interface StudySettings {
  scene: StudyScene
  duration: number
  timerMode: 'countdown' | 'countup'
  musicVolume: number
  ambientVolume: number
}

export interface StudySession {
  id: number
  start_time: string
  end_time: string | null
  duration_minutes: number
  goal: string | null
  scene_name: string | null
  status: 'studying' | 'completed' | 'interrupted'
  created_at: string
}
