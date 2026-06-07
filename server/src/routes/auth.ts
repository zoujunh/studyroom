import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import pool from '../config/database.js'
import { signToken } from '../utils/jwt.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需要 2-20 个字符' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 个字符' })
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    if ((existing as any[]).length > 0) {
      return res.status(400).json({ error: '用户名已存在' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    )

    const userId = (result as any).insertId

    // Create default settings
    await pool.execute(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    )

    // Create default stats
    await pool.execute(
      'INSERT INTO study_stats (user_id) VALUES (?)',
      [userId]
    )

    const token = signToken({ userId, username })

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, username }
    })
  } catch (error) {
    console.error('Registration failed:', error)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const [users] = await pool.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    )

    const user = (users as any[])[0]

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const token = signToken({ userId: user.id, username: user.username })

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username }
    })
  } catch (error) {
    console.error('Login failed:', error)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId

    const [users] = await pool.execute(
      'SELECT id, username, created_at FROM users WHERE id = ?',
      [userId!]
    )

    const user = (users as any[])[0]

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user failed:', error)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

export default router
