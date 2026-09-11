import { motion } from 'framer-motion'

type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const iconSize = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' }[size]
  const textSize = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' }[size]
  const gap = { sm: 'gap-1.5', md: 'gap-2.5', lg: 'gap-3' }[size]

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* 自定义 Logo 图标 */}
      <div className={`relative ${iconSize}`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          {/* 外圈光晕 */}
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="url(#logoGlow)"
            strokeWidth="1.5"
            opacity="0.4"
            animate={{ r: [17, 18.5, 17], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* 月亮主体 */}
          <path
            d="M24 12a10 10 0 1 1-8 16 8 8 0 0 0 8-16z"
            fill="url(#logoMoon)"
          />
          {/* 小星星 */}
          <motion.circle
            cx="28"
            cy="12"
            r="1.2"
            fill="rgba(255,255,255,0.8)"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="32"
            cy="18"
            r="0.8"
            fill="rgba(255,255,255,0.5)"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
          <defs>
            <linearGradient id="logoMoon" x1="12" y1="8" x2="28" y2="32">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* 文字 */}
      {showText && (
        <span className={`${textSize} font-semibold tracking-tight text-white`} style={{ fontFamily: "'Noto Serif SC', 'STSong', serif" }}>
          安静之境
        </span>
      )}
    </div>
  )
}
