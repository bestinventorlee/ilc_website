import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { initDatabase } from './database/db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import contentRoutes from './routes/content.js'
import communityRoutes from './routes/community.js'
import membershipRoutes from './routes/memberships.js'
import libraryRoutes from './routes/library.js'
import {
  securityHeaders,
  validateEnvironment,
  apiRateLimiter,
} from './middleware/security.js'

const app = express()
const PORT = process.env.PORT || 3000

// Nginx/ALB 같은 리버스 프록시 뒤에서 실제 클라이언트 IP를 신뢰
app.set('trust proxy', 1)

// 환경 변수 검증
validateEnvironment()

// 보안 헤더 설정
app.use(securityHeaders)

// 미들웨어
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/files', express.static(path.resolve(process.cwd(), 'uploads')))

// Rate Limiting (일반 API)
app.use('/api', apiRateLimiter)

// 라우트
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/memberships', membershipRoutes)
app.use('/api/library', libraryRoutes)

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ILC 회원 포털 API 서버' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ILC 회원 포털 API 서버' })
})

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
  })
})

// 에러 핸들러
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('서버 오류:', err)
  res.status(500).json({
    success: false,
    message: '서버 오류가 발생했습니다.',
  })
})

const startServer = async () => {
  try {
    await initDatabase()
    app.listen(PORT, () => {
      console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`)
      console.log('📊 데이터베이스: PostgreSQL')
    })
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error)
    process.exit(1)
  }
}

startServer()

