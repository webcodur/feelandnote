/**
 * 수식어(title·title_en)가 비어 있는 인물에게 agy(Gemini)로 한영을 함께 만든다.
 * 생성만 하고 DB는 건드리지 않는다. 산출물은 apply 스크립트가 받는다.
 *
 * 규칙 SSoT: docs/project/celeb/celeb-01-03-title.md (프롬프트에 docs로 첨부)
 *
 * 입력: ../../data/celeb/gap-fill/titles/src.json
 * 출력: ../../data/celeb/gap-fill/titles/out/<slug>.json — { slug, title, title_en }
 * 재실행 안전: 이미 만든 산출물은 건너뛴다.
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/celeb/agy-title-ko.mjs --list
 *   node scripts/celeb/agy-title-ko.mjs --conc 4 --group 8
 *   node scripts/celeb/agy-title-ko.mjs --slugs rurik,rollo
 */

import path from 'node:path'
import fs from 'node:fs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const BASE = path.resolve(process.cwd(), '../../data/celeb/gap-fill/titles')
const SRC = path.join(BASE, 'src.json')
const OUT_DIR = path.join(BASE, 'out')
const RULEBOOK = path.resolve(process.cwd(), '../../docs/project/celeb/celeb-01-03-title.md')

const CONC = Number(arg('--conc', 4))
const GROUP = Number(arg('--group', 8))
const ONLY = (arg('--slugs', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
const LIST_ONLY = process.argv.includes('--list')

function buildPrompt(rows) {
  const people = rows.map((r, i) => [
    `### ${i + 1}. slug: ${r.slug}`,
    `이름: ${r.nickname} / 영문명: ${r.nickname_en ?? '(없음)'}`,
    `한 줄 정의: ${r.headline ?? '(없음)'} / EN: ${r.headline_en ?? '(없음)'}`,
    `직업: ${r.profession ?? '(없음)'} / 국적: ${r.nationality ?? '(없음)'}`,
    `생몰: ${r.birth_date ?? '?'} ~ ${r.death_date ?? '?'}`,
    `분류: ${r.celeb_reality ?? 'REAL'}`,
    r.bio ? `소개 앞부분: ${String(r.bio).slice(0, 220)}` : null,
  ].filter(Boolean).join('\n')).join('\n\n')

  return `아래 인물들의 수식어(title)와 영문 수식어(title_en)를 만든다.

수식어는 이름 앞에 붙는 짧은 표지다. 화면에 "수식어 + 이름" 형태로 노출되고 단독으로도 읽힌다.
예: 「오라클 설립」 래리 엘리슨, 「페이팔 마피아」 피터 틸, 「LSTM」 위르겐 슈미트후버,
「인류 최초의 영웅」 길가메시, 「바빌론의 주신」 마르두크.

## 규칙 요약 (전체 규격은 첨부 룰북)

1. 우선순위: ① 실제로 통용되는 호칭·별명 ② 대표작 하나(한국어는 「」로 감싼다) ③ 그 인물만의 상징적 정체성
2. 한국어는 2~12자의 자연스러운 한국어. "탐색자"·"창조자" 같은 문맥 없는 조어 금지.
3. 출전·장르·국가만 적은 분류 표식 금지("고대 신화"·"그리스 신화" 금지 — 인물을 바로 특정해야 한다).
4. 창업계열은 "<회사> 설립" / 영문 "<Company> Founder"로 통일. "Founder of X" 어순 금지.
5. 행위계열은 "<대상> <행위>"("트랜스포머 설계")로 통일하고 "의"·"공동"을 쓰지 않는다.
6. title과 title_en은 같은 사실을 담되 각 언어에서 자연스럽게 — 직역 금지.
7. 긴 설명문·이력 나열 금지. 대표 정체성보다 작은 일화 하나만 떼어 만들지 않는다.
8. 신화·전설 인물도 같은 규칙이다 — 인물을 바로 특정하는 호칭.

## 출력

JSON 배열만 출력한다. 코드펜스·설명·서두 금지.
[{"slug":"…","title":"…","title_en":"…"}]

## 인물

${people}`
}

function validate(text, rows) {
  const issues = []
  const body = String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  let parsed
  try {
    parsed = JSON.parse(start > -1 && end > start ? body.slice(start, end + 1) : body)
  } catch (e) {
    return { ok: [], issues: [`JSON 파싱 실패: ${e.message}`] }
  }
  if (!Array.isArray(parsed)) return { ok: [], issues: ['배열이 아니다'] }

  const wanted = new Set(rows.map((r) => r.slug))
  const ok = []
  for (const it of parsed) {
    if (!wanted.has(it.slug)) { issues.push(`모르는 slug: ${it.slug}`); continue }
    const title = String(it.title ?? '').trim()
    const titleEn = String(it.title_en ?? '').trim()
    if (!title || !titleEn) { issues.push(`${it.slug}: 빈 값`); continue }
    if (/[a-zA-Z]/.test(title)) { issues.push(`${it.slug}: ko에 영문 잔존`); continue }
    if (/[가-힣]/.test(titleEn)) { issues.push(`${it.slug}: en에 한글 잔존`); continue }
    if (title.length > 30) { issues.push(`${it.slug}: ko ${title.length}자 초장`); continue }
    ok.push({ slug: it.slug, title, title_en: titleEn })
  }
  const missing = [...wanted].filter((s) => !ok.some((o) => o.slug === s))
  if (missing.length) issues.push(`누락: ${missing.join(', ')}`)
  return { ok, issues }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const src = JSON.parse(fs.readFileSync(SRC, 'utf8'))
  const done = new Set(fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')))

  let todo = src.filter((r) => !done.has(r.slug))
  if (ONLY.length) todo = src.filter((r) => ONLY.includes(r.slug))

  const groups = []
  for (let i = 0; i < todo.length; i += GROUP) groups.push(todo.slice(i, i + GROUP))

  console.log(`대상 ${todo.length}명 / 완료 ${done.size}명 / 묶음 ${groups.length}개 (묶음당 ${GROUP}명, 동시 ${CONC})`)
  if (LIST_ONLY || !groups.length) return

  let made = 0
  let failed = 0
  for (let i = 0; i < groups.length; i += CONC) {
    await Promise.all(groups.slice(i, i + CONC).map(async (g) => {
      const label = g.map((r) => r.nickname).join('·')
      try {
        const text = await agyCall(buildPrompt(g), { docs: [RULEBOOK], repoRoot: path.resolve(process.cwd(), '../..') })
        const { ok, issues } = validate(text, g)
        for (const r of ok) {
          fs.writeFileSync(path.join(OUT_DIR, `${r.slug}.json`), JSON.stringify(r, null, 1))
          made++
        }
        if (issues.length) console.log(`[!] ${label}: ${issues.join(' | ')}`)
      } catch (e) {
        failed += g.length
        console.log(`[실패] ${label}: ${e.message?.slice(0, 160)}`)
      }
    }))
    if ((i / CONC) % 10 === 0) console.log(`... ${Math.min(i + CONC, groups.length)}/${groups.length} 묶음 · 누적 ${made}명`)
  }
  console.log(`완료: 생성 ${made}명 · 실패 ${failed}명 → ${OUT_DIR}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
