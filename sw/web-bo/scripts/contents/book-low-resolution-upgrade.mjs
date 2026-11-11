/** 등록된 모든 BOOK 표지의 실측 크기를 검사하고 같은 ISBN의 같은 표지만 교체한다. LLM 호출 없음. */
import sharp from 'sharp'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { toIsbn13, equivalentIsbns } from '../../../../packages/content-search/src/book-isbn.ts'
import { CACHE_TAGS } from '../../../../packages/shared/src/constants/cache-tags.ts'
import { sqlLiteral } from '../figure-books/lib/merge-work-sql.mjs'
import { preserveHash } from './book-cover-backfill-contract.mjs'
import { originalCoverUrl, compareCoverImages, revalidateThumbnailCaches } from './book-thumbnail-upgrade.mjs'
import { excludedBookEditionReason } from '../../../../packages/content-search/src/book-edition-policy.ts'

export const LOW_RESOLUTION = Object.freeze({ minWidth: 400, minHeight: 600, concurrency: 12,
  timeoutMs: 15000, maxBytes: 8 * 1024 * 1024, maxHeaderBytes: 128 * 1024,
  maxPixelError: 12, maxHashDifference: 6, minEntropy: 0.5, consecutiveFailures: 12, writeBatch: 20, yes24IntervalMs: 200 })
export const eligibleCoverRow = row => !excludedBookEditionReason(row) && row.sources?.primary !== 'none'
export const isLowResolution = ({ width, height }) => width < LOW_RESOLUTION.minWidth || height < LOW_RESOLUTION.minHeight

/** 부분 응답에서도 크기를 읽는다. WebP 전체 디코딩을 위해 수만 장을 내려받지 않는다. */
export function imageHeaderSize(b) {
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }
  if (b.length >= 10 && /^GIF8[79]a$/u.test(b.toString('ascii', 0, 6))) return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16)
    if (kind === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 }
    if (kind === 'VP8L' && b[20] === 0x2f) return { width: 1 + (b[21] | (b[22] & 63) << 8), height: 1 + ((b[22] >> 6) | b[23] << 2 | (b[24] & 15) << 10) }
    if (kind === 'VP8 ' && b[23] === 0x9d && b[24] === 1 && b[25] === 0x2a) return { width: b.readUInt16LE(26) & 16383, height: b.readUInt16LE(28) & 16383 }
  }
  if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    let p = 2
    while (p + 4 <= b.length) {
      if (b[p] !== 255) return null
      while (b[p + 1] === 255) p++
      const marker = b[p + 1]
      if (marker === 0xda || marker === 0xd9) return null
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) { p += 2; continue }
      if (p + 4 > b.length) return null
      const n = b.readUInt16BE(p + 2)
      if (n < 2) return null
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return p + 9 <= b.length ? { width: b.readUInt16BE(p + 7), height: b.readUInt16BE(p + 5) } : null
      p += n + 2
    }
  }
  return null
}

