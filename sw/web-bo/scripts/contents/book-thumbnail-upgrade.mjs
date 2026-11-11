/** 같은 표지의 축소 주소만 원본으로 바꾼다. 다른 판본·표지를 검색해서 대체하지 않는다. */
import sharp from 'sharp'
import { sqlLiteral } from '../figure-books/lib/merge-work-sql.mjs'
import { preserveHash } from './book-cover-backfill-contract.mjs'
import { CACHE_TAGS } from '../../../../packages/shared/src/constants/cache-tags.ts'
import { reviewedBookEditionSelectionReason } from '../../../../packages/content-search/src/book-edition-policy.ts'

export const THUMBNAIL_UPGRADE = Object.freeze({ concurrency: 8, writeBatch: 100, maxBytes: 8 * 1024 * 1024,
  timeoutMs: 15000, minPixelGain: 2, maxAspectDifference: 0.03, maxPixelError: 24, comparisonWidth: 32, comparisonHeight: 48 })

export function originalCoverUrl(raw) {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null
    if (/^search\d*\.kakaocdn\.net$/u.test(url.hostname) && url.pathname.startsWith('/thumb/')) {
      const original = new URL(url.searchParams.get('fname'))
      if (!['http:', 'https:'].includes(original.protocol) || original.username || original.password || original.port
        || original.hostname !== 't1.daumcdn.net' || !/^\/lbook\/image\/\d+$/u.test(original.pathname)) return null
      original.protocol = 'https:'
      return original.href
    }
    if (url.hostname === 'covers.openlibrary.org' && /^\/b\/(?:id\/\d+|isbn\/(?:\d{13}|\d{9}[\dXx])|olid\/OL\d+M)-[SM]\.jpg$/u.test(url.pathname)) {
      url.protocol = 'https:'
      url.pathname = url.pathname.replace(/-[SM]\.jpg$/u, '-L.jpg')
      return url.href
    }
    if (url.hostname === 'image.aladin.co.kr' && /^\/product\/\d+\/\d+\/(?:cover150|coversum)\/[\w-]+\.(?:jpg|gif|png)$/iu.test(url.pathname)) {
      url.protocol = 'https:'
      url.pathname = url.pathname.replace(/\/(?:cover150|coversum)\//iu, '/cover500/')
      return url.href
    }
    if (url.hostname === 'image.yes24.com' && /^\/goods\/\d+\/[SML]$/iu.test(url.pathname)) {
      url.protocol = 'https:'
      url.pathname = url.pathname.replace(/\/[SML]$/iu, '/XL')
      return url.href
    }
    // 출판사 CDN의 같은 파일에서 축소 지정만 뺀다. 확대 크기는 요청하지 않는다.
    if (/^[a-z\d-]+\.imgix\.net$/u.test(url.hostname) && /^\/covers\/[\w-]+\.(?:jpg|png)$/iu.test(url.pathname)
      && /^\d+$/u.test(url.searchParams.get('w') ?? '') && !['h', 'crop', 'fit', 'rect'].some(key => url.searchParams.has(key))) {
      url.protocol = 'https:'
      url.searchParams.delete('w')
      return url.href
    }
  } catch { /* 미확인 주소는 바꾸지 않는다. */ }
  return null
}

export async function compareCoverImages(before, after, { thumbnailCanvas = false } = {}) {
  const settings = { limitInputPixels: 30_000_000 }
  const [oldSize, newSize] = await Promise.all([sharp(before, settings).metadata(), sharp(after, settings).metadata()])
  const size = image => ({ width: image.width, height: image.height })
  const result = { before: size(oldSize), after: size(newSize) }
  if (!oldSize.width || !oldSize.height || !newSize.width || !newSize.height) return { ...result, reason: 'unreadable_dimensions' }
  if (newSize.width <= oldSize.width || newSize.height <= oldSize.height
    || newSize.width * newSize.height < oldSize.width * oldSize.height * THUMBNAIL_UPGRADE.minPixelGain) return { ...result, reason: 'not_larger' }
  if (!thumbnailCanvas && Math.abs((newSize.width / newSize.height) / (oldSize.width / oldSize.height) - 1) > THUMBNAIL_UPGRADE.maxAspectDifference) return { ...result, reason: 'different_aspect' }
  const pixels = buffer => sharp(buffer, settings).flatten({ background: '#fff' }).toColourspace('srgb')
    .resize(THUMBNAIL_UPGRADE.comparisonWidth, THUMBNAIL_UPGRADE.comparisonHeight, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const a = await pixels(before)
  // 카카오 고정 크기 썸네일은 책 비율에 따라 여백 또는 늘이기를 사용한다. 원본을 두 방식으로 축소해 대조한다.
  const versions = await Promise.all([pixels(after), ...(thumbnailCanvas ? [sharp(after, settings)
    .resize(oldSize.width, oldSize.height, { fit: 'contain', background: '#fff' }).png().toBuffer().then(pixels)] : [])])
  const errors = versions.filter(b => b.length === a.length).map(b => Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length))
  if (!errors.length) return { ...result, reason: 'different_channels' }
  const error = Math.min(...errors)
  return { ...result, pixelError: Number(error.toFixed(2)), reason: error <= THUMBNAIL_UPGRADE.maxPixelError ? null : 'different_image' }
}

