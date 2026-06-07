# 用户登录系统 + MySQL 数据存储 - 执行计划

> 创建日期：2026-06-06
> 状态：待执行

## 目标

为学习室项目添加用户登录系统，使用 MySQL 存储用户数据，实现数据持久化和用户偏好同步。

---

## 技术架构

```
前端 (React + TypeScript) - 端口 5173
    ↓ API 调用 (fetch/axios)
后端 (Node.js + Express + TypeScript) - 端口 3001
    ↓ 数据库操作 (mysql2)
MySQL (localhost:3306/studyroom)
```

---

## 阶段 1：后端搭建

### 任务 1：创建后端项目结构

**目录结构：**
```
server/
├── src/
│   ├── index.ts              # 入口文件
│   ├── config/
│   │   └── database.ts       # 数据库配置
│   ├── middleware/
│   │   └── auth.ts           # JWT 鉴权中间件
│   ├── routes/
│   │   ├── auth.ts           # 注册/登录路由
│   │   ├── settings.ts       # 用户设置路由
│   │   ├── stats.ts          # 学习统计路由
│   │   ├── plans.ts          # 学习计划路由
│   │   └── breaks.ts         # 休息记录路由
│   ├── models/
│   │   └── index.ts          # 数据库模型
│   └── utils/
│       └── jwt.ts            # JWT 工具函数
├── package.json
├── tsconfig.json
└── .env                      # 环境变量
```

**依赖包：**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.13",
    "typescript": "^5.1.6",
    "ts-node": "^10.9.1"
  }
}
```

---

### 任务 2：配置 MySQL 连接

**文件：** `server/src/config/database.ts`

```typescript
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'studyroom',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export default pool
```

**文件：** `server/.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=studyroom
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3001
```

---

### 任务 3：创建数据库表

**文件：** `server/src/models/index.ts`

```typescript
import pool from '../config/database'

export async function initDatabase() {
  const connection = await pool.getConnection()
  
  try {
    // 用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 用户设置表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        background_photo VARCHAR(255),
        music_volume INT DEFAULT 60,
        ambient_volume INT DEFAULT 40,
        timer_mode VARCHAR(20) DEFAULT 'countdown',
        duration INT DEFAULT 25,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
    `)

    // 学习统计表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_stats (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        today_minutes INT DEFAULT 0,
        total_minutes INT DEFAULT 0,
        completed_pomodoros INT DEFAULT 0,
        streak INT DEFAULT 0,
        last_study_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
    `)

    // 学习计划表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_plans (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        time VARCHAR(50),
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // 休息记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS break_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        reason VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    console.log('✅ 数据库表初始化完成')
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error)
    throw error
  } finally {
    connection.release()
  }
}
```

---

### 任务 4：实现用户注册 API

**文件：** `server/src/routes/auth.ts`

```typescript
import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../config/database'

const router = Router()

// 注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需要 2-20 个字符' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 个字符' })
    }

    // 检查用户名是否已存在
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    if ((existing as any[]).length > 0) {
      return res.status(400).json({ error: '用户名已存在' })
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    )

    const userId = (result as any).insertId

    // 创建默认设置
    await pool.execute(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    )

    // 创建默认统计
    await pool.execute(
      'INSERT INTO study_stats (user_id) VALUES (?)',
      [userId]
    )

    // 生成 JWT
    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, username }
    })
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    // 查找用户
    const [users] = await pool.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      [username]
    )

    const user = (users as any[])[0]

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      message: '登录成功',
      token,
      user: { id: user.id, username: user.username }
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// 获取当前用户信息
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const [users] = await pool.execute(
      'SELECT id, username, created_at FROM users WHERE id = ?',
      [userId]
    )

    const user = (users as any[])[0]

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ user })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

export default router
```

---

### 任务 5：实现 JWT 鉴权中间件

**文件：** `server/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as { userId: number; username: string }

    ;(req as any).userId = decoded.userId
    ;(req as any).username = decoded.username

    next()
  } catch (error) {
    return res.status(401).json({ error: '认证令牌无效或已过期' })
  }
}
```

---

### 任务 6：实现用户设置 API

**文件：** `server/src/routes/settings.ts`

```typescript
import { Router, Request, Response } from 'express'
import pool from '../config/database'

const router = Router()

// 获取用户设置
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const [settings] = await pool.execute(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    )

    const userSettings = (settings as any[])[0]

    if (!userSettings) {
      return res.status(404).json({ error: '未找到用户设置' })
    }

    res.json({ settings: userSettings })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({ error: '获取设置失败' })
  }
})

