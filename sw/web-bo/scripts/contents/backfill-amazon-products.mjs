/** Check missing English book purchase connections against exact edition evidence. Default preview.
 * node --env-file=.env --import tsx scripts/contents/backfill-amazon-products.mjs --browser --apply --oracle
 * node --env-file=.env --import tsx scripts/contents/backfill-amazon-products.mjs --browser --plan <temporary.json>
 * node --env-file=.env --import tsx scripts/contents/backfill-amazon-products.mjs --apply-plan <reviewed.json>
 */
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { createClient } from '@feelandnote/db'
import { amazonBookCandidate, parseAmazonBookPage, verifyAmazonBookProduct, lookupAmazonBookProduct,
  AMAZON_BOOK_BATCH_SIZE, AMAZON_BOOK_CONCURRENCY, AMAZON_BOOK_AGENT_USER_AGENT } from '../../../../packages/content-search/src/amazon-book-product.ts'
import { fillMissingAmazonBookConnection } from '../../../../packages/content-search/src/amazon-book-registration.ts'
import { excludedBookEditionReason, reviewedBookWorkSelectionReason } from '../../../../packages/content-search/src/book-edition-policy.ts'
import { CACHE_TAGS } from '../../../../packages/shared/src/constants/cache-tags.ts'
import { buildAmazonProductApplySql } from './amazon-product-apply.mjs'

const args = process.argv.slice(2)
const DB_PAGE_SIZE = 1000
const WRITE_BATCH_SIZE = 200
const READBACK_BATCH_SIZE = 100
const option = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1] }
const db = () => {
  if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) throw new Error('DB configuration unavailable')
  return createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}