const rowKey = row => `${row.table}:${row.content_id}:${row.id ?? row.locale}`
const where = (row, alias) => row.table === 'content_locales'
  ? `${alias}.content_id=${sqlLiteral(row.content_id)} AND ${alias}.locale=${sqlLiteral(row.locale)}`
  : `${alias}.id=${sqlLiteral(String(row.id))}::bigint AND ${alias}.content_id=${sqlLiteral(row.content_id)}`

export function buildThumbnailUpgradeSql(changes) {
  const updates = changes.map(({ row, cover }) => {
    if (!['content_locales', 'figure_book_editions'].includes(row.table) || !/^[a-f0-9]{32}$/u.test(row.row_hash)
      || originalCoverUrl(row.thumbnail_url) !== cover) throw new Error('Unverified thumbnail transformation')
    return `WITH changed AS (UPDATE ${row.table} t SET thumbnail_url=${sqlLiteral(cover)},updated_at=now()
      WHERE ${where(row, 't')} AND t.thumbnail_url=${sqlLiteral(row.thumbnail_url)} AND md5(to_jsonb(t)::text)=${sqlLiteral(row.row_hash)} RETURNING t.*)
      SELECT jsonb_build_object('table',${sqlLiteral(row.table)},'content_id',t.content_id,'id',${row.table === 'content_locales' ? 'NULL' : 't.id'},'locale',t.locale,'thumbnail_url',t.thumbnail_url,'preserved_hash',${preserveHash('t')}) FROM changed t;`
  })
  return `BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='60s';\n${updates.join('\n')}\nCOMMIT;`
}

async function imageBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(THUMBNAIL_UPGRADE.timeoutMs) })
  if (response.status === 429) throw new Error('rate_limited')
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`image_http_${response.status}`)
  const reader = response.body.getReader(), chunks = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > THUMBNAIL_UPGRADE.maxBytes) throw new Error('image_too_large')
      chunks.push(value)
    }
    return Buffer.concat(chunks)
  } finally { await reader.cancel().catch(() => {}) }
}

/** 개발 서버가 꺼져 있어도 운영 캐시는 갱신한다. 그 밖의 실패는 완료로 취급하지 않는다. */
export async function revalidateThumbnailCaches(send, log) {
  const configuredOrigin = process.env.NEXT_PUBLIC_WEB_URL, failures = []
  const refused = error => error?.code === 'ECONNREFUSED' || (error?.cause && refused(error.cause))
    || (Array.isArray(error?.errors) && error.errors.some(refused))
  try {
    for (const origin of ['http://localhost:3000', 'https://feelandnote.com']) {
      process.env.NEXT_PUBLIC_WEB_URL = origin
      try { await send(origin); log('thumbnail_cache_revalidated', { origin }) }
      catch (error) {
        if (origin === 'http://localhost:3000' && refused(error)) log('thumbnail_local_cache_not_running', { origin })
        else { failures.push(error); log('thumbnail_cache_failed', { origin, reason: error.message }) }
      }
    }
  } finally { if (configuredOrigin === undefined) delete process.env.NEXT_PUBLIC_WEB_URL; else process.env.NEXT_PUBLIC_WEB_URL = configuredOrigin }
  if (failures.length) throw new AggregateError(failures, 'Thumbnail cache revalidation incomplete')
}

