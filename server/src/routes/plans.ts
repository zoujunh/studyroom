import { Router, Response } from 'express'
import pool from '../config/database.js'
import { AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get user plans
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const [plans] = await pool.execute(
      'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC',
      [userId!]
    )

    res.json({ plans })
  } catch (error) {
    console.error('Get plans failed:', error)
    res.status(500).json({ error: '获取计划失败' })
  }
})

// Create plan
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const { title, time } = req.body

    if (!title) {
      return res.status(400).json({ error: '计划标题不能为空' })
    }

    const [result] = await pool.execute(
      'INSERT INTO study_plans (user_id, title, time) VALUES (?, ?, ?)',
      [userId!, title, time || '待定']
    )

    const planId = (result as any).insertId

    res.status(201).json({
      message: '计划创建成功',
      plan: { id: planId, title, time: time || '待定', completed: false }
    })
  } catch (error) {
    console.error('Create plan failed:', error)
    res.status(500).json({ error: '创建计划失败' })
  }
})

// Update plan status
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const planId = req.params.id
    const { completed } = req.body

    await pool.execute(
      'UPDATE study_plans SET completed = ? WHERE id = ? AND user_id = ?',
      [completed, planId, userId!]
    )

    res.json({ message: '计划更新成功' })
  } catch (error) {
    console.error('Update plan failed:', error)
    res.status(500).json({ error: '更新计划失败' })
  }
})

// Delete plan
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId
    const planId = req.params.id

    await pool.execute(
      'DELETE FROM study_plans WHERE id = ? AND user_id = ?',
      [planId, userId!]
    )

    res.json({ message: '计划删除成功' })
  } catch (error) {
    console.error('Delete plan failed:', error)
    res.status(500).json({ error: '删除计划失败' })
  }
})

export default router
