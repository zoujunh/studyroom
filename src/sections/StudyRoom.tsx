import { ArrowLeft, BookOpen, Check, Coffee, Image, Maximize2, Minimize2, Pause, Phone, Play, RefreshCw, RotateCcw, Target, Utensils, Volume2, VolumeX, X } from 'lucide-react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { GlassSlider } from '../components/GlassSlider'
import { Modal } from '../components/Modal'

import { useAmbientSound } from '../hooks/useAmbientSound'
import { useStudyStats } from '../hooks/useStudyStats'
import { useStudySessions } from '../hooks/useStudySessions'
import { useTimer } from '../hooks/useTimer'
import { sceneBackgrounds } from '../data/scenes'
import type { StudySettings } from '../types'

type BreakReason = 'drink' | 'bathroom' | 'phone' | 'meal' | 'other'

const breakReasons: { id: BreakReason; label: string; icon: React.ReactNode }[] = [
  { id: 'drink', label: '喝水/茶歇', icon: <Coffee className="h-5 w-5" /> },
  { id: 'bathroom', label: '上厕所', icon: <BookOpen className="h-5 w-5" /> },
  { id: 'phone', label: '接电话', icon: <Phone className="h-5 w-5" /> },
  { id: 'meal', label: '用餐', icon: <Utensils className="h-5 w-5" /> },
  { id: 'other', label: '其他', icon: <Target className="h-5 w-5" /> },
]

type StudyRoomProps = {
  settings: StudySettings
  onBack: () => void
  onHome: () => void
}

