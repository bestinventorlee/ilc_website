import { query } from '../database/db.js'
import type { PostRow } from './Admin.js'

export const listPortalNotices = async (): Promise<PostRow[]> => {
  const result = await query<PostRow>(
    `SELECT id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned
     FROM posts
     WHERE type = 'notice'
     ORDER BY is_pinned DESC, created_at DESC`
  )
  return result.rows
}

export const listPortalCommunityPosts = async (): Promise<PostRow[]> => {
  const result = await query<PostRow>(
    `SELECT id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned
     FROM posts
     WHERE type = 'community'
     ORDER BY created_at DESC`
  )
  return result.rows
}

export const getPortalPostById = async (id: number): Promise<PostRow | undefined> => {
  const result = await query<PostRow>(
    `SELECT id, title, content, author, author_id, created_at, updated_at, views, likes, type, category, is_pinned
     FROM posts
     WHERE id = $1`,
    [id]
  )
  return result.rows[0]
}

export const incrementPostViews = async (id: number): Promise<void> => {
  await query(`UPDATE posts SET views = views + 1 WHERE id = $1`, [id])
}

export interface UserMembershipRow {
  id: number
  membership_number: string
  membership_type: string
  join_date: string
  expiry_date: string | null
  benefits: string[]
  status: 'active' | 'expired' | 'suspended'
  price: number | null
  description: string | null
}

export const listMembershipsForUser = async (userId: number): Promise<UserMembershipRow[]> => {
  const result = await query<UserMembershipRow>(
    `SELECT id, membership_number, membership_type, join_date::text, expiry_date::text, benefits, status, price, description
     FROM memberships
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  )
  return result.rows
}

export const getMembershipForUser = async (
  userId: number,
  membershipId: number
): Promise<UserMembershipRow | undefined> => {
  const result = await query<UserMembershipRow>(
    `SELECT id, membership_number, membership_type, join_date::text, expiry_date::text, benefits, status, price, description
     FROM memberships
     WHERE user_id = $1 AND id = $2`,
    [userId, membershipId]
  )
  return result.rows[0]
}
