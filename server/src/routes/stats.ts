import { Router, Response } from 'express'
import pool from '../config/database.js'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get study stats
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const [stats] = await pool.execute(
      'SELECT * FROM study_stats WHERE user_id = ?',
      [userId!]
    )

    const userStats = (stats as any[])[0]

    if (!userStats) {
      return res.status(404).json({ error: '未找到统计数据' })
    }

    res.json({ stats: userStats })
  } catch (error) {
    console.error('Get stats failed:', error)
    res.status(500).json({ error: '获取统计失败' })
  }
})

// Update study stats
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { today_minutes, total_minutes, completed_pomodoros, streak, last_study_date } = req.body

    await pool.execute(
      `UPDATE study_stats 
       SET today_minutes = ?, total_minutes = ?, completed_pomodoros = ?, streak = ?, last_study_date = ?
       WHERE user_id = ?`,
      [today_minutes, total_minutes, completed_pomodoros, streak, last_study_date, userId!]
    )

    res.json({ message: '统计更新成功' })
  } catch (error) {
    console.error('Update stats failed:', error)
    res.status(500).json({ error: '更新统计失败' })
  }
})

// Record pomodoro completion
router.post('/pomodoro', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { duration } = req.body

    const [stats] = await pool.execute(
      'SELECT * FROM study_stats WHERE user_id = ?',
      [userId!]
    )

    const userStats = (stats as any[])[0]

    if (!userStats) {
      return res.status(404).json({ error: '未找到统计数据' })
    }

    const today = new Date().toISOString().split('T')[0]
    let newStreak = userStats.streak

    if (userStats.last_study_date) {
      const lastDate = new Date(userStats.last_study_date)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        newStreak = userStats.streak + 1
      } else if (diffDays > 1) {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    await pool.execute(
      `UPDATE study_stats 
       SET today_minutes = today_minutes + ?, 
           total_minutes = total_minutes + ?, 
           completed_pomodoros = completed_pomodoros + 1,
           streak = ?,
           last_study_date = ?
       WHERE user_id = ?`,
       [duration, duration, newStreak, today, userId!]
    )

    res.json({ message: '番茄钟记录成功' })
  } catch (error) {
    console.error('Record pomodoro failed:', error)
    res.status(500).json({ error: '记录番茄钟失败' })
  }
})

// Record break
router.post('/break', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { reason } = req.body

    await pool.execute(
      'INSERT INTO break_records (user_id, reason) VALUES (?, ?)',
      [userId, reason]
    )

    res.json({ message: '休息记录成功' })
  } catch (error) {
    console.error('Record break failed:', error)
    res.status(500).json({ error: '记录休息失败' })
  }
})

export default router
