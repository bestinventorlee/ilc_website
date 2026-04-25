/**
 * users 테이블만 남기고 나머지 애플리케이션 데이터를 비웁니다.
 * 실행: cd server && npm run db:clear-non-user -- --yes
 */
import { query, initDatabase, closeDatabase } from '../src/database/db.js'

const main = async () => {
  if (!process.argv.includes('--yes')) {
    console.error('사용법: cd server && npm run db:clear-non-user -- --yes')
    console.error('  users를 제외한 테이블을 TRUNCATE하고 시퀀스를 초기화합니다.')
    console.error('  refresh_tokens도 비워지므로 모든 사용자는 다시 로그인해야 합니다.')
    process.exitCode = 1
    return
  }

  let inTx = false
  try {
    await initDatabase()
    await query('BEGIN')
    inTx = true
    await query(`
      TRUNCATE TABLE
        refresh_tokens,
        memberships,
        membership_types,
        posts,
        library_items,
        contacts,
        site_contents
      RESTART IDENTITY CASCADE
    `)
    await query('COMMIT')
    inTx = false
    console.log('✅ users를 제외한 테이블을 비웠습니다.')
  } catch (e) {
    if (inTx) {
      await query('ROLLBACK').catch(() => {})
    }
    console.error('❌ 실패:', e)
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}

main()