// 更新用户设置
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { background_photo, music_volume, ambient_volume, timer_mode, duration } = req.body

    await pool.execute(
      `UPDATE user_settings 
       SET background_photo = ?, music_volume = ?, ambient_volume = ?, timer_mode = ?, duration = ?
       WHERE user_id = ?`,
      [background_photo, music_volume, ambient_volume, timer_mode, duration, userId]
    )

    res.json({ message: '设置更新成功' })
  } catch (error) {
    console.error('更新设置失败:', error)
    res.status(500).json({ error: '更新设置失败' })
  }
})

export default router
```

---

### 任务 7：实现学习统计 API

**文件：** `server/src/routes/stats.ts`

```typescript
import { Router, Request, Response } from 'express'
import pool from '../config/database'

const router = Router()

// 获取学习统计
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const [stats] = await pool.execute(
      'SELECT * FROM study_stats WHERE user_id = ?',
      [userId]
    )

    const userStats = (stats as any[])[0]

    if (!userStats) {
      return res.status(404).json({ error: '未找到统计数据' })
    }

    res.json({ stats: userStats })
  } catch (error) {
    console.error('获取统计失败:', error)
    res.status(500).json({ error: '获取统计失败' })
  }
})

// 更新学习统计
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { today_minutes, total_minutes, completed_pomodoros, streak, last_study_date } = req.body

    await pool.execute(
      `UPDATE study_stats 
       SET today_minutes = ?, total_minutes = ?, completed_pomodoros = ?, streak = ?, last_study_date = ?
       WHERE user_id = ?`,
      [today_minutes, total_minutes, completed_pomodoros, streak, last_study_date, userId]
    )

    res.json({ message: '统计更新成功' })
  } catch (error) {
    console.error('更新统计失败:', error)
    res.status(500).json({ error: '更新统计失败' })
  }
})

// 记录番茄钟完成
router.post('/pomodoro', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { duration } = req.body

    const [stats] = await pool.execute(
      'SELECT * FROM study_stats WHERE user_id = ?',
      [userId]
    )

    const userStats = (stats as any[])[0]

    if (!userStats) {
      return res.status(404).json({ error: '未找到统计数据' })
    }

    // 计算连续天数
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
      [duration, duration, newStreak, today, userId]
    )

    res.json({ message: '番茄钟记录成功' })
  } catch (error) {
    console.error('记录番茄钟失败:', error)
    res.status(500).json({ error: '记录番茄钟失败' })
  }
})

// 记录休息
router.post('/break', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { reason } = req.body

    await pool.execute(
      'INSERT INTO break_records (user_id, reason) VALUES (?, ?)',
      [userId, reason]
    )

    res.json({ message: '休息记录成功' })
  } catch (error) {
    console.error('记录休息失败:', error)
    res.status(500).json({ error: '记录休息失败' })
  }
})

export default router
```

---

### 任务 8：实现学习计划 API

**文件：** `server/src/routes/plans.ts`

```typescript
import { Router, Request, Response } from 'express'
import pool from '../config/database'

const router = Router()

// 获取用户计划
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const [plans] = await pool.execute(
      'SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )

    res.json({ plans })
  } catch (error) {
    console.error('获取计划失败:', error)
    res.status(500).json({ error: '获取计划失败' })
  }
})

// 创建计划
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const { title, time } = req.body

    if (!title) {
      return res.status(400).json({ error: '计划标题不能为空' })
    }

    const [result] = await pool.execute(
      'INSERT INTO study_plans (user_id, title, time) VALUES (?, ?, ?)',
      [userId, title, time || '待定']
    )

    const planId = (result as any).insertId

    res.status(201).json({
      message: '计划创建成功',
      plan: { id: planId, title, time: time || '待定', completed: false }
    })
  } catch (error) {
    console.error('创建计划失败:', error)
    res.status(500).json({ error: '创建计划失败' })
  }
})

// 更新计划状态
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const planId = req.params.id
    const { completed } = req.body

    await pool.execute(
      'UPDATE study_plans SET completed = ? WHERE id = ? AND user_id = ?',
      [completed, planId, userId]
    )

    res.json({ message: '计划更新成功' })
  } catch (error) {
    console.error('更新计划失败:', error)
    res.status(500).json({ error: '更新计划失败' })
  }
})

