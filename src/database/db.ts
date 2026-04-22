import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 데이터베이스 파일 경로
const dbPath = path.join(__dirname, '../../data/users.json')

// Refresh Token 저장 파일 경로
const refreshTokenPath = path.join(__dirname, '../../data/refresh_tokens.json')

// 데이터베이스 초기화
export const initDatabase = () => {
  // data 디렉토리가 없으면 생성
  const dataDir = path.dirname(dbPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // users.json 파일이 없으면 생성
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify([], null, 2), 'utf-8')
    console.log('✅ 사용자 데이터베이스 파일 생성 완료')
  } else {
    console.log('✅ 사용자 데이터베이스 파일 로드 완료')
  }

  // refresh_tokens.json 파일이 없으면 생성
  if (!fs.existsSync(refreshTokenPath)) {
    fs.writeFileSync(refreshTokenPath, JSON.stringify([], null, 2), 'utf-8')
    console.log('✅ Refresh Token 데이터베이스 파일 생성 완료')
  } else {
    console.log('✅ Refresh Token 데이터베이스 파일 로드 완료')
  }
}

// 데이터베이스 파일 읽기
export const readDatabase = (): any[] => {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// 데이터베이스 파일 쓰기
export const writeDatabase = (data: any[]): void => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
}

// Refresh Token 데이터베이스 읽기
export const readRefreshTokens = (): any[] => {
  try {
    const data = fs.readFileSync(refreshTokenPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// Refresh Token 데이터베이스 쓰기
export const writeRefreshTokens = (data: any[]): void => {
  fs.writeFileSync(refreshTokenPath, JSON.stringify(data, null, 2), 'utf-8')
}

// 데이터베이스 경로 내보내기 (필요시)
export default dbPath

