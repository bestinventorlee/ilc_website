import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  getPortalPostById,
  incrementPostViews,
  listPortalCommunityPosts,
  listPortalNotices,
} from '../models/Portal.js'
import type { PostRow } from '../models/Admin.js'

const router = express.Router()
router.use(authenticateToken)

const mapPost = (row: PostRow, viewsOverride?: number) => ({
  id: String(row.id),
  title: row.title,
  content: row.content,
  author: row.author,
  authorId: row.author_id != null ? String(row.author_id) : 'admin',
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
  views: viewsOverride ?? row.views,
  likes: row.likes,
  type: row.type,
  category: row.category ?? undefined,
  isPinned: row.type === 'notice' ? row.is_pinned : undefined,
})

router.get('/notices', async (_req, res) => {
  try {
    const rows = await listPortalNotices()
    res.json({
      success: true,
      message: '공지사항 목록을 조회했습니다.',
      data: rows.map((r) => mapPost(r)),
    })
  } catch (error) {
    console.error('공지사항 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '공지사항 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/posts', async (_req, res) => {
  try {
    const rows = await listPortalCommunityPosts()
    res.json({
      success: true,
      message: '커뮤니티 게시글 목록을 조회했습니다.',
      data: rows.map((r) => mapPost(r)),
    })
  } catch (error) {
    console.error('커뮤니티 게시글 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '커뮤니티 게시글 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, message: '잘못된 게시글 ID입니다.' })
      return
    }
    const row = await getPortalPostById(id)
    if (!row) {
      res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' })
      return
    }
    await incrementPostViews(id)
    res.json({
      success: true,
      message: '게시글을 조회했습니다.',
      data: mapPost(row, row.views + 1),
    })
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error)
    res.status(500).json({ success: false, message: '게시글 조회 중 오류가 발생했습니다.' })
  }
})

export default router
