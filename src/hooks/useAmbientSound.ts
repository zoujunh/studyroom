import { useCallback, useEffect, useRef, useState } from 'react'
import type { StudyScene } from '../types'

interface AudioNode {
  audio: HTMLAudioElement
  isPlaying: boolean
  baseVolume: number
}

const sceneAudioMap: Record<string, { file: string; volume: number }[]> = {
  morning: [
    { file: '/sounds/scenes/wind-and-birds.wav', volume: 1.0 },
  ],
  'rainy-cafe': [
    { file: '/sounds/scenes/rain-on-windows.wav', volume: 0.8 },
    { file: '/sounds/scenes/cafe.wav', volume: 0.3 },
  ],
  library: [
    { file: '/sounds/scenes/library-ambience-noise.wav', volume: 0.7 },
    { file: '/sounds/scenes/library-pages.wav', volume: 0.2 },
  ],
  ocean: [
    { file: '/sounds/scenes/ocean-waves.wav', volume: 0.8 },
    { file: '/sounds/scenes/seagulls.wav', volume: 0.25 },
  ],
}

export function useAmbientSound(scene: StudyScene, volume: number, autoStart: boolean = false) {
  const audioNodesRef = useRef<Map<string, AudioNode>>(new Map())
  const [isPlaying, setIsPlaying] = useState(false)
  const hasInteractedRef = useRef(false)
  const volumeRef = useRef(volume)

  // 保持 volumeRef 同步
  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  const stopAll = useCallback(() => {
    audioNodesRef.current.forEach((node) => {
      node.audio.pause()
      node.audio.currentTime = 0
    })
    audioNodesRef.current.clear()
    setIsPlaying(false)
  }, [])

  const updateAllVolumes = useCallback((newVolume: number) => {
    // 直接使用 0-1 的音量值
    const vol = Math.max(0, Math.min(1, newVolume / 100))
    audioNodesRef.current.forEach((node) => {
      node.audio.volume = node.baseVolume * vol
    })
  }, [])

  const startAll = useCallback(() => {
    const audioList = sceneAudioMap[scene.id] || []

    stopAll()

    const vol = Math.max(0, Math.min(1, volumeRef.current / 100))

    audioList.forEach(({ file, volume: baseVolume }) => {
      const audio = new Audio(file)
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = baseVolume * vol

      audio.addEventListener('error', (e) => {
        console.warn(`Failed to load audio: ${file}`, e)
      })

      const playPromise = audio.play()
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn(`Autoplay blocked for ${file}:`, err.message)
        })
      }

      audioNodesRef.current.set(file, { audio, isPlaying: true, baseVolume })
    })

    setIsPlaying(true)
  }, [scene.id, stopAll])

  const stop = useCallback(() => {
    stopAll()
  }, [stopAll])

  const start = useCallback(async () => {
    startAll()
  }, [startAll])

  // 实时更新音量 - 不依赖播放状态
  useEffect(() => {
    updateAllVolumes(volume)
  }, [volume, updateAllVolumes])

  // 自动开始播放
  useEffect(() => {
    if (autoStart && !hasInteractedRef.current) {
      const handleInteraction = (e: Event) => {
        if (e.type === 'keydown' && e.target instanceof HTMLElement && 
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
          return
        }
        hasInteractedRef.current = true
        if (!isPlaying) {
          startAll()
        }
        document.removeEventListener('click', handleInteraction)
        document.removeEventListener('keydown', handleInteraction)
      }
      document.addEventListener('click', handleInteraction)
      document.addEventListener('keydown', handleInteraction)
      return () => {
        document.removeEventListener('click', handleInteraction)
        document.removeEventListener('keydown', handleInteraction)
      }
    }
  }, [autoStart, isPlaying, startAll])

  // 清理
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [stopAll])

  return { isPlaying, start, stop }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
