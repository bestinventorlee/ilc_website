import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool, QueryResult, QueryResultRow } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const schemaPath = path.join(__dirname, './schema.sql')

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'ilc_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
})

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params)
}

export const getPool = (): Pool => pool

export const initDatabase = async (): Promise<void> => {
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
  await pool.query(schemaSql)
  console.log('✅ PostgreSQL 스키마 초기화 완료')
}

export const closeDatabase = async (): Promise<void> => {
  await pool.end()
}