export async function upgradeBookThumbnails(sql, args) {
  for (let i = 0; i < args.length; i++) {
    if (['--upgrade-thumbnails', '--apply', '--bulk-cache'].includes(args[i])) continue
    if (['--limit', '--content-id'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue }
    throw new Error(`Unknown or incomplete argument: ${args[i]}`)
  }
  const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
  const apply = args.includes('--apply'), limit = value('--limit') === undefined ? Infinity : Number(value('--limit'))
  const contentId = value('--content-id')
  const bulkCache = args.includes('--bulk-cache')
  if (!(limit > 0) || (limit !== Infinity && !Number.isInteger(limit))) throw new Error('Invalid limit')
  if (contentId && !/^[a-f0-9-]{36}$/u.test(contentId)) throw new Error('Invalid content ID')
  if (bulkCache && (contentId || limit !== Infinity)) throw new Error('--bulk-cache is for the complete catalog; omit --content-id and --limit')
  const inventory = sql(`WITH covers AS (SELECT l.content_id,l.thumbnail_url FROM content_locales l JOIN contents c ON c.id=l.content_id WHERE c.type='BOOK' UNION ALL SELECT e.content_id,e.thumbnail_url FROM figure_book_editions e JOIN contents c ON c.id=e.content_id WHERE c.type='BOOK') SELECT jsonb_build_object('totalRows',count(*),'coveredRows',count(nullif(thumbnail_url,'')),'coveredWorks',count(DISTINCT content_id) FILTER (WHERE nullif(thumbnail_url,'') IS NOT NULL),'uniqueCoverUrls',count(DISTINCT nullif(thumbnail_url,''))) FROM covers${contentId ? ` WHERE content_id=${sqlLiteral(contentId)}` : ''};`)[0]
  const select = (table, alias) => `SELECT jsonb_build_object('table',${sqlLiteral(table)},'id',${table === 'content_locales' ? 'NULL' : `${alias}.id`},'content_id',${alias}.content_id,'locale',${alias}.locale,'title',${alias}.title,'isbn',${alias}.isbn,'sources',${alias}.sources,'thumbnail_url',${alias}.thumbnail_url,'row_hash',md5(to_jsonb(${alias})::text),'preserved_hash',${preserveHash(alias)}) FROM ${table} ${alias} JOIN contents c ON c.id=${alias}.content_id WHERE c.type='BOOK' AND ${alias}.thumbnail_url ~ '^https?://(search[0-9]*[.]kakaocdn[.]net/thumb/|covers[.]openlibrary[.]org/b/(id|isbn|olid)/.*-[SM][.]jpg|image[.]aladin[.]co[.]kr/product/.*/(cover150|coversum)/|image[.]yes24[.]com/goods/[0-9]+/[sSmMlL]($|[?])|[a-z0-9-]+[.]imgix[.]net/covers/)'${contentId ? ` AND ${alias}.content_id=${sqlLiteral(contentId)}` : ''}`
  const rows = sql(`${select('content_locales', 'l')} UNION ALL ${select('figure_book_editions', 'e')};`)
  const groups = new Map()
  for (const row of rows) {
    if (reviewedBookEditionSelectionReason(row) || row.sources?.primary === 'none') continue
    const cover = originalCoverUrl(row.thumbnail_url)
    if (!cover) continue
    const key = `${row.thumbnail_url}\n${cover}`
    if (!groups.has(key)) groups.set(key, { cover, rows: [] })
    groups.get(key).rows.push(row)
  }
  const selected = [...groups.values()].slice(0, limit), counts = {}, changed = new Map(), pending = []
  const count = reason => { counts[reason] = (counts[reason] ?? 0) + 1 }
  const log = (event, rest) => console.log(JSON.stringify({ event, ...rest }))
  log('thumbnail_scan', { ...inventory, rows: rows.length, uniqueImages: groups.size, selected: selected.length, apply })
  let next = 0, checked = 0, stopped = null, cacheComplete = false
  const flush = () => {
    if (!pending.length) return
    const changes = pending.splice(0)
    const results = new Map(sql(buildThumbnailUpgradeSql(changes)).map(row => [rowKey(row), row]))
    for (const change of changes) {
      const result = results.get(rowKey(change.row))
      if (!result) { count('concurrent_change_skipped'); continue }
      if (result.thumbnail_url !== change.cover || result.preserved_hash !== change.row.preserved_hash) throw new Error('Thumbnail readback mismatch')
      changed.set(rowKey(change.row), change)
      count('upgraded_rows')
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(selected.length, THUMBNAIL_UPGRADE.concurrency) }, async () => {
      while (!stopped && next < selected.length) {
        const group = selected[next++]
        try {
          const before = await imageBytes(group.rows[0].thumbnail_url), after = await imageBytes(group.cover)
          const check = await compareCoverImages(before, after, { thumbnailCanvas: /\.kakaocdn\.net\/thumb\//u.test(group.rows[0].thumbnail_url) })
          if (check.reason) count(check.reason)
          else {
            count('verified_images')
            log('thumbnail_verified', { title: group.rows[0].title, contentId: group.rows[0].content_id, rows: group.rows.length, cover: group.cover, ...check })
            if (apply) {
              pending.push(...group.rows.map(row => ({ row, cover: group.cover })))
              if (pending.length >= THUMBNAIL_UPGRADE.writeBatch) try { flush() } catch (error) { error.fatal = true; throw error }
            }
          }
        } catch (error) {
          count(/^(rate_limited|image_http_\d+|image_too_large)$/u.test(error.message) ? error.message : error.fatal ? 'database_write_failed' : 'image_unreadable')
          if (error.fatal || error.message === 'rate_limited' || error.message === 'Thumbnail readback mismatch') stopped = error
          else log('thumbnail_skip', { title: group.rows[0].title, reason: error.message })
        }
        checked++
        if (checked % 100 === 0) log('thumbnail_progress', { checked, selected: selected.length, counts })
      }
    }))
    if (!stopped) flush()
    if (stopped) throw stopped
  } finally {
    try {
    if (changed.size) {
      const ids = [...new Set([...changed.values()].map(x => x.row.content_id))], encoded = ids.map(sqlLiteral).join(',')
      const readback = new Map(sql(`SELECT jsonb_build_object('table','content_locales','content_id',l.content_id,'locale',l.locale,'id',NULL,'thumbnail_url',l.thumbnail_url) FROM content_locales l WHERE l.content_id IN (${encoded}) UNION ALL SELECT jsonb_build_object('table','figure_book_editions','content_id',e.content_id,'locale',e.locale,'id',e.id,'thumbnail_url',e.thumbnail_url) FROM figure_book_editions e WHERE e.content_id IN (${encoded});`).map(row => [rowKey(row), row]))
      for (const [key, change] of changed) if (readback.get(key)?.thumbnail_url !== change.cover) throw new Error('Final thumbnail readback mismatch')
      const imported = await import('../../src/lib/revalidate-web.ts'), { revalidateWebItems, revalidateWebCache } = imported.default ?? imported
      if (bulkCache) {
        await revalidateThumbnailCaches(() => revalidateWebCache([CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS, CACHE_TAGS.FIGURE_BOOKS], '전체 BOOK 카탈로그의 축소 표지 주소를 원본으로 교체'), log)
      } else {
        const refs = sql(`SELECT jsonb_build_object('id',c.id,'external_id',c.external_id) FROM contents c WHERE c.id IN (${encoded}) UNION ALL SELECT DISTINCT jsonb_build_object('celeb_id',c.id,'slug',c.slug) FROM celebs c JOIN (SELECT celeb_id FROM celeb_contents WHERE content_id IN (${encoded}) UNION SELECT celeb_id FROM figure_book_characters WHERE content_id IN (${encoded})) r ON r.celeb_id=c.id;`)
        const targets = new Map(), add = (domain, id) => { if (id) targets.set(`${domain}:${id}`, { domain, id }) }
        for (const ref of refs) if (ref.id) { add(CACHE_TAGS.CONTENTS, ref.id); add(CACHE_TAGS.CONTENTS, ref.external_id); add(CACHE_TAGS.FIGURE_BOOKS, ref.id) }
        else { add(CACHE_TAGS.CELEBS, ref.celeb_id); add(CACHE_TAGS.CELEBS, ref.slug) }
        await revalidateThumbnailCaches(() => revalidateWebItems([...targets.values()]), log)
      }
      log('thumbnail_readback', { rows: changed.size, works: ids.length })
    }
    cacheComplete = true
    } finally {
      log('thumbnail_result', { apply, checked, counts, changedRows: changed.size, changedWorks: new Set([...changed.values()].map(x => x.row.content_id)).size, cacheComplete })
    }
  }
}
