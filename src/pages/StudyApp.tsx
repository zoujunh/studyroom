import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { HomePage } from '../sections/HomePage'
import { SetupPage } from '../sections/SetupPage'
import { StudyRoom } from '../sections/StudyRoom'
import { LoginPage } from './Login'
import { RegisterPage } from './Register'
import { isLoggedIn, logout } from '../utils/auth'

type View = 'login' | 'register' | 'home' | 'setup' | 'room'

export function StudyApp() {
  const [view, setView] = useState<View>(() => {
    return isLoggedIn() ? 'home' : 'login'
  })
  const { settings, updateSettings } = useSettings()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [view])

  const handleLogin = () => {
    setView('home')
  }

  const handleRegister = () => {
    setView('home')
  }

  const handleLogout = () => {
    logout()
    setView('login')
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-[#10100f] text-white">
      <AnimatePresence mode="wait">
        {view === 'login' && (
          <motion.div
            key="login"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <LoginPage
              onLogin={handleLogin}
              onSwitchToRegister={() => setView('register')}
            />
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div
            key="register"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <RegisterPage
              onRegister={handleRegister}
              onSwitchToLogin={() => setView('login')}
            />
          </motion.div>
        )}

        {view === 'home' && (
          <motion.div
            key="home"
            className="h-full"
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.015 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <HomePage
              onStart={() => setView('setup')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {view === 'setup' && (
          <motion.div
            key="setup"
            className="h-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <SetupPage
              initialSettings={settings}
              onBack={() => setView('home')}
              onStart={(nextSettings) => {
                updateSettings(nextSettings)
                setView('room')
              }}
            />
          </motion.div>
        )}

        {view === 'room' && (
          <motion.div
            key="room"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          >
            <StudyRoom settings={settings} onBack={() => setView('setup')} onHome={() => setView('home')} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
