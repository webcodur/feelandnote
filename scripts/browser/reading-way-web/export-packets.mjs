// reading-way-argon.mjs의 submit()이 Argon에 첨부하는 입력 묶음을 그대로 만들어 packets/<slug>.txt로 쓴다(Aside 차단 중 Chrome 확장 경로용).
// 사용(저장소 루트): node --import tsx <이 파일> slug1,slug2 [--feedback slug=<절대경로>]
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const OUT = W + '/packets'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const { READING_WAY_KO_MAX_CHARS, READING_WAY_MAX_PARAGRAPHS } = await import(pathToFileURL(R + '/packages/shared/src/constants/celeb-reading-way.ts').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY, H = { apikey: key, Authorization: `Bearer ${key}` }
const get = async (p) => (await fetch(`${url}/rest/v1/${p}`, { headers: H })).json()
const rules = m.argonSections(await fs.readFile(R + '/docs/project/celeb/celeb-05-02-reading-way.md', 'utf8'), 'celeb-05-02-reading-way.md')
const fb = {}
for (let i = 3; i < process.argv.length; i++) if (process.argv[i] === '--feedback') { const v = process.argv[++i]; fb[v.slice(0, v.indexOf('='))] = v.slice(v.indexOf('=') + 1) }
for (const slug of process.argv[2].split(',')) {
  const [c] = await get(`celebs?slug=eq.${slug}&select=id,slug,nickname,nickname_en,gender,birth_date,death_date,profession,reading_way`)
  if (c.reading_way && !process.argv.includes('--force')) { console.log('SKIP has reading_way', slug); continue }
  const rows = await get(`celeb_contents?celeb_id=eq.${c.id}&source_url=not.is.null&select=source_url,contents!inner(type)&contents.type=eq.BOOK`)
  // 서점 상품·굿리즈 리뷰는 Argon이 열지 못하므로 뺀다(26.11.10 김경일·아만 마다안).
  const store = /aladin\.co\.kr\/shop|yes24\.com\/[Pp]roduct|kyobobook|goodreads\.com\/review|amazon\.|coupang/
  const sources = [...new Set(rows.map((r) => r.source_url).filter((u) => u && /^https?:\/\//.test(u) && !store.test(u)))].sort().slice(0, 5)
  const links = sources.slice(0, 5)
  const identity = { slug, name: c.nickname, name_en: c.nickname_en, gender: c.gender === true ? '남성' : c.gender === false ? '여성' : '미상', birth_date: c.birth_date, death_date: c.death_date, profession: c.profession }
  const revision = fb[slug] ? '\n\n' + await fs.readFile(fb[slug], 'utf8') : ''
  const task = '위 링크를 직접 읽고 필요한 추가 조사도 직접 해서 이 인물의 한국어 독서 방식 글을 완성해주세요.'
  const contract = `{"slug":${JSON.stringify(slug)},"ko":"완성 한국어 본문"}`
  const packet = `인물: ${JSON.stringify(identity)}\n참조 링크: ${JSON.stringify(links)}\n\n${rules}${revision}\n\n${task}\n한국어 본문은 공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하로 작성해주세요.\n응답은 JSON 코드 블록 하나로 주세요: ${contract}. 조사 결과 본문을 쓸 수 없으면 ko를 빈 문자열로 주세요.`
  await fs.writeFile(`${OUT}/${slug}.txt`, packet, 'utf8')
  console.log(slug, packet.length, 'links', links.length)
}
