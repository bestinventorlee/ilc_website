import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'

/**
 * 보안 헤더 설정 미들웨어
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // XSS 방지
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // HTTPS 강제 (프로덕션)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  next()
}

/**
 * 인증 관련 Rate Limiting
 * 15분에 최대 5회 시도
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 최대 5회
  message: {
    success: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * 일반 API Rate Limiting
 * 15분에 최대 100회 요청
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100회
  message: {
    success: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * 환경 변수 검증
 */
export const validateEnvironment = (): void => {
  const requiredEnvVars = ['JWT_SECRET']

  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER')
    requiredEnvVars.forEach((varName) => {
      if (!process.env[varName]) {
        throw new Error(
          `프로덕션 환경에서는 ${varName} 환경 변수가 필수입니다.`
        )
      }
    })

    // JWT_SECRET 강도 검증
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.warn(
        '⚠️  경고: JWT_SECRET이 너무 짧습니다. 최소 32자 이상을 권장합니다.'
      )
    }
  }
}

