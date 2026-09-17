/**
 * new-figures 세력도감 배정 일괄 반영 — 19개 신규 테마 생성 + 546명 배정 행 삽입.
 *
 *   pnpm --dir sw/web-bo celeb:seed:factions            # dry-run (기본)
 *   pnpm --dir sw/web-bo celeb:seed:factions --apply    # 실제 반영
 *
 * 안전 장치
 * - 신규 세력은 is_featured=false·published=false로 만든다(도감에 '준비 중'으로만 보임).
 * - 배정 행은 전부 hidden=true — 비활성 인물이 웹 도감에 새지 않는다
 *   (getFeaturedTags는 배정의 hidden만 본다. publication_status로는 거르지 않는다).
 * - (celeb_id, lv2_id) 기존 배정이 있으면 건너뛴다. 덮어쓰지 않는다.
 * - secondary 세력은 별도 배정 행으로 넣는다(한 인물이 여러 세력에 등재되는 기존 관례).
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const APPLY = process.argv.includes('--apply')
const FACTIONS_DIR = resolve(__dirname, '../../../../data/celeb/new-figures/factions')
const LEDGER_DIR = resolve(__dirname, '../../../../data/celeb/new-figures')

interface NewTag {
  slug: string; name: string; name_en: string; parent: string
  color: string; description: string; description_en: string
}
interface Assignment {
  tag: string | null; secondary: string | null; reason: string
  short_desc?: string | null; short_desc_en?: string | null
  long_desc?: string | null; long_desc_en?: string | null
}
interface LedgerRow { nickname: string; celeb_id?: string; slug?: string }

function db(): DatabaseClient {
  const url = process.env.NEXT_PUBLIC_DB_API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.DB_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('DB 접속 env 필요')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function main() {
  const client = db()

  const newTags = JSON.parse(readFileSync(resolve(FACTIONS_DIR, 'new-tags.json'), 'utf8')) as NewTag[]
  const assignments = JSON.parse(readFileSync(resolve(FACTIONS_DIR, 'assignments.json'), 'utf8')) as Record<string, Assignment>

  // 원장 nickname → celeb_id
  const ledger = new Map<string, string>()
  for (const f of readdirSync(LEDGER_DIR)) {
    if (!f.endsWith('.json')) continue
    const rows = JSON.parse(readFileSync(resolve(LEDGER_DIR, f), 'utf8')) as LedgerRow[]
    if (!Array.isArray(rows)) continue
    for (const r of rows) if (r.nickname && r.celeb_id) ledger.set(r.nickname, r.celeb_id)
  }

  // ── 1. 기존 태그 지도 ─────────────────────────────────────────────
  const { data: allL1, error: l1Err } = await client
    .from('faction_lv1').select('id, slug')
  if (l1Err) throw l1Err
  const { data: allLv2, error: tagErr } = await client
    .from('faction_lv2').select('id, slug, lv1_id, sort_order')
  if (tagErr) throw tagErr
  const tagBySlug = new Map((allLv2 ?? []).map(t => [t.slug as string, t]))
  const parentBySlug = new Map((allL1 ?? []).map(t => [t.slug as string, t]))

  const missingParents = newTags.filter(t => !parentBySlug.get(t.parent))
  const slugClashes = newTags.filter(t => tagBySlug.get(t.slug))
  if (missingParents.length || slugClashes.length) {
    console.log('⛔ 대분류 없음:', missingParents.map(t => `${t.slug}→${t.parent}`).join(', ') || '없음')
    console.log('⛔ slug 충돌:', slugClashes.map(t => t.slug).join(', ') || '없음')
    process.exit(1)
  }

  // 대분류별 마지막 sort_order
  const maxSortByParent = new Map<string, number>()
  for (const t of allLv2 ?? []) {
    const cur = maxSortByParent.get(t.lv1_id) ?? 0
    if ((t.sort_order ?? 0) > cur) maxSortByParent.set(t.lv1_id, t.sort_order ?? 0)
  }

  // ── 2. 배정 계획 ──────────────────────────────────────────────────
  const plan: Array<{ celeb_id: string; slug: string; rec: Assignment; isSecondary: boolean }> = []
  const problems: string[] = []
  for (const [nick, rec] of Object.entries(assignments)) {
    if (!rec.tag) continue
    const celebId = ledger.get(nick)
    if (!celebId) { problems.push(`원장에 celeb_id 없음: ${nick}`); continue }
    const norm = (s: string) => s.replace(/^new:/, '')
    plan.push({ celeb_id: celebId, slug: norm(rec.tag), rec, isSecondary: false })
    if (rec.secondary) plan.push({ celeb_id: celebId, slug: norm(rec.secondary), rec, isSecondary: true })
  }
  const newSlugs = new Set(newTags.map(t => t.slug))
  const badSlugs = [...new Set(plan.map(p => p.slug))].filter(s => !tagBySlug.get(s) && !newSlugs.has(s))
  if (badSlugs.length) problems.push(`존재하지 않는 태그: ${badSlugs.join(', ')}`)

  // ── 3. 기존 배정과 중복 검사 ─────────────────────────────────────
  const celebIds = [...new Set(plan.map(p => p.celeb_id))]
  const existingPairs = new Set<string>()
  const tagMaxSort = new Map<string, number>()
  for (let i = 0; i < celebIds.length; i += 100) {
    const { data, error } = await client
      .from('faction_members').select('celeb_id, lv2_id')
      .in('celeb_id', celebIds.slice(i, i + 100))
    if (error) throw error
    for (const r of data ?? []) existingPairs.add(`${r.celeb_id}|${r.lv2_id}`)
  }
  // 태그별 기존 최대 sort_order — 새 배정은 그 뒤에 붙인다
  const involvedTagIds = new Set<string>()
  for (const p of plan) { const t = tagBySlug.get(p.slug); if (t) involvedTagIds.add(t.id) }
  for (const tagId of involvedTagIds) {
    const { data } = await client.from('faction_members')
      .select('sort_order').eq('lv2_id', tagId)
      .order('sort_order', { ascending: false }).limit(1)
    tagMaxSort.set(tagId, data?.[0]?.sort_order ?? 0)
  }

  const dupes = plan.filter(p => {
    const t = tagBySlug.get(p.slug)
    return t && existingPairs.has(`${p.celeb_id}|${t.id}`)
  })

  console.log(`\n=== ${APPLY ? 'APPLY' : 'DRY-RUN'} ===`)
  console.log(`신규 테마: ${newTags.length}개`)
  console.log(`배정 계획: ${plan.length}행 (주 배정 ${plan.filter(p => !p.isSecondary).length} + 부 배정 ${plan.filter(p => p.isSecondary).length})`)
  console.log(`기존 배정과 중복(스킵): ${dupes.length}행`)
  if (problems.length) { console.log('⛔ 문제:'); problems.forEach(p => console.log('  -', p)); process.exit(1) }

  if (!APPLY) { console.log('\n(dry-run — --apply로 반영)'); return }

  // ── 4. 신규 테마 삽입 ────────────────────────────────────────────
  for (const t of newTags) {
    const parent = parentBySlug.get(t.parent)!
    const sortOrder = (maxSortByParent.get(parent.id) ?? 0) + 10
    maxSortByParent.set(parent.id, sortOrder)
    const { data, error } = await client.from('faction_lv2').insert({
      name: t.name, name_en: t.name_en, slug: t.slug,
      description: t.description, description_en: t.description_en,
      color: t.color, lv1_id: parent.id, sort_order: sortOrder,
      is_featured: false, is_fiction: false, is_myth: false, published: false, team_images: [],
    }).select('id').single()
    if (error) { console.log(`⛔ 세력 실패 ${t.slug}: ${error.message}`); process.exit(1) }
    tagBySlug.set(t.slug, { id: data.id, slug: t.slug, lv1_id: parent.id, sort_order: sortOrder })
    console.log(`세력 생성: ${t.slug} (${t.name}) → ${t.parent}`)
  }

  // ── 5. 배정 삽입 ─────────────────────────────────────────────────
  const sortCursor = new Map<string, number>(tagMaxSort)
  let inserted = 0, skipped = 0
  const CHUNK = 100
  const rows: object[] = []
  for (const p of plan) {
    const tag = tagBySlug.get(p.slug)!
    if (existingPairs.has(`${p.celeb_id}|${tag.id}`)) { skipped++; continue }
    const next = (sortCursor.get(tag.id) ?? 0) + 10
    sortCursor.set(tag.id, next)
    rows.push({
      celeb_id: p.celeb_id, lv2_id: tag.id,
      short_desc: p.rec.short_desc ?? null, short_desc_en: p.rec.short_desc_en ?? null,
      long_desc: p.rec.long_desc ?? null, long_desc_en: p.rec.long_desc_en ?? null,
      hidden: true, sort_order: next,
    })
    existingPairs.add(`${p.celeb_id}|${tag.id}`)
  }
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await client.from('faction_members').insert(rows.slice(i, i + CHUNK))
    if (error) { console.log(`⛔ 배정 삽입 실패(${i}~): ${error.message}`); process.exit(1) }
    inserted += Math.min(CHUNK, rows.length - i)
  }
  console.log(`\n배정 삽입: ${inserted}행, 중복 스킵: ${skipped}행`)

  // ── 6. readback 검증 ─────────────────────────────────────────────
  const { data: checkTags } = await client.from('faction_lv2')
    .select('slug, is_featured, published').in('slug', newTags.map(t => t.slug))
  const badTags = (checkTags ?? []).filter(t => t.is_featured || t.published)
  let hiddenBad = 0, totalNew = 0
  for (let i = 0; i < celebIds.length; i += 100) {
    const { data } = await client.from('faction_members')
      .select('hidden').in('celeb_id', celebIds.slice(i, i + 100))
    for (const r of data ?? []) { totalNew++; if (!r.hidden) hiddenBad++ }
  }
  console.log(`readback — 세력 ${checkTags?.length ?? 0}/19 (featured 누설 ${badTags.length}), 배정 행 확인 ${totalNew}건 중 hidden=false ${hiddenBad}건`)
  if (badTags.length || hiddenBad) { console.log('⚠ 누설 위험 있음 — 위 건수 확인'); process.exit(1) }
  console.log('완료 — 전원 비노출 상태로 등록됨')
}

main().catch(e => { console.error(e); process.exit(1) })
