import { ArrowRight, BarChart3, Calendar, CheckCircle, Clock, Crown, Image, Languages, LogIn, MapPin, Moon, Plus, Target, Trash2, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { PhotoSelector } from '../components/PhotoSelector'
import { useStudyStats } from '../hooks/useStudyStats'
import { useStudyPlans } from '../hooks/useStudyPlans'
import { useStudySessions } from '../hooks/useStudySessions'
import { getUser } from '../utils/auth'

type HomePageProps = {
  onStart: () => void
  onLogout: () => void
}

const DEFAULT_PHOTO = '/images/morning/scene-morning.jpg'

export function HomePage({ onStart, onLogout }: HomePageProps) {
  const [backgroundPhoto, setBackgroundPhoto] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('home-background-photo') || DEFAULT_PHOTO
    }
    return DEFAULT_PHOTO
  })
  const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [comingSoonModal, setComingSoonModal] = useState<string | null>(null)

  // 统计数据
  const { stats } = useStudyStats()

  // 学习记录
  const { sessions } = useStudySessions()

  // 用户数据
  const user = getUser()

  // 计划数据
  const { plans, addPlan, togglePlan, deletePlan } = useStudyPlans()
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')

  const handlePhotoSelect = (photo: string) => {
    setBackgroundPhoto(photo)
    localStorage.setItem('home-background-photo', photo)
  }

  const handleAddPlan = () => {
    if (!newTitle.trim()) return
    addPlan(newTitle.trim(), newTime || '待定')
    setNewTitle('')
    setNewTime('')
  }

  return (
    <section className="home-scene relative h-full overflow-hidden">
      {/* 背景图 */}
      <div className="absolute inset-0 z-0">
        <img src={backgroundPhoto} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      <div className="noise-layer" />

      {/* 顶部导航栏 */}
      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3 font-semibold tracking-tight text-white">
          <Moon className="h-5 w-5" />
          <span>安静之境</span>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          <button className="nav-link-new" type="button" onClick={() => setShowPlan(true)}>
            <MapPin className="h-4 w-4 icon-plan" />
            计划
          </button>
          <button className="nav-link-new" type="button" onClick={() => setComingSoonModal('会员')}>
            <Crown className="h-4 w-4 icon-member" />
            会员
          </button>
          <button className="nav-link-new" type="button" onClick={() => setShowStats(true)}>
            <BarChart3 className="h-4 w-4 icon-stats" />
            统计
          </button>
          <button
            className="nav-link-new"
            type="button"
            onClick={() => setIsPhotoSelectorOpen(true)}
            title="更换首页背景"
          >
            <Image className="h-4 w-4 icon-bg" />
            背景
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button className="nav-link-new" type="button" onClick={() => setComingSoonModal('语言设置')}>
            <Languages className="h-4 w-4 icon-lang" />
            中文
          </button>
          {user ? (
            <>
              <span className="text-sm text-white/60">{user.username}</span>
              <button
                className="nav-link-new"
                type="button"
                onClick={onLogout}
              >
                <LogIn className="h-4 w-4 icon-login" />
                退出
              </button>
            </>
          ) : (
            <button className="nav-link-new hidden md:inline-flex" type="button">
              <LogIn className="h-4 w-4 icon-login" />
              登录
            </button>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <h1 className="hero-title-new">
          开启你的清晨自习室
        </h1>
        <p className="hero-subtitle-new">
          选择场景、声音与节奏，构建专属学习空间
        </p>
        <button className="cta-button-transparent" type="button" onClick={onStart}>
          开始学习
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* 在线人数指示器 */}
      <div className="online-indicator">
        <span className="online-dot" />
        <span>9 人在线学习</span>
      </div>

      {/* 底部Footer */}
      <footer className="footer-new">
        <div className="footer-brand">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Moon className="h-4 w-4" />
            安静之境
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">
            结合沉浸式场景、专注音乐与智能计划，让每一次学习都更专注。
          </p>
        </div>
        
        <div className="footer-links">
          <div>
            <div className="footer-title">产品</div>
            <div className="footer-item">场景库</div>
            <div className="footer-item">声音库</div>
            <div className="footer-item">学习方法</div>
          </div>
          <div>
            <div className="footer-title">资源</div>
            <div className="footer-item">使用指南</div>
            <div className="footer-item">更新日志</div>
            <div className="footer-item">API 文档</div>
          </div>
          <div>
            <div className="footer-title">关于</div>
            <div className="footer-item">关于我们</div>
            <div className="footer-item">联系方式</div>
            <div className="footer-item">隐私政策</div>
          </div>
        </div>
      </footer>

      {/* 背景图选择器 */}
      <PhotoSelector
        isOpen={isPhotoSelectorOpen}
        onClose={() => setIsPhotoSelectorOpen(false)}
        onSelect={handlePhotoSelect}
        currentPhoto={backgroundPhoto}
      />

      {/* 学习统计悬浮面板 */}
      <Modal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="学习统计"
        size="md"
      >
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">今日学习</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.todayMinutes}</div>
            <div className="text-xs text-white/40">分钟</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs">总学习时长</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.totalMinutes}</div>
            <div className="text-xs text-white/40">分钟</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <Target className="h-4 w-4" />
              <span className="text-xs">完成番茄钟</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.completedPomodoros}</div>
            <div className="text-xs text-white/40">个</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">连续天数</span>
            </div>
            <div className="text-2xl font-semibold text-white">{stats.streak}</div>
            <div className="text-xs text-white/40">天</div>
          </div>
        </div>
        {stats.todayMinutes === 0 && stats.totalMinutes === 0 && (
          <p className="mt-4 text-center text-sm text-white/40">开始学习，记录你的专注时光</p>
        )}

        {/* 学习历史 */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-white/80">学习历史</h3>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/40">还没有学习记录</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span>{new Date(session.created_at).toLocaleDateString('zh-CN')}</span>
                      <span className="text-white/40">·</span>
                      <span>{session.duration_minutes} 分钟</span>
                      {session.scene_name && (
                        <>
                          <span className="text-white/40">·</span>
                          <span className="text-white/60">{session.scene_name}</span>
                        </>
                      )}
                    </div>
                    {session.goal && (
                      <p className="mt-1 text-xs text-white/50">{session.goal}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* 学习计划悬浮面板 */}
      <Modal
        isOpen={showPlan}
        onClose={() => setShowPlan(false)}
        title="学习计划"
        size="md"
      >
        {/* 添加计划表单 */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="计划内容..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
          />
          <input
            type="text"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            placeholder="时间"
            className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20"
          />
          <button
            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
            onClick={handleAddPlan}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* 计划列表 */}
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {plans.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">还没有计划，添加一个开始吧</p>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-all ${
                  plan.completed ? 'opacity-50' : ''
                }`}
              >
                <button
                  className={`shrink-0 rounded-full p-1 transition-colors ${
                    plan.completed
                      ? 'text-emerald-400'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                  onClick={() => togglePlan(plan.id)}
                >
                  <CheckCircle className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-white ${plan.completed ? 'line-through' : ''}`}>
                    {plan.title}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <Calendar className="h-3 w-3" />
                    {plan.time}
                  </div>
                </div>
                <button
                  className="shrink-0 rounded-full p-1 text-white/30 hover:text-red-400 transition-colors"
                  onClick={() => deletePlan(plan.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* 即将上线提示 */}
      <Modal
        isOpen={comingSoonModal !== null}
        onClose={() => setComingSoonModal(null)}
        title={comingSoonModal || ''}
        size="sm"
      >
        <div className="py-4 text-center">
          <p className="text-white/60">该功能即将上线，敬请期待！</p>
          <button
            className="primary-ghost mt-4 mx-auto"
            onClick={() => setComingSoonModal(null)}
          >
            知道了
          </button>
        </div>
      </Modal>
    </section>
  )
}
