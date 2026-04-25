import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool, QueryResult, QueryResultRow } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 빌드 산출물(dist) 또는 tsx(src)에서 schema.sql 위치를 찾습니다. */
function resolveSchemaPath(): string {
  const coLocated = path.join(__dirname, 'schema.sql')
  if (fs.existsSync(coLocated)) {
    return coLocated
  }
  const fromServerSrc = path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql')
  if (fs.existsSync(fromServerSrc)) {
    return fromServerSrc
  }
  throw new Error(
    `schema.sql을 찾을 수 없습니다. 다음 경로를 확인하세요: ${coLocated}, ${fromServerSrc}`
  )
}

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

/** 세미콜론으로 구분된 DDL을 순서대로 실행합니다(프록시/PgBouncer에서 다중 문장 한 번 실행이 막히는 경우 대비). */
function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export const initDatabase = async (): Promise<void> => {
  const schemaPath = resolveSchemaPath()
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
  const statements = splitSqlStatements(schemaSql)
  for (const statement of statements) {
    await pool.query(statement)
  }
  console.log('✅ PostgreSQL 스키마 초기화 완료')
}

export const closeDatabase = async (): Promise<void> => {
  await pool.end()
}

