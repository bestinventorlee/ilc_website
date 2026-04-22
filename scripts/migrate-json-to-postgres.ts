import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, initDatabase, closeDatabase } from '../src/database/db.js'

interface JsonUser {
  id: number
  name: string
  email: string
  password: string
  created_at: string
  updated_at: string
}

interface JsonRefreshToken {
  token: string
  userId: number
  email: string
  createdAt: string
  expiresAt: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const usersPath = path.join(__dirname, '../data/users.json')
const refreshTokensPath = path.join(__dirname, '../data/refresh_tokens.json')

const readJson = <T>(filePath: string): T[] => {
  if (!fs.existsSync(filePath)) {
    return []
  }
  const raw = fs.readFileSync(filePath, 'utf-8')
  if (!raw.trim()) {
    return []
  }
  return JSON.parse(raw) as T[]
}

const migrate = async () => {
  try {
    await initDatabase()
    const users = readJson<JsonUser>(usersPath)
    const refreshTokens = readJson<JsonRefreshToken>(refreshTokensPath)

    console.log(`users.json rows: ${users.length}`)
    console.log(`refresh_tokens.json rows: ${refreshTokens.length}`)

    await query('BEGIN')

    for (const user of users) {
      const role = user.email === 'admin@ilc.com' || user.email.endsWith('@admin.ilc.com') ? 'admin' : 'user'
      await query(
        `INSERT INTO users (id, name, email, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             email = EXCLUDED.email,
             password = EXCLUDED.password,
             role = EXCLUDED.role,
             updated_at = EXCLUDED.updated_at`,
        [user.id, user.name, user.email, user.password, role, user.created_at, user.updated_at]
      )
    }

    for (const token of refreshTokens) {
      await query(
        `INSERT INTO refresh_tokens (token, user_id, email, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             email = EXCLUDED.email,
             created_at = EXCLUDED.created_at,
             expires_at = EXCLUDED.expires_at`,
        [token.token, token.userId, token.email, token.createdAt, token.expiresAt]
      )
    }

    await query(
      `SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true)`
    )
    await query(
      `SELECT setval('memberships_id_seq', COALESCE((SELECT MAX(id) FROM memberships), 1), true)`
    )
    await query(`SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1), true)`)
    await query(
      `SELECT setval('library_items_id_seq', COALESCE((SELECT MAX(id) FROM library_items), 1), true)`
    )
    await query(
      `SELECT setval('contacts_id_seq', COALESCE((SELECT MAX(id) FROM contacts), 1), true)`
    )

    await query('COMMIT')
    console.log('✅ JSON -> PostgreSQL 마이그레이션 완료')
  } catch (error) {
    await query('ROLLBACK')
    console.error('❌ 마이그레이션 실패:', error)
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}

migrate()