async function allRows(client, table, select, configure = q => q) {
  const rows = []
  for (let offset = 0; ; offset += DB_PAGE_SIZE) {
    const { data, error } = await configure(client.from(table).select(select)).order(table === 'content_locales' ? 'content_id' : ['figure_book_products','figure_book_purchase_options'].includes(table) ? 'edition_id' : 'id').range(offset, offset + DB_PAGE_SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < DB_PAGE_SIZE) return rows
  }
}
export async function missingAmazonTargets(client) {
  const [locales, editions, products] = await Promise.all([
    allRows(client, 'content_locales', 'content_id,locale,isbn,title,creator,publisher,sources,affiliate_url,contents!inner(type,metadata)', q => q.eq('locale', 'en').eq('contents.type', 'BOOK')),
    allRows(client, 'figure_book_editions', 'id,content_id,locale,isbn,title,creator,publisher,sources,edition_kind,text_scope', q => q.eq('locale', 'en')),
    allRows(client, 'figure_book_products', 'edition_id,platform', q => q.eq('platform', 'amazon')),
  ])
  const connected = new Set(products.map(p => p.edition_id)), targets = [], counts = {}
  const count = reason => { counts[reason] = (counts[reason] ?? 0) + 1 }
  for (const row of [...locales, ...editions]) {
    if (row.id === undefined ? Array.isArray(row.affiliate_url) && row.affiliate_url.some(l => l?.platform === 'amazon') : connected.has(row.id)) { count('existing_connection'); continue }
    if (row.id === undefined && row.affiliate_url !== null && !Array.isArray(row.affiliate_url)) { count('malformed_links'); continue }
    if (excludedBookEditionReason({ ...row, contentId: row.content_id, editionKind: row.edition_kind, textScope: row.text_scope })
      || reviewedBookWorkSelectionReason({ contentId: row.content_id, metadata: (Array.isArray(row.contents) ? row.contents[0] : row.contents)?.metadata })) { count('excluded_edition'); continue }
    const target = { contentId: row.content_id, ...(row.id !== undefined && { editionId: row.id }), locale: 'en', isbn: row.isbn, title: row.title, creator: row.creator }
    if (!amazonBookCandidate(target)) { count('no_isbn10_candidate'); continue }
    if (!target.title?.trim()) { count('no_title'); continue }
    targets.push(target)
  }
  return { targets, counts, scannedRows: locales.length + editions.length }
}
export async function createAmazonBrowserLookup() {
  const { AsideClient } = await import('../../../../.agents/skills/aside-browser/scripts/aside-client.mjs')
  const client = new AsideClient({ account: option('--account') ?? 'u1' })
  await client.ready
  const initial = await client.callRepl(`var amazonAnchor = await openTab('https://www.amazon.com/'); var amazonHome = await snapshot(amazonAnchor, {interactive:true}); console.log(/Robot Check|Enter the characters you see below/.test(amazonHome.tree) ? 'AMAZON_CHALLENGE' : 'AMAZON_CONNECTED'); var __name = (f) => f; var amazonParse = ${parseAmazonBookPage.toString()};`)
  const texts = initial.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') ?? ''
  if (!texts.includes('AMAZON_CONNECTED')) { await client.close(); throw new Error('Amazon browser session unavailable') }
  return {
    async lookup(books) {
      const candidates = books.map(book => amazonBookCandidate(book))
      const script = `var amazonQueue = ${JSON.stringify(candidates)}; var amazonPages = new Array(amazonQueue.length); var amazonNext = 0;
        await Promise.all(Array.from({length:${AMAZON_BOOK_CONCURRENCY}}, async () => { while(amazonNext < amazonQueue.length) {
          var i = amazonNext++, item = amazonQueue[i]; if (!item) { amazonPages[i] = null; continue; } try { var r = await fetch(item.productUrl, {headers:{'User-Agent':${JSON.stringify(AMAZON_BOOK_AGENT_USER_AGENT)}}});
            amazonPages[i] = amazonParse(await r.text(), r.status, r.url || item.productUrl);
          } catch { amazonPages[i] = {status:0,url:item.productUrl,title:'',byline:'',asin:'',details:'',blocked:false}; }
        }})); console.log('AMAZON_RESULT:' + JSON.stringify(amazonPages));`
      const reply = await client.callRepl(script)
      const output = reply.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
      const match = output.match(/AMAZON_RESULT:(\[[^\n]*\])/)
      if (!match) throw new Error('Amazon browser did not return product evidence')
      const pages = JSON.parse(match[1])
      return books.map((book, i) => pages[i] ? verifyAmazonBookProduct(book, pages[i]) : {status:'unsupported',reason:'no_isbn10_candidate'})
    },
    async close() { try { await client.callRepl('await closeTab(amazonAnchor);') } finally { await client.close() } },
  }
}
export async function applyAmazonPlan(client, plan) {
    if (!Array.isArray(plan)) throw new Error('Reviewed plan must be an array of target and page evidence')
    const seen = new Set()
    for (const item of plan) {
      if (verifyAmazonBookProduct(item.target, item.page).status !== 'verified') throw new Error(`Unverified Amazon product: ${item.target?.isbn}`)
      const key = `${item.target.contentId}:${item.target.editionId ?? 'locale'}`
      if (seen.has(key)) throw new Error(`Duplicate Amazon target: ${key}`)
      seen.add(key)
    }
    const planByContent = new Map()
    for (const item of plan) {
      if (!planByContent.has(item.target.contentId)) planByContent.set(item.target.contentId, [])
      planByContent.get(item.target.contentId).push(item)
    }
    const changed = new Set(), written = new Set(); let saved = 0, skipped = 0
    try {
      if (args.includes('--oracle')) {
        if (new URL(process.env.NEXT_PUBLIC_DB_API_URL).hostname !== 'db.feelandnote.com') throw new Error('--oracle requires the production DB API configuration')
        for (let offset = 0; offset < plan.length; offset += WRITE_BATCH_SIZE) {
          const batch = plan.slice(offset, offset + WRITE_BATCH_SIZE)
          const result = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
            'ubuntu@152.67.198.197', 'docker exec -i feelandnote-db psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres'],
          { input: buildAmazonProductApplySql(batch), encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024, windowsHide: true })
          if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
          const report = JSON.parse(result.stdout.trim())
          saved += report.saved; skipped += batch.length - report.saved
          for (const row of report.rows) {
            const approved = batch.find(item => item.target.contentId === row.content_id && (item.target.editionId ?? null) === row.edition_id)
            if (!approved) throw new Error('Unexpected Amazon write target')
            const expected = verifyAmazonBookProduct(approved.target, approved.page).product.productUrl
            if (row.edition_id === null ? !row.affiliate_url.some(l => l.platform === 'amazon' && l.url === expected) : row.affiliate_url !== expected) throw new Error('Amazon write return mismatch')
            changed.add(row.content_id)
            written.add(`${row.content_id}:${row.edition_id ?? 'locale'}`)
          }
          console.log(JSON.stringify({ event: 'apply_progress', processed: Math.min(offset + WRITE_BATCH_SIZE, plan.length), total: plan.length, saved, skipped }))
        }
        // Read persisted rows after the atomic statements, in batches, rather than one HTTP call per book.
        const ids = [...changed]
        for (let offset = 0; offset < ids.length; offset += READBACK_BATCH_SIZE) {
          const batchIds = ids.slice(offset, offset + READBACK_BATCH_SIZE)
          const [locales, products] = await Promise.all([
            allRows(client,'content_locales','content_id,isbn,affiliate_url',q=>q.eq('locale','en').in('content_id',batchIds)),
            allRows(client,'figure_book_purchase_options','content_id,edition_id,isbn,affiliate_url,platform',q=>q.eq('platform','amazon').in('content_id',batchIds)),
          ])
          const localeById = new Map(locales.map(r => [r.content_id,r])), productById = new Map(products.map(r=>[r.edition_id,r]))
          for (const item of batchIds.flatMap(id=>planByContent.get(id)).filter(item => written.has(`${item.target.contentId}:${item.target.editionId ?? 'locale'}`))) {
            const expected = verifyAmazonBookProduct(item.target,item.page).product.productUrl
            const row = item.target.editionId === undefined ? localeById.get(item.target.contentId) : productById.get(item.target.editionId)
            if (!row || row.isbn !== item.target.isbn || (item.target.editionId === undefined ? !row.affiliate_url?.some(l => l.platform==='amazon' && l.url===expected) : row.affiliate_url!==expected)) throw new Error(`Amazon persisted link mismatch: ${item.target.isbn}`)
          }
        }
      } else {
      for (const item of plan) {
        const result = verifyAmazonBookProduct(item.target, item.page)
        if (result.status !== 'verified') throw new Error(`Reviewed product no longer matches: ${item.target?.isbn}`)
        if (await fillMissingAmazonBookConnection(client, item.target, result.product)) { saved++; changed.add(item.target.contentId) } else skipped++
      }
      }
    } finally {
      if (changed.size) {
        const module = await import('../../src/lib/revalidate-web.ts')
        const { revalidateWebItems } = module.default ?? module
        await revalidateWebItems([...changed].flatMap(id => [{ domain: CACHE_TAGS.CONTENTS, id }, { domain: CACHE_TAGS.FIGURE_BOOKS, id }]), [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS, CACHE_TAGS.FIGURE_BOOKS])
      }
    }
    console.log(JSON.stringify({ event: 'applied', saved, skipped, changedWorks: changed.size }))
}
export async function main() {
  const client = db(), applyPlan = option('--apply-plan')
  if (applyPlan) {
    const raw = (await readFile(resolve(applyPlan), 'utf8')).trim()
    const plan = raw.startsWith('[') ? JSON.parse(raw) : raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
    await applyAmazonPlan(client, plan)
    return
  }
  const { targets, counts, scannedRows } = await missingAmazonTargets(client)
  const isbnFilter = option('--isbn'), limit = option('--limit') ? Number(option('--limit')) : Infinity
  if (!(limit > 0)) throw new Error('Invalid --limit')
  const grouped = new Map()
  for (const target of targets) {
    if (isbnFilter && target.isbn !== isbnFilter) continue
    if (!grouped.has(target.isbn)) grouped.set(target.isbn, [])
    grouped.get(target.isbn).push(target)
  }
  const groups = [...grouped.values()].slice(0, limit)
  const plan = option('--resume-plan') ? (await readFile(resolve(option('--resume-plan')), 'utf8')).trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) : []
  const previouslyVerified = new Set(plan.map(item => item.target.isbn))
  const checkedFile = option('--checked-file')
  const attempted = new Set(checkedFile ? (await readFile(resolve(checkedFile), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return ''
    throw error
  })).split(/\r?\n/).filter(Boolean) : [])
  const pending = groups.filter(rows => !previouslyVerified.has(rows[0].isbn) && !attempted.has(rows[0].isbn))
  console.log(JSON.stringify({ event: 'scan', pid: process.pid, scannedRows, eligibleRows: targets.length, uniqueIsbns: grouped.size, checking: pending.length, previouslyVerified: previouslyVerified.size, previouslyAttempted: attempted.size, counts }))
  if (option('--plan') && !option('--resume-plan')) await writeFile(resolve(option('--plan')), '', { flag: 'wx' })
  if (option('--resume-plan') && resolve(option('--plan') ?? '') !== resolve(option('--resume-plan'))) throw new Error('--resume-plan must equal --plan')
  const transport = args.includes('--browser') ? await createAmazonBrowserLookup() : null
  const reasons = {}, examples = {}; let checked = 0
  try {
    for (let offset = 0; offset < pending.length; offset += AMAZON_BOOK_BATCH_SIZE) {
      const previousLength = plan.length
      const batch = pending.slice(offset, offset + AMAZON_BOOK_BATCH_SIZE)
      const results = transport ? await transport.lookup(batch.map(rows => rows[0])) : []
      if (!transport) {
        let next = 0
        await Promise.all(Array.from({ length: AMAZON_BOOK_CONCURRENCY }, async () => {
          while (next < batch.length) { const i = next++; results[i] = await lookupAmazonBookProduct(batch[i][0]) }
        }))
      }
      for (let i = 0; i < batch.length; i++) {
        checked++
        for (const target of batch[i]) {
          const result = results[i].page ? verifyAmazonBookProduct(target, results[i].page) : results[i]
          if (result.status === 'verified') plan.push({ target, page: result.page })
          else { const reason = result.reason; reasons[reason] = (reasons[reason] ?? 0) + 1;
            if ((examples[reason]?.length ?? 0) < 3) (examples[reason] ??= []).push({ title: target.title, isbn: target.isbn, actualTitle: result.page?.title, details: result.page?.details }) }
        }
      }
      console.log(JSON.stringify({ event: 'progress', checked, total: pending.length, verifiedRows: plan.length, reasons }))
      if (option('--plan') && plan.length > previousLength) await appendFile(resolve(option('--plan')), plan.slice(previousLength).map(item => JSON.stringify(item)).join('\n') + '\n')
      // A challenge affects the session, not the books. Do not falsely complete the unqueried remainder.
      if (results.every(result => result.status === 'unconfirmed')) throw new Error('Amazon session unavailable; remaining books are unqueried')
      if (checkedFile) await appendFile(resolve(checkedFile), batch.map(rows => rows[0].isbn).join('\n') + '\n')
    }
  } finally {
    if (transport) await transport.close()
    if (args.includes('--apply') && plan.length) await applyAmazonPlan(client, plan)
  }
  console.log(JSON.stringify({ event: 'result', checked, total: pending.length, previouslyVerified: previouslyVerified.size, verifiedRows: plan.length, reasons, examples, ...(option('--plan') && { reviewPlan: resolve(option('--plan')) }) }))
  if (!option('--plan')) console.log(JSON.stringify({ preview: plan.slice(0, 5), note: 'Use --plan to inspect all evidence before applying.' }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
