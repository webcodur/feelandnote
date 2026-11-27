// 웹챗이 낸 책별 감상 배경(review_ko)을 출처 원문과 대조해 고친다(agy Ultra Carbon, 웹 열람). 책 한 권당 호출 하나, 동시 실행은 agy-slot 슬롯이 제한한다.
// 사용: node scripts/browser/reading-way-web/books-verify.mjs <slug,slug> [제목ko|제목ko]  결과: relist/<slug>.books.verified.json (기존 파일이 있으면 같은 제목만 갈아끼운다)
import fs from 'node:fs'; import { pathToFileURL } from 'node:url'
import { R, W } from './paths.mjs'
const { agyCall, jsonOf, RW_AGY_MODEL } = await import(new URL('./agy-slot.mjs', import.meta.url).href)
const D = W + '/relist', rule = fs.readFileSync(R + '/docs/project/celeb/celeb-02-03-content-review.md', 'utf8')
const only = process.argv[3]?.split('|')
await Promise.all(process.argv[2].split(',').map(async s => {
  const j = JSON.parse(fs.readFileSync(`${D}/${s}.books.json`, 'utf8')), rw = (() => { try { return fs.readFileSync(`${D}/${s}.new.ko.txt`, 'utf8') } catch { return '' } })()
  const out = `${D}/${s}.books.verified.json`, prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { slug: s, books: [] }
  const res = await Promise.all(j.books.filter(b => !only || only.includes(b.title_ko)).map(async b => {
    const prompt = `아래 책 한 권의 감상배경(review_ko)을 출처와 대조해 검수하고 고쳐주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요.\n- source_url·source_urls를 직접 열어 읽고(안 열리면 같은 기사를 웹 검색) 인물이 그 책을 읽은 사실·시기·장면·발언이 출처에 있는지 확인합니다.\n- 출처에 없는 동기·장면·해석(예: 그 책의 사상이 그의 태도와 '겹친다', '맞닿아 있다' 같은 연결), 출처에 없는 신체·경력 서술은 지웁니다. 책 내용 소개는 독자가 이해하는 데 필요한 만큼만 짧게 남깁니다.\n- 독서 방식 본문과 사실이 어긋나지 않게 합니다.\n- 출처로 독서 자체가 확인되지 않으면(출연·낭독·제작만 확인되는 경우 포함) drop:true로 표시합니다.\n- 아래 작성 규칙을 따릅니다.\n출력은 설명 없이 JSON 코드 블록 하나: {"title_ko":"${b.title_ko}","drop":false,"source_url":"독서 사실을 직접 확인한 출처 URL 하나(열어서 확인한 것)","review_ko":"고친 감상배경(문단 \\n\\n)","review_en":"같은 사실의 자연스러운 영어","changes":"무엇을 왜 고쳤는지 한 줄"}\n\n[작성 규칙]\n${rule}\n\n[독서 방식 본문]\n${rw}\n\n[검수 대상]\n${JSON.stringify({ title_ko: b.title_ko, title_en: b.title_en, author_ko: b.author_ko, source_url: b.source_url, source_urls: b.source_urls, evidence: b.evidence, review_ko: b.review_ko }, null, 1)}`
    try { const o = await agyCall(prompt, { model: RW_AGY_MODEL, timeoutMs: 30 * 60e3 }); const v = jsonOf(o); v.title_ko = b.title_ko; console.log(s, b.title_ko, v.drop ? 'drop' : 'ok'); return v }
    catch (e) { console.log(s, b.title_ko, 'FAIL', String(e.message).slice(0, 120)); return null }
  }))
  const got = res.filter(Boolean), books = [...prev.books.filter(x => !got.some(g => g.title_ko === x.title_ko)), ...got]
  fs.writeFileSync(out, JSON.stringify({ slug: s, books }, null, 1)); console.log(s, '검수', got.length, '/', res.length)
}))
console.log('BOOKS-VERIFY-DONE')
