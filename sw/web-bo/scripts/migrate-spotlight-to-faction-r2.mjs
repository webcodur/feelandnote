/**
 * R2 폴더 개명: spotlight/ → faction/ (세력도감 개편 잔재 정리, 2026-08-01)
 *
 * 대상: 개인 화보(celeb_tag_assignments.faction_image_url), 단체 화보(celeb_tags.team_images[])
 * 방식: R2 내부 복사(CopyObject — 다운로드 없음, egress 없음) → DB 주소 갱신
 *
 * 옛 키는 지우지 않는다. 배포가 안정된 뒤 --purge 로 따로 지운다
 * (배포 전 구버전 웹이 아직 옛 주소를 읽고 있기 때문).
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/migrate-spotlight-to-faction-r2.mjs            # dry-run
 *   node scripts/migrate-spotlight-to-faction-r2.mjs --apply    # 복사 + DB 갱신
 *   node scripts/migrate-spotlight-to-faction-r2.mjs --purge    # 옛 키 삭제 (배포 뒤)
 */
import { S3Client, CopyObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes('--apply')
const PURGE = process.argv.includes('--purge')

function loadEnv(p) {
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(resolve(__dirname, '..', '.env'))

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL,
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env
for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) throw new Error(`.env에 ${k} 누락`)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/** 공개 URL → R2 키. 우리 버킷의 spotlight/ 경로가 아니면 null */
function toOldKey(url) {
  if (typeof url !== 'string') return null
  const path = url.split('?')[0]
  const idx = path.indexOf('/spotlight/')
  if (idx < 0) return null
  return path.slice(idx + 1)
}
const toNewKey = oldKey => oldKey.replace(/^spotlight\//, 'faction/')
const toNewUrl = (url, newKey) => `${R2_PUBLIC_URL}/${newKey}${url.includes('?') ? '?' + url.split('?').slice(1).join('?') : ''}`

async function copyOne(oldKey, newKey) {
  // 이미 옮겨졌으면 건너뛴다 (재실행 안전)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: newKey }))
    return 'exists'
  } catch { /* 없으면 복사한다 */ }
  await s3.send(new CopyObjectCommand({
    Bucket: R2_BUCKET_NAME,
    CopySource: `${R2_BUCKET_NAME}/${encodeURIComponent(oldKey).replace(/%2F/g, '/')}`,
    Key: newKey,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
    MetadataDirective: 'REPLACE',
  }))
  return 'copied'
}

const stats = { person: 0, team: 0, copied: 0, exists: 0, failed: 0, purged: 0 }
const failures = []

// ── 개인 화보 ──────────────────────────────────────────────
const { data: assignments, error: e1 } = await sb
  .from('celeb_tag_assignments').select('id, faction_image_url')
  .like('faction_image_url', '%/spotlight/%').limit(5000)
if (e1) throw e1

for (const row of assignments) {
  const oldKey = toOldKey(row.faction_image_url)
  if (!oldKey) continue
  const newKey = toNewKey(oldKey)
  stats.person++
  if (!APPLY) continue
  try {
    stats[await copyOne(oldKey, newKey) === 'copied' ? 'copied' : 'exists']++
    const { error } = await sb.from('celeb_tag_assignments')
      .update({ faction_image_url: toNewUrl(row.faction_image_url, newKey) }).eq('id', row.id)
    if (error) throw new Error(error.message)
  } catch (err) {
    stats.failed++
    failures.push({ kind: 'person', key: oldKey, reason: err.message })
  }
}

// ── 단체 화보 (team_images 배열 안의 주소) ──────────────────
const { data: tags, error: e2 } = await sb.from('celeb_tags').select('id, slug, team_images').limit(5000)
if (e2) throw e2

for (const tag of tags) {
  const arr = Array.isArray(tag.team_images) ? tag.team_images : []
  if (!arr.length) continue
  let touched = false
  const next = []
  for (const item of arr) {
    const url = typeof item === 'string' ? item : item?.url
    const oldKey = toOldKey(url)
    if (!oldKey) { next.push(item); continue }
    const newKey = toNewKey(oldKey)
    stats.team++
    if (!APPLY) { next.push(item); continue }
    try {
      stats[await copyOne(oldKey, newKey) === 'copied' ? 'copied' : 'exists']++
      const newUrl = toNewUrl(url, newKey)
      next.push(typeof item === 'string' ? newUrl : { ...item, url: newUrl })
      touched = true
    } catch (err) {
      stats.failed++
      failures.push({ kind: 'team', key: oldKey, reason: err.message })
      next.push(item)
    }
  }
  // 한 장이라도 실패하면 그 태그의 배열은 그대로 둔다(반쪽 갱신 방지)
  if (APPLY && touched && !failures.some(f => f.kind === 'team')) {
    const { error } = await sb.from('celeb_tags').update({ team_images: next }).eq('id', tag.id)
    if (error) { stats.failed++; failures.push({ kind: 'team-update', key: tag.slug, reason: error.message }) }
  }
}

// ── 옛 키 삭제 (배포 뒤 별도 실행) ──────────────────────────
if (PURGE) {
  const { data: left } = await sb.from('celeb_tag_assignments')
    .select('id').like('faction_image_url', '%/spotlight/%').limit(1)
  if (left?.length) throw new Error('아직 옛 주소를 가리키는 배정이 있다. 먼저 --apply 를 끝내라')

  const { data: rows } = await sb.from('celeb_tag_assignments')
    .select('faction_image_url').like('faction_image_url', '%/faction/%').limit(5000)
  const { data: tagRows } = await sb.from('celeb_tags').select('team_images').limit(5000)
  const newKeys = [
    ...(rows || []).map(r => toOldKey(r.faction_image_url?.replace('/faction/', '/spotlight/'))),
    ...(tagRows || []).flatMap(t => (Array.isArray(t.team_images) ? t.team_images : [])
      .map(i => toOldKey((typeof i === 'string' ? i : i?.url)?.replace('/faction/', '/spotlight/')))),
  ].filter(Boolean)

  for (const oldKey of new Set(newKeys)) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: oldKey }))
      stats.purged++
    } catch (err) {
      stats.failed++
      failures.push({ kind: 'purge', key: oldKey, reason: err.message })
    }
  }
}

const mode = PURGE ? '옛 키 삭제' : APPLY ? '복사+갱신' : 'dry-run'
console.log(`[${mode}] 개인 ${stats.person} · 단체 ${stats.team} · 복사 ${stats.copied} · 이미있음 ${stats.exists} · 삭제 ${stats.purged} · 실패 ${stats.failed}`)
if (failures.length) console.log(JSON.stringify(failures.slice(0, 20), null, 2))
if (!APPLY && !PURGE) console.log('실행하려면 --apply')
