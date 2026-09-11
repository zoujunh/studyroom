import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Logo } from '../components/Logo'
import { scenes } from '../data/scenes'

// 各场景的音频文件
const sceneAudioFiles: Record<string, string[]> = {
  morning: ['/sounds/scenes/wind-and-birds.mp3'],
  'rainy-cafe': ['/sounds/scenes/rain-on-windows.mp3', '/sounds/scenes/cafe.mp3'],
  library: ['/sounds/scenes/library-ambience-noise.mp3', '/sounds/scenes/library-pages.mp3'],
  ocean: ['/sounds/scenes/ocean-waves.mp3', '/sounds/scenes/seagulls.mp3'],
}

type PreparingPageProps = {
  onReady: () => void
  onBack: () => void
}

export function PreparingPage({ onReady }: PreparingPageProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // 同时预加载图片和音频
    const imageUrls = scenes.map((s) => s.image)
    const audioUrls = Object.values(sceneAudioFiles).flat()
    const allAssets = [...imageUrls, ...audioUrls]
    let loaded = 0
    const total = allAssets.length

    const checkDone = () => {
      loaded++
      setProgress(Math.round((loaded / total) * 100))
      if (loaded >= total) {
        setTimeout(onReady, 400)
      }
    }

    // 预加载图片
    imageUrls.forEach((url) => {
      const img = new Image()
      img.onload = checkDone
      img.onerror = checkDone
      img.src = url
    })

    // 预加载音频（只下载不播放）
    audioUrls.forEach((url) => {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.oncanplaythrough = checkDone
      audio.onerror = checkDone
      audio.src = url
    })

    // 兜底：最多等 5 秒
    const timeout = setTimeout(onReady, 5000)
    return () => clearTimeout(timeout)
  }, [onReady])

  return (
    <section className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden bg-[#10100f]">
      {/* 背景微光 */}
      <div className="absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo 呼吸动画 */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo size="lg" showText={false} />
        </motion.div>

        {/* 标题 */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white/90">准备学习空间</h2>
          <p className="mt-2 text-sm text-white/40">正在加载场景资源...</p>
        </div>

        {/* 进度条 */}
        <div className="w-48">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-emerald-400/70"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-white/30">{progress}%</p>
        </div>
      </div>
    </section>
  )
}
