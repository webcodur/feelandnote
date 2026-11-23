// 제목 접두로 BOOK 작품을 찾아 연결 인물 수 순으로 보이고 ko·en 행(제목·ISBN)을 함께 출력한다. 책장 보완 때 기존 작품부터 찾는 데 쓴다.
// 사용(저장소 루트): node --import tsx <이 파일> "<제목 접두>" [저자 일부]
import { R } from './paths.mjs'
process.loadEnvFile(R + '/sw/web-bo/.env')
const u = process.env.NEXT_PUBLIC_DB_API_URL, k = process.env.DB_SECRET_KEY, H = { apikey: k, Authorization: 'Bearer ' + k }
const [title, author = ''] = process.argv.slice(2)
const rows = await (await fetch(`${u}/rest/v1/content_locales?title=ilike.${encodeURIComponent(title + '*')}&select=content_id,title,creator,contents!inner(type)&contents.type=eq.BOOK&limit=60`, { headers: H })).json()
const out = []
for (const id of [...new Set(rows.filter((x) => !author || (x.creator || '').includes(author)).map((x) => x.content_id))]) {
  const c = await fetch(`${u}/rest/v1/celeb_contents?content_id=eq.${id}&select=celeb_id`, { headers: { ...H, Prefer: 'count=exact' } })
  const l = await (await fetch(`${u}/rest/v1/content_locales?content_id=eq.${id}&select=locale,title,isbn`, { headers: H })).json()
  out.push([+c.headers.get('content-range').split('/')[1], id, l.map((x) => `${x.locale}:${x.title}${x.isbn ? '(' + x.isbn + ')' : ''}`).join(' | ')])
}
out.sort((x, y) => y[0] - x[0])
for (const o of out.slice(0, 6)) console.log(o.join('  '))
