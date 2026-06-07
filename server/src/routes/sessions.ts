import { Router, Response } from 'express'
import pool from '../config/database.js'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get recent sessions (last 15 days)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || 0

    const [sessions] = await pool.execute(
      `SELECT * FROM study_sessions 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 15 DAY)
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json({ sessions })
  } catch (error) {
    console.error('Get sessions failed:', error)
    res.status(500).json({ error: '获取学习记录失败' })
  }
})

// Create new session
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { duration, goal, scene_name } = req.body

    const [result] = await pool.execute(
      `INSERT INTO study_sessions (user_id, start_time, duration_minutes, goal, scene_name)
       VALUES (?, NOW(), ?, ?, ?)`,
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
    const userId = req.userId
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
