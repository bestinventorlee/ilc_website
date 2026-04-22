import { Request, Response, NextFunction } from 'express'
import { findUserById } from '../models/User.js'

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      })
      return
    }

    const user = await findUserById(req.user.userId)
    if (!user || user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.',
      })
      return
    }

    next()
  } catch (error) {
    console.error('관리자 권한 확인 오류:', error)
    res.status(500).json({
      success: false,
      message: '권한 확인 중 오류가 발생했습니다.',
    })
  }
}