export function isbnCoverCandidates(isbn, sources = {}) {
  if (toIsbn13(isbn ?? '') !== isbn) return []
  const out = [{ url: `https://contents.kyobobook.co.kr/sih/fit-in/0x0/pdt/${isbn}.jpg`, source: `https://contents.kyobobook.co.kr/sih/fit-in/0x0/pdt/${isbn}.jpg`, isbn }]
  const short = equivalentIsbns(isbn).find(value => value.length === 10)
  if (short) out.push({ url: `https://images-na.ssl-images-amazon.com/images/P/${short}.01.LZZZZZZZ.jpg`, source: `https://www.amazon.com/dp/${short}`, isbn })
  for (const value of Object.values(sources)) {
    const match = typeof value === 'string' && value.match(/^https:\/\/www\.yes24\.com\/(?:product\/goods|Product\/Goods)\/(\d+)(?:[?#]|$)/u)
    if (match) out.push({ url: `https://image.yes24.com/goods/${match[1]}/XL`, source: `https://www.yes24.com/product/goods/${match[1]}`, isbn, verifyPage: true })
  }
  return [...new Map(out.map(item => [item.url, item])).values()]
}

export async function sameCoverAtHigherResolution(before, after) {
  const check = await compareCoverImages(before, after)
  if (check.reason || check.pixelError > LOW_RESOLUTION.maxPixelError) return { ...check, reason: check.reason ?? 'different_image' }
  const stats = await Promise.all([before, after].map(bytes => sharp(bytes).stats()))
  if (stats.some(s => s.entropy < LOW_RESOLUTION.minEntropy)) return { ...check, reason: 'uninformative_image' }
  const hash = async bytes => {
    const p = await sharp(bytes).flatten({ background: '#fff' }).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
    return Array.from({ length: 64 }, (_, i) => p[Math.floor(i / 8) * 9 + i % 8] > p[Math.floor(i / 8) * 9 + i % 8 + 1])
  }
  const [a, b] = await Promise.all([hash(before), hash(after)])
  const hashDifference = a.filter((bit, i) => bit !== b[i]).length
  return { ...check, hashDifference, reason: hashDifference <= LOW_RESOLUTION.maxHashDifference ? null : 'different_image' }
}

export function yes24CoverCandidate(payload, isbn) {
  const item = payload.data?.items?.find(item => item.isbn13 === isbn && Number.isSafeInteger(item.itemId) && item.itemId > 0
    && ['도서','국내도서','외서','외국도서','만화','eBook'].includes(item.goodsType) && item.link === `https://www.yes24.com/product/goods/${item.itemId}`)
  return item ? { isbn, url: `https://image.yes24.com/goods/${item.itemId}/XL`, source: item.link } : null
}

export function buildLowResolutionApplySql(changes) {
  const updates = changes.map(({ row, candidate }) => {
    if (!['content_locales', 'figure_book_editions'].includes(row.table) || !/^[a-f0-9]{32}$/u.test(row.row_hash)
      || toIsbn13(row.isbn ?? '') !== candidate.isbn || !candidate.verifiedImage || !/^https:\/\//u.test(candidate.source)
      || !/^https:\/\//u.test(candidate.url)) throw new Error('Unverified higher-resolution cover')
    const where = row.table === 'content_locales' ? `t.content_id=${sqlLiteral(row.content_id)} AND t.locale=${sqlLiteral(row.locale)}` : `t.id=${sqlLiteral(String(row.id))}::bigint AND t.content_id=${sqlLiteral(row.content_id)}`
    return `WITH changed AS (UPDATE ${row.table} t SET thumbnail_url=${sqlLiteral(candidate.url)},sources=jsonb_set(coalesce(t.sources,'{}'::jsonb),'{thumbnail}',${sqlLiteral(JSON.stringify(candidate.source))}::jsonb),updated_at=now() WHERE ${where} AND t.thumbnail_url=${sqlLiteral(row.thumbnail_url)} AND md5(to_jsonb(t)::text)=${sqlLiteral(row.row_hash)} RETURNING t.*) SELECT jsonb_build_object('table',${sqlLiteral(row.table)},'content_id',t.content_id,'id',${row.table === 'content_locales' ? 'NULL' : 't.id'},'locale',t.locale,'thumbnail_url',t.thumbnail_url,'source',t.sources->>'thumbnail','preserved_hash',${preserveHash('t')}) FROM changed t;`
  })
  return `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n${updates.join('\n')}\nCOMMIT;`
}

const keyOf = row => `${row.table}:${row.content_id}:${row.id ?? row.locale}`
export async function upgradeLowResolutionBooks(sql, args) {
  const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
  for (let i = 0; i < args.length; i++) {
    if (['--upgrade-low-resolution', '--apply'].includes(args[i])) continue
    if (['--limit', '--content-id', '--session-dir'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue }
    throw Error(`Unknown or incomplete argument: ${args[i]}`)
  }
  const apply = args.includes('--apply'), limit = Number(option('--limit') ?? Infinity), contentId = option('--content-id')
  if (!(limit > 0) || (limit !== Infinity && !Number.isInteger(limit))) throw Error('Invalid limit')
  if (contentId && !/^[a-f0-9-]{36}$/u.test(contentId)) throw Error('Invalid content ID')
  const dir = resolve(option('--session-dir') ?? resolve(tmpdir(), 'feelandnote', `book-cover-sizes-${process.pid}`))
  await mkdir(dir, { recursive: true })
  // 외부 이미지 크기만 캐시한다. DB 행이나 메타의 덤프는 파일로 저장하지 않는다.
  const cacheFile = resolve(dir, 'image-sizes.jsonl'), cache = new Map()
  try { for (const line of (await readFile(cacheFile, 'utf8')).split('\n').filter(Boolean)) { const entry = JSON.parse(line); cache.set(entry.url, entry) } } catch (e) { if (e.code !== 'ENOENT') throw e }
  const counts = {}, changed = new Map(), pending = []
  const count = (name, n = 1) => { counts[name] = (counts[name] ?? 0) + n }
  const log = (event, fields = {}) => console.log(JSON.stringify({ event, ...fields }))
  let stopped = null, failures = 0, nextIsbnCover = 0, apiStopped = false
  const productCache = new Map()
  const productCacheFile = resolve(dir, 'yes24-products.jsonl'), blockedProviders = new Set()
  try { for (const line of (await readFile(productCacheFile, 'utf8')).split('\n').filter(Boolean)) { const entry = JSON.parse(line); productCache.set(entry.isbn, entry.candidate) } } catch (e) { if (e.code !== 'ENOENT') throw e }
  let productQueue = Promise.resolve(), productKey = process.env.YES24_AUDIT_API_KEY, usedSecondary = false
  async function response(url) {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error('Invalid image URL')
    const limitedIsbnCover = parsed.hostname === 'covers.openlibrary.org' && !/^\/b\/(?:id|olid)\//iu.test(parsed.pathname)
    const provider = parsed.hostname + (limitedIsbnCover ? ':isbn' : '')
    if (blockedProviders.has(provider)) throw Object.assign(Error(`provider_unavailable:${provider}`), { providerUnavailable: true })
    if (limitedIsbnCover) {
      const gap = Math.max(0, nextIsbnCover - Date.now()); nextIsbnCover = Math.max(nextIsbnCover, Date.now()) + 3100
      if (gap) await new Promise(done => setTimeout(done, gap))
    }
    const r = await fetch(url, { signal: AbortSignal.timeout(LOW_RESOLUTION.timeoutMs) })
    if ([403,429].includes(r.status)) {
      blockedProviders.add(provider); log('cover_image_provider_stopped', { provider, status: r.status })
      throw Object.assign(Error(`provider_unavailable:${provider}`), { providerUnavailable: true })
    }
    if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) throw Error(`image_http_${r.status}`)
    return r
  }
  async function bytes(url) {
    const r = await response(url), reader = r.body.getReader(), chunks = []; let n = 0
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; n += value.length; if (n > LOW_RESOLUTION.maxBytes) throw Error('image_too_large'); chunks.push(value) } return Buffer.concat(chunks) }
    finally { await reader.cancel().catch(() => {}) }
  }
  async function size(url) {
    if (cache.has(url)) return cache.get(url)
    const r = await response(url), reader = r.body.getReader(), chunks = []; let n = 0, result
    try {
      for (;;) { const { value, done } = await reader.read(); if (done) break; n += value.length; chunks.push(value); result = imageHeaderSize(Buffer.concat(chunks)); if (result || n >= LOW_RESOLUTION.maxHeaderBytes) break }
      if (!result) throw Error('unreadable_dimensions')
      const entry = { url, ...result }; cache.set(url, entry); await appendFile(cacheFile, JSON.stringify(entry) + '\n'); return entry
    } finally { await reader.cancel().catch(() => {}) }
  }
  async function yes24(isbn) {
    if (!productKey || apiStopped) return null
    if (productCache.has(isbn)) return productCache.get(isbn)
    const task = productQueue.then(async () => {
      if (apiStopped) return null
      const remember = async candidate => { await appendFile(productCacheFile, JSON.stringify({ isbn, candidate }) + '\n'); return candidate }
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(done => setTimeout(done, LOW_RESOLUTION.yes24IntervalMs))
        const r = await fetch(`https://apis.yes24.com/v1/goods/itemDetail?searchType=ISBN13&query=${isbn}&detail=N`, { headers: { 'X-Api-Key': productKey, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(LOW_RESOLUTION.timeoutMs) })
        if (r.status === 404) return remember(null)
        const payload = await r.json()
        if (r.status === 429 && payload.errorCode !== 'RATE_002') {
          const waitMs = Math.max(Number(r.headers.get('retry-after')) * 1000 || 1000 * 2 ** attempt, LOW_RESOLUTION.yes24IntervalMs)
          log('cover_provider_backoff', { provider: 'yes24', waitMs }); await new Promise(done => setTimeout(done, waitMs)); continue
        }
        if (payload.errorCode === 'RATE_002' && !usedSecondary && process.env.YES24_AUDIT_SECONDARY_API_KEY) {
          productKey = process.env.YES24_AUDIT_SECONDARY_API_KEY; usedSecondary = true; log('cover_provider_daily_quota', { provider: 'yes24', switchedToConfiguredSecondary: true }); continue
        }
        if ([401,403,429].includes(r.status) || payload.success !== true || payload.errorCode) {
          apiStopped = true; log('cover_provider_stopped', { provider: 'yes24', status: r.status, reason: payload.errorCode ?? 'invalid_response' }); return null
        }
        if (!r.ok) throw Error(`yes24_http_${r.status}`)
        return remember(yes24CoverCandidate(payload, isbn))
      }
      apiStopped = true; log('cover_provider_stopped', { provider: 'yes24', reason: 'repeated_rate_limit' }); return null
    })
    productQueue = task.catch(() => {})
    productCache.set(isbn, task)
    return task
  }
  const select = (table, a) => `SELECT jsonb_build_object('table',${sqlLiteral(table)},'id',${table === 'content_locales' ? 'NULL' : `${a}.id`},'content_id',${a}.content_id,'locale',${a}.locale,'title',${a}.title,'isbn',${a}.isbn,'publisher',${a}.publisher,'editionKind',${table === 'figure_book_editions' ? `${a}.edition_kind` : 'NULL'},'textScope',${table === 'figure_book_editions' ? `${a}.text_scope` : 'NULL'},'sources',jsonb_build_object('primary',${a}.sources->>'primary','title',${a}.sources->>'title','thumbnail',${a}.sources->>'thumbnail','description',${a}.sources->>'description','isbn',${a}.sources->>'isbn','provider_edition_isbn',${a}.sources->>'provider_edition_isbn','provider_edition_title',${a}.sources->>'provider_edition_title','provider_scope_description',coalesce(${a}.sources->>'provider_scope_description',${a}.sources#>>'{provider_metadata,contents}')),'thumbnail_url',${a}.thumbnail_url,'row_hash',md5(to_jsonb(${a})::text),'preserved_hash',${preserveHash(a)}) FROM ${table} ${a} JOIN contents c ON c.id=${a}.content_id WHERE c.type='BOOK' AND coalesce(${a}.sources->'edition_selection_evidence','[]'::jsonb)='[]'::jsonb AND NOT coalesce(public.book_nonstart_work_volume(${a}.title,c.metadata->'figureBook',${table === 'figure_book_editions' ? `${a}.text_scope` : 'NULL'}),false) AND nullif(btrim(${a}.thumbnail_url),'') IS NOT NULL${contentId ? ` AND ${a}.content_id=${sqlLiteral(contentId)}` : ''}`
  const rows = []
  for (const [table, alias] of [['content_locales', 'l'], ['figure_book_editions', 'e']]) {
    let last = null
    for (;;) {
      const keyset = !last ? '' : table === 'content_locales'
        ? ` AND (${alias}.content_id,${alias}.locale)>(${sqlLiteral(last.content_id)},${sqlLiteral(last.locale)})`
        : ` AND ${alias}.id>${sqlLiteral(String(last.id))}::bigint`
      const order = table === 'content_locales' ? `${alias}.content_id,${alias}.locale` : `${alias}.id`
      const batch = sql(`${select(table, alias)}${keyset} ORDER BY ${order} LIMIT 5000;`)
      rows.push(...batch)
      if (batch.length < 5000) break
      last = batch.at(-1)
    }
  }
  const groups = new Map()
  for (const row of rows) {
    if (!eligibleCoverRow(row)) continue
    if (!groups.has(row.thumbnail_url)) groups.set(row.thumbnail_url, [])
    groups.get(row.thumbnail_url).push(row)
  }
  const selected = [...groups].slice(0, limit)
  const flush = () => {
    if (!pending.length) return
    const changes = pending.splice(0), results = new Map(sql(buildLowResolutionApplySql(changes)).map(r => [keyOf(r), r]))
    for (const change of changes) {
      const actual = results.get(keyOf(change.row))
      if (!actual) { count('concurrent_change_skipped'); continue }
      if (actual.thumbnail_url !== change.candidate.url || actual.source !== change.candidate.source || actual.preserved_hash !== change.row.preserved_hash) throw Object.assign(Error('Cover readback mismatch'), { stop: true })
      changed.set(keyOf(change.row), change); count('upgraded_rows')
    }
  }
  let next = 0, checked = 0
  log('cover_size_scan', { rows: rows.length, uniqueImages: groups.size, selected: selected.length, apply, sessionDir: dir })
  try {
    await Promise.all(Array.from({ length: Math.min(selected.length, LOW_RESOLUTION.concurrency) }, async () => {
      while (!stopped && next < selected.length) {
        const [url, group] = selected[next++]
        try {
          const measured = await size(url); failures = 0; count('measured_images')
          if (!isLowResolution(measured)) { count('adequate_images'); continue }
          count('low_resolution_images')
          const byIsbn = new Map()
          for (const row of group) { const isbn = toIsbn13(row.isbn ?? ''); if (!isbn) { count('no_valid_isbn'); continue }; if (!byIsbn.has(isbn)) byIsbn.set(isbn, []); byIsbn.get(isbn).push(row) }
          let before
          for (const [isbn, targets] of byIsbn) {
            const origin = originalCoverUrl(url), candidates = isbnCoverCandidates(isbn, targets[0].sources)
            if (origin && origin !== url) candidates.unshift({ isbn, url: origin, source: targets[0].sources?.thumbnail?.startsWith('https://') ? targets[0].sources.thumbnail : origin })
            let accepted = null, providerQueried = false
            for (let i = 0; i <= candidates.length; i++) {
              if (i === candidates.length) { if (providerQueried) break; providerQueried = true; const candidate = await yes24(isbn); if (!candidate) break; candidates.push(candidate) }
              const candidate = candidates[i]
              if (candidate.url === url) continue
              try {
                if (candidate.verifyPage) {
                  const page = await fetch(candidate.source, { signal: AbortSignal.timeout(LOW_RESOLUTION.timeoutMs) }); const html = await page.text()
                  if (!page.ok || html.match(/<th\b[^>]*>\s*ISBN13\s*<\/th>\s*<td\b[^>]*>\s*(\d{13})\s*<\/td>/iu)?.[1] !== isbn) continue
                }
                const afterSize = await size(candidate.url)
                if (afterSize.width <= measured.width || afterSize.height <= measured.height || afterSize.width * afterSize.height < measured.width * measured.height * 2) continue
                before ??= await bytes(url)
                const check = await sameCoverAtHigherResolution(before, await bytes(candidate.url))
                if (check.reason) { count('candidate_image_rejected'); continue }
                candidate.verifiedImage = true
                if (!accepted || check.after.width * check.after.height > accepted.check.after.width * accepted.check.after.height) accepted = { candidate, check }
                if (!isLowResolution(afterSize)) break
              } catch (e) { if (e.stop) { if (e.message.includes('covers.openlibrary.org')) throw e; count('candidate_provider_unavailable') } else count('candidate_unavailable') }
            }
            if (!accepted) count('no_verified_larger_cover')
            else {
              count('verified_images'); log('cover_size_verified', { contentId: targets[0].content_id, title: targets[0].title, isbn, rows: targets.length, cover: accepted.candidate.url, ...accepted.check })
              if (apply) pending.push(...targets.map(row => ({ row, candidate: accepted.candidate })))
            }
          }
          if (apply && pending.length >= LOW_RESOLUTION.writeBatch) try { flush() } catch (e) { e.stop = true; throw e }
        } catch (e) {
          count('unmeasured_or_failed')
          if (e.providerUnavailable) { count('source_provider_unavailable'); failures = 0; continue }
          failures++
          if (e.stop || failures >= LOW_RESOLUTION.consecutiveFailures) stopped = e
          if (checked < 5 || stopped) log('cover_size_failure', { reason: e.message })
        } finally {
          checked++
          if (checked % 100 === 0) log('cover_size_progress', { checked, selected: selected.length, counts, changedRows: changed.size })
        }
      }
    }))
    if (!stopped && apply) flush()
    if (stopped) throw stopped
  } finally {
    if (changed.size) {
      const ids = [...new Set([...changed.values()].map(x => x.row.content_id))], encoded = ids.map(sqlLiteral).join(',')
      const current = new Map(sql(`SELECT jsonb_build_object('table','content_locales','content_id',content_id,'id',NULL,'locale',locale,'thumbnail_url',thumbnail_url) FROM content_locales WHERE content_id IN (${encoded}) UNION ALL SELECT jsonb_build_object('table','figure_book_editions','content_id',content_id,'id',id,'locale',locale,'thumbnail_url',thumbnail_url) FROM figure_book_editions WHERE content_id IN (${encoded});`).map(row => [keyOf(row), row]))
      for (const [key, change] of changed) if (current.get(key)?.thumbnail_url !== change.candidate.url) throw Error('Final cover readback mismatch')
      const imported = await import('../../src/lib/revalidate-web.ts'), { revalidateWebCache } = imported.default ?? imported
      await revalidateThumbnailCaches(() => revalidateWebCache([CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.CELEBS], 'BOOK의 낮은 해상도 표지를 같은 ISBN의 큰 표지로 교체'), log)
    }
    log('cover_size_result', { complete: !stopped && checked === selected.length, apply, checked, selected: selected.length, counts, changedRows: changed.size, changedWorks: new Set([...changed.values()].map(x => x.row.content_id)).size })
  }
}
