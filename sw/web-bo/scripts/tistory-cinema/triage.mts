/**
 * 필터에 걸린 감상을 **왜 걸렸는지로 나눈다.**
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/triage.mts
 *   node --env-file=.env --import tsx scripts/tistory-cinema/triage.mts --dump 짧음   # 그 무리를 파일로
 *
 * 영화 감상 3,488건 가운데 44%만 글에 실린다. 나머지를 통째로 버리기 전에 **고치면 살릴
 * 것**과 **정말 못 쓸 것**을 가른다. 짧아서 걸린 것은 손댈 수 없지만, 화자 귀속이 없어
 * 걸린 것은 원문에 근거가 있으면 DB 를 고쳐 살릴 수 있다.
 *
 * 함께 **꼬리 문장**(화자 귀속 없이 영향·의미를 단정하는 마지막 문장)도 센다. 9편에 실린
 * 151건에서 38건이 나왔으므로 전체에는 훨씬 많다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { usableReview } from './lib/quality.mts'
import { ASSETS } from '../blog-assets.mjs'

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const args = process.argv.slice(2)
const dumpWhich = args.indexOf('--dump') >= 0 ? args[args.indexOf('--dump') + 1] : null

const page = async <T,>(t: string, s: string, f?: (q: any) => any): Promise<T[]> => {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    let q = db.from(t).select(s).range(i, i + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw error
    out.push(...(data as never[]))
    if (!data!.length || data!.length < 1000) break
  }
  return out
}

const contents = await page<{ id: string; external_id: string | null }>(
  'contents', 'id, external_id', (q) => q.eq('type', 'VIDEO'))
const movie = new Set(contents.filter((c) => (c.external_id ?? '').startsWith('tmdb-movie-')).map((c) => c.id))
const locales = await page<{ content_id: string; title: string; locale: string }>('content_locales', 'content_id, title, locale')
const koTitle = new Map(locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
const celebs = await page<{ id: string; nickname: string; slug: string }>('celebs', 'id, nickname, slug')
const celebById = new Map(celebs.map((c) => [c.id, c]))
const cc = await page<{ id: string; celeb_id: string; content_id: string; review: string | null }>(
  'celeb_contents', 'id, celeb_id, content_id, review')

// 필터가 쓰는 것과 같은 신호. 여기서는 **왜 떨어졌는지**를 알려고 따로 잰다.
const SAID = /말했|말한|밝혔|밝힌|적었|답했|평했|평가|언급|강조|덧붙|시인|인정|털어놓|불렀|부른다|짚었|전했|썼다|고백|설명|주장|묘사|극찬|단언|아쉬워|물었|증언|감탄|회상|회고|꼽았|꼽는|꼽으|꼽힌|올렸|골랐|선택|선정|포함|등재|지목|뽑았|삼았|추천|순위|위에 올|\d+위|봤다|보았다|관람|다시 보|반복해 보|처음 접했|처음 봤|빠져/
const SOURCE = /\b(19|20)\d{2}\b|인터뷰|자서전|회고록|팟캐스트|방송|다큐|칼럼|에세이|기고|대담|좌담|강연|목록|투표|프로필|매거진|매체|지면|Q&A|AMA|SNS|인스타|트위터|유튜브|라디오|영화제|상영|시상식|연재|저서|책에서|수상 소감|기자회견|무대인사/
const QUOTED = /["“”][^"“”]{12,}["“”]|'[^']{12,}'/

/** 화자 귀속 없이 영향·의미를 단정하는 꼬리 문장 */
const TAIL = /(되었다|됐다|미쳤다|주었다|줬다|맞닿아 있(다|었다)|이어졌다|일치한다|가깝다|평가받는다|추정된다|것이다|셈이다|보여준다|무관하지 않다)\.?\s*$/
const ATTR = /말했|밝혔|적었|답했|전했|회고했|회상했|고백했|설명했|덧붙였|꼽았|썼다|증언했/

const buckets: Record<string, { id: string; who: string; work: string; review: string }[]> = {
  짧음: [], 귀속없음: [], 출처없음: [], 둘다없음: [], 통과: [],
}
const tails: { id: string; who: string; work: string; tail: string }[] = []

for (const r of cc) {
  if (!movie.has(r.content_id)) continue
  const t = (r.review ?? '').trim()
  const row = { id: r.id, who: celebById.get(r.celeb_id)?.nickname ?? '?', work: koTitle.get(r.content_id) ?? '?', review: t }
  if (usableReview(t)) {
    buckets.통과.push(row)
    // 통과한 것 중에서도 꼬리 문장은 걷어야 한다
    const sents = t.split(/(?<=[.!?])\s+/).filter(Boolean)
    const last = sents[sents.length - 1] ?? ''
    if (sents.length >= 2 && TAIL.test(last) && !ATTR.test(last) && last.length >= 15) {
      tails.push({ id: r.id, who: row.who, work: row.work, tail: last })
    }
    continue
  }
  if (t.length < 100) { buckets.짧음.push(row); continue }
  const said = SAID.test(t)
  const src = SOURCE.test(t)
  if (!said && !src) buckets.둘다없음.push(row)
  else if (!said) buckets.귀속없음.push(row)
  else buckets.출처없음.push(row)
}

const n = (k: string) => buckets[k].length
const all = Object.values(buckets).reduce((a, b) => a + b.length, 0)
console.log(`영화 감상 ${all}건`)
console.log(`  통과      ${n('통과')}건 (${Math.round(n('통과') / all * 100)}%)`)
console.log(`  짧음      ${n('짧음')}건 — 100자 미만. 손댈 수 없다`)
console.log(`  귀속없음  ${n('귀속없음')}건 — 출처는 있는데 「누가 말했다」가 없다. **고치면 살릴 수 있다**`)
console.log(`  출처없음  ${n('출처없음')}건 — 말한 것은 맞는데 언제 어디서가 없다. 조사하면 살릴 수 있다`)
console.log(`  둘다없음  ${n('둘다없음')}건 — 서술자의 해설. 대개 못 쓴다`)
console.log(`\n통과한 것 중 꼬리 문장이 의심되는 것 ${tails.length}건`)

if (dumpWhich) {
  const dir = path.join(ASSETS, 'tistory-cinema')
  if (dumpWhich === '꼬리') {
    const out = tails.map((t, i) => `[${i + 1}] ${t.who} · 『${t.work}』\n  ${t.tail}\n  id=${t.id}`).join('\n\n')
    fs.writeFileSync(path.join(dir, '_triage-꼬리.txt'), out, 'utf8')
    console.log(`저장: _triage-꼬리.txt (${tails.length}건)`)
  } else {
    const rows = buckets[dumpWhich]
    if (!rows) throw new Error(`무리 이름이 틀렸다: ${Object.keys(buckets).join(', ')}, 꼬리`)
    const out = rows.map((x, i) => `[${i + 1}] ${x.who} · 『${x.work}』\n${x.review}\n  id=${x.id}`).join('\n\n')
    fs.writeFileSync(path.join(dir, `_triage-${dumpWhich}.txt`), out, 'utf8')
    console.log(`저장: _triage-${dumpWhich}.txt (${rows.length}건)`)
  }
}
