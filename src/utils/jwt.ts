import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// JWT 시크릿 키 (환경 변수에서 가져오거나 기본값 사용)
// 프로덕션에서는 반드시 환경 변수로 설정해야 함
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('프로덕션 환경에서는 JWT_SECRET 환경 변수가 필수입니다.')
      })()
    : 'ilc-member-portal-secret-key-change-in-production')

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '-refresh'

// 프로덕션 환경에서 시크릿 키 강도 검증
if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
  console.warn('⚠️  경고: JWT_SECRET이 너무 짧습니다. 최소 32자 이상을 권장합니다.')
}

// 토큰 만료 시간 설정
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' // 15분
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '15d' // 15일

export interface TokenPayload {
  userId: number
  email: string
  name: string
  role: 'admin' | 'user'
}

/**
 * Access Token 생성 (짧은 만료 시간)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * Refresh Token 생성 (긴 만료 시간, 랜덤 문자열)
 */
export const generateRefreshToken = (): string => {
  // 랜덤한 64바이트 문자열 생성
  return crypto.randomBytes(64).toString('hex')
}

/**
 * Refresh Token을 JWT로 서명 (선택사항 - 현재는 랜덤 문자열 사용)
 */
export const generateRefreshTokenJWT = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * Access Token 검증
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access Token이 만료되었습니다.')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('유효하지 않은 Access Token입니다.')
    }
    throw new Error('Access Token 검증 중 오류가 발생했습니다.')
  }
}

/**
 * Refresh Token 검증 (JWT 방식인 경우)
 */
export const verifyRefreshTokenJWT = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh Token이 만료되었습니다. 다시 로그인해주세요.')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('유효하지 않은 Refresh Token입니다.')
    }
    throw new Error('Refresh Token 검증 중 오류가 발생했습니다.')
  }
}

/**
 * 기존 함수 호환성을 위한 래퍼 (deprecated)
 * @deprecated generateAccessToken 사용 권장
 */
export const generateToken = (payload: TokenPayload): string => {
  return generateAccessToken(payload)
}

/**
 * 기존 함수 호환성을 위한 래퍼 (deprecated)
 * @deprecated verifyAccessToken 사용 권장
 */
export const verifyToken = (token: string): TokenPayload => {
  return verifyAccessToken(token)
}

/**
 * Authorization 헤더에서 토큰 추출
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null
  }

  // "Bearer <token>" 형식에서 토큰 추출
  const parts = authHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]
  }

  return null
}

