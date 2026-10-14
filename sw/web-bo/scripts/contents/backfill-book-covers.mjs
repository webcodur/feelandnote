/** 빈 BOOK 표지만 소급 보완한다. 기본 미리보기, --apply로 저장·재조회·캐시 갱신. */
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { toIsbn13 } from '../../../../packages/content-search/src/book-isbn.ts'
import { OPENLIBRARY_BOOK_BATCH_SIZE, requestOpenLibraryBookBatch } from '../../../../packages/content-search/src/openlibrary.ts'
import { getKakaoBookByIsbn } from '../../../../packages/content-search/src/kakao-books.ts'
import { readOfficialEdition } from '../figure-books/lib/edition-provider-audit.mjs'
import { sqlLiteral } from '../figure-books/lib/merge-work-sql.mjs'
import { CACHE_TAGS } from '../../../../packages/shared/src/constants/cache-tags.ts'
import { matchCoverEdition, buildCoverApplySql, missingProviderReason, preserveHash, storedCoverCandidates } from './book-cover-backfill-contract.mjs'
export { matchCoverEdition, buildCoverApplySql } from './book-cover-backfill-contract.mjs'

const text = value => String(value ?? '').trim()
const sshArgs = ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
  'ubuntu@152.67.198.197', 'docker exec -i feelandnote-db psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres']

function sql(statement) {
  const result = spawnSync('ssh', sshArgs, { input: statement, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
  return result.stdout.trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line))
}

async function verifyImage(url) {
  for (let attempt = 0; attempt < 3; attempt++) try {
    const check = new URL(url)
    check.searchParams.set('default', 'false')
    const response = await fetch(check, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) })
    if ((response.status === 429 || response.status >= 500) && attempt < 2) { await new Promise(done => setTimeout(done, 1000)); continue }
    if (response.status === 404) return { error: 'cover_not_found' }
    if (!response.ok) return { error: `cover_http_${response.status}` }
    if (!response.headers.get('content-type')?.startsWith('image/')) return { error: 'cover_not_image' }
    return { url }
  } catch (error) {
    if (attempt < 2) { await new Promise(done => setTimeout(done, 1000)); continue }
    return { error: 'cover_request_failed', detail: error.message }
  }
}

async function openLibraryBatch(isbns, command) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await requestOpenLibraryBookBatch(isbns, command)
      if (response.ok) return await response.json()
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error(`OpenLibrary HTTP ${response.status}`)
      console.log(JSON.stringify({ event: 'retry', provider: 'openlibrary', status: response.status, attempt: attempt + 1 }))
    } catch (error) {
      if (attempt === 2) throw error
      console.log(JSON.stringify({ event: 'retry', provider: 'openlibrary', error: error.message, attempt: attempt + 1 }))
    }
    await new Promise(done => setTimeout(done, 5000 * (attempt + 1)))
  }
  throw new Error('OpenLibrary unavailable; remaining records are unqueried')
}

