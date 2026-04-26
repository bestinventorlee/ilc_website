import { query } from '../database/db.js'

export interface AdminUserRow {
  id: number
  name: string
  username: string
  email: string | null
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

export interface MembershipTypeRow {
  id: number
  name: string
  number_format: string
  default_duration_days: number | null
  benefits: string[]
  price: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface SiteContentRow {
  key: string
  content: unknown
  updated_by: number | null
  updated_at: string
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
    `SELECT id, name, username, email, role, created_at, last_login_at
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

export const listAdminMembershipsByUser = async (userId: number): Promise<MembershipRow[]> => {
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
    WHERE m.user_id = $1
    ORDER BY m.created_at DESC`,
    [userId]
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
  const nextNumber = numberResult.rows[0].next_number
  const typeResult = await query<{ number_format: string }>(
    `SELECT number_format FROM membership_types WHERE name = $1`,
    [data.membershipType]
  )
  const numberFormat = typeResult.rows[0]?.number_format || 'MEM-{YYYY}-{SEQ3}'
  const membershipNumber = formatMembershipNumber(numberFormat, nextNumber)

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

export const listAdminMembershipTypes = async (): Promise<MembershipTypeRow[]> => {
  const result = await query<MembershipTypeRow>(
    `SELECT id, name, number_format, default_duration_days, benefits, price, description, created_at::text, updated_at::text
     FROM membership_types
     ORDER BY name ASC`
  )
  return result.rows
}

export const createAdminMembershipType = async (data: {
  name: string
  membershipNumberFormat: string
  defaultDurationDays?: number | null
  benefits: string[]
  price?: number | null
  description?: string | null
}): Promise<MembershipTypeRow> => {
  const result = await query<MembershipTypeRow>(
    `INSERT INTO membership_types (name, number_format, default_duration_days, benefits, price, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, number_format, default_duration_days, benefits, price, description, created_at::text, updated_at::text`,
    [
      data.name.trim(),
      data.membershipNumberFormat.trim(),
      data.defaultDurationDays ?? null,
      data.benefits,
      data.price ?? null,
      data.description?.trim() ? data.description.trim() : null,
    ]
  )
  return result.rows[0]
}

export const updateAdminMembershipType = async (
  id: number,
  data: {
    name: string
    membershipNumberFormat: string
    defaultDurationDays?: number | null
    benefits: string[]
    price?: number | null
    description?: string | null
  }
): Promise<MembershipTypeRow | undefined> => {
  const result = await query<MembershipTypeRow>(
    `UPDATE membership_types
     SET name = $2, number_format = $3, default_duration_days = $4, benefits = $5, price = $6, description = $7, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, number_format, default_duration_days, benefits, price, description, created_at::text, updated_at::text`,
    [
      id,
      data.name.trim(),
      data.membershipNumberFormat.trim(),
      data.defaultDurationDays ?? null,
      data.benefits,
      data.price ?? null,
      data.description?.trim() ? data.description.trim() : null,
    ]
  )
  return result.rows[0]
}

const formatMembershipNumber = (format: string, seq: number): string => {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const yy = yyyy.slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seqRaw = String(seq)

  return format
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{YY\}/g, yy)
    .replace(/\{MM\}/g, mm)
    .replace(/\{DD\}/g, dd)
    .replace(/\{SEQ5\}/g, seqRaw.padStart(5, '0'))
    .replace(/\{SEQ4\}/g, seqRaw.padStart(4, '0'))
    .replace(/\{SEQ3\}/g, seqRaw.padStart(3, '0'))
    .replace(/\{SEQ\}/g, seqRaw)
}

export const deleteAdminMembershipType = async (
  id: number
): Promise<'deleted' | 'not_found' | { blocked: true; membershipCount: number }> => {
  const nameResult = await query<{ name: string }>(`SELECT name FROM membership_types WHERE id = $1`, [id])
  if (nameResult.rows.length === 0) {
    return 'not_found'
  }
  const name = nameResult.rows[0].name
  const countResult = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM memberships WHERE membership_type = $1`,
    [name]
  )
  const membershipCount = Number(countResult.rows[0].c)
  if (membershipCount > 0) {
    return { blocked: true, membershipCount }
  }
  await query(`DELETE FROM membership_types WHERE id = $1`, [id])
  return 'deleted'
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

export const createAdminLibraryItem = async (data: {
  title: string
  description: string
  category: string
  fileType: string
  fileSize: number
  downloadUrl?: string | null
  author?: string | null
  uploaderId?: number | null
  thumbnailUrl?: string | null
}): Promise<LibraryItemRow> => {
  const result = await query<LibraryItemRow>(
    `INSERT INTO library_items
      (title, description, category, file_type, file_size, download_url, author, uploader_id, thumbnail_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING
      id, title, description, category, file_type, file_size, download_url,
      upload_date, download_count, author, uploader_id, thumbnail_url,
      (SELECT name FROM users WHERE id = library_items.uploader_id) AS uploader_name`,
    [
      data.title,
      data.description,
      data.category,
      data.fileType,
      data.fileSize,
      data.downloadUrl ?? null,
      data.author ?? null,
      data.uploaderId ?? null,
      data.thumbnailUrl ?? null,
    ]
  )
  return result.rows[0]
}

export const updateAdminLibraryItem = async (
  id: number,
  data: {
    title: string
    description: string
    category: string
    fileType: string
    fileSize: number
    downloadUrl?: string | null
    author?: string | null
    thumbnailUrl?: string | null
  }
): Promise<LibraryItemRow | undefined> => {
  const result = await query<LibraryItemRow>(
    `UPDATE library_items
     SET
      title = $2,
      description = $3,
      category = $4,
      file_type = $5,
      file_size = $6,
      download_url = $7,
      author = $8,
      thumbnail_url = $9,
      updated_at = NOW()
     WHERE id = $1
     RETURNING
      id, title, description, category, file_type, file_size, download_url,
      upload_date, download_count, author, uploader_id, thumbnail_url,
      (SELECT name FROM users WHERE id = library_items.uploader_id) AS uploader_name`,
    [
      id,
      data.title,
      data.description,
      data.category,
      data.fileType,
      data.fileSize,
      data.downloadUrl ?? null,
      data.author ?? null,
      data.thumbnailUrl ?? null,
    ]
  )
  return result.rows[0]
}

export const deleteAdminLibraryItem = async (id: number): Promise<void> => {
  await query(`DELETE FROM library_items WHERE id = $1`, [id])
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

export const getSiteContent = async (key: string): Promise<SiteContentRow | undefined> => {
  const result = await query<SiteContentRow>(
    `SELECT key, content, updated_by, updated_at
     FROM site_contents
     WHERE key = $1`,
    [key]
  )
  return result.rows[0]
}

export const upsertSiteContent = async (
  key: string,
  content: unknown,
  updatedBy: number
): Promise<SiteContentRow> => {
  const result = await query<SiteContentRow>(
    `INSERT INTO site_contents (key, content, updated_by)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE
     SET content = EXCLUDED.content,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
     RETURNING key, content, updated_by, updated_at`,
    [key, JSON.stringify(content), updatedBy]
  )
  return result.rows[0]
}
