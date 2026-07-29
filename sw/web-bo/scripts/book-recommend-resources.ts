/**
 * 서재 탐방 DB 연결·표지 캐시 운영 CLI.
 *
 * 기본은 읽기 전용 감사:
 *   pnpm book-recommend:resources
 *
 * 제목이 정확히 일치하거나 이미 ID가 연결된 안전 항목만 반영:
 *   pnpm book-recommend:resources -- --apply-safe
 *
 * 사람이 검토한 후보 한 건을 명시적으로 연결:
 *   pnpm book-recommend:resources -- --book <episode/book-folder> --user-content <uuid>
 */

import 'dotenv/config'
import {
  auditBookRecommendResources,
  syncBookRecommendResources,
} from '../src/lib/book-recommend-resources'

function optionValue(name: string): string | null {
  const inline = process.argv.find(arg => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1).trim() || null

  const index = process.argv.indexOf(name)
  if (index < 0) return null
  return process.argv[index + 1]?.trim() || null
}

async function main() {
  const applySafe = process.argv.includes('--apply-safe')
  const json = process.argv.includes('--json')
  const bookKey = optionValue('--book')
  const userContentId = optionValue('--user-content')

  if (Boolean(bookKey) !== Boolean(userContentId)) {
    throw new Error('--book과 --user-content는 함께 지정해야 합니다.')
  }

  if (applySafe || (bookKey && userContentId)) {
    const result = await syncBookRecommendResources(
      bookKey && userContentId
        ? { keys: [bookKey], mappings: { [bookKey]: userContentId } }
        : undefined,
    )
    if (json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`동기화 ${result.synced}건 · 실패 ${result.failed}건`)
      for (const item of result.results.filter(row => !row.ok || row.warnings.length)) {
        console.log(`- ${item.key}: ${item.ok ? item.warnings.join(', ') : item.error}`)
      }
    }
    if (result.failed) process.exitCode = 1
  } else {
    const audit = await auditBookRecommendResources()
    if (json) {
      console.log(JSON.stringify(audit, null, 2))
    } else {
      const s = audit.summary
      console.log(`에피소드 ${s.episodes}편 · 콘텐츠 ${s.books}건`)
      console.log(`ID 연결 ${s.linked} · 안전 자동 연결 ${s.exact} · 후보 확인 ${s.candidate} · 미해결 ${s.unresolved + s.invalidLink}`)
      console.log(`표지 동기화 ${s.syncedCovers} · 외부 URL ${s.externalCovers} · 구경로 ${s.legacyCovers} · 변경/누락 ${s.staleCovers + s.missingCovers}`)
      console.log('적용하려면 --apply-safe를 붙이세요. 후보 항목은 web-bo /book-recommend에서 사람이 연결합니다.')
    }
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
