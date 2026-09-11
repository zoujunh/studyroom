import { Router, Response } from 'express'
import pool from '../config/database.js'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get recent sessions (last 15 days, exclude 0-minute records)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0

    const [sessions] = await pool.execute(
      `SELECT * FROM study_sessions 
       WHERE user_id = ? 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 15 DAY)
         AND (duration_minutes > 0 OR status = 'studying')
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json({ sessions })
  } catch (error) {
    console.error('Get sessions failed:', error)
    res.status(500).json({ error: '获取学习记录失败' })
  }
})

// Start a new session (called when entering study room)
router.post('/start', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0
    const { goal, scene_name } = req.body

    // 先把之前未结束的 studying 记录标记为 interrupted
    await pool.execute(
      `UPDATE study_sessions 
       SET status = 'interrupted', end_time = NOW()
       WHERE user_id = ? AND status = 'studying'`,
      [userId]
    )

    // 创建新记录
    const [result] = await pool.execute(
      `INSERT INTO study_sessions (user_id, start_time, end_time, duration_minutes, goal, scene_name, status)
       VALUES (?, NOW(), NULL, 0, ?, ?, 'studying')`,
      [userId, goal || null, scene_name || null]
    )

    const sessionId = (result as any).insertId

    res.status(201).json({
      message: '学习记录已创建',
      session: { id: sessionId, status: 'studying', goal, scene_name }
    })
  } catch (error) {
    console.error('Start session failed:', error)
    res.status(500).json({ error: '创建学习记录失败' })
  }
})

// End a session (called when leaving study room normally)
router.post('/:id/end', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0
    const sessionId = req.params.id
    const { duration_minutes, goal } = req.body

    await pool.execute(
      `UPDATE study_sessions 
       SET status = 'completed', end_time = NOW(), duration_minutes = ?, goal = COALESCE(?, goal)
       WHERE id = ? AND user_id = ? AND status = 'studying'`,
      [duration_minutes || 0, goal, sessionId, userId]
    )

    res.json({ message: '学习记录已更新' })
  } catch (error) {
    console.error('End session failed:', error)
    res.status(500).json({ error: '更新学习记录失败' })
  }
})

// Get current active session (for recovery after refresh)
router.get('/active', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0

    const [sessions] = await pool.execute(
      `SELECT * FROM study_sessions 
       WHERE user_id = ? AND status = 'studying' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )

    const active = (sessions as any[])[0] || null

    res.json({ session: active })
  } catch (error) {
    console.error('Get active session failed:', error)
    res.status(500).json({ error: '获取当前学习记录失败' })
  }
})

// Create new session (legacy endpoint, keep for compatibility)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0
    const { duration, goal, scene_name } = req.body

    const [result] = await pool.execute(
      `INSERT INTO study_sessions (user_id, start_time, end_time, duration_minutes, goal, scene_name, status)
       VALUES (?, NOW(), NOW(), ?, ?, ?, 'completed')`,
      [userId, duration || 0, goal || null, scene_name || null]
    )

    const sessionId = (result as any).insertId

    res.status(201).json({
      message: '学习记录创建成功',
      session: { id: sessionId, duration, goal, scene_name }
    })
  } catch (error) {
    console.error('Create session failed:', error)
    res.status(500).json({ error: '创建学习记录失败' })
  }
})

// Update session
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0
    const sessionId = req.params.id
    const { duration, goal } = req.body

    await pool.execute(
      `UPDATE study_sessions 
       SET duration_minutes = ?, goal = ?
       WHERE id = ? AND user_id = ?`,
      [duration, goal, sessionId, userId]
    )

    res.json({ message: '学习记录更新成功' })
  } catch (error) {
    console.error('Update session failed:', error)
    res.status(500).json({ error: '更新学习记录失败' })
  }
})

export default router
