/**
 * 창조신·개벽신처럼 「기준점이 없다」는 이유로 생년이 비워진 인물에게 대표 연도를 매긴다.
 *
 * 이 서비스는 실존 여부와 무관하게 모든 인물에게 추정 생년을 둔다. 정렬·동시대 인물·연대기가
 * 그 값을 쓰기 때문이다(`docs/project/celeb/celeb-01-01-profile-facts.md`).
 * 창조신도 예외가 아니며, 그 문화권의 고고학적 정착 시기나 전승 세계의 시작을 대표 연도로 삼는다.
 *
 * 실행 (sw/web-bo 에서): node scripts/founding-myth/gpt-lifespan-creators.mjs [--apply-file <경로>]
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

const OUT = path.resolve(process.cwd(), '../../data/celeb/founding-myth/patch-lifespan-creators.json')

async function main() {
  const { data: all } = await db
    .from('celebs')
    .select('id,slug,nickname,headline,bio,birth_date,nationality')
    .gte('created_at', '2026-09-04T22:00:00')
    .limit(600)

  const ids = all.map((c) => c.id)
  const asg = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await db.from('faction_members').select('celeb_id,lv2_id').in('celeb_id', ids.slice(i, i + 100))
    asg.push(...(data ?? []))
  }
  const { data: tags } = await db.from('faction_lv2').select('id,name')
  const tn = new Map(tags.map((t) => [t.id, t.name]))
  const tof = new Map(asg.map((a) => [a.celeb_id, tn.get(a.lv2_id)]))

  const todo = all.filter((c) => !c.birth_date)
  if (!todo.length) { console.log('대상 없음'); return }

  // 전승별로 이미 확정된 가장 이른 연도 — 창조신은 그보다 앞에 서야 한다
  const earliest = new Map()
  for (const c of all) {
    if (!c.birth_date) continue
    const t = tof.get(c.id) ?? '(배정없음)'
    const y = Number(c.birth_date)
    if (!Number.isFinite(y)) continue
    if (!earliest.has(t) || y < earliest.get(t).y) earliest.set(t, { y, who: c.nickname })
  }

  const people = todo.map((c, i) => {
    const t = tof.get(c.id) ?? '(배정없음)'
    const e = earliest.get(t)
    return [
      `### ${i + 1}. ${c.nickname} (${c.slug})`,
      `전승: ${t} / 국적: ${c.nationality ?? '없음'}`,
      `한 줄 정의: ${c.headline}`,
      `소개: ${c.bio}`,
      e ? `※ 같은 전승에서 가장 이른 확정 연도: ${e.y} (${e.who}) — 이 인물은 그보다 앞서야 한다` : null,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const prompt = `너는 세계 신화 인물 데이터베이스의 연대 담당자다. 아래 ${todo.length}명에게 birth_date 를 매긴다.

이들은 창조신·개벽신·첫 사람이라 「세상이 생기기 전이므로 연도를 매길 수 없다」고 판정돼 값이 비어 있다. **그 판정을 뒤집는 것이 이번 작업이다.**

이 서비스는 인물 정렬·동시대 인물·연대기 화면에서 생년을 쓴다. 그래서 **실존 여부와 무관하게 모든 인물에게 대표 연도를 둔다.** 전승 인물의 생년은 실제 생일이 아니라 그 전승이 놓인 배경 연도이며, 창조신도 예외가 아니다. 비우는 선택지는 없다.

## 정하는 방법

1. **그 문화권의 시작을 대표하는 연대를 잡는다.** 고고학이 보는 그 지역의 초기 정착·문화 형성 시기가 1순위다. 예를 들어 수메르의 알룰림은 왕명표의 28800년 재위 대신 에리두가 형성된 우바이드기 시작을 대표 연도로 삼았다. 같은 방식으로 판단한다.
2. **같은 전승의 다른 인물보다 앞서야 한다.** 각 인물에 「가장 이른 확정 연도」를 적어 두었다. 창조신은 그 전승의 첫머리에 서므로 그보다 앞선 값을 준다. 다만 수만 년씩 벌리지 말고 그 문화권의 정착 시기 안에서 잡는다.
3. **같은 전승의 짝은 같은 연도를 공유한다.** 부부·남매로 함께 세상을 연 존재가 있으면 연도를 맞춘다.
4. **연도만 쓴다.** 기원전은 음수(예: "-2200"). 월·일을 만들지 않는다.
5. **death_date 는 넣지 않는다.** 이들은 죽음이 전해지지 않거나 하늘로 돌아가는 존재다.

## 출력 형식

설명·머리말·코드펜스 없이 JSON 배열만 출력한다.

[{"slug":"...","birth_date":"-2200","basis":"그 연도를 정한 근거 한 문장"}]

${todo.length}명 전원에 대해 원소를 하나씩 낸다. 비우거나 skip 하지 않는다.

## 대상 인물

${people}`

  console.log(`대상 ${todo.length}명 — codex 호출`)
  const text = await codexCall(prompt, { model: 'gpt-6-astra', effort: 'xhigh', timeoutMs: 420000 })
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(body)

  const wanted = new Map(todo.map((c) => [c.slug, c]))
  const keep = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { console.log(`모르는 slug: ${it.slug}`); continue }
    if (!/^-?\d{1,6}$/.test(String(it.birth_date))) { console.log(`${it.slug}: 연도 아님 (${it.birth_date})`); continue }
    console.log(`${wanted.get(it.slug).nickname}: ${it.birth_date} — ${it.basis ?? '(근거 없음)'}`)
    keep.push({ slug: it.slug, celeb: { birth_date: String(it.birth_date) } })
  }
  const missing = [...wanted.keys()].filter((s) => !keep.some((k) => k.slug === s))
  if (missing.length) console.log(`\n누락: ${missing.join(', ')}`)

  fs.writeFileSync(OUT, JSON.stringify(keep, null, 2) + '\n', 'utf8')
  console.log(`\n${keep.length}명 → ${OUT}`)
}

main()
