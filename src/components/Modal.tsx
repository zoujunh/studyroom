import { X } from 'lucide-react'
import { type ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 弹窗主体 */}
      <div
        className={`glass-panel glass-scroll relative ${sizeClasses[size]} w-[calc(100%-2rem)] p-6 animate-fade-in-up`}
      >
        {/* 头部 */}
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {/* 内容 */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  )
}

/* 内卡组件 - 轻量级，无嵌套 blur */
interface ModalCardProps {
  children: ReactNode
  className?: string
}

export function ModalCard({ children, className = '' }: ModalCardProps) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}
    >
      {children}
    </div>
  )
}

/* 弹窗按钮 */
interface ModalButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  className?: string
}

export function ModalButton({ children, onClick, variant = 'secondary', className = '' }: ModalButtonProps) {
  const baseClasses =
    'rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200'
  const variantClasses =
    variant === 'primary'
      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
