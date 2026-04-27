import { query } from '../database/db.js'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  name: string
  username: string
  email: string | null
  token_balance: number
  wallet_address: string | null
  password: string
  role: 'admin' | 'user'
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  name: string
  username: string
  email?: string
  password: string
}

export interface UserWithoutPassword {
  id: number
  name: string
  username: string
  email: string | null
  token_balance: number
  wallet_address: string | null
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
    `SELECT id, name, username, email, token_balance, wallet_address, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  )
  return result.rows[0]
}

/**
 * ID로 사용자 찾기
 */
export const findUserById = async (id: number): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, username, email, token_balance, wallet_address, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

export const listUsers = async (): Promise<UserWithoutPassword[]> => {
  const result = await query<UserWithoutPassword>(
    `SELECT id, name, username, email, token_balance, wallet_address, role, last_login_at, created_at, updated_at
     FROM users
     ORDER BY created_at DESC`
  )
  return result.rows
}

export const findUserByUsername = async (username: string): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, username, email, token_balance, wallet_address, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE username = $1`,
    [username]
  )
  return result.rows[0]
}

export const findUserByNameAndEmail = async (
  name: string,
  email: string
): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, username, email, token_balance, wallet_address, password, role, last_login_at, created_at, updated_at
     FROM users
     WHERE LOWER(name) = LOWER($1) AND LOWER(email) = LOWER($2)
     LIMIT 1`,
    [name, email]
  )
  return result.rows[0]
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
  const email = data.email?.trim() || null
  const role =
    email && (email === 'admin@ilc.com' || email.endsWith('@admin.ilc.com')) ? 'admin' : 'user'
  const result = await query<UserWithoutPassword>(
    `INSERT INTO users (name, username, email, password, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, username, email, token_balance, wallet_address, role, last_login_at, created_at, updated_at`,
    [data.name, data.username, email, hashedPassword, role]
  )
  return result.rows[0]
}

export const updateUserWalletAddress = async (
  id: number,
  walletAddress: string
): Promise<UserWithoutPassword | undefined> => {
  const result = await query<UserWithoutPassword>(
    `UPDATE users
     SET wallet_address = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, username, email, token_balance, wallet_address, role, last_login_at, created_at, updated_at`,
    [id, walletAddress]
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

