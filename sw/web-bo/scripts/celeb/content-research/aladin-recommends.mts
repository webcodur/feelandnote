/**
 * 알라딘 「저자의 추천」 수집. 인물이 추천사를 쓴 책과 추천사 본문을 끝 페이지까지 모은다.
 *
 * 1) 저자 후보 찾기 — 활동명·본명·별칭으로 검색하고, 후보마다 분류·출생·최근작·추천 수·추천한 책 앞 3권을 보여 준다.
 *    pnpm celeb:research:aladin -- find --slug a,b            (DB의 nickname·aliases로 검색)
 *    pnpm celeb:research:aladin -- find --name "전한길"
 * 2) 수집 — 본인으로 판정한 저자 ID의 추천 목록 전체를 JSON으로 저장한다.
 *    pnpm celeb:research:aladin -- collect --author 136457 --out <작업폴더>/jeon-han-gil.aladin.json [--isbn]
 *    --isbn은 상품 페이지를 하나씩 열어 ISBN-13을 붙인다(건당 1초 간격).
 *
 * 본인 판정과 채택은 사람이 한다: docs/project/celeb/celeb-02-07-content-research-techniques.md 「추천사 페이지」
 */
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const command = args[0]
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const flag = (name: string) => args.includes(`--${name}`)
const UA = { headers: { 'User-Agent': 'Mozilla/5.0 (feelandnote research)' } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const strip = (s: string) => s
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const pageUrl = (author: string, page = 1) =>
  `https://www.aladin.co.kr/author/wauthor_recommend.aspx?AuthorSearch=@${author}&ViewRowsCount=100&SortOrder=5&page=${page}`

async function get(url: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...UA, signal: AbortSignal.timeout(20000) }).catch((error: Error) => ({ ok: false, status: error.name, text: async () => '' }))
    if (res.ok) return res.text()
    if (attempt >= 3) throw new Error(`${res.status} ${url}`)
    await sleep(3000 * attempt)
  }
}

type Item = { itemId: string; title: string; meta: string; isbn10?: string; isbn13?: string; recommend: string }

function parseItems(html: string): Item[] {
  return html.split(/<div class="ss_book_box"/).slice(1).map((block) => {
    const itemId = (block.match(/class="bo3"[^>]*href="[^"]*ItemId=(\d+)/) ?? block.match(/ItemId=(\d+)/) ?? [])[1] ?? ''
    const title = strip((block.match(/class="bo3"[^>]*>([\s\S]*?)<\/a>/) ?? [])[1] ?? '')
    const meta = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1]))
      .find((x) => /\((지은이|옮긴이|엮은이|글|그림|감수)\)/.test(x)) ?? ''
    const isbn10 = (block.match(/wletslookViewer\.aspx\?ISBN=([0-9Xx]{10,13})/) ?? [])[1]
    // 추천사는 상품마다 author_recommend_txt 영역에만 있다. 마지막 상품 뒤에는 페이지 하단 문구가 붙으므로 영역 밖 텍스트를 쓰지 않는다.
    const recommend = strip((block.match(/<div class="author_recommend_txt">([\s\S]*?)<\/div>/) ?? [])[1] ?? '')
    return { itemId, title, meta, isbn10, recommend }
  }).filter((x) => x.itemId)
}

function profile(html: string) {
  const t = strip(html)
  const g = (re: RegExp) => (t.match(re) ?? [])[1]?.trim() ?? ''
  return {
    name: g(/이름:\s*(.+?)\s*(?:국적:|출생:|최근작|이 저자의)/),
    category: g(/분류\s*(.{0,60}?)\s*이름:/),
    born: g(/출생:\s*(.{0,40}?)\s*(?:최근작|이 저자의|직업:)/),
    job: g(/직업:\s*(.{0,40}?)\s*(?:최근작|이 저자의)/),
    recent: g(/최근작\s*(.{0,80}?)\s*(?:이 저자의|SNS|전체보기)/),
    total: Number(g(/이 분야에\s*(\d+)\s*개의 상품/) || 0),
  }
}

async function namesFor(slugs: string[]) {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('--slug는 DB를 읽는다. --env-file=.env로 실행한다.')
  const rows = await (await fetch(`${url}/rest/v1/celebs?slug=in.(${slugs.join(',')})&select=slug,nickname,aliases`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json()
  return rows.map((r: { slug: string; nickname: string; aliases: string[] | null }) => ({ slug: r.slug, names: [...new Set([r.nickname, ...(r.aliases ?? [])].filter(Boolean))] }))
}

if (command === 'find') {
  const targets = opt('slug') ? await namesFor(opt('slug')!.split(',')) : [{ slug: '-', names: [opt('name') ?? ''] }]
  if (!targets.length || !targets[0].names[0]) throw new Error('--slug나 --name이 필요하다.')
  for (const t of targets) {
    console.log(`\n## ${t.slug} (${t.names.join(', ')})`)
    const seen = new Set<string>()
    for (const name of t.names) {
      const html = await get(`https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Author&SearchWord=${encodeURIComponent(name)}`)
      const ids = [...new Set([...html.matchAll(/AuthorSearch=@(\d+)/g)].map((m) => m[1]))].slice(0, 5)
      for (const id of ids) {
        if (seen.has(id)) continue
        seen.add(id)
        const page = await get(pageUrl(id))
        const p = profile(page)
        const first = parseItems(page).slice(0, 3).map((x) => x.title).join(' / ')
        console.log(`  ${id.padEnd(9)} [${name}] ${p.name} | ${p.category} | ${p.born} ${p.job} | 최근작 ${p.recent} | 추천 ${p.total}${first ? ` | ${first}` : ''}`)
        await sleep(500)
      }
    }
  }
} else if (command === 'collect') {
  const author = opt('author')
  const out = opt('out')
  if (!author || !out) throw new Error('--author와 --out이 필요하다.')
  const first = await get(pageUrl(author))
  const p = profile(first)
  const items = parseItems(first)
  for (let page = 2; items.length < p.total; page++) {
    const more = parseItems(await get(pageUrl(author, page)))
    if (!more.length) break
    items.push(...more)
    await sleep(800)
  }
  if (flag('isbn')) {
    for (const item of items) {
      const html = await get(`https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=${item.itemId}`)
      item.isbn13 = (html.match(/ISBN\s*[:：]?\s*(97[89]\d{10})/) ?? html.match(/(97[89]\d{10})/) ?? [])[1]
      await sleep(1000)
    }
  }
  writeFileSync(out, JSON.stringify({ author, profile: p, source: pageUrl(author), collectedAt: new Date().toISOString(), items }, null, 1))
  console.log(`${p.name} 추천 ${items.length}/${p.total}건 → ${out}${items.length < p.total ? ' (일부만 받음, 다시 실행)' : ''}`)
} else {
  console.error('명령: find | collect. 사용법은 파일 머리말을 본다.')
  process.exit(1)
}
