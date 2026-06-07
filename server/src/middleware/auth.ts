import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'

export interface AuthRequest extends Request {
  userId?: number
  username?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    req.userId = decoded.userId
    req.username = decoded.username

    next()
  } catch (error) {
    return res.status(401).json({ error: '认证令牌无效或已过期' })
  }
}