export function StudyRoom({ onBack, onHome, settings }: StudyRoomProps) {
  const { scene, duration, timerMode, ambientVolume: initialAmbientVolume } = settings
  const { recordPomodoro, recordBreak } = useStudyStats()
  const { startSession, endSession } = useStudySessions()
  const timer = useTimer(duration, timerMode, () => {
    recordPomodoro(duration)
  })
  const [ambientVolume, setAmbientVolume] = useState(initialAmbientVolume)
  const sound = useAmbientSound(scene, ambientVolume, true)
  const [breakStep, setBreakStep] = useState<'none' | 'reason' | 'resting'>('none')
  const [breakReason, setBreakReason] = useState<BreakReason | null>(null)
  const [goal, setGoal] = useState('')
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState('')

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [customBg, setCustomBg] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`scene-bg-${scene.id}`)
    }
    return null
  })
  const [showBgPicker, setShowBgPicker] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Start session when entering study room
  useEffect(() => {
    startSession(scene.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leave = useCallback(() => {
    sound.stop()
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onBack()
  }, [sound, onBack])

  const endStudy = useCallback(() => {
    // Record elapsed time when ending study early
    const elapsedSeconds = timer.totalSeconds - timer.timeLeft
    const elapsedMinutes = Math.floor(elapsedSeconds / 60)
    
    // Record session
    endSession(elapsedMinutes, goal || undefined)
    
    // Record pomodoro if completed
    if (elapsedMinutes > 0) {
      recordPomodoro(elapsedMinutes)
    }
    
    sound.stop()
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onHome()
  }, [sound, onHome, timer.timeLeft, timer.totalSeconds, recordPomodoro, endSession, goal])

  // 全屏模式
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // 组件卸载时退出全屏
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  const pause = () => {
    timer.setIsRunning(false)
    sound.stop()
  }

  const resume = () => {
    timer.setIsRunning(true)
    void sound.start()
  }

  const toggleSound = () => {
    if (sound.isPlaying) {
      sound.stop()
    } else {
      void sound.start()
    }
  }

  const handleBreak = () => {
    setBreakStep('reason')
    pause()
  }

  const handleSelectReason = (reason: BreakReason) => {
    setBreakReason(reason)
    setBreakStep('resting')
    recordBreak(reason)
  }

  const handleResume = () => {
    setBreakStep('none')
    setBreakReason(null)
    resume()
  }

  const handleGoalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tempGoal.trim()) {
      setGoal(tempGoal.trim())
      setIsEditingGoal(false)
    }
  }

  const handleGoalFocus = () => {
    setIsEditingGoal(true)
    setTempGoal(goal)
  }

  const handleClearGoal = () => {
    setGoal('')
    setTempGoal('')
    setIsEditingGoal(false)
  }

  const handleBgSelect = (bg: string) => {
    setCustomBg(bg)
    localStorage.setItem(`scene-bg-${scene.id}`, bg)
    setShowBgPicker(false)
  }

  return (
    <section ref={containerRef} className="study-room relative h-full overflow-hidden bg-black">
      <img src={customBg || scene.image} alt="" className="absolute inset-0 h-full w-full scale-[1.02] object-cover slow-zoom" />
      {/* 清晰背景 */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="noise-layer" />

      {/* 顶部导航栏 - 半透明玻璃态 */}
      <header className="absolute left-0 right-0 top-0 z-20 flex h-12 items-center justify-between px-4 md:h-14 md:px-8" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button className="pill-button-sm justify-self-start" type="button" onClick={leave}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-xs">返回</span>
        </button>
        <div className="mx-auto hidden items-center gap-5 text-xs text-white/40 md:flex">
          <span>{scene.name}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>学习中</span>
          <span>POMODORO #{timer.round}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="pill-button-sm" type="button" onClick={() => setShowBgPicker(true)}>
            <Image className="h-3.5 w-3.5" />
            <span className="hidden text-xs md:inline">换景</span>
          </button>
          <button className="pill-button-sm" type="button" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden text-xs md:inline">{isFullscreen ? '退出全屏' : '沉浸'}</span>
          </button>
        </div>
      </header>

      {/* 计时器卡片 - 轻量化悬浮 */}
      <div className="absolute left-1/2 top-1/2 z-20 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 md:left-10 md:top-auto md:bottom-32 md:translate-x-0 md:translate-y-0">
        <div className="relative rounded-2xl p-4 md:p-6" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="eyebrow">POMODORO #{timer.round}</div>
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {timer.isRunning ? '学习中' : '暂停'}
            </div>
          </div>
          <div className="font-mono text-4xl font-light leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] tabular-nums md:text-6xl">{timer.formatted}</div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/35 md:mt-7">
            <span>本轮进度</span>
            <span>{Math.round(timer.progress)}%</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/12">
            <div className="progress-fill h-full rounded-full transition-all duration-500" style={{ width: `${timer.progress}%` }} />
          </div>
        </div>
      </div>

      {/* 目标输入框 - 回车确认 */}
      <div className="absolute bottom-24 left-1/2 z-20 w-[calc(100%-2rem)] -translate-x-1/2 md:bottom-28 md:w-auto">
        <div className="flex items-center gap-2 rounded-full px-3 py-2 text-sm md:px-4 md:py-2.5" style={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' }}>
          <Target className={`h-3.5 w-3.5 shrink-0 ${goal ? 'text-emerald-300/70' : 'text-white/30'}`} />
          {isEditingGoal ? (
            <input
              value={tempGoal}
              onChange={(e) => setTempGoal(e.target.value)}
              onKeyDown={handleGoalKeyDown}
              onBlur={() => {
                if (tempGoal.trim()) {
                  setGoal(tempGoal.trim())
                }
                setIsEditingGoal(false)
              }}
              placeholder="输入目标，按回车确认..."
              className="bg-transparent outline-none border-none text-white/70 placeholder:text-white/30 w-40 md:w-48"
              maxLength={50}
              autoFocus
            />
          ) : (
            <span
              className={`cursor-text ${goal ? 'text-white/80' : 'text-white/30'}`}
              onClick={handleGoalFocus}
            >
              {goal || '写下今天想完成的事...'}
            </span>
          )}
          {goal && !isEditingGoal && (
            <button
              className="ml-1 rounded-full p-0.5 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              onClick={handleClearGoal}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 底部控制条 - 三组布局 */}
      <div className="absolute bottom-4 left-1/2 z-20 flex h-10 w-[calc(100%-1rem)] -translate-x-1/2 items-center justify-between rounded-full px-3 text-xs text-white/56 md:bottom-6 md:h-11 md:w-[min(48rem,calc(100%-2rem))] md:px-4" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* 左边：音量 */}
        <div className="flex items-center h-8 md:h-9">
          <Volume2 className="h-4 w-4 text-white/40" />
          <div className="w-1 md:w-2" />
          <span className="hidden text-white/40 text-sm md:inline">背景音</span>
          <div className="w-2 md:w-3" />
          <div style={{ width: '80px' }} className="md:w-[120px]">
            <GlassSlider
              value={ambientVolume}
              onChange={setAmbientVolume}
              showValue={false}
            />
          </div>
        </div>

        {/* 分隔符 */}
        <div className="h-4 w-px bg-white/20" />

        {/* 中间：静音、混音、暂停、重置 */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            className={`control-button-sm ${sound.isPlaying ? 'text-emerald-300/70' : 'text-white/30'}`}
            type="button"
            onClick={toggleSound}
          >
            {sound.isPlaying ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{sound.isPlaying ? '音效' : '静音'}</span>
          </button>

          <button className="control-button-sm" type="button" onClick={timer.isRunning ? pause : resume}>
            {timer.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{timer.isRunning ? '暂停' : '继续'}</span>
          </button>
          <button className="control-button-sm" type="button" onClick={timer.reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">重置</span>
          </button>
        </div>

        {/* 分隔符 */}
        <div className="h-4 w-px bg-white/20" />

        {/* 右边：休息、结束学习 */}
        <div className="flex items-center gap-2 md:gap-3">
          <button className="control-button-sm" type="button" onClick={handleBreak}>
            <Coffee className="h-3.5 w-3.5" />
            <span className="hidden md:inline">休息</span>
          </button>
          <button className="control-button-sm hover:text-red-300" type="button" onClick={endStudy}>
            <X className="h-3.5 w-3.5" />
            <span className="hidden md:inline">结束</span>
          </button>
        </div>
      </div>


      {timer.isComplete && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/44 backdrop-blur-sm">
          <div className="glass-panel relative w-[min(24rem,calc(100%-2rem))] p-8 text-center">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 text-emerald-200" />
            <h2 className="text-2xl font-semibold text-white">这一轮完成了</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">记录一下状态，然后开始下一轮。</p>
            <button className="primary-ghost mt-6 w-full justify-center" type="button" onClick={timer.skip}>
              下一轮
            </button>
          </div>
        </div>
      )}

      {/* 选择离开原因 */}
      {breakStep === 'reason' && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/48 backdrop-blur-md">
          <div className="glass-panel relative w-[min(24rem,calc(100%-2rem))] p-6">
            <h2 className="text-lg font-semibold text-white text-center mb-5">选择离开原因</h2>
            <div className="grid grid-cols-2 gap-3">
              {breakReasons.map((item) => (
                <button
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                  type="button"
                  onClick={() => handleSelectReason(item.id)}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 休息中 */}
      {breakStep === 'resting' && breakReason && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/48 backdrop-blur-md">
          <div className="glass-panel relative w-[min(22rem,calc(100%-2rem))] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              {breakReasons.find(r => r.id === breakReason)?.icon}
            </div>
            <h2 className="text-xl font-semibold text-white">暂时离开</h2>
            <p className="mt-2 text-sm text-white/50">
              {breakReasons.find(r => r.id === breakReason)?.label}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/54">学习辛苦了，适当休息一下吧。</p>
            <button className="primary-ghost mt-6 w-full justify-center" type="button" onClick={handleResume}>
              继续学习
            </button>
          </div>
        </div>
      )}

      {/* 背景图选择器 */}
      <Modal
        isOpen={showBgPicker}
        onClose={() => setShowBgPicker(false)}
        title="更换背景图"
        size="md"
      >
        <div className="grid grid-cols-2 gap-3">
          {(sceneBackgrounds[scene.id] || []).map((bg) => (
            <button
              key={bg}
              className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                (customBg || scene.image) === bg
                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                  : 'border-white/10 hover:border-white/30'
              }`}
              onClick={() => handleBgSelect(bg)}
            >
              <img src={bg} alt="" className="h-full w-full object-cover" />
              {(customBg || scene.image) === bg && (
                <div className="absolute right-2 top-2 rounded-full bg-emerald-400 p-1">
                  <Check className="h-3 w-3 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
        {(sceneBackgrounds[scene.id] || []).length <= 1 && (
          <p className="mt-4 text-center text-sm text-white/40">该场景暂无可更换的背景图</p>
        )}
      </Modal>
    </section>
  )
}
