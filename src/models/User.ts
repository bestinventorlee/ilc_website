import { readDatabase, writeDatabase } from '../database/db.js'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  name: string
  email: string
  password: string
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
  created_at: string
  updated_at: string
}

/**
 * 이메일로 사용자 찾기
 */
export const findUserByEmail = (email: string): User | undefined => {
  const users = readDatabase()
  return users.find((user) => user.email === email) as User | undefined
}

/**
 * ID로 사용자 찾기
 */
export const findUserById = (id: number): User | undefined => {
  const users = readDatabase()
  return users.find((user) => user.id === id) as User | undefined
}

/**
 * 새 사용자 생성
 */
export const createUser = async (data: CreateUserData): Promise<UserWithoutPassword> => {
  // 비밀번호 해싱
  const hashedPassword = await bcrypt.hash(data.password, 10)

  const users = readDatabase()
  
  // 새 ID 생성
  const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1
  
  const now = new Date().toISOString()
  
  const newUser: User = {
    id: newId,
    name: data.name,
    email: data.email,
    password: hashedPassword,
    created_at: now,
    updated_at: now,
  }

  users.push(newUser)
  writeDatabase(users)

  // 생성된 사용자 정보 반환 (비밀번호 제외)
  const { password, ...userWithoutPassword } = newUser
  return userWithoutPassword as UserWithoutPassword
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

