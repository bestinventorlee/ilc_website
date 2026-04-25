import { Request, Response, NextFunction } from 'express'
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt.js'

// Request 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number
        username: string
        email?: string
        name: string
        role: 'admin' | 'user'
      }
    }
  }
}

/**
 * JWT 토큰 검증 미들웨어
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.',
      })
      return
    }

    // Access Token 검증
    const payload = verifyAccessToken(token)
    
    // 요청 객체에 사용자 정보 추가
    req.user = {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    }

    next()
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        message: error.message,
      })
      return
    }

    res.status(401).json({
      success: false,
      message: '인증에 실패했습니다.',
    })
  }
}

