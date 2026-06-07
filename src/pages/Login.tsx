import { Eye, EyeOff, Moon } from 'lucide-react'
import { useState } from 'react'
import { api } from '../utils/api'

type LoginPageProps = {
  onLogin: () => void
  onSwitchToRegister: () => void
}

export function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.login(username, password)
      onLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative h-full overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="noise-layer" />

      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Moon className="mx-auto mb-4 h-10 w-10 text-white/80" />
            <h1 className="text-2xl font-semibold text-white">安静之境</h1>
            <p className="mt-2 text-sm text-white/50">登录你的账号</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
                required
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition-colors"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white/10 border border-white/20 px-6 py-3 text-white font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            没有账号？{' '}
            <button
              className="text-white/70 hover:text-white transition-colors"
              onClick={onSwitchToRegister}
            >
              注册
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}