async function main() {
  const apply = process.argv.includes('--apply')
  const limitIndex = process.argv.indexOf('--limit')
  const limit = limitIndex < 0 ? Infinity : Number(process.argv[limitIndex + 1])
  if (!(limit > 0)) throw new Error('Invalid limit')
  const rows = sql(`SELECT jsonb_build_object('table','content_locales','id',NULL,'content_id',l.content_id,'locale',l.locale,'title',l.title,'creator',l.creator,'publisher',l.publisher,'isbn',l.isbn,'sources',l.sources,'row_hash',md5(to_jsonb(l)::text),'preserved_hash',${preserveHash('l')}) FROM content_locales l JOIN contents c ON c.id=l.content_id WHERE c.type='BOOK' AND nullif(btrim(l.thumbnail_url),'') IS NULL UNION ALL SELECT jsonb_build_object('table','figure_book_editions','id',e.id,'content_id',e.content_id,'locale',e.locale,'title',e.title,'creator',e.creator,'publisher',e.publisher,'isbn',e.isbn,'sources',e.sources,'row_hash',md5(to_jsonb(e)::text),'preserved_hash',${preserveHash('e')}) FROM figure_book_editions e WHERE nullif(btrim(e.thumbnail_url),'') IS NULL;`)
  const counts = {}, examples = {}, groups = new Map(), changedIds = new Set(), appliedChecks = new Map()
  const count = (reason, row) => { counts[reason] = (counts[reason] ?? 0) + 1; if ((examples[reason]?.length ?? 0) < 5) (examples[reason] ??= []).push({ table: row.table, contentId: row.content_id, id: row.id, title: row.title, isbn: row.isbn }) }
  for (const row of rows) {
    if (missingProviderReason(row)) { count(missingProviderReason(row), row); continue }
    const isbn = toIsbn13(row.isbn ?? '')
    if (!isbn) { count(text(row.isbn) ? 'invalid_isbn' : 'no_isbn', row); continue }
    if (!['ko', 'en'].includes(row.locale)) { count('unsupported_locale', row); continue }
    const key = `${row.locale}:${isbn}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  console.log(JSON.stringify({ event: 'scan', missingRows: rows.length, eligibleRows: [...groups.values()].flat().length, uniqueLookups: groups.size, counts }))
  let checked = 0, verified = 0
  const pending = []
  const flush = async () => {
    if (!pending.length) return
    const changes = pending.splice(0)
    if (!apply) { for (const change of changes) count('would_fill', change.row); return }
    const results = sql(buildCoverApplySql(changes))
    const byKey = new Map(results.map(row => [`${row.table}:${row.content_id}:${row.id ?? row.locale}`, row]))
    for (const change of changes) {
      const { row, cover, source } = change
      const result = byKey.get(`${row.table}:${row.content_id}:${row.id ?? row.locale}`)
      if (!result) { count('concurrent_change_skipped', row); continue }
      changedIds.add(row.content_id)
      if (result.thumbnail_url !== cover || result.source !== source || result.preserved_hash !== row.preserved_hash) throw new Error(`Cover write verification failed: ${row.content_id}`)
      appliedChecks.set(`${row.table}:${row.content_id}:${row.id ?? row.locale}`, { cover, preservedHash: row.preserved_hash })
      count(`filled_${row.locale}_${row.table}`, row)
    }
  }
  const consider = async (group, official, coverUrl) => {
    const matches = group.filter(row => { const reason = matchCoverEdition(row, official); if (reason) count(reason, row); return !reason })
    if (matches.length) {
      const image = coverUrl ? await verifyImage(coverUrl) : { error: 'provider_has_no_cover' }
      for (const row of matches) {
        if (image.error) count(image.error, row)
        else { pending.push({ row, cover: image.url, source: official.sourceUrl }); verified++ }
      }
    }
    checked++
    if (pending.length >= 100) await flush()
    if (checked % 20 === 0) console.log(JSON.stringify({ event: 'progress', checked, total: Math.min(groups.size, limit), verifiedRows: verified, counts }))
  }
  try {
    const storedOnly = process.argv.includes('--stored-covers')
    if (storedOnly) {
      const candidates = storedCoverCandidates(sql, rows).slice(0, limit)
      console.log(JSON.stringify({ event: 'stored_cover_candidates', count: candidates.length }))
      for (const change of candidates) {
        const image = await verifyImage(change.cover)
        image.error ? count(image.error, change.row) : pending.push(change)
        if (pending.length >= 100) await flush()
      }
    }
    const selected = storedOnly ? [] : [...groups].slice(0, limit)
    const english = selected.filter(([key]) => key.startsWith('en:'))
    for (let start = 0; start < english.length; start += OPENLIBRARY_BOOK_BATCH_SIZE) {
      const batch = english.slice(start, start + OPENLIBRARY_BOOK_BATCH_SIZE), isbns = batch.map(([key]) => key.slice(3))
      const details = await openLibraryBatch(isbns, 'details')
      const data = await openLibraryBatch(isbns, 'data')
      for (const [key, group] of batch) {
        const isbn = key.slice(3), bibkey = `ISBN:${isbn}`, detail = details[bibkey]?.details
        const official = detail ? readOfficialEdition(isbn, detail, data[bibkey]) : { error: 'provider_not_found' }
        if (detail && data[bibkey]?.key !== detail.key) official.error = 'provider_edition_mismatch'
        // Books API는 동일 ISBN의 중복 판본을 정본으로 묶는다. 확인된 표지 번호만 조회한다.
        const coverId = detail?.covers?.find(value => Number.isInteger(value) && value > 0)
        const cover = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : data[bibkey]?.cover?.large
        const coverUrl = /^https:\/\/covers\.openlibrary\.org\/b\/id\/\d+-L\.jpg$/u.test(cover ?? '') ? cover : null
        await consider(group, official, coverUrl)
      }
    }
    for (const [key, group] of selected.filter(([key]) => key.startsWith('ko:'))) {
      const isbn = key.slice(3), book = await getKakaoBookByIsbn(isbn)
      const official = book ? { isbn: toIsbn13(book.metadata.isbn), title: book.title, creator: book.creator, sourceUrl: book.metadata.link } : null
      await consider(group, official, book?.coverImageUrl)
      await new Promise(done => setTimeout(done, 250))
    }
    await flush()
  } finally {
    // 일부 저장 뒤 공급처 조회가 실패해도 이미 저장한 작품의 캐시를 비운다.
    if (changedIds.size) {
      const ids = [...changedIds], encoded = ids.map(sqlLiteral).join(',')
      const references = sql(`SELECT jsonb_build_object('id',c.id,'external_id',c.external_id) FROM contents c WHERE c.id IN (${encoded}) UNION ALL SELECT DISTINCT jsonb_build_object('celeb_id',c.id,'slug',c.slug) FROM celebs c JOIN (SELECT celeb_id FROM celeb_contents WHERE content_id IN (${encoded}) UNION SELECT celeb_id FROM figure_book_characters WHERE content_id IN (${encoded})) r ON r.celeb_id=c.id;`)
      const targets = new Map()
      const add = (domain, id) => { if (id) targets.set(`${domain}:${id}`, { domain, id }) }
      for (const ref of references) { if (ref.id) { add(CACHE_TAGS.CONTENTS, ref.id); add(CACHE_TAGS.CONTENTS, ref.external_id) } else { add(CACHE_TAGS.CELEBS, ref.celeb_id); add(CACHE_TAGS.CELEBS, ref.slug) } }
      // 한 작품 아래 판본 자료도 콘텐츠 키와 동일한 식별자로 무효화한다.
      for (const id of ids) add(CACHE_TAGS.FIGURE_BOOKS, id)
      const revalidateModule = await import('../../src/lib/revalidate-web.ts')
      const { revalidateWebItems } = revalidateModule.default ?? revalidateModule
      for (const url of ['http://localhost:3000', 'https://feelandnote.com']) {
        process.env.NEXT_PUBLIC_WEB_URL = url
        await revalidateWebItems([...targets.values()])
        console.log(JSON.stringify({ event: 'cache_revalidated', url, targets: targets.size }))
      }
      const rechecked = sql(`SELECT jsonb_build_object('table','content_locales','content_id',l.content_id,'locale',l.locale,'id',NULL,'thumbnail_url',l.thumbnail_url,'preserved_hash',${preserveHash('l')}) FROM content_locales l WHERE l.content_id IN (${encoded}) UNION ALL SELECT jsonb_build_object('table','figure_book_editions','content_id',e.content_id,'locale',e.locale,'id',e.id,'thumbnail_url',e.thumbnail_url,'preserved_hash',${preserveHash('e')}) FROM figure_book_editions e WHERE e.content_id IN (${encoded});`)
      const readback = new Map(rechecked.map(row => [`${row.table}:${row.content_id}:${row.id ?? row.locale}`, row]))
      for (const [key, expected] of appliedChecks) {
        const current = readback.get(key)
        if (!current || current.thumbnail_url !== expected.cover) throw new Error(`Final cover readback mismatch: ${key}`)
        // 저장 직후의 보존 검사는 위에서 통과했다. 뒤늦은 다른 메타 수정은 표지 오류와 구별한다.
        if (current.preserved_hash !== expected.preservedHash) console.log(JSON.stringify({ event: 'metadata_changed_after_cover_write', key }))
      }
      console.log(JSON.stringify({ event: 'readback', rows: rechecked.length, changedWorks: changedIds.size }))
    }
    console.log(JSON.stringify({ event: 'result', apply, missingRows: rows.length, checkedLookups: checked, totalLookups: groups.size, changedWorks: changedIds.size, changedIds: [...changedIds], counts, examples }))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
