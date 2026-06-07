import { useCallback, useRef, useState } from 'react'

interface GlassSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  showValue?: boolean
}

export function GlassSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  showValue = true,
}: GlassSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const updateValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newValue = Math.round(min + ratio * (max - min))
      onChange(newValue)
    },
    [min, max, onChange]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      updateValue(e.clientX)
    },
    [updateValue]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return
      updateValue(e.clientX)
    },
    [updateValue]
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
    setDragging(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newValue: number
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(max, value + 1)
          break
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(min, value - 1)
          break
        case 'Home':
          newValue = min
          break
        case 'End':
          newValue = max
          break
        default:
          return
      }
      e.preventDefault()
      onChange(newValue)
    },
    [value, min, max, onChange]
  )

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-3 w-full">
      {label && (
        <span className="text-xs text-white/60 min-w-[2rem]">{label}</span>
      )}
      {/* 滑块容器 - 增大点击区域 */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer select-none min-w-0"
        style={{
          padding: '10px 0',
          touchAction: 'none',
          overflow: 'visible',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        {/* 轨道 - 完整的圆角矩形 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          }}
        />
        {/* 已播放部分 - 白色填充 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: `${percentage}%`,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: dragging ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.5)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5))',
            boxShadow: dragging ? '0 0 12px rgba(255, 255, 255, 0.3)' : 'none',
            transition: dragging ? 'background-color 0.15s, box-shadow 0.15s' : 'width 0.1s ease, background-color 0.15s, box-shadow 0.15s',
          }}
        />
        {/* 滑块圆点 - 白色圆形，直径 12px */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percentage}%`,
            transform: dragging ? 'translate(-50%, -50%) scale(1.2)' : 'translate(-50%, -50%) scale(1)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: dragging
              ? '0 0 16px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.4)'
              : '0 2px 6px rgba(0, 0, 0, 0.3)',
            transition: dragging ? 'transform 0.15s, box-shadow 0.15s' : 'left 0.1s ease, transform 0.15s, box-shadow 0.15s',
          }}
        />
      </div>
      {showValue && (
        <span className="text-xs text-white/50 min-w-[2.5rem] text-right tabular-nums">
          {value}%
        </span>
      )}
    </div>
  )
}
