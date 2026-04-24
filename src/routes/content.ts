import express from 'express'
import { getSiteContent } from '../models/Admin.js'

const router = express.Router()

router.get('/:key', async (req, res) => {
  try {
    const data = await getSiteContent(req.params.key)
    res.json({
      success: true,
      message: '콘텐츠를 조회했습니다.',
      data: data?.content ?? null,
      updatedAt: data?.updated_at ?? null,
    })
  } catch (error) {
    console.error('공개 콘텐츠 조회 오류:', error)
    res.status(500).json({ success: false, message: '콘텐츠 조회 중 오류가 발생했습니다.' })
  }
})

export default router
