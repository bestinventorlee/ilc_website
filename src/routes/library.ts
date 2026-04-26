import express from 'express'
import { query } from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticateToken)

router.get('/', async (req, res) => {
  try {
    const category = String(req.query.category || '').trim()
    const result = await query<{
      id: number
      title: string
      description: string
      category: string
      file_type: string
      file_size: number
      download_url: string | null
      upload_date: string
      download_count: number
      author: string | null
      thumbnail_url: string | null
    }>(
      `SELECT id, title, description, category, file_type, file_size, download_url, upload_date, download_count, author, thumbnail_url
       FROM library_items
       WHERE ($1 = '' OR category = $1)
       ORDER BY upload_date DESC`,
      [category]
    )
    res.json({
      success: true,
      message: '자료 목록을 조회했습니다.',
      data: result.rows.map((item) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        category: item.category,
        fileType: item.file_type,
        fileSize: Number(item.file_size),
        downloadUrl: item.download_url ?? undefined,
        uploadDate: item.upload_date,
        downloadCount: item.download_count,
        author: item.author ?? undefined,
        thumbnailUrl: item.thumbnail_url ?? undefined,
      })),
    })
  } catch (error) {
    console.error('자료 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '자료 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const result = await query<{
      id: number
      title: string
      description: string
      category: string
      file_type: string
      file_size: number
      download_url: string | null
      upload_date: string
      download_count: number
      author: string | null
      thumbnail_url: string | null
    }>(
      `SELECT id, title, description, category, file_type, file_size, download_url, upload_date, download_count, author, thumbnail_url
       FROM library_items
       WHERE id = $1`,
      [id]
    )
    const item = result.rows[0]
    if (!item) {
      res.status(404).json({ success: false, message: '자료를 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '자료를 조회했습니다.',
      data: {
        id: String(item.id),
        title: item.title,
        description: item.description,
        category: item.category,
        fileType: item.file_type,
        fileSize: Number(item.file_size),
        downloadUrl: item.download_url ?? undefined,
        uploadDate: item.upload_date,
        downloadCount: item.download_count,
        author: item.author ?? undefined,
        thumbnailUrl: item.thumbnail_url ?? undefined,
      },
    })
  } catch (error) {
    console.error('자료 상세 조회 오류:', error)
    res.status(500).json({ success: false, message: '자료 상세 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/:id/download', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const updated = await query<{ download_url: string | null }>(
      `UPDATE library_items
       SET download_count = download_count + 1
       WHERE id = $1
       RETURNING download_url`,
      [id]
    )
    const row = updated.rows[0]
    if (!row) {
      res.status(404).json({ success: false, message: '자료를 찾을 수 없습니다.' })
      return
    }
    if (!row.download_url) {
      res.status(400).json({ success: false, message: '다운로드 URL이 등록되지 않은 자료입니다.' })
      return
    }
    res.json({
      success: true,
      message: '다운로드 정보를 조회했습니다.',
      data: { downloadUrl: row.download_url },
    })
  } catch (error) {
    console.error('자료 다운로드 오류:', error)
    res.status(500).json({ success: false, message: '자료 다운로드 중 오류가 발생했습니다.' })
  }
})

export default router
