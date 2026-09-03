/**
 * book-person/review.mjs — 「책과 사람」 원고 검수 (agy, 무료)
 *
 * 편 폴더의 ko.json(원고)과 facts.json(재료: 감상배경·출처·다른 독서 기록)을 함께 주고
 * "한국인이 한국어로 처음부터 쓴 글로 읽히는가"만 묻는다. 이상한 문장만 돌려받고 평가어는 금지한다.
 *
 *   pnpm --filter remotion exec node scripts/book-person/review.mjs elon-musk-capital [다른 편 ...]
 *
 * 운용 규칙 (docs/continuous/book-person.md)
 * - 지적은 받되 제미니가 제안한 "고친 문장"은 쓰지 않는다. 고친 문장에서 사실을 지어낸 사례가 있다(강백호 등번호, 왓슨 독서 목록).
 * - 재료 목록에 있는 사실을 "재료에 없다"고 하는 오탐이 있다. 지적마다 facts.json과 대조한 뒤 수용한다.
 */

import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASE = path.join(ROOT, 'public', 'book-person')
const slugs = process.argv.slice(2)
if (slugs.length === 0) { console.error('✗ 편 폴더명을 하나 이상 준다'); process.exit(1) }

const HEAD = `너는 한국어가 모국어인 편집자다. 아래 원고가 "한국인이 한국어로 처음부터 쓴 글"로 읽히는지 본다. 웹 검색이나 파일 접근은 하지 않는다.

찾을 것 (이상점)
- 한국 사람이 말로는 안 쓰는 표현: 사물이 주어인 문장, "~한 X였습니다" 식 명사 종결, 긴 관형절, 영어 어순, 어색한 조사, 번역체 관용구
- 기계 냄새: 아무 글에나 붙는 뻔한 연결 문장, 감상이나 교훈으로 닫는 마무리, 감정을 강요하는 말, 앞 문장을 되풀이하는 문장, 습관적 문예어
- 재료에 없는 사실·발언·표정·태도
- 소리 내어 읽었을 때 호흡이 막히는 문장 (쇼츠 나레이션이다)

출력 규칙 (반드시 지킨다)
- 이상한 문장만 적는다. 형식: "N: 무엇이 이상한지 한 줄 → 고친 문장"
- 통과·좋다·양호·자연스럽다 같은 평가어를 쓰지 않는다. 문제없는 문장은 언급하지 않는다.
- 총평·칭찬·요약을 쓰지 않는다.
- 지적할 것이 하나도 없으면 아무것도 출력하지 않는다.

`

for (const slug of slugs) {
  const dir = path.join(BASE, slug)
  const kp = path.join(dir, 'ko.json'), fp = path.join(dir, 'facts.json')
  if (!existsSync(kp) || !existsSync(fp)) { console.log(`- ${slug}: ko.json 또는 facts.json 없음, 건너뜀`); continue }
  const s = JSON.parse(readFileSync(kp, 'utf8'))
  const f = JSON.parse(readFileSync(fp, 'utf8'))
  const lines = ['0. ' + (s.lead ?? ''), ...s.books.map((b, i) => `${i + 1}. ${b.text}`)].join('\n')
  const others = (f.other_books ?? []).map(t => `『${t}』`).join(', ')
  const prompt = HEAD + `## 재료 (이 밖의 사실은 널리 알려진 상식이어야 한다)\n\n인물: ${f.person} (${f.headline ?? ''})\n책: 『${f.book.title}』 ${f.book.creator ?? ''}\n감상배경 (출처 ${f.book.source_url || '-'}): ${f.book.review}\n같은 인물의 다른 독서 기록: ${others}\n\n## 원고 (세로 쇼츠 나레이션, 문장마다 화면이 바뀐다)\n\n${lines}\n`
  let out = ''
  try { out = (await agyCall(prompt, { timeoutMs: 540_000 })).trim() } catch (e) { out = `(호출 실패: ${e.message})` }
  console.log(`=== ${slug}\n${out || '(지적 없음)'}\n`)
}
