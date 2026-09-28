/**
 * 신화 개요(faction_lv2.description / description_en)를 문단 단위로 다시 나눈다.
 * 원문 어휘·문장을 보존하고 \n\n만 삽입한다 — remo-write-6-paragraphs와 같은 방식.
 *
 * 규격: 한국어 3~4 문단, 영어 3~4 문단. 분량 변경 없음.
 * 대상: is_myth=true 전체 38개 — 한 화면에 서는 글이라 분단 규격이 같아야 한다.
 * 검증: 개행·공백을 지운 정규화 텍스트가 원문과 같아야 한다. 다르면 1회 재시도.
 * 재실행 안전: 이미 만들어 둔 출력 파일이 있으면 건너뛴다.
 *
 * 실행 (sw/web-bo 에서): node scripts/founding-myth/agy-myth-desc-paragraphs.mjs [--conc 3] [--list]
 */
import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/myth-desc/paras')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const CONC = Number(arg('--conc', 3))
const LIST_ONLY = process.argv.includes('--list')

const norm = (s = '') => s.replace(/\s+/g, '')

function buildPrompt(tag) {
  return `아래는 신화 안내글 한 편의 한국어 원문과 영어 원문이다. **단어나 문장을 하나도 고치지 말고**, 문단 구분(빈 줄 \\n\\n)만 다시 넣어 나눠라.

## 규칙

- 한국어는 3~4 문단, 영어는 3~4 문단으로 나눈다.
- 내용이 바뀌는 지점(자료 설명 → 이야기 → 의미/전승)에서 자른다.
- 문장 순서·어휘·부호를 그대로 보존한다. 추가·삭제·요약 금지.
- 빈 줄이 아닌 다른 형식(불릿·머리글)을 넣지 않는다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 객체만 출력한다.

{"description":"한국어 (문단 사이 \\n\\n)","description_en":"English (blank line between paragraphs)"}

## 한국어 원문

${tag.description}

## 영어 원문

${tag.description_en}`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const { data: tags, error } = await db.from('faction_lv2')
    .select('id,slug,name,description,description_en').eq('is_myth', true).order('slug')
  if (error) throw new Error(error.message)

  const todo = (tags ?? []).filter((t) => t.description && !fs.existsSync(path.join(OUT_DIR, `${t.slug}.json`)))
  console.log(`대상 ${(tags ?? []).length}개 / 남은 것 ${todo.length}개`)
  if (LIST_ONLY || !todo.length) return

  let done = 0, failed = 0
  for (let i = 0; i < todo.length; i += CONC) {
    const results = await Promise.allSettled(todo.slice(i, i + CONC).map(async (tag) => {
      const parse = (text) => JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim())
      const same = (o) => norm(o.description) === norm(tag.description) && norm(o.description_en) === norm(tag.description_en ?? '')
      let o = parse(await agyCall(buildPrompt(tag), { timeoutMs: 480_000 }))
      if (!same(o)) {
        const retry = parse(await agyCall(
          `${buildPrompt(tag)}\n\n## 교정 지시\n\n직전 결과가 원문을 고쳤다. 단어·문장을 하나도 바꾸지 말고 빈 줄만 넣어 다시 출력한다.`,
          { timeoutMs: 480_000 },
        ))
        if (!same(retry)) throw new Error('원문 보존 검증 실패')
        o = retry
      }
      const koParas = o.description.split(/\n+/).filter(Boolean).length
      const enParas = o.description_en.split(/\n+/).filter(Boolean).length
      if (koParas < 3 || koParas > 4 || enParas < 3 || enParas > 4) {
        throw new Error(`문단 수 이탈 — ko ${koParas} / en ${enParas}`)
      }
      return { tag, o, koParas, enParas }
    }))
    for (const [j, r] of results.entries()) {
      const tag = todo[i + j]
      if (r.status === 'rejected') {
        failed++
        console.log(`FAIL ${tag.name} — ${String(r.reason?.message ?? r.reason).slice(0, 200)}`)
        continue
      }
      const { o, koParas, enParas } = r.value
      fs.writeFileSync(path.join(OUT_DIR, `${tag.slug}.json`),
        JSON.stringify({ slug: tag.slug, name: tag.name, ...o }, null, 2) + '\n', 'utf8')
      done++
      console.log(`OK   ${tag.name} — 문단 ko ${koParas} / en ${enParas}`)
    }
  }
  console.log(`\n생성 ${done} / 실패 ${failed}`)
  console.log(`출력: ${OUT_DIR}`)
}

main()
