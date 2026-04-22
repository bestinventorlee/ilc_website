import { query } from '../database/db.js'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'admin' | 'user'
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  name: string
  email: string
  password: string
}

export interface UserWithoutPassword {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  last_login_at: string | null
  created_at: string
  updated_at: string
}

/**
 * 이메일로 사용자 찾기
 */
export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, email, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email]
  )
  return result.rows[0]
}

/**
 * ID로 사용자 찾기
 */
export const findUserById = async (id: number): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, email, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

export const listUsers = async (): Promise<UserWithoutPassword[]> => {
  const result = await query<UserWithoutPassword>(
    `SELECT id, name, email, role, last_login_at, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  )
  return result.rows
}

export const updateLastLoginAt = async (id: number): Promise<void> => {
  await query(
    `UPDATE users
     SET last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
}

/**
 * 새 사용자 생성
 */
export const createUser = async (data: CreateUserData): Promise<UserWithoutPassword> => {
  const hashedPassword = await bcrypt.hash(data.password, 10)
  const role = data.email === 'admin@ilc.com' || data.email.endsWith('@admin.ilc.com') ? 'admin' : 'user'
  const result = await query<UserWithoutPassword>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, last_login_at, created_at, updated_at`,
    [data.name, data.email, hashedPassword, role]
  )
  return result.rows[0]
}

/**
 * 비밀번호 검증
 */
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword)
}

