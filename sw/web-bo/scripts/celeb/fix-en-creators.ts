// content_locales 의 en 행에 한글 감독·제작사명이 들어간 것을 영문으로 고친다.
// 원인: 앞선 배치의 등록 스크립트가 TMDB ko-KR 크레딧을 en 로케일에도 그대로 넣었다.
// 기본 dry-run, --apply 로 실제 반영.
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const APPLY = process.argv.includes('--apply')
const KEY = process.env.TMDB_API_KEY!

async function tmdbCreator(type: string, id: string): Promise<string | null> {
  const kind = type === 'tv' ? 'tv' : 'movie'
  const r = await fetch(`https://api.themoviedb.org/3/${kind}/${id}/credits?api_key=${KEY}&language=en-US`)
  if (!r.ok) return null
  const j: any = await r.json()
  if (kind === 'tv') {
    const c = (j.crew ?? []).find((x: any) => x.job === 'Creator' || x.department === 'Directing')
    return c?.name ?? null
  }
  const d = (j.crew ?? []).find((x: any) => x.job === 'Director')
  return d?.name ?? null
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
  const en: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('content_locales').select('content_id, title, creator').eq('locale', 'en').range(f, f + 999)
    if (!data?.length) break
    en.push(...data); if (data.length < 1000) break
  }
  // 영문 제목인데 감독만 한글 = 오염
  const dirty = en.filter((r) => /[가-힣]/.test(String(r.creator ?? '')) && !/[가-힣]/.test(String(r.title ?? '')))
  const ids = dirty.map((r) => r.content_id)
  const { data: cs } = await db.from('contents').select('id, type, external_source, external_id').in('id', ids)
  const meta = new Map((cs ?? []).map((c: any) => [c.id, c]))

  let fixed = 0
  const skipped: string[] = []
  for (const r of dirty) {
    const c: any = meta.get(r.content_id)
    const src = String(c?.external_source ?? '')
    const eid = String(c?.external_id ?? '')
    const m = eid.match(/^tmdb-(movie|tv)-(\d+)$/) ?? (src.startsWith('tmdb') ? [null, src.includes('tv') ? 'tv' : 'movie', eid.replace(/\D/g, '')] as any : null)
    if (!m || !m[2]) { skipped.push(r.title + ' (TMDB id 없음: ' + eid + ')'); continue }
    const name = await tmdbCreator(m[1], m[2])
    if (!name || /[가-힣]/.test(name)) { skipped.push(r.title + ' (영문 크레딧 없음)'); continue }
    if (APPLY) {
      const { error } = await db.from('content_locales').update({ creator: name }).eq('content_id', r.content_id).eq('locale', 'en')
      if (error) { skipped.push(r.title + ': ' + error.message); continue }
    }
    console.log('  ' + String(r.title).slice(0, 38).padEnd(40) + r.creator + ' → ' + name)
    fixed++
  }
  console.log('\n대상 ' + dirty.length + ' / ' + (APPLY ? '반영 ' : '교정 가능 ') + fixed + ' / 건너뜀 ' + skipped.length)
  for (const s of skipped.slice(0, 10)) console.log('  건너뜀 ' + s)
  if (!APPLY) console.log('\n[dry-run] --apply 를 붙이면 실제로 쓴다')
}
main().catch((e) => { console.error(e?.message ?? e); process.exit(1) })
