import { readRefreshTokens, writeRefreshTokens } from '../database/db.js'

export interface RefreshTokenData {
  token: string
  userId: number
  email: string
  createdAt: string
  expiresAt: string
}

/**
 * Refresh Token 저장
 */
export const saveRefreshToken = (token: string, userId: number, email: string): void => {
  const tokens = readRefreshTokens()
  
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15일 후

  const tokenData: RefreshTokenData = {
    token,
    userId,
    email,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  tokens.push(tokenData)
  writeRefreshTokens(tokens)
}

/**
 * Refresh Token 찾기
 */
export const findRefreshToken = (token: string): RefreshTokenData | undefined => {
  const tokens = readRefreshTokens()
  return tokens.find((t) => t.token === token && new Date(t.expiresAt) > new Date())
}

/**
 * 사용자의 모든 Refresh Token 삭제 (로그아웃 시)
 */
export const deleteUserRefreshTokens = (userId: number): void => {
  const tokens = readRefreshTokens()
  const filteredTokens = tokens.filter((t) => t.userId !== userId)
  writeRefreshTokens(filteredTokens)
}

/**
 * 특정 Refresh Token 삭제
 */
export const deleteRefreshToken = (token: string): void => {
  const tokens = readRefreshTokens()
  const filteredTokens = tokens.filter((t) => t.token !== token)
  writeRefreshTokens(filteredTokens)
}

/**
 * 만료된 토큰 정리
 */
export const cleanupExpiredTokens = (): void => {
  const tokens = readRefreshTokens()
  const now = new Date()
  const validTokens = tokens.filter((t) => new Date(t.expiresAt) > now)
  writeRefreshTokens(validTokens)
}

