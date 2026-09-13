/**
 * 원고 HTML 을 파일로 뽑아 브라우저로 열어 본다. 올리기 전에 눈으로 확인하는 자리다.
 *
 *   npx tsx scripts/tistory-cinema/preview.mts <글이름>     한 편
 *   npx tsx scripts/tistory-cinema/preview.mts --all        재료가 있는 것 전부
 *
 * `--all` 은 렌더러를 고친 뒤 현재 원고 전체를 다시 만들 때 쓴다. 편마다 프로세스를 새로
 * 띄우면 공백이 든 제목(「해롤드와 모드」)이 셸에서 잘려 엉뚱한 파일을 찾는다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSETS } from '../blog-assets.mjs'
import { renderWork, renderPerson, renderList, type Material, type PersonMaterial, type ListMaterial } from './render.mts'
import { categoryPathForMaterial } from './lib/categories.mjs'

const DIR = path.join(ASSETS, 'tistory-cinema')

/**
 * 🔴 **태그 균형을 여기서 막는다.** 남는 `</div>` 하나가 티스토리 본문 컨테이너
 * (`.area-view` → `.area-main`)를 일찍 닫아 버려, 스킨의 「다른글」·「댓글」 블록이
 * 본문과 형제가 된다. 스킨의 `.main` 은 `display:flex` 라 그 형제들이 1020px 를
 * 나눠 갖고 본문이 353px 로 쪼그라든다(26.09.05 인물 편 3분할, 목록 편 사이드바 증발).
 * 화면만 보고는 원인을 찾을 수 없으므로 올리기 전에 센다.
 */
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link'])
export function assertBalanced(html: string) {
  const stack: string[] = []
  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const [, close, tagRaw, self] = m
    const tag = tagRaw.toLowerCase()
    if (VOID.has(tag) || self) continue
    if (!close) stack.push(tag)
    else {
      const at = stack.lastIndexOf(tag)
      if (at < 0) throw new Error(`닫는 </${tag}> 가 남는다 — 그 앞 160자: ${html.slice(Math.max(0, m.index - 160), m.index + 20)}`)
      stack.length = at
    }
  }
  if (stack.length) throw new Error(`닫지 않은 태그: ${stack.join(' > ')}`)
}

/**
 * 「필앤노트 리뷰」 주입은 걷어 냈다(26.09.06). 240편이 앞 절의 인물을 다시 세는 글이라
 * 본문과 같은 말을 두 번 했다. 원문 `fn-reviews.json` 은 D 드라이브에 그대로 둔다 —
 * 영화 자체를 다루는 글로 다시 쓸 때 무엇이 문제였는지 볼 자리가 필요하다.
 */
/** 작품 편 제목 앞에 세울 한 줄. 재료를 다시 만들어도 살아남게 별도 파일에 둔다. */
const headlines = (): Record<string, string> => {
  const file = path.join(DIR, 'headlines.json')
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
}

export function renderOne(name: string) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.json`), 'utf8'))
  const categoryPath = categoryPathForMaterial(raw)
  if (raw.work) raw.headline = headlines()[name] ?? null
  const { title, html, tags } = raw.list ? renderList(raw as ListMaterial)
    : raw.celeb ? renderPerson(raw as PersonMaterial) : renderWork(raw as Material)
  assertBalanced(html)

  const out = path.join(DIR, `_preview-${name}.html`)
  fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>${title}</title>
<div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:-apple-system,'Malgun Gothic',sans-serif;font-size:16px;line-height:1.75;color:#222;">
<h1 style="font-size:26px;line-height:1.4;">${title}</h1>
<div style="font-size:13px;color:#888;margin-bottom:30px;">태그 ${tags.join(' · ')}</div>
${html}
</div>`)
  fs.writeFileSync(path.join(DIR, `_body-${name}.html`), html)
  // 발행기가 읽는 메타. 제목·태그는 렌더러가 정하므로 여기서 함께 떨어뜨린다.
  fs.writeFileSync(path.join(DIR, `_meta-${name}.json`), JSON.stringify({ title, tags, length: html.length, categoryPath, category: categoryPath[1] }, null, 2))
  return { title, tags, length: html.length, categoryPath, category: categoryPath[1], out }
}

/** 재료 JSON 이 있는 글 이름. 교정 결과 등 보조 JSON은 재료 구조로 구분한다. */
export function materialNames() {
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_') && !['fn-reviews.json', 'headlines.json'].includes(f))
    .filter((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
      return raw.work || raw.celeb || raw.list
    })
    .map((f) => f.slice(0, -5))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const arg = process.argv[2]
if (!arg) throw new Error('글 이름 또는 --all 을 달라')

if (arg === '--all') {
  const names = materialNames()
  const failed: { name: string; reason: string }[] = []
  let done = 0
  for (const name of names) {
    try { renderOne(name); done++ } catch (error) { failed.push({ name, reason: (error as Error).message }) }
  }
  console.log(`재생성 ${done}/${names.length}편`)
  if (failed.length) {
    console.log('실패:')
    failed.forEach((f) => console.log(` - ${f.name}: ${f.reason.slice(0, 160)}`))
    process.exit(1)
  }
} else {
  const { title, tags, length, out } = renderOne(arg)
  console.log('제목:', title)
  console.log('태그:', tags.join(', '))
  console.log('본문', length, '자 · 미리보기:', out)
}
}
