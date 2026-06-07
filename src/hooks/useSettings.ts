import { useCallback, useState, useEffect } from 'react'
import { api } from '../utils/api'
import { isLoggedIn } from '../utils/auth'
import type { StudySettings } from '../types'
import { scenes } from '../data/scenes'

const defaultSettings: StudySettings = {
  scene: scenes[0],
  duration: 25,
  timerMode: 'countdown',
  musicVolume: 60,
  ambientVolume: 40,
}

export function useSettings() {
  const [settings, setSettings] = useState<StudySettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(() => !isLoggedIn())

  // Load settings from API on mount
  useEffect(() => {
    if (!isLoggedIn()) return

    api.getSettings().then((result) => {
      const s = result.settings
      const scene = scenes.find(sc => sc.id === s.background_photo) || scenes[0]
      setSettings({
        scene,
        duration: s.duration || 25,
        timerMode: (s.timer_mode === 'countup' ? 'countup' : 'countdown'),
        musicVolume: s.music_volume || 60,
        ambientVolume: s.ambient_volume || 40,
      })
      setIsLoaded(true)
    }).catch(() => {
      setIsLoaded(true)
    })
  }, [])

  const updateSettings = useCallback((newSettings: StudySettings) => {
    setSettings(newSettings)
    if (isLoggedIn()) {
      api.updateSettings({
        background_photo: newSettings.scene.id,
        music_volume: newSettings.musicVolume,
        ambient_volume: newSettings.ambientVolume,
        timer_mode: newSettings.timerMode,
        duration: newSettings.duration,
      }).catch(console.error)
    }
  }, [])

  return {
    settings,
    updateSettings,
    isLoaded,
  }
}
