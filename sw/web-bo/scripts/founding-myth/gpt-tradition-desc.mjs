/**
 * 안내글이 비어 있는 전승의 description / description_en 을 codex(GPT)로 쓴다. DB는 건드리지 않는다.
 *
 * 기존 안내글(한국 신화·북유럽 신화)이 분량과 결의 본이다. 그 전승에 실제로 등록된 인물 명단을
 * 함께 주어, 화면에 서는 인물과 안내글이 어긋나지 않게 한다.
 *
 * 재실행 안전: 이미 안내글이 있거나 이미 만들어 둔 전승은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서): node scripts/founding-myth/gpt-tradition-desc.mjs [--conc 2] [--list]
 * 모델은 sol 이다. 두 문단짜리 안내글이라 글쓰기가 결과를 가른다.
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/founding-myth/tradition-desc')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 2))
const LIST_ONLY = process.argv.includes('--list')

function buildPrompt(tag, people, samples) {
  const roster = people.map((p) => `- ${p.nickname} (${p.title}) — ${p.headline}`).join('\n')
  const models = samples.map((s) => `### 본보기: ${s.name}\n\n${s.description}`).join('\n\n')

  return `너는 인물 큐레이션 서비스의 편집자다. 신화 지도에 서는 전승 「${tag.name}」의 안내글을 한국어와 영어로 쓴다.

## 무엇을 쓰는가

이 서비스는 문화권별 전승을 묶어 그 안에 인물을 세운다. 안내글은 그 전승이 **무엇으로 이루어진 전승인지**를 처음 보는 사람에게 설명하는 글이다. 아래 본보기가 분량과 결의 기준이다.

${models}

## 규격

- **두 문단으로 쓴다.** 첫 문단은 그 전승이 어떤 자료·기록으로 전해지는지와 대표적인 이야기 몇 가지를, 둘째 문단은 그 전승이 무엇을 다루는지와 지금 어떻게 전해지는지를 쓴다.
- 한국어 450~600자, 영어 900~1400자로 맞춘다.
- **하나의 정본이 없는 전승이면 그것을 먼저 밝힌다.** 여러 지역·시대·언어의 기록이 묶인 것이면 「단일 정본은 아니다」처럼 범위를 정직하게 적는다. 본보기 둘 다 그렇게 시작한다.
- **문헌 이름과 인물 이름을 구체적으로 적는다.** 「많은 신들이 등장한다」 같은 뭉뚱그린 말 대신 실제 기록과 이름을 든다.
- **전승이 갈리는 대목은 갈린다고 적는다.** 한쪽으로 단정하지 않는다.
- 영어는 한국어를 직역하지 않는다. 같은 사실을 영어에서 자연스럽게 다시 쓴다.

## 문체 금지

- **단골 문예 어휘를 쓰지 않는다** — 벼리다, 포개다, 빚어내다, 아로새기다, 결을 고르다, 숨결, 울림, 여정, 서사의 지평 같은 말.
- 설교나 교훈으로 끝내지 않는다. 「우리에게 무엇을 말해 준다」, 「오늘날에도 시사하는 바가 크다」 같은 마무리를 쓰지 않는다.
- 드라마 과장과 감탄을 넣지 않는다. 사실을 적는 평서문으로 쓴다.
- 번역투를 피한다. 사물을 주어로 세운 문장, 「~에 의해」, 「~을 가진다」 같은 구문을 한국어 어순으로 고쳐 쓴다.

## 이 전승에 실제로 등록된 인물 ${people.length}명

안내글에 이 인물들 가운데 대표적인 이름이 실제로 나와야 한다. 화면에서 안내글 아래에 이 사람들이 선다.

${roster}

## 출력 형식

설명·머리말·코드펜스 없이 JSON 객체만 출력한다. 문단 사이는 \\n\\n 으로 나눈다.

{"description":"한국어 두 문단","description_en":"English, two paragraphs"}`
}

async function main() {

  fs.mkdirSync(OUT_DIR, { recursive: true })

  const { data: tags, error } = await db.from('celeb_tags').select('id,slug,name,description,description_en').like('slug', 'myth%').order('slug')
  if (error) throw new Error(error.message)

  const samples = tags.filter((t) => ['myth-korea', 'myth-norse'].includes(t.slug)).map((t) => ({ name: t.name, description: t.description }))
  const todo = tags.filter((t) => !t.description && !fs.existsSync(path.join(OUT_DIR, `${t.slug}.json`)))

  console.log(`안내글 없는 전승 ${tags.filter((t) => !t.description).length}개 / 남은 것 ${todo.length}개`)
  for (const t of todo) console.log(`  ${t.slug}  ${t.name}`)
  if (LIST_ONLY || !todo.length) return

  // 전승별 인물 명단
  const { data: asg } = await db.from('celeb_tag_assignments').select('celeb_id,tag_id').in('tag_id', todo.map((t) => t.id))
  const ids = [...new Set(asg.map((a) => a.celeb_id))]
  const people = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await db.from('celebs').select('id,nickname,title,headline').in('id', ids.slice(i, i + 100))
    people.push(...(data ?? []))
  }
  const pById = new Map(people.map((p) => [p.id, p]))
  const byTag = new Map()
  for (const a of asg) {
    if (!byTag.has(a.tag_id)) byTag.set(a.tag_id, [])
    const p = pById.get(a.celeb_id)
    if (p) byTag.get(a.tag_id).push(p)
  }

  let done = 0, failed = 0
  for (let i = 0; i < todo.length; i += CONC) {
    await Promise.all(todo.slice(i, i + CONC).map(async (tag) => {
      const roster = byTag.get(tag.id) ?? []
      if (!roster.length) { console.log(`SKIP ${tag.name} — 등록 인물 없음`); return }
      try {
        const text = await codexCall(buildPrompt(tag, roster, samples), { model: 'gpt-5.6-sol', effort: 'xhigh', timeoutMs: 420000 })
        const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
        const o = JSON.parse(body)
        const bad = []
        if (!o.description || o.description.length < 300) bad.push(`한국어 ${o.description?.length ?? 0}자`)
        if (!o.description_en || o.description_en.length < 600) bad.push(`영어 ${o.description_en?.length ?? 0}자`)
        for (const w of ['벼리', '포개', '빚어내', '아로새기', '숨결', '울림']) if (o.description?.includes(w)) bad.push(`금지어 ${w}`)
        if (bad.length) { failed++; console.log(`FAIL ${tag.name} — ${bad.join(', ')}`); return }
        fs.writeFileSync(path.join(OUT_DIR, `${tag.slug}.json`), JSON.stringify({ slug: tag.slug, name: tag.name, ...o }, null, 2) + '\n', 'utf8')
        done++
        console.log(`OK   ${tag.name} — 한 ${o.description.length}자 / 영 ${o.description_en.length}자 (인물 ${roster.length}명)`)
      } catch (e) {
        failed++
        console.log(`${looksRateLimited(e.message) ? 'RATE' : 'ERR '} ${tag.name} — ${e.message.slice(0, 250)}`)
      }
    }))
  }
  console.log(`\n생성 ${done} / 실패 ${failed}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
