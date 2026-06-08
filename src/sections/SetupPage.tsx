import { ArrowLeft, ArrowRight, Clock, Timer } from 'lucide-react'
import { useState } from 'react'
import { GlassSlider } from '../components/GlassSlider'
import { scenes } from '../data/scenes'
import type { StudyScene, StudySettings } from '../types'

type SetupPageProps = {
  initialSettings: StudySettings
  onBack: () => void
  onStart: (settings: StudySettings) => void
}

export function SetupPage({ initialSettings, onBack, onStart }: SetupPageProps) {
  const [scene, setScene] = useState<StudyScene>(initialSettings.scene)
  const [musicVolume, setMusicVolume] = useState(initialSettings.musicVolume)
  const [ambientVolume, setAmbientVolume] = useState(initialSettings.ambientVolume)
  const [duration, setDuration] = useState(initialSettings.duration)
  const [timerMode, setTimerMode] = useState<'countdown' | 'countup'>(initialSettings.timerMode)
  const [customDuration, setCustomDuration] = useState('')

  return (
    <section className="setup-page relative h-full overflow-hidden overflow-x-hidden p-3 md:p-5" style={{ minHeight: '100dvh' }}>
      <img src={scene.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,8,10,0.62),rgba(41,36,31,0.42)_45%,rgba(8,10,14,0.68))] backdrop-blur-[2px]" />
      <div className="noise-layer" />

      <button className="pill-button relative z-10" type="button" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-3 py-3 md:gap-4 md:py-4 lg:h-[calc(100%-3.2rem)] lg:grid-cols-[1.2fr_1fr] lg:items-stretch lg:py-0">
        <section className="glass-panel relative flex h-full flex-col p-4 md:p-5" style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
          <div className="panel-kicker">
            <span className="eyebrow">STEP 01</span>
            <span>{scene.detail}</span>
          </div>
          <h2 className="panel-title-compact">选择你的学习场景</h2>
          <div className="mt-3 grid grid-cols-2 flex-1 gap-3 md:mt-4 md:gap-4" style={{ minHeight: 'clamp(300px, 40vh, 500px)' }}>
            {scenes.map((item) => (
              <button
                key={item.id}
                className={`scene-card ${item.id === scene.id ? 'is-selected' : ''}`}
                type="button"
                onClick={() => setScene(item)}
              >
                <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="text-sm font-semibold text-white md:text-base">{item.name}</div>
                  <div className="mt-1 text-xs text-white/70">{item.description}</div>
                </div>
                {item.id === scene.id && (
                  <div className="absolute bottom-3 right-3 h-3 w-3 rounded-full bg-white/60" />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:gap-5">
          <section className="glass-panel relative p-4 md:p-5" style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <div className="panel-kicker">
              <span className="eyebrow">STEP 02</span>
              <span>声音会在用户操作后启动</span>
            </div>
            <h2 className="panel-title-compact">设置声音氛围</h2>
            <VolumeControl label="音乐" value={musicVolume} onChange={setMusicVolume} description="Lo-fi、轻音乐、钢琴等专注音乐" />
            <VolumeControl label="背景音" value={ambientVolume} onChange={setAmbientVolume} description="根据当前场景自动匹配环境声" />
          </section>

          <section className="glass-panel relative p-4 md:p-5" style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '16px' }}>
            <div className="panel-kicker">
              <span className="eyebrow">STEP 03</span>
              <span>选择今天的节奏</span>
            </div>
            <h2 className="panel-title-compact">设置番茄钟</h2>

            {/* Timer mode toggle */}
            <div className="mt-3 flex gap-3">
              <button
                className={`time-button flex-1 ${timerMode === 'countdown' ? 'is-selected' : ''}`}
                type="button"
                onClick={() => setTimerMode('countdown')}
              >
                <Timer className="h-4 w-4" />
                倒计时
              </button>
              <button
                className={`time-button flex-1 ${timerMode === 'countup' ? 'is-selected' : ''}`}
                type="button"
                onClick={() => setTimerMode('countup')}
              >
                <Clock className="h-4 w-4" />
                正计时
              </button>
            </div>

            {/* Duration selection for countdown mode */}
            {timerMode === 'countdown' && (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[25, 45, 90].map((item) => (
                    <button
                      key={item}
                      className={`time-button ${item === duration && customDuration === '' ? 'is-selected' : ''}`}
                      type="button"
                      onClick={() => { setDuration(item); setCustomDuration('') }}
                    >
                      {item} 分钟
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">自定义</span>
                    <span className="text-sm text-white/60">{customDuration || duration} 分钟</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={5}
                    value={customDuration || duration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full accent-white/60"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>15</span>
                    <span>120</span>
                  </div>
                </div>
              </>
            )}

            {/* Countup mode message */}
            {timerMode === 'countup' && (
              <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-emerald-300/70" />
                <p className="text-sm text-white/70">点击开始，最长 6 小时</p>
              </div>
            )}

            <button
              className="primary-ghost mt-3 w-full justify-center"
              type="button"
              onClick={() => onStart({ scene, duration: customDuration ? parseInt(customDuration) : duration, timerMode, musicVolume, ambientVolume })}
            >
              进入自习室
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </section>
  )
}

function VolumeControl({
  label,
  onChange,
  value,
  description,
}: {
  label: string
  onChange: (value: number) => void
  value: number
  description?: string
}) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-white/84">{label}</span>
        <span className="text-sm text-white/60">{value}</span>
      </div>
      {description && <span className="mb-2 block text-xs text-white/50">{description}</span>}
      <GlassSlider value={value} onChange={onChange} showValue={false} />
    </div>
  )
}
