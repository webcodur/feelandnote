/**
 * inactive 셀럽을 active 로 전환한다.
 *
 * 판정은 docs/project/celeb/celeb-00-01-pipeline.md 「최소 필수 조건」 아홉 가지만 본다.
 * 그 문서가 화면 실측으로 세운 조건이며, 없으면 인물 상세의 어느 자리가 비는지
 * 근거가 붙어 있다. 02~07 구획은 자료가 없으면 목차와 함께 숨으므로 조건이 아니다.
 *
 * 기본 dry-run. --apply 로 실제 전환한다.
 */
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)

const blank = (v: unknown) => !String(v ?? '').trim()
/** 07 미디어의 대사 탭이 여는 9종. 하나도 없으면 빈 상자가 남는다. */
const LINE_KEYS = ['quote', 'monologue', 'greeting', 'roll_call', 'deploy',
  'battle_win', 'battle_draw', 'battle_lose', 'clash_attack']

async function pageAll<T>(table: string, cols: string, apply?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from(table).select(cols).range(from, from + 999)
    if (apply) q = apply(q)
    const { data, error } = await q
    if (error) throw new Error(table + ': ' + error.message)
    out.push(...((data ?? []) as T[]))
    if ((data?.length ?? 0) < 1000) return out
  }
}

async function main() {
  const celebs = await pageAll<any>('celebs',
    'id, slug, nickname, nickname_en, headline, headline_en, bio, bio_en, avatar_url, profession, nationality, birth_date, celeb_tier,celeb_reality',
    (q) => q.eq('publication_status', 'inactive'))
  console.log('inactive ' + celebs.length + '명')

  const ids = new Set(celebs.map((c) => c.id))

  // 인물 안내: 게시 표시를 찍었으면 본문이 있어야 한다 (02가 빈 문단으로 노출)
  const expl = new Map<string, { pub: boolean; text: boolean }>()
  for (const r of await pageAll<any>('celeb_explanations', 'profile_id, published_at, plain_text')) {
    if (ids.has(r.profile_id)) expl.set(r.profile_id, { pub: !!r.published_at, text: !blank(r.plain_text) })
  }

  // 대사: lines 가 있는데 9종 키가 하나도 없으면 빈 상자 (07)
  const dial = new Map<string, boolean>()
  for (const r of await pageAll<any>('celeb_dialogues', 'celeb_id, lines')) {
    if (!ids.has(r.celeb_id)) continue
    const l = r.lines
    if (!l || typeof l !== 'object') continue
    dial.set(r.celeb_id, LINE_KEYS.some((k) => {
      const v = (l as any)[k]
      return Array.isArray(v) ? v.length > 0 : !blank(v)
    }))
  }

  // full 티어: 공개 콘텐츠 1건 이상 (전부 비공개면 03 서재가 사라진다)
  const pub = new Set<string>()
  for (const r of await pageAll<any>('celeb_contents', 'celeb_id', (q) => q.eq('visibility', 'public'))) {
    if (ids.has(r.celeb_id)) pub.add(r.celeb_id)
  }

  const ok: any[] = []
  const blocked = new Map<string, string[]>()
  for (const c of celebs) {
    const g: string[] = []
    const tier = c.celeb_tier ?? 'full'
    const reality = c.celeb_reality ?? 'REAL'
    if (blank(c.avatar_url)) g.push('avatar_url')
    if (blank(c.nickname)) g.push('nickname')
    if (blank(c.headline)) g.push('headline')
    if (blank(c.bio)) g.push('bio')
    if (blank(c.profession)) g.push('profession')
    if (blank(c.nationality)) g.push('nationality')
    if (reality === 'REAL' && blank(c.birth_date)) g.push('birth_date')
    if (blank(c.nickname_en)) g.push('nickname_en')
    if (blank(c.headline_en)) g.push('headline_en')
    if (blank(c.bio_en)) g.push('bio_en')
    const e = expl.get(c.id)
    if (e?.pub && !e.text) g.push('안내: 게시했는데 본문이 없다')
    if (dial.has(c.id) && !dial.get(c.id)) g.push('대사: lines 에 9종 키가 없다')
    if (tier === 'full' && !pub.has(c.id)) g.push('full: 공개 콘텐츠 0건')
    if (g.length) blocked.set(c.slug, g)
    else ok.push(c)
  }

  const byTier = (rows: any[]) => {
    const m: Record<string, number> = {}
    for (const r of rows) m[r.celeb_tier ?? 'full'] = (m[r.celeb_tier ?? 'full'] ?? 0) + 1
    return Object.entries(m).map(([k, v]) => k + ' ' + v).join(' / ')
  }
  console.log('통과 ' + ok.length + '명 (' + byTier(ok) + ')')
  console.log('탈락 ' + blocked.size + '명')
  const reasons: Record<string, number> = {}
  for (const g of blocked.values()) for (const x of g) reasons[x] = (reasons[x] ?? 0) + 1
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log('  ' + k + ': ' + v)
  for (const [s, g] of [...blocked.entries()].slice(0, 15)) console.log('  · ' + s + ' — ' + g.join(', '))

  if (!APPLY) { console.log('\n[dry-run] --apply 로 전환한다'); return }

  let done = 0
  const fail: string[] = []
  for (let i = 0; i < ok.length; i += 100) {
    const batch = ok.slice(i, i + 100)
    // 후보 id 만, inactive 인 행만 조건부로 바꾼다
    const { data, error } = await db.from('celebs')
      .update({ publication_status: 'active' })
      .in('id', batch.map((c) => c.id))
      .eq('publication_status', 'inactive')
      .select('id')
    if (error) { fail.push(error.message); continue }
    done += data?.length ?? 0
    console.log('전환 ' + done + '/' + ok.length)
  }
  console.log('\n반영 ' + done + ' / 후보 ' + ok.length)
  for (const f of fail.slice(0, 5)) console.log('  실패 ' + f)
  if (done !== ok.length) { console.error('반영 수가 후보 수와 다르다. 확인이 필요하다.'); process.exit(1) }
}

main().catch((e) => { console.error(e?.message ?? e); process.exit(1) })
