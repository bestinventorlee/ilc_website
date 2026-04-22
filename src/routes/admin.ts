import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import {
  answerAdminContact,
  createAdminMembership,
  createAdminNotice,
  deleteAdminMembership,
  deleteAdminPost,
  getAdminStats,
  listAdminContacts,
  listAdminLibraryItems,
  listAdminMemberships,
  listAdminPosts,
  listAdminUsers,
  updateAdminMembership,
  updateAdminPost,
} from '../models/Admin.js'

const router = express.Router()

router.use(authenticateToken)
router.use(requireAdmin)

router.get('/stats', async (req, res) => {
  try {
    const stats = await getAdminStats()
    const recentUsers = (await listAdminUsers()).slice(0, 5).map((user) => ({
      id: String(user.id),
      name: user.name,
      email: user.email,
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
        email: user.email,
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

export default router