// 删除计划
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const planId = req.params.id

    await pool.execute(
      'DELETE FROM study_plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    )

    res.json({ message: '计划删除成功' })
  } catch (error) {
    console.error('删除计划失败:', error)
    res.status(500).json({ error: '删除计划失败' })
  }
})

export default router
```

---

### 任务 9：创建后端入口文件

**文件：** `server/src/index.ts`

```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDatabase } from './models'
import { authMiddleware } from './middleware/auth'
import authRoutes from './routes/auth'
import settingsRoutes from './routes/settings'
import statsRoutes from './routes/stats'
import plansRoutes from './routes/plans'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json())

// 公开路由
app.use('/api/auth', authRoutes)

// 需要认证的路由
app.use('/api/settings', authMiddleware, settingsRoutes)
app.use('/api/stats', authMiddleware, statsRoutes)
app.use('/api/plans', authMiddleware, plansRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动服务器
async function start() {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`✅ 服务器运行在 http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ 服务器启动失败:', error)
    process.exit(1)
  }
}

start()
```

---

## 阶段 2：前端对接

### 任务 10：创建登录页面

**文件：** `src/pages/Login.tsx`

- 用户名输入框
- 密码输入框
- 登录按钮
- 跳转注册链接

### 任务 11：创建注册页面

**文件：** `src/pages/Register.tsx`

- 用户名输入框
- 密码输入框
- 确认密码输入框
- 注册按钮
- 跳转登录链接

### 任务 12：实现 Token 存储

**文件：** `src/utils/auth.ts`

```typescript
const TOKEN_KEY = 'studyroom-token'
const USER_KEY = 'studyroom-user'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function getUser(): { id: number; username: string } | null {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setUser(user: { id: number; username: string }): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}
```

### 任务 13：创建 API 客户端

**文件：** `src/utils/api.ts`

```typescript
import { getToken } from './auth'

const API_BASE = 'http://localhost:3001/api'

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '请求失败')
  }

  return response.json()
}

export const api = {
  // 认证
  login: (username: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request('/auth/me'),

  // 设置
  getSettings: () => request('/settings'),
  updateSettings: (settings: any) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // 统计
  getStats: () => request('/stats'),
  updateStats: (stats: any) =>
    request('/stats', {
      method: 'PUT',
      body: JSON.stringify(stats),
    }),
  recordPomodoro: (duration: number) =>
    request('/stats/pomodoro', {
      method: 'POST',
      body: JSON.stringify({ duration }),
    }),
  recordBreak: (reason: string) =>
    request('/stats/break', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // 计划
  getPlans: () => request('/plans'),
  createPlan: (title: string, time: string) =>
    request('/plans', {
      method: 'POST',
      body: JSON.stringify({ title, time }),
    }),
  updatePlan: (id: number, completed: boolean) =>
    request(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    }),
  deletePlan: (id: number) =>
    request(`/plans/${id}`, { method: 'DELETE' }),
}
```

### 任务 14：修改路由系统

**文件：** `src/pages/StudyApp.tsx`

- 添加 `login` 和 `register` 路由
- 未登录时跳转到登录页

### 任务 15：修改 HomePage

- 未登录：显示"登录"按钮
- 已登录：显示用户名和"退出"按钮

### 任务 16：修改 StudyRoom

- 统计数据同步到后端
- 休息记录同步到后端

### 任务 17：修改统计面板

- 从后端读取数据
- 实时更新

### 任务 18：修改计划面板

- 从后端读取数据
- CRUD 操作同步到后端

---

## 阶段 3：测试验证

### 任务 19：测试注册流程

- 注册新用户
- 验证数据库记录

### 任务 20：测试登录流程

- 登录后进入首页
- 验证 Token 存储

### 任务 21：测试数据同步

- 学习数据保存到数据库
- 验证数据一致性

### 任务 22：测试偏好同步

- 设置保存到数据库
- 重新登录后恢复设置

---

## 执行顺序

1. 创建后端项目结构
2. 配置 MySQL 连接
3. 创建数据库表
4. 实现用户认证 API
5. 实现数据 API
6. 创建前端登录/注册页面
7. 修改现有组件对接后端
8. 测试验证

---

## 注意事项

- 密码必须 bcrypt 加密存储
- JWT Token 设置合理过期时间
- 所有 API 需要错误处理
- 前端需要处理 Token 过期情况
- 数据库操作需要使用参数化查询防止 SQL 注入
