/**
 * 검수 대기표에서 신규 작품 등록 명세를 만든다. DB는 건드리지 않고 파일만 쓴다.
 * 만들어진 명세는 figure-books:book으로 한 건씩 dry-run한 뒤 반영한다.
 *
 * node scripts/figure-books/appearance-manifests.mjs --queue ../../data/celeb/figure-books/appearance-review-queue-2026-09-04.json
 * node scripts/figure-books/appearance-manifests.mjs --only-isbns ../../data/coupang/appearance-shortlist-2026-09-05.json
 *
 * --only-isbns를 주면 그 파일에 있는 ISBN만 만든다. 쿠팡 상품이 확인된 책부터 여는 데 쓴다.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

function bareIsbn(value) {
  return String(value ?? '').replace(/[\s-]/g, '')
}

// 권·세트 표시가 붙은 책은 edition.kind가 full이 아닐 수 있다. 임의로 정하지 않고 사람에게 넘긴다.
const MULTIPART = /(\d+\s*권|제?\s*\d+\s*권|\s\d+\s*:|세트|상권|하권|중권|\(상\)|\(하\)|\(중\)|전\s*\d+\s*권)/

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))]
}

// packages/content-search의 normalizeKakaoBookTitle이 실제로 깎아내는 형태들.
function titleVariants(title) {
  const noTrailingParen = title.replace(/\s*\([^)]+\)\s*$/, '').trim()
  const beforeDash = noTrailingParen.match(/^(.+?)\s*[-–—]\s+(.+)$/u)?.[1]?.trim()
  const beforeColon = noTrailingParen.split(':')[0].trim()
  return unique([noTrailingParen, beforeDash, beforeColon]).filter((value) => value !== title)
}

// 저자는 authors 배열을 ', '로 조인한 형태로 정규화된다. 역자만 있는 책은 "역" 표기가 붙는다.
function creatorVariants(authors, translators, chosen) {
  const joinedAuthors = authors.join(', ')
  const joinedTranslators = translators.join(', ')
  return unique([
    joinedAuthors,
    authors[0],
    joinedTranslators ? `${joinedTranslators} (역)` : null,
    ...authors,
  ]).filter((value) => value !== chosen)
}

function main() {
  const queuePath = resolve(process.cwd(), argumentValue('queue', '../../data/celeb/figure-books/appearance-review-queue-2026-09-04.json'))
  const outDir = resolve(process.cwd(), argumentValue('out-dir', '../../data/celeb/figure-books/manifests'))
  const onlyIsbnsPath = argumentValue('only-isbns')

  const queue = JSON.parse(readFileSync(queuePath, 'utf8'))
  const fresh = queue.fresh ?? []

  let allow = null
  if (onlyIsbnsPath) {
    const rows = JSON.parse(readFileSync(resolve(process.cwd(), onlyIsbnsPath), 'utf8'))
    allow = new Set(rows.map((row) => bareIsbn(row.isbn)).filter(Boolean))
  }

  mkdirSync(outDir, { recursive: true })

  const seen = new Set()
  const written = []
  const deferred = []

  for (const row of fresh) {
    const isbn = bareIsbn(row.kakao?.isbn)
    if (!isbn || isbn.length !== 13) continue
    if (seen.has(isbn)) continue
    if (allow && !allow.has(isbn)) continue
    seen.add(isbn)

    const title = String(row.kakao.title ?? '').trim()
    const creator = String((row.kakao.authors ?? [])[0] ?? '').trim()
    if (!title || !creator) {
      deferred.push({ isbn, title, creator, reason: 'title_or_creator_missing' })
      continue
    }
    if (MULTIPART.test(title)) {
      deferred.push({ isbn, title, creator, reason: 'multipart_edition_needs_review' })
      continue
    }

    const manifest = {
      work: {
        identity: `book/${isbn}`,
        title,
        creator,
        // 등록기는 카카오 제목·저자를 정규화한 뒤 명세와 대조한다(끝 괄호 제거, 하이픈 부제 분리,
        // 저자 배열 조인). 어느 표기로 오든 통과하도록 실제 변형을 모두 선언한다.
        titleAliases: titleVariants(title),
        creatorAliases: creatorVariants(row.kakao.authors ?? [], row.kakao.translators ?? [], creator),
      },
      edition: { kind: 'full', scope: 'complete' },
      ko: { translationStatus: 'published', isbn },
    }

    const file = resolve(outDir, `${isbn}.json`)
    writeFileSync(file, JSON.stringify(manifest, null, 2), 'utf8')
    written.push({ isbn, title, creator, file })
  }

  const indexPath = resolve(outDir, '_index.json')
  writeFileSync(indexPath, JSON.stringify({ generatedAt: new Date().toISOString(), written, deferred }, null, 2), 'utf8')

  console.log(`명세 ${written.length}건 작성 / 사람 검토로 미룸 ${deferred.length}건`)
  console.log(`  ${outDir}`)
  if (deferred.length > 0) {
    console.log('\n미룬 책 (앞 10건):')
    for (const row of deferred.slice(0, 10)) console.log(`  · ${row.title} — ${row.reason}`)
  }
}

main()
