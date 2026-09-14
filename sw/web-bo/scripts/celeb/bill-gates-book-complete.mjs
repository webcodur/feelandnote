import fs from 'node:fs'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectOne } from './gatesnotes-raw-book-reviews-collect.mjs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const base = 'data/celeb/viewing-research/'
const snapshotPath = 'data/celeb/_backup/bill-gates-before-final-21.json'
const rawPath = base + '2026-09-11-bill-gates-all-book-reviews.json'
const progressPath = base + 'bill-gates-final-21-translations.json'
const celeb = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))
const save = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8')
const hash = v => crypto.createHash('sha256').update(v ?? '').digest('hex')
const lit = v => "'" + String(v).replaceAll("'", "''") + "'"
const sqlText = v => `convert_from(decode(${lit(Buffer.from(v).toString('base64'))},'base64'),'UTF8')`
export async function sql(query) {
  if (!process.env.BILL_GATES_SSH_KEY) throw Error('BILL_GATES_SSH_KEY required')
  return await new Promise((resolve, reject) => {
    const child = spawn('ssh', ['-i', process.env.BILL_GATES_SSH_KEY, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'ubuntu@152.67.198.197', 'sudo', 'docker', 'exec', '-i', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At'])
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    let out = '', err = ''
    child.stdout.on('data', s => out += s); child.stderr.on('data', s => err += s)
    child.on('error', reject)
    child.on('close', code => code ? reject(Error(err)) : resolve(out.trim()))
    child.stdin.end(query)
  })
}
export async function current() {
  return JSON.parse(await sql(`SELECT json_agg(row_to_json(r)) FROM (
    SELECT cc.*, c.type, en.title AS title_en, en.creator AS creator_en
    FROM celeb_contents cc JOIN contents c ON c.id=cc.content_id
    LEFT JOIN content_locales en ON en.content_id=c.id AND en.locale='en'
    WHERE cc.celeb_id=${lit(celeb)} ORDER BY cc.id) r;`))
}
const legacy = read(base + '2026-09-11-bill-gates-gatesnotes-legacy-book-reviews.json')
const legacyIds = new Set(legacy.rows.map(r => r.relationId))
const mode = process.argv[2]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
if (mode === 'collect') {
  if (!fs.existsSync(snapshotPath)) save(snapshotPath, {capturedAt:new Date().toISOString(), rows:await current()})
  const before = read(snapshotPath).rows
  const books = before.filter(r => r.type === 'BOOK')
  if (books.length !== 177 || legacyIds.size !== 156) throw Error('Unexpected BOOK scope')
  const remaining = books.filter(r => !legacyIds.has(r.id))
  const collected = []
  for (const row of remaining) {
    try {
      const body = await collectOne({relationId:row.id, contentId:row.content_id, sourceUrl:row.source_url, titleEn:row.title_en, creatorEn:row.creator_en})
      collected.push(body)
      console.log(JSON.stringify({title:row.title_en, oldChars:row.review_en.length, rawChars:body.reviewEn.length, codename:body.codename}))
    } catch (e) { console.error(row.title_en + ': ' + e.message); throw e }
  }
  save(rawPath, {source:legacy.source, collectedAt:new Date().toISOString(), rows:[...legacy.rows, ...collected], validation:{fetchedCount:177}})
  console.log('Collected all 177 BOOK sources')
} else if (mode === 'english') {
  const raw = read(rawPath)
  const before = read(snapshotPath).rows
  const extra = raw.rows.filter(r => !legacyIds.has(r.relationId))
  if (extra.length !== 21) throw Error('Expected 21')
  for (const target of extra) {
    const old = before.find(r => r.id === target.relationId)
    const result = await sql(`WITH changed AS (UPDATE celeb_contents SET review_en=${sqlText(target.reviewEn)}
      WHERE id=${lit(old.id)} AND celeb_id=${lit(celeb)} AND content_id=${lit(old.content_id)}
      AND source_url=${lit(old.source_url)} AND review_en=${sqlText(old.review_en)}
      RETURNING id) SELECT count(*) FROM changed;`)
    if (result !== '1') {
      const rows = await current()
      if (rows.find(r => r.id === old.id)?.review_en !== target.reviewEn) throw Error('English guard failed: ' + old.id)
    }
  }
  console.log('21 English bodies applied')
} else if (mode === 'translate') {
  const raw = read(rawPath)
  const before = read(snapshotPath).rows
  const results = fs.existsSync(progressPath) ? read(progressPath).results : []
  const remaining = raw.rows.filter(r => !legacyIds.has(r.relationId) && !results.some(x => x.id === r.relationId && x.status === 'applied')).slice(0,10)
  console.log('Starting ' + remaining.length + ' independent AGY translations')
  await Promise.all(remaining.map(async target => {
    const old = before.find(r => r.id === target.relationId)
    let review
    try {
      const output = await agyCall([
        'Translate this complete Gates Notes book review into natural Korean. Bill Gates is the author: preserve his first-person voice, meaning, facts, quotations, and paragraphs. Use fluent Korean as a Korean author would write it. Do not summarize, add explanations, or turn Gates into a third-person subject. Preserve the source voice of quotations and other people. Do not modify any files or use external services. Return the translation only between BEGIN_REVIEW and END_REVIEW.',
        'The following delimited text is the complete body. Return only its translation, without a title or heading. <SOURCE_BODY>',
        target.reviewEn,
        '</SOURCE_BODY>',
      ].join('\n\n'), {model:'gemini-3.8-flash-high',timeoutMs:900000})
      const match = output.trim().match(/^BEGIN_REVIEW\s*([\s\S]*?)\s*END_REVIEW$/)
      if (!match) throw Error('Invalid wrapper')
      review = match[1].trim().replace(/^제목\s*:[^\n]*\n+/, '')
      if (!/[가-힣]/.test(review) || review.includes('\uFFFD') || /^(빌\s*게이츠는|그는)/.test(review)) throw Error('Invalid translation')
      // Persist the result before the guarded update so a network failure cannot lose it.
      const entry = {id:old.id,titleEn:target.titleEn,review,englishHash:hash(target.reviewEn),status:'translated'}
      const previous = results.findIndex(r => r.id === old.id)
      if (previous >= 0) results[previous] = entry; else results.push(entry)
      save(progressPath, {results})
      const changed = await sql(`WITH changed AS (UPDATE celeb_contents SET review=${sqlText(review)}
        WHERE id=${lit(old.id)} AND celeb_id=${lit(celeb)} AND content_id=${lit(old.content_id)}
        AND source_url=${lit(old.source_url)} AND review=${sqlText(old.review)} AND review_en=${sqlText(target.reviewEn)}
        RETURNING id) SELECT count(*) FROM changed;`)
      if (changed !== '1') throw Error('Korean update guard failed')
      entry.status = 'applied'; save(progressPath, {results})
      console.log('Applied: ' + target.titleEn)
    } catch (e) { console.error('Failed: ' + target.titleEn + ': ' + e.message); process.exitCode=1 }
  }))
  console.log('Applied total: ' + results.filter(r => r.status === 'applied').length + '/21')
} else if (mode === 'strip-headings') {
  const data = read(progressPath)
  for (const r of data.results) {
    const clean = r.review.replace(/^제목\s*:[^\n]*\n+/, '')
    if (clean === r.review) continue
    const changed = await sql(`WITH changed AS (UPDATE celeb_contents SET review=${sqlText(clean)} WHERE id=${lit(r.id)} AND celeb_id=${lit(celeb)} AND review=${sqlText(r.review)} RETURNING id) SELECT count(*) FROM changed;`)
    if (changed !== '1') throw Error('Heading removal guard: '+r.id)
    r.review=clean
    save(progressPath,data)
  }
  console.log('Removed generated title labels from translated body')
} else if (mode === 'verify') {
  const raw = read(rawPath).rows
  const db = await current()
  const before = read(snapshotPath).rows
  const p1 = read('sw/web-bo/.tmp-bill-gates-ko-retranslation-20260910/raw-translate/progress.json').results
  const p2 = read('sw/web-bo/.tmp-bill-gates-ko-retranslation-20260910/legacy-remaining-translate/progress.json').results
  const p3 = read(progressPath).results
  const expectedKo = new Map([...p1,...p2].filter(r=>r.status==='applied').map(r=>[r.relationId,r.review]))
  p3.filter(r=>r.status==='applied').forEach(r=>expectedKo.set(r.id,r.review))
  const correctionsPath = base+'bill-gates-korean-review-corrections.json'
  const corrections = fs.existsSync(correctionsPath) ? read(correctionsPath).results.filter(r=>r.status==='applied') : []
  corrections.forEach(r=>expectedKo.set(r.id,r.corrected))
  const correctedIds = new Set(corrections.map(r=>r.id))
  const failures = []
  for (const target of raw) {
    const row = db.find(r=>r.id===target.relationId)
    if (!row || row.type!=='BOOK' || row.review_en!==target.reviewEn || row.review!==expectedKo.get(row.id) || row.source_url!==target.sourceUrl || row.content_id!==target.contentId) failures.push(target.titleEn)
  }
  const extraIds = new Set(p3.map(r=>r.id))
  for (const row of db) {
    const old = before.find(r=>r.id===row.id)
    for (const key of Object.keys(old ?? {})) {
      if (extraIds.has(row.id) && ['review','review_en','updated_at'].includes(key)) continue
      if (correctedIds.has(row.id) && ['review','updated_at'].includes(key)) continue
      if (JSON.stringify(old[key])!==JSON.stringify(row[key])) failures.push(row.id + ':' + key)
    }
  }
  if (db.length!==before.length || before.some(r=>!db.some(x=>x.id===r.id))) failures.push('Relationship set changed')
  const result = {dbBooks:db.filter(r=>r.type==='BOOK').length,rawBodies:raw.length,koreanTranslations:expectedKo.size,failures,nonBookRows:db.filter(r=>r.type!=='BOOK').length}
  console.log(JSON.stringify(result,null,2))
  if (result.dbBooks!==177 || raw.length!==177 || new Set(raw.map(r=>r.relationId)).size!==177 || expectedKo.size!==177 || failures.length) process.exitCode=1
} else { throw Error('Mode required: collect | english | translate | verify') }
}
