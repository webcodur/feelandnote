/**
 * 영향력 근거문 중복을 인물 맥락을 넣은 문장으로 다시 쓴다. 패치 파일을 제자리에서 고친다.
 *
 * 룰북이 「다른 인물의 점수나 설명을 복사하지 않는다」고 정한다(celeb-03-01-influence.md).
 * 0점 축의 부재 진술이 특히 겹치기 쉬우므로, 겹친 것만 골라 그 인물이 무엇을 한 사람인지가
 * 드러나게 고쳐 쓴다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/gpt-influence-dedup.mjs [--file <패치>]
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const FILE = path.resolve(process.cwd(), arg('--file', '../../data/celeb/gap-fill/patch-influence.json'))
const AXES = ['political', 'strategic', 'tech', 'social', 'economic', 'cultural', 'transhistoricity']
const LABEL = { political: '정치', strategic: '전략', tech: '기술', social: '사회', economic: '경제', cultural: '문화', transhistoricity: '시대초월성' }

async function main() {
  const all = JSON.parse(fs.readFileSync(FILE, 'utf8'))

  // 겹친 문장을 찾고, 첫 번째만 남기고 나머지를 고쳐 쓴다
  const seen = new Map()
  const targets = []
  for (const x of all) {
    for (const a of AXES) {
      const key = x.influence[`${a}_exp`].trim()
      if (seen.has(key)) targets.push({ slug: x.slug, axis: a, current: key })
      else seen.set(key, `${x.slug}:${a}`)
    }
  }
  if (!targets.length) { console.log('중복 없음'); return }

  const { data: rows } = await db.from('celebs').select('slug,nickname,headline,bio').in('slug', [...new Set(targets.map((t) => t.slug))])
  const info = new Map((rows ?? []).map((r) => [r.slug, r]))

  const list = targets.map((t, i) => {
    const c = info.get(t.slug)
    return `${i + 1}. slug=${t.slug} / axis=${t.axis} (${LABEL[t.axis]})\n   인물: ${c?.nickname} — ${c?.headline}\n   소개: ${(c?.bio ?? '').slice(0, 140)}\n   지금 문장(다른 인물과 겹침): ${t.current}`
  }).join('\n\n')

  const prompt = `너는 인물 영향력 평가의 근거 문장을 다듬는 편집자다. 아래 ${targets.length}건은 **다른 인물과 똑같은 문장**이 붙어 있어 고쳐 써야 한다.

## 왜 고치는가

같은 문장이 여러 인물에 붙으면 어느 점수도 설명하지 못한다. 특히 0점 축의 「기여가 없다」류는 겹치기 쉬운데, 그 인물이 **무엇을 한 사람인지**가 드러나면 같은 뜻이라도 서로 다른 문장이 된다.

- 나쁨: 확인되는 기술·과학 기여가 없다 (누구에게나 붙는다)
- 좋음: 유목 연맹을 묶었을 뿐 기술 기록은 없다 / 왕통을 세운 기록에 기술 항목이 없다

## 규격

- **한국어 30자 이내 한 문장.** 40자를 넘기지 않는다.
- 그 인물의 행적·지위·전승에서 온 말을 한 조각 넣어 다른 인물과 구별되게 한다.
- 점수를 바꾸라는 것이 아니다. 같은 판정(기여 없음·미미함 등)을 유지하면서 문장만 그 인물의 것으로 만든다.
- 사실을 지어내지 않는다. 주어진 한 줄 정의와 소개에 있는 것만 쓴다.
- 영어(reason_en 에 해당)도 함께 낸다. 한국어를 직역하지 않는다.
- 큰따옴표를 쓰지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 배열만 출력한다. 순서와 개수를 입력과 맞춘다.

[{"slug":"...","axis":"tech","exp":"...","exp_en":"..."}]

## 대상 ${targets.length}건

${list}`

  console.log(`중복 ${targets.length}건 — codex 호출`)
  const text = await codexCall(prompt, { model: 'gpt-6-astra', effort: 'xhigh', timeoutMs: 600000 })
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(body)

  const bySlug = new Map(all.map((x) => [x.slug, x]))
  let fixed = 0
  for (const it of parsed) {
    const x = bySlug.get(it.slug)
    if (!x || !AXES.includes(it.axis)) { console.log(`모르는 항목: ${it.slug}/${it.axis}`); continue }
    if (!it.exp?.trim() || !it.exp_en?.trim()) { console.log(`빈 값: ${it.slug}/${it.axis}`); continue }
    if ([...it.exp].length > 40) { console.log(`40자 초과라 건너뜀: ${it.slug}/${it.axis} — ${it.exp}`); continue }
    x.influence[`${it.axis}_exp`] = it.exp.replace(/[“”"]/g, "'").trim()
    x.influence[`${it.axis}_exp_en`] = it.exp_en.replace(/[“”"]/g, "'").trim()
    fixed++
  }

  fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + '\n', 'utf8')

  const after = new Map()
  let left = 0
  for (const x of all) for (const a of AXES) {
    const k = x.influence[`${a}_exp`].trim()
    if (after.has(k)) left++
    else after.set(k, 1)
  }
  console.log(`${fixed}건 교체 / 남은 중복 ${left}건`)
}

main()
