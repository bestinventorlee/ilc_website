import { query } from '../database/db.js'

export interface AdminUserRow {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  last_login_at: string | null
}

export interface AdminStatsRow {
  totalusers: string
  totalmemberships: string
  totalposts: string
  totallibraryitems: string
  totalcontacts: string
}

export interface MembershipRow {
  id: number
  user_id: number
  membership_number: string
  membership_type: string
  join_date: string
  expiry_date: string | null
  benefits: string[]
  status: 'active' | 'expired' | 'suspended'
  price: number | null
  description: string | null
  user_name: string
  user_email: string
}

export interface PostRow {
  id: number
  title: string
  content: string
  author: string
  author_id: number | null
  created_at: string
  updated_at: string | null
  views: number
  likes: number
  type: 'notice' | 'community'
  category: string | null
  is_pinned: boolean
}

export interface LibraryItemRow {
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
  uploader_id: number | null
  thumbnail_url: string | null
  uploader_name: string | null
}

export interface ContactRow {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  user_id: number | null
  submitted_at: string
  status: 'pending' | 'answered' | 'closed'
  answer: string | null
  answered_at: string | null
}

export const getAdminStats = async (): Promise<{
  totalUsers: number
  totalMemberships: number
  totalPosts: number
  totalLibraryItems: number
  totalContacts: number
}> => {
  const result = await query<AdminStatsRow>(
    `SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM memberships) AS totalMemberships,
      (SELECT COUNT(*) FROM posts) AS totalPosts,
      (SELECT COUNT(*) FROM library_items) AS totalLibraryItems,
      (SELECT COUNT(*) FROM contacts) AS totalContacts`
  )
  const row = result.rows[0]
  return {
    totalUsers: Number(row.totalusers),
    totalMemberships: Number(row.totalmemberships),
    totalPosts: Number(row.totalposts),
    totalLibraryItems: Number(row.totallibraryitems),
    totalContacts: Number(row.totalcontacts),
  }
}

export const listAdminUsers = async (): Promise<AdminUserRow[]> => {
  const result = await query<AdminUserRow>(
    `SELECT id, name, email, role, created_at, last_login_at
     FROM users
     ORDER BY created_at DESC`
  )
  return result.rows
}

export const listAdminMemberships = async (): Promise<MembershipRow[]> => {
  const result = await query<MembershipRow>(
    `SELECT
      m.id,
      m.user_id,
      m.membership_number,
      m.membership_type,
      m.join_date::text,
      m.expiry_date::text,
      m.benefits,
      m.status,
      m.price,
      m.description,
      u.name AS user_name,
      u.email AS user_email
    FROM memberships m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC`
  )
  return result.rows
}

export const createAdminMembership = async (data: {
  userId: number
  membershipType: string
  joinDate: string
  expiryDate?: string
  benefits: string[]
  price?: number
  description?: string
  status: 'active' | 'expired' | 'suspended'
}): Promise<MembershipRow> => {
  const numberResult = await query<{ next_number: number }>(
    `SELECT COALESCE(MAX(id), 0) + 1 AS next_number FROM memberships`
  )
  const membershipNumber = `MEM-${new Date().getFullYear()}-${String(numberResult.rows[0].next_number).padStart(3, '0')}`

  const result = await query<MembershipRow>(
    `INSERT INTO memberships
      (user_id, membership_number, membership_type, join_date, expiry_date, benefits, status, price, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, user_id, membership_number, membership_type, join_date::text, expiry_date::text, benefits, status, price, description,
      (SELECT name FROM users WHERE id = $1) AS user_name,
      (SELECT email FROM users WHERE id = $1) AS user_email`,
    [
      data.userId,
      membershipNumber,
      data.membershipType,
      data.joinDate,
      data.expiryDate ?? null,
      data.benefits,
      data.status,
      data.price ?? null,
      data.description ?? null,
    ]
  )
  return result.rows[0]
}

export const updateAdminMembership = async (
  id: number,
  data: {
    membershipType: string
    joinDate: string
    expiryDate?: string
    benefits: string[]
    price?: number
    description?: string
    status: 'active' | 'expired' | 'suspended'
  }
): Promise<MembershipRow | undefined> => {
  const result = await query<MembershipRow>(
    `UPDATE memberships
     SET membership_type = $2, join_date = $3, expiry_date = $4, benefits = $5, status = $6, price = $7, description = $8, updated_at = NOW()
     WHERE id = $1
     RETURNING id, user_id, membership_number, membership_type, join_date::text, expiry_date::text, benefits, status, price, description,
      (SELECT name FROM users WHERE id = memberships.user_id) AS user_name,
      (SELECT email FROM users WHERE id = memberships.user_id) AS user_email`,
    [id, data.membershipType, data.joinDate, data.expiryDate ?? null, data.benefits, data.status, data.price ?? null, data.description ?? null]
  )
  return result.rows[0]
}

export const deleteAdminMembership = async (id: number): Promise<void> => {
  await query(`DELETE FROM memberships WHERE id = $1`, [id])
}

export const listAdminPosts = async (): Promise<PostRow[]> => {
  const result = await query<PostRow>(
    `SELECT id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned
     FROM posts
     ORDER BY created_at DESC`
  )
  return result.rows
}

export const createAdminNotice = async (data: {
  title: string
  content: string
  isPinned?: boolean
  authorId?: number
  authorName: string
}): Promise<PostRow> => {
  const result = await query<PostRow>(
    `INSERT INTO posts (title, content, author, author_id, type, is_pinned)
     VALUES ($1, $2, $3, $4, 'notice', $5)
     RETURNING id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned`,
    [data.title, data.content, data.authorName, data.authorId ?? null, data.isPinned ?? false]
  )
  return result.rows[0]
}

export const updateAdminPost = async (
  id: number,
  data: { title: string; content: string; isPinned?: boolean }
): Promise<PostRow | undefined> => {
  const result = await query<PostRow>(
    `UPDATE posts
     SET title = $2, content = $3, is_pinned = $4, updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned`,
    [id, data.title, data.content, data.isPinned ?? false]
  )
  return result.rows[0]
}

export const deleteAdminPost = async (id: number): Promise<void> => {
  await query(`DELETE FROM posts WHERE id = $1`, [id])
}

export const listAdminLibraryItems = async (): Promise<LibraryItemRow[]> => {
  const result = await query<LibraryItemRow>(
    `SELECT
      l.id, l.title, l.description, l.category, l.file_type, l.file_size, l.download_url,
      l.upload_date, l.download_count, l.author, l.uploader_id, l.thumbnail_url,
      u.name AS uploader_name
    FROM library_items l
    LEFT JOIN users u ON u.id = l.uploader_id
    ORDER BY l.upload_date DESC`
  )
  return result.rows
}

export const listAdminContacts = async (): Promise<ContactRow[]> => {
  const result = await query<ContactRow>(
    `SELECT id, name, email, phone, subject, message, user_id, submitted_at, status, answer, answered_at
     FROM contacts
     ORDER BY submitted_at DESC`
  )
  return result.rows
}

export const answerAdminContact = async (
  id: number,
  answer: string
): Promise<ContactRow | undefined> => {
  const result = await query<ContactRow>(
    `UPDATE contacts
     SET answer = $2, status = 'answered', answered_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, phone, subject, message, user_id, submitted_at, status, answer, answered_at`,
    [id, answer]
  )
  return result.rows[0]
}
