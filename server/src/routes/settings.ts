import { Router, Response } from 'express'
import pool from '../config/database.js'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get user settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId!]
    )

    const userSettings = (settings as any[])[0]

    if (!userSettings) {
      return res.status(404).json({ error: '未找到用户设置' })
    }

    res.json({ settings: userSettings })
  } catch (error) {
    console.error('Get settings failed:', error)
    res.status(500).json({ error: '获取设置失败' })
  }
})

// Update user settings
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { background_photo, music_volume, ambient_volume, timer_mode, duration } = req.body

    await pool.execute(
      `UPDATE user_settings 
       SET background_photo = ?, music_volume = ?, ambient_volume = ?, timer_mode = ?, duration = ?
       WHERE user_id = ?`,
      [background_photo, music_volume, ambient_volume, timer_mode, duration, userId]
    )

    res.json({ message: '设置更新成功' })
  } catch (error) {
    console.error('Update settings failed:', error)
    res.status(500).json({ error: '更新设置失败' })
  }
})

export default router
