import express from 'express'
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByNameAndEmail,
  findUserByUsername,
  updateLastLoginAt,
  verifyPassword,
} from '../models/User.js'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'
import { deleteRefreshToken, findRefreshToken, saveRefreshToken } from '../models/RefreshToken.js'
import { authRateLimiter } from '../middleware/security.js'

const router = express.Router()

// 인증 관련 Rate Limiting 적용
router.use(authRateLimiter)

/**
 * 아이디(Username) 중복 확인
 * GET /api/auth/check-username?username=...
 */
router.get('/check-username', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim()
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '아이디를 입력해주세요.',
      })
    }

    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: '아이디는 4~20자 영문, 숫자, 언더스코어(_)만 가능합니다.',
      })
    }

    const existingUser = await findUserByUsername(username)
    res.json({
      success: true,
      message: existingUser ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.',
      data: {
        available: !existingUser,
      },
    })
  } catch (error) {
    console.error('아이디 중복 확인 오류:', error)
    res.status(500).json({
      success: false,
      message: '아이디 중복 확인 중 오류가 발생했습니다.',
    })
  }
})

/**
 * 아이디 찾기
 * POST /api/auth/find-username
 */
router.post('/find-username', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim()

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: '이름과 이메일을 모두 입력해주세요.',
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '올바른 이메일 형식을 입력해주세요.',
      })
    }

    const user = await findUserByNameAndEmail(name, email)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '일치하는 회원 정보를 찾을 수 없습니다.',
      })
    }

    res.json({
      success: true,
      message: '아이디를 찾았습니다.',
      data: {
        username: user.username,
      },
    })
  } catch (error) {
    console.error('아이디 찾기 오류:', error)
    res.status(500).json({
      success: false,
      message: '아이디 찾기 중 오류가 발생했습니다.',
    })
  }
})

/**
 * 회원가입
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password } = req.body

    // 입력 검증
    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요.',
      })
    }

    const normalizedEmail = typeof email === 'string' && email.trim() ? email.trim() : null
    if (normalizedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: '올바른 이메일 형식을 입력해주세요.',
        })
      }
    }

    const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: '아이디는 4~20자 영문, 숫자, 언더스코어(_)만 가능합니다.',
      })
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 최소 8자 이상이어야 합니다.',
      })
    }

    const existingUsername = await findUserByUsername(username)
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 아이디입니다.',
      })
    }

    // 이메일 중복 확인
    if (normalizedEmail) {
      const existingUser = await findUserByEmail(normalizedEmail)
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: '이미 사용 중인 이메일입니다.',
        })
      }
    }

    // 사용자 생성
    const user = await createUser({ name, username, email: normalizedEmail ?? undefined, password })

    // Access Token 생성 (15분 만료)
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email ?? undefined,
      name: user.name,
      role: user.role,
    })

    // Refresh Token 생성 (7일 만료)
    const refreshToken = generateRefreshToken()
    
    // Refresh Token 저장
    await saveRefreshToken(refreshToken, user.id, user.email)

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        userId: user.id.toString(),
        username: user.username,
        email: user.email || '',
        name: user.name,
        role: user.role,
        accessToken, // Access Token (15분 만료)
        refreshToken, // Refresh Token (7일 만료)
      },
    })
  } catch (error) {
    console.error('회원가입 오류:', error)
    res.status(500).json({
      success: false,
      message: '회원가입 중 오류가 발생했습니다.',
    })
  }
})

/**
 * 토큰 갱신
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh Token이 필요합니다.',
      })
    }

    // Refresh Token 검증
    const tokenData = await findRefreshToken(refreshToken)

    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않거나 만료된 Refresh Token입니다.',
      })
    }

    // 사용자 정보 가져오기
    const user = await findUserById(tokenData.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      })
    }

    // 새 Access Token 생성
    const newAccessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email ?? undefined,
      name: user.name,
      role: user.role,
    })

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다.',
      data: {
        accessToken: newAccessToken,
      },
    })
  } catch (error) {
    console.error('토큰 갱신 오류:', error)
    res.status(500).json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.',
    })
  }
})

/**
 * 로그아웃
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (refreshToken) {
      await deleteRefreshToken(refreshToken)
    }

    res.json({
      success: true,
      message: '로그아웃되었습니다.',
    })
  } catch (error) {
    console.error('로그아웃 오류:', error)
    res.status(500).json({
      success: false,
      message: '로그아웃 중 오류가 발생했습니다.',
    })
  }
})

/**
 * 로그인
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { loginId, username, password } = req.body
    const loginValue = String(loginId || username || '').trim()

    // 입력 검증
    if (!loginValue || !password) {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해주세요.',
      })
    }

    // 사용자 찾기 (ID(username) 전용 로그인)
    const user = await findUserByUsername(loginValue)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      })
    }

    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
      })
    }

    // Access Token 생성 (15분 만료)
    const accessToken = generateAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email ?? undefined,
      name: user.name,
      role: user.role,
    })

    // Refresh Token 생성 (15일 만료)
    const refreshToken = generateRefreshToken()
    
    // Refresh Token 저장
    await saveRefreshToken(refreshToken, user.id, user.email)
    await updateLastLoginAt(user.id)

    res.json({
      success: true,
      message: '로그인되었습니다.',
      data: {
        userId: user.id.toString(),
        username: user.username,
        email: user.email || '',
        name: user.name,
        role: user.role,
        accessToken, // Access Token (15분 만료)
        refreshToken, // Refresh Token (15일 만료)
      },
    })
  } catch (error) {
    console.error('로그인 오류:', error)
    res.status(500).json({
      success: false,
      message: '로그인 중 오류가 발생했습니다.',
    })
  }
})

export default router

