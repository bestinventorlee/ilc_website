import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { authenticateToken } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import {
  answerAdminContact,
  createAdminMembership,
  createAdminMembershipType,
  createAdminNotice,
  deleteAdminMembership,
  deleteAdminMembershipType,
  deleteAdminPost,
  getAdminStats,
  listAdminContacts,
  listAdminLibraryItems,
  createAdminLibraryItem,
  updateAdminLibraryItem,
  deleteAdminLibraryItem,
  listAdminMemberships,
  listAdminMembershipsByUser,
  listAdminMembershipTypes,
  listAdminPosts,
  listAdminUsers,
  getSiteContent,
  upsertSiteContent,
  updateAdminMembership,
  updateAdminMembershipType,
  updateAdminPost,
} from '../models/Admin.js'

const router = express.Router()
const uploadDir = path.resolve(process.cwd(), 'uploads', 'library')
fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ''
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60) || 'file'
    cb(null, `${Date.now()}-${base}${ext.toLowerCase()}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
})

router.use(authenticateToken)
router.use(requireAdmin)

router.post('/library/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: '업로드할 파일이 없습니다.' })
      return
    }
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase() || 'bin'
    res.status(201).json({
      success: true,
      message: '파일 업로드가 완료되었습니다.',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: ext,
        fileSize: req.file.size,
        downloadUrl: `/api/files/library/${req.file.filename}`,
      },
    })
  } catch (error) {
    console.error('파일 업로드 오류:', error)
    res.status(500).json({ success: false, message: '파일 업로드 중 오류가 발생했습니다.' })
  }
})

router.get('/stats', async (req, res) => {
  try {
    const stats = await getAdminStats()
    const recentUsers = (await listAdminUsers()).slice(0, 5).map((user) => ({
      id: String(user.id),
      name: user.name,
      username: user.username,
      email: user.email || '',
      role: user.role,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at ?? undefined,
    }))

    res.json({
      success: true,
      message: '관리자 통계를 조회했습니다.',
      data: { ...stats, recentUsers },
    })
  } catch (error) {
    console.error('관리자 통계 조회 오류:', error)
    res.status(500).json({ success: false, message: '관리자 통계 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const users = await listAdminUsers()
    res.json({
      success: true,
      message: '회원 목록을 조회했습니다.',
      data: users.map((user) => ({
        id: String(user.id),
        name: user.name,
        username: user.username,
        email: user.email || '',
        role: user.role,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at ?? undefined,
      })),
    })
  } catch (error) {
    console.error('회원 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/memberships', async (req, res) => {
  try {
    const memberships = await listAdminMemberships()
    res.json({
      success: true,
      message: '회원권 목록을 조회했습니다.',
      data: memberships.map((membership) => ({
        id: String(membership.id),
        userId: String(membership.user_id),
        membershipNumber: membership.membership_number,
        membershipType: membership.membership_type,
        joinDate: membership.join_date,
        expiryDate: membership.expiry_date ?? undefined,
        benefits: membership.benefits,
        status: membership.status,
        price: membership.price ?? undefined,
        description: membership.description ?? undefined,
        userName: membership.user_name,
        userEmail: membership.user_email,
      })),
    })
  } catch (error) {
    console.error('회원권 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원권 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/users/:id/memberships', async (req, res) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isFinite(userId)) {
      res.status(400).json({ success: false, message: '잘못된 회원 ID입니다.' })
      return
    }
    const memberships = await listAdminMembershipsByUser(userId)
    res.json({
      success: true,
      message: '회원별 회원권 목록을 조회했습니다.',
      data: memberships.map((membership) => ({
        id: String(membership.id),
        userId: String(membership.user_id),
        membershipNumber: membership.membership_number,
        membershipType: membership.membership_type,
        joinDate: membership.join_date,
        expiryDate: membership.expiry_date ?? undefined,
        benefits: membership.benefits,
        status: membership.status,
        price: membership.price ?? undefined,
        description: membership.description ?? undefined,
        userName: membership.user_name,
        userEmail: membership.user_email,
      })),
    })
  } catch (error) {
    console.error('회원별 회원권 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원별 회원권 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/memberships', async (req, res) => {
  try {
    const { userId, membershipType, joinDate, expiryDate, benefits, price, description, status } = req.body
    const membership = await createAdminMembership({
      userId: Number(userId),
      membershipType,
      joinDate,
      expiryDate,
      benefits: benefits ?? [],
      price,
      description,
      status,
    })
    res.status(201).json({
      success: true,
      message: '회원권이 생성되었습니다.',
      data: {
        id: String(membership.id),
        userId: String(membership.user_id),
        membershipNumber: membership.membership_number,
        membershipType: membership.membership_type,
        joinDate: membership.join_date,
        expiryDate: membership.expiry_date ?? undefined,
        benefits: membership.benefits,
        status: membership.status,
        price: membership.price ?? undefined,
        description: membership.description ?? undefined,
        userName: membership.user_name,
        userEmail: membership.user_email,
      },
    })
  } catch (error) {
    console.error('회원권 생성 오류:', error)
    res.status(500).json({ success: false, message: '회원권 생성 중 오류가 발생했습니다.' })
  }
})

router.put('/memberships/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const updated = await updateAdminMembership(id, req.body)
    if (!updated) {
      res.status(404).json({ success: false, message: '회원권을 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '회원권이 수정되었습니다.',
      data: {
        id: String(updated.id),
        userId: String(updated.user_id),
        membershipNumber: updated.membership_number,
        membershipType: updated.membership_type,
        joinDate: updated.join_date,
        expiryDate: updated.expiry_date ?? undefined,
        benefits: updated.benefits,
        status: updated.status,
        price: updated.price ?? undefined,
        description: updated.description ?? undefined,
        userName: updated.user_name,
        userEmail: updated.user_email,
      },
    })
  } catch (error) {
    console.error('회원권 수정 오류:', error)
    res.status(500).json({ success: false, message: '회원권 수정 중 오류가 발생했습니다.' })
  }
})

router.delete('/memberships/:id', async (req, res) => {
  try {
    await deleteAdminMembership(Number(req.params.id))
    res.json({ success: true, message: '회원권이 삭제되었습니다.' })
  } catch (error) {
    console.error('회원권 삭제 오류:', error)
    res.status(500).json({ success: false, message: '회원권 삭제 중 오류가 발생했습니다.' })
  }
})

router.get('/membership-types', async (_req, res) => {
  try {
    const rows = await listAdminMembershipTypes()
    res.json({
      success: true,
      message: '회원권 종류 목록을 조회했습니다.',
      data: rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        membershipNumberFormat: row.number_format,
        defaultDurationDays: row.default_duration_days ?? undefined,
        benefits: row.benefits,
        price: row.price ?? undefined,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    })
  } catch (error) {
    console.error('회원권 종류 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원권 종류 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/membership-types', async (req, res) => {
  try {
    const { name, membershipNumberFormat, defaultDurationDays, benefits, price, description } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: '종류 이름이 필요합니다.' })
      return
    }
    if (!membershipNumberFormat || typeof membershipNumberFormat !== 'string' || !membershipNumberFormat.trim()) {
      res.status(400).json({ success: false, message: '회원권 번호 형식이 필요합니다.' })
      return
    }
    const benefitsList: string[] = Array.isArray(benefits)
      ? benefits.map((b: unknown) => String(b).trim()).filter(Boolean)
      : typeof benefits === 'string'
        ? benefits
            .split('\n')
            .map((b: string) => b.trim())
            .filter(Boolean)
        : []
    const row = await createAdminMembershipType({
      name,
      membershipNumberFormat,
      defaultDurationDays:
        defaultDurationDays === '' || defaultDurationDays === undefined || defaultDurationDays === null
          ? null
          : Number(defaultDurationDays),
      benefits: benefitsList,
      price: price === '' || price === undefined || price === null ? null : Number(price),
      description,
    })
    res.status(201).json({
      success: true,
      message: '회원권 종류가 등록되었습니다.',
      data: {
        id: String(row.id),
        name: row.name,
        membershipNumberFormat: row.number_format,
        defaultDurationDays: row.default_duration_days ?? undefined,
        benefits: row.benefits,
        price: row.price ?? undefined,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    })
  } catch (error: unknown) {
    console.error('회원권 종류 등록 오류:', error)
    const err = error as { code?: string }
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: '이미 같은 이름의 회원권 종류가 있습니다.' })
      return
    }
    res.status(500).json({ success: false, message: '회원권 종류 등록 중 오류가 발생했습니다.' })
  }
})

router.put('/membership-types/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, membershipNumberFormat, defaultDurationDays, benefits, price, description } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: '종류 이름이 필요합니다.' })
      return
    }
    if (!membershipNumberFormat || typeof membershipNumberFormat !== 'string' || !membershipNumberFormat.trim()) {
      res.status(400).json({ success: false, message: '회원권 번호 형식이 필요합니다.' })
      return
    }
    const benefitsList: string[] = Array.isArray(benefits)
      ? benefits.map((b: unknown) => String(b).trim()).filter(Boolean)
      : typeof benefits === 'string'
        ? benefits
            .split('\n')
            .map((b: string) => b.trim())
            .filter(Boolean)
        : []
    const updated = await updateAdminMembershipType(id, {
      name,
      membershipNumberFormat,
      defaultDurationDays:
        defaultDurationDays === '' || defaultDurationDays === undefined || defaultDurationDays === null
          ? null
          : Number(defaultDurationDays),
      benefits: benefitsList,
      price: price === '' || price === undefined || price === null ? null : Number(price),
      description,
    })
    if (!updated) {
      res.status(404).json({ success: false, message: '회원권 종류를 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '회원권 종류가 수정되었습니다.',
      data: {
        id: String(updated.id),
        name: updated.name,
        membershipNumberFormat: updated.number_format,
        defaultDurationDays: updated.default_duration_days ?? undefined,
        benefits: updated.benefits,
        price: updated.price ?? undefined,
        description: updated.description ?? undefined,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    })
  } catch (error: unknown) {
    console.error('회원권 종류 수정 오류:', error)
    const err = error as { code?: string }
    if (err.code === '23505') {
      res.status(409).json({ success: false, message: '이미 같은 이름의 회원권 종류가 있습니다.' })
      return
    }
    res.status(500).json({ success: false, message: '회원권 종류 수정 중 오류가 발생했습니다.' })
  }
})

router.delete('/membership-types/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const result = await deleteAdminMembershipType(id)
    if (result === 'not_found') {
      res.status(404).json({ success: false, message: '회원권 종류를 찾을 수 없습니다.' })
      return
    }
    if (typeof result === 'object' && result.blocked) {
      res.status(409).json({
        success: false,
        message: `이 종류로 발급된 회원권이 ${result.membershipCount}건 있어 삭제할 수 없습니다.`,
      })
      return
    }
    res.json({ success: true, message: '회원권 종류가 삭제되었습니다.' })
  } catch (error) {
    console.error('회원권 종류 삭제 오류:', error)
    res.status(500).json({ success: false, message: '회원권 종류 삭제 중 오류가 발생했습니다.' })
  }
})

router.get('/posts', async (req, res) => {
  try {
    const posts = await listAdminPosts()
    res.json({
      success: true,
      message: '게시글 목록을 조회했습니다.',
      data: posts.map((post) => ({
        id: String(post.id),
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.author_id ? String(post.author_id) : 'admin',
        userId: post.author_id ? String(post.author_id) : undefined,
        createdAt: post.created_at,
        updatedAt: post.updated_at ?? undefined,
        views: post.views,
        likes: post.likes,
        type: post.type,
        category: post.category ?? undefined,
        isPinned: post.is_pinned,
      })),
    })
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '게시글 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/posts/notice', async (req, res) => {
  try {
    const post = await createAdminNotice({
      title: req.body.title,
      content: req.body.content,
      isPinned: req.body.isPinned,
      authorId: req.user?.userId,
      authorName: req.user?.name || '관리자',
    })
    res.status(201).json({
      success: true,
      message: '공지사항이 생성되었습니다.',
      data: {
        id: String(post.id),
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.author_id ? String(post.author_id) : 'admin',
        userId: post.author_id ? String(post.author_id) : undefined,
        createdAt: post.created_at,
        views: post.views,
        likes: post.likes,
        type: post.type,
        isPinned: post.is_pinned,
      },
    })
  } catch (error) {
    console.error('공지사항 생성 오류:', error)
    res.status(500).json({ success: false, message: '공지사항 생성 중 오류가 발생했습니다.' })
  }
})

router.put('/posts/:id', async (req, res) => {
  try {
    const post = await updateAdminPost(Number(req.params.id), req.body)
    if (!post) {
      res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '게시글이 수정되었습니다.',
      data: {
        id: String(post.id),
        title: post.title,
        content: post.content,
        author: post.author,
        authorId: post.author_id ? String(post.author_id) : 'admin',
        userId: post.author_id ? String(post.author_id) : undefined,
        createdAt: post.created_at,
        updatedAt: post.updated_at ?? undefined,
        views: post.views,
        likes: post.likes,
        type: post.type,
        category: post.category ?? undefined,
        isPinned: post.is_pinned,
      },
    })
  } catch (error) {
    console.error('게시글 수정 오류:', error)
    res.status(500).json({ success: false, message: '게시글 수정 중 오류가 발생했습니다.' })
  }
})

router.delete('/posts/:id', async (req, res) => {
  try {
    await deleteAdminPost(Number(req.params.id))
    res.json({ success: true, message: '게시글이 삭제되었습니다.' })
  } catch (error) {
    console.error('게시글 삭제 오류:', error)
    res.status(500).json({ success: false, message: '게시글 삭제 중 오류가 발생했습니다.' })
  }
})

router.get('/library', async (req, res) => {
  try {
    const items = await listAdminLibraryItems()
    res.json({
      success: true,
      message: '자료실 목록을 조회했습니다.',
      data: items.map((item) => ({
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
        uploaderId: item.uploader_id ? String(item.uploader_id) : undefined,
        uploaderName: item.uploader_name ?? undefined,
        thumbnailUrl: item.thumbnail_url ?? undefined,
      })),
    })
  } catch (error) {
    console.error('자료실 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '자료실 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/library', async (req, res) => {
  try {
    const { title, description, category, fileType, fileSize, downloadUrl, author, thumbnailUrl } = req.body
    if (!title || !description || !category || !fileType || fileSize === undefined || fileSize === null) {
      res.status(400).json({ success: false, message: '필수 항목을 모두 입력해주세요.' })
      return
    }
    const size = Number(fileSize)
    if (!Number.isFinite(size) || size < 0) {
      res.status(400).json({ success: false, message: '파일 크기는 0 이상의 숫자여야 합니다.' })
      return
    }
    const item = await createAdminLibraryItem({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      fileType: String(fileType).trim(),
      fileSize: size,
      downloadUrl: downloadUrl ? String(downloadUrl).trim() : null,
      author: author ? String(author).trim() : null,
      uploaderId: req.user?.userId ?? null,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null,
    })
    res.status(201).json({
      success: true,
      message: '자료가 등록되었습니다.',
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
        uploaderId: item.uploader_id ? String(item.uploader_id) : undefined,
        uploaderName: item.uploader_name ?? undefined,
        thumbnailUrl: item.thumbnail_url ?? undefined,
      },
    })
  } catch (error) {
    console.error('자료 등록 오류:', error)
    res.status(500).json({ success: false, message: '자료 등록 중 오류가 발생했습니다.' })
  }
})

router.put('/library/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { title, description, category, fileType, fileSize, downloadUrl, author, thumbnailUrl } = req.body
    if (!title || !description || !category || !fileType || fileSize === undefined || fileSize === null) {
      res.status(400).json({ success: false, message: '필수 항목을 모두 입력해주세요.' })
      return
    }
    const size = Number(fileSize)
    if (!Number.isFinite(size) || size < 0) {
      res.status(400).json({ success: false, message: '파일 크기는 0 이상의 숫자여야 합니다.' })
      return
    }
    const updated = await updateAdminLibraryItem(id, {
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      fileType: String(fileType).trim(),
      fileSize: size,
      downloadUrl: downloadUrl ? String(downloadUrl).trim() : null,
      author: author ? String(author).trim() : null,
      thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : null,
    })
    if (!updated) {
      res.status(404).json({ success: false, message: '자료를 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '자료가 수정되었습니다.',
      data: {
        id: String(updated.id),
        title: updated.title,
        description: updated.description,
        category: updated.category,
        fileType: updated.file_type,
        fileSize: Number(updated.file_size),
        downloadUrl: updated.download_url ?? undefined,
        uploadDate: updated.upload_date,
        downloadCount: updated.download_count,
        author: updated.author ?? undefined,
        uploaderId: updated.uploader_id ? String(updated.uploader_id) : undefined,
        uploaderName: updated.uploader_name ?? undefined,
        thumbnailUrl: updated.thumbnail_url ?? undefined,
      },
    })
  } catch (error) {
    console.error('자료 수정 오류:', error)
    res.status(500).json({ success: false, message: '자료 수정 중 오류가 발생했습니다.' })
  }
})

router.delete('/library/:id', async (req, res) => {
  try {
    await deleteAdminLibraryItem(Number(req.params.id))
    res.json({ success: true, message: '자료가 삭제되었습니다.' })
  } catch (error) {
    console.error('자료 삭제 오류:', error)
    res.status(500).json({ success: false, message: '자료 삭제 중 오류가 발생했습니다.' })
  }
})

router.get('/contacts', async (req, res) => {
  try {
    const contacts = await listAdminContacts()
    res.json({
      success: true,
      message: '문의 목록을 조회했습니다.',
      data: contacts.map((contact) => ({
        id: String(contact.id),
        name: contact.name,
        email: contact.email,
        phone: contact.phone ?? undefined,
        subject: contact.subject,
        message: contact.message,
        userId: contact.user_id ? String(contact.user_id) : undefined,
        submittedAt: contact.submitted_at,
        status: contact.status,
        answer: contact.answer ?? undefined,
        answeredAt: contact.answered_at ?? undefined,
      })),
    })
  } catch (error) {
    console.error('문의 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '문의 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.post('/contacts/:id/answer', async (req, res) => {
  try {
    const updated = await answerAdminContact(Number(req.params.id), req.body.answer)
    if (!updated) {
      res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '답변이 등록되었습니다.',
      data: {
        id: String(updated.id),
        name: updated.name,
        email: updated.email,
        phone: updated.phone ?? undefined,
        subject: updated.subject,
        message: updated.message,
        userId: updated.user_id ? String(updated.user_id) : undefined,
        submittedAt: updated.submitted_at,
        status: updated.status,
        answer: updated.answer ?? undefined,
        answeredAt: updated.answered_at ?? undefined,
      },
    })
  } catch (error) {
    console.error('문의 답변 오류:', error)
    res.status(500).json({ success: false, message: '문의 답변 중 오류가 발생했습니다.' })
  }
})

router.get('/site-content/:key', async (req, res) => {
  try {
    const data = await getSiteContent(req.params.key)
    res.json({
      success: true,
      message: '사이트 콘텐츠를 조회했습니다.',
      data: data?.content ?? null,
      updatedAt: data?.updated_at ?? null,
    })
  } catch (error) {
    console.error('사이트 콘텐츠 조회 오류:', error)
    res.status(500).json({ success: false, message: '사이트 콘텐츠 조회 중 오류가 발생했습니다.' })
  }
})

router.put('/site-content/:key', async (req, res) => {
  try {
    const key = req.params.key
    const content = req.body?.content
    if (!content || typeof content !== 'object') {
      res.status(400).json({ success: false, message: 'content 객체가 필요합니다.' })
      return
    }
    const saved = await upsertSiteContent(key, content, req.user!.userId)
    res.json({
      success: true,
      message: '사이트 콘텐츠가 저장되었습니다.',
      data: saved.content,
      updatedAt: saved.updated_at,
    })
  } catch (error) {
    console.error('사이트 콘텐츠 저장 오류:', error)
    res.status(500).json({ success: false, message: '사이트 콘텐츠 저장 중 오류가 발생했습니다.' })
  }
})

export default router
