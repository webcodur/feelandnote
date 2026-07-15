/**
 * profiles.virtual_monologue 일괄 생성 (GLM-4.6, 종량제 API)
 *
 *   - 각 인물의 bio(소개)만 근거로 1인칭 가상 독백을 생성한다.
 *   - 대상은 profile_type='CELEB' 인물만(일반 USER 제외).
 *   - 작성 지침은 docs/todo/virtual-monologue-plan.md 전문을 system 프롬프트로 주입.
 *   - 점증(재실행 안전): virtual_monologue 이미 채워진 인물은 건너뜀. --force로 덮어씀.
 *   - 시험: --limit N (앞에서 N명만 처리).
 *   - bio 없는 인물은 건너뜀(근거 부재).
 *
 * 준비: .env 에 ZAI_API_KEY=<Z.AI 종량제 키> 추가.
 * 실행: sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue.ts --limit 10
 *   node --env-file=.env --import tsx scripts/fill-virtual-monologue.ts          # 전량
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ── .env 직접 로드 (--env-file 미사용 환경 대비) ──
function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const FORCE = process.argv.includes('--force')
const li = process.argv.indexOf('--limit')
const LIMIT = li >= 0 ? parseInt(process.argv[li + 1], 10) : Infinity

const CONCURRENCY = 5 // 동시 호출 수. rate limit 대비 보수적.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── GLM (Z.AI 종량제, OpenAI 호환 엔드포인트) ──
const ZAI_API_KEY = process.env.ZAI_API_KEY
const GLM_URL = 'https://api.z.ai/api/paas/v4/chat/completions'
const MODEL = 'glm-5.2'

// 작성 지침 = 계획 문서. 단, "## 저장" 섹션(DB·UPDATE SQL)은 에이전트형 모델(5.2)이
// 실행 작업으로 오해해 SQL·머리말을 뱉으므로 프롬프트에서 잘라내고, 출력 형식을 못박는다.
const RAW_GUIDE = readFileSync(resolve(process.cwd(), 'docs/todo/virtual-monologue-plan.md'), 'utf-8')
const GUIDE = RAW_GUIDE.replace(/\n## 저장[\s\S]*?(?=\n## )/, '\n')
  + '\n\n## 출력 형식\n\n독백 본문만 출력한다. 인사말·작업 설명·SQL·코드블록(```)·머리말(#)·분석 메모를 붙이지 않는다. 첫 글자부터 독백이 시작되어 독백 문장으로 끝난다.'

// 평어체(~다) 대상 직군. 나머지 전원 정중체(~습니다). DB profile.profession 값 기준.
const COMMANDER_PROFESSIONS = new Set(['commander'])
const toneFor = (profession: string | null) =>
  COMMANDER_PROFESSIONS.has(profession ?? '') ? '평어체(~다, 단정적 서술체)' : '정중체(~습니다)'

// GLM(중국 모델)이 간혹 흘리는 중국어 한자 검출
const hasHanzi = (s: string) => /[一-鿿]/.test(s)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function generate(name: string, bio: string, tone: string, retries = 3): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(GLM_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ZAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.8,
          messages: [
            { role: 'system', content: GUIDE },
            { role: 'user', content: `말투: ${tone}\n\n인물: ${name}\n\n소개:\n${bio}` },
          ],
        }),
      })
      if (res.status === 429) { await sleep(2000 * (i + 1)); continue } // rate limit → backoff
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
      const j = await res.json()
      const text = j?.choices?.[0]?.message?.content?.trim()
      if (!text) throw new Error('빈 응답')
      if (hasHanzi(text)) { // 한자 누출 → 재생성
        if (i === retries) throw new Error('한자 혼입(재시도 소진)')
        await sleep(500); continue
      }
      return text
    } catch (e) {
      if (i === retries) throw e
      await sleep(1500 * (i + 1))
    }
  }
  throw new Error('unreachable')
}

// 셀럽 전원 로드 (Supabase 기본 1000행 상한 → 페이지네이션)
async function loadAll() {
  const rows: { slug: string; nickname: string; bio: string | null; profession: string | null; virtual_monologue: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, nickname, bio, profession, virtual_monologue')
      .eq('profile_type', 'CELEB')
      .order('slug')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function run() {
  if (!ZAI_API_KEY) { console.error('ZAI_API_KEY 없음. .env에 추가하라.'); process.exit(1) }

  const all = await loadAll()
  let targets = all.filter((r) => r.bio && (FORCE || !r.virtual_monologue))
  const skippedNoBio = all.filter((r) => !r.bio).length
  const skippedDone = all.filter((r) => r.bio && r.virtual_monologue && !FORCE).length
  targets = targets.slice(0, LIMIT)

  console.log(`셀럽 ${all.length}명 | 대상 ${targets.length}명 | 소개없음 스킵 ${skippedNoBio} | 기작성 스킵 ${skippedDone}`)
  if (LIMIT !== Infinity) console.log(`(시험 모드: 앞 ${LIMIT}명만)`)

  let done = 0, ok = 0, fail = 0
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (r) => {
      try {
        const mono = await generate(r.nickname, r.bio!, toneFor(r.profession))
        const { error } = await supabase.from('profiles').update({ virtual_monologue: mono }).eq('slug', r.slug)
        if (error) throw error
        ok++
        console.log(`✓ ${r.nickname} (${mono.length}자)`)
      } catch (e) {
        fail++
        console.error(`✗ ${r.nickname}: ${(e as Error).message}`)
      } finally {
        done++
      }
    }))
    console.log(`  진행 ${done}/${targets.length}`)
  }

  console.log(`\n완료. 성공 ${ok} / 실패 ${fail}`)
}

run().catch((e) => { console.error(e); process.exit(1) })
