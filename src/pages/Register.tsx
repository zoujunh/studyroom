import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '../components/Logo'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { api } from '../utils/api'

type RegisterPageProps = {
  onRegister: () => void
  onSwitchToLogin: () => void
}

export function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少 6 个字符')
      return
    }

    if (username.length < 2 || username.length > 20) {
      setError('用户名长度需要 2-20 个字符')
      return
    }

    setLoading(true)

    try {
      await api.register(username, password)
      onRegister()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative h-full overflow-hidden">
      {/* 深蓝夜空渐变背景 */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #060810 0%, #0c1220 30%, #101828 60%, #0a0f1a 100%)'
      }} />

      {/* 月亮光晕 */}
      <div className="absolute left-1/2 top-[12%] -translate-x-1/2 md:top-[15%]">
        <motion.div
          className="h-[220px] w-[220px] rounded-full opacity-20 md:h-[280px] md:w-[280px]"
          style={{
            background: 'radial-gradient(circle, rgba(167,243,208,0.4) 0%, rgba(16,185,129,0.15) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* 星星 */}
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* 地平线微光 */}
      <div className="absolute bottom-0 left-0 right-0 h-[40%]"
        style={{
          background: 'linear-gradient(0deg, rgba(16,185,129,0.06) 0%, transparent 100%)',
        }}
      />

      <div className="noise-layer" />

      {/* ===== 手机端：上下分割布局 ===== */}
      <div className="relative z-10 flex h-full flex-col md:hidden">
        {/* 上半：品牌区 */}
        <motion.div
          className="flex flex-col items-center justify-center px-6 pt-[8vh]"
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <Logo size="lg" showText={false} className="mx-auto mb-3 justify-center" />
          <h1 className="text-xl font-semibold text-white" style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
            安静之境
          </h1>
          <p className="mt-1.5 text-sm text-white/40">创建你的专注空间</p>
        </motion.div>

        {/* 下半：表单区 */}
        <motion.div
          className="flex flex-1 flex-col justify-center px-6 pb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名（2-20个字符）"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 transition-all duration-300"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码（至少6位）"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 transition-all duration-300"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认密码"
                className="w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 transition-all duration-300"
                required
              />
            </div>

            {error && (
              <motion.p className="text-sm text-red-400/80 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? '注册中...' : '开始专注之旅'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/30">
            已有账号？{' '}
            <button className="text-emerald-300/60 hover:text-emerald-300 transition-colors" onClick={onSwitchToLogin}>
              登录
            </button>
          </p>
        </motion.div>
      </div>

      {/* ===== 桌面端：居中卡片布局（不变） ===== */}
      <div className="relative z-10 hidden h-full items-center justify-center px-6 md:flex">
        <div className="w-full max-w-sm">
          <motion.div
            className="mb-8 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo size="lg" showText={false} className="mx-auto mb-4 justify-center" />
            <h1 className="text-2xl font-semibold text-white" style={{ textShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
              安静之境
            </h1>
            <p className="mt-2 text-sm text-white/40">创建你的专注空间</p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-white/[0.08] p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px rgba(255,255,255,0.06)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名（2-20个字符）"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 focus:bg-white/[0.06] transition-all duration-300"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码（至少6位）"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 focus:bg-white/[0.06] transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="确认密码"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/30 focus:bg-white/[0.06] transition-all duration-300"
                  required
                />
              </div>

              {error && (
                <motion.p className="text-sm text-red-400/80 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/30 transition-all duration-300 disabled:opacity-50"
              >
                {loading ? '注册中...' : '开始专注之旅'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-white/30">
              已有账号？{' '}
              <button className="text-emerald-300/60 hover:text-emerald-300 transition-colors" onClick={onSwitchToLogin}>
                登录
              </button>
            </p>
          </motion.div>

          <motion.p
            className="mt-8 text-center text-xs text-white/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            选择场景、声音与节奏，构建专属学习空间
          </motion.p>
        </div>
      </div>
    </section>
  )
}
