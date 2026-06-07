import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase } from './models/index.js'
import { authMiddleware } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import settingsRoutes from './routes/settings.js'
import statsRoutes from './routes/stats.js'
import plansRoutes from './routes/plans.js'
import sessionsRoutes from './routes/sessions.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}))
app.use(express.json())

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/settings', authMiddleware, settingsRoutes)
app.use('/api/stats', authMiddleware, statsRoutes)
app.use('/api/plans', authMiddleware, plansRoutes)
app.use('/api/sessions', authMiddleware, sessionsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Static files (frontend build)
const distPath = path.join(__dirname, '../../dist')
app.use(express.static(distPath))

// All non-API routes return index.html (support frontend routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'))
  }
})

// Start server
async function start() {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`)
      console.log(`📁 Serving frontend from: ${distPath}`)
    })
  } catch (error) {
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

start()
