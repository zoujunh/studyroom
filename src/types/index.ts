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
