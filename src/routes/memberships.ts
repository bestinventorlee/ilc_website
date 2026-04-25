import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getMembershipForUser, listMembershipsForUser, type UserMembershipRow } from '../models/Portal.js'

const router = express.Router()
router.use(authenticateToken)

function remainingDays(row: UserMembershipRow): number | undefined {
  if (row.status === 'expired') {
    return 0
  }
  if (!row.expiry_date) {
    return undefined
  }
  const end = new Date(row.expiry_date + 'T12:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const mapMembership = (row: UserMembershipRow) => ({
  id: String(row.id),
  membershipNumber: row.membership_number,
  membershipType: row.membership_type,
  joinDate: row.join_date,
  expiryDate: row.expiry_date ?? undefined,
  benefits: row.benefits,
  status: row.status,
  remainingDays: remainingDays(row),
  price: row.price ?? undefined,
  description: row.description ?? undefined,
})

router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId
    const rows = await listMembershipsForUser(userId)
    res.json({
      success: true,
      message: '회원권 목록을 조회했습니다.',
      data: rows.map(mapMembership),
    })
  } catch (error) {
    console.error('회원권 목록 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원권 목록 조회 중 오류가 발생했습니다.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      res.status(400).json({ success: false, message: '잘못된 회원권 ID입니다.' })
      return
    }
    const row = await getMembershipForUser(userId, id)
    if (!row) {
      res.status(404).json({ success: false, message: '회원권을 찾을 수 없습니다.' })
      return
    }
    res.json({
      success: true,
      message: '회원권 정보를 조회했습니다.',
      data: mapMembership(row),
    })
  } catch (error) {
    console.error('회원권 상세 조회 오류:', error)
    res.status(500).json({ success: false, message: '회원권 조회 중 오류가 발생했습니다.' })
  }
})

export default router
