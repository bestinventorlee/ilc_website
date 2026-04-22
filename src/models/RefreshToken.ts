import { query } from '../database/db.js'

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
export const saveRefreshToken = async (token: string, userId: number, email: string): Promise<void> => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15일 후
  await query(
    `INSERT INTO refresh_tokens (token, user_id, email, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, userId, email, now.toISOString(), expiresAt.toISOString()]
  )
}

/**
 * Refresh Token 찾기
 */
export const findRefreshToken = async (token: string): Promise<RefreshTokenData | undefined> => {
  const result = await query<{
    token: string
    user_id: number
    email: string
    created_at: string
    expires_at: string
  }>(
    `SELECT token, user_id, email, created_at, expires_at
     FROM refresh_tokens
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  )
  const row = result.rows[0]
  if (!row) return undefined
  return {
    token: row.token,
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

/**
 * 사용자의 모든 Refresh Token 삭제 (로그아웃 시)
 */
export const deleteUserRefreshTokens = async (userId: number): Promise<void> => {
  await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId])
}

/**
 * 특정 Refresh Token 삭제
 */
export const deleteRefreshToken = async (token: string): Promise<void> => {
  await query(`DELETE FROM refresh_tokens WHERE token = $1`, [token])
}

/**
 * 만료된 토큰 정리
 */
export const cleanupExpiredTokens = async (): Promise<void> => {
  await query(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`)
}

