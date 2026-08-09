/**
 * 아바타 검수용 격자 이미지 생성기
 *
 * 등록된 아바타를 내려받아 규격 기준선을 겹친 격자 그림으로 묶는다.
 * AI나 사람이 한 장을 보고 30~40명을 한 번에 판정하기 위한 도구다.
 *
 * 왜 필요한가:
 *   scripts/measure-avatar-geometry.ts 는 눈·턱·중심축만 잰다.
 *   시선·고개 각도·소품·쇄골 노출·얼굴 잘림·배경·질감은 기계가 보지 못한다(SSoT §5.2).
 *   그 나머지는 이미지를 실제로 보는 수밖에 없고, 이 도구가 그 입력을 만든다.
 *
 * 규격 SSoT: docs/project/celeb-avatar-spec.md
 * 겹치는 기준선은 src/lib/avatar-geometry.ts 의 AVATAR_SPEC 에서 온다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/build-avatar-contact-sheet.ts --out <출력폴더> [옵션]
 *
 *   --limit <n>      몇 명을 볼지 (기본 36)
 *   --offset <n>     건너뛸 인원 (전수 검수를 나눠 돌 때)
 *   --slugs a,b,c    특정 인물만
 *   --slugs-file <경로>  slug 를 줄 단위로 적은 파일. 명단이 길 때 쓴다
 *   --seed <문자열>  무작위 표본의 순서를 정하는 값. 같은 값이면 같은 표본이 나온다
 *   --cols <n>       가로 칸 수 (기본 6)
 *   --cell <px>      칸 한 변 (기본 220)
 *   --no-guides      기준선을 겹치지 않는다
 *
 * 출력:
 *   <출력폴더>/sheet-001.png ...   격자 그림
 *   <출력폴더>/sheet-index.json    칸 번호 ↔ 인물 대응표. 판정 결과를 이 slug로 돌려준다
 *
 * 판정하는 법은 SSoT §5.2·§5.3 을 따른다. 특히 기계가 못 보는 것들을 본다.
 */
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { AVATAR_SPEC } from '../src/lib/avatar-geometry'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BO = resolve(__dirname, '..')

function loadEnv() {
  const p = join(BO, '.env')
  if (!existsSync(p)) throw new Error(`.env 없음: ${p}`)
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

interface Person {
  slug: string
  nickname: string
  avatar_url: string
}

async function fetchTargets(): Promise<Person[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')
  const db = createClient(url, key)

  const slugsFile = arg('slugs-file')
  const slugs = slugsFile
    ? readFileSync(slugsFile, 'utf-8').split('\n').map((s) => s.trim()).filter(Boolean)
    : arg('slugs')?.split(',').map((s) => s.trim()).filter(Boolean)
  let q = db
    .from('celebs')
    .select('slug, nickname, avatar_url')
    .eq('publication_status', 'active')
    .not('avatar_url', 'is', null)

  if (slugs?.length) q = q.in('slug', slugs)

  const { data, error } = await q
  if (error) throw new Error(`DB 조회 실패: ${error.message}`)
  let rows = (data ?? []) as Person[]

  if (slugs?.length) {
    // 명단 순서를 그대로 지킨다. 판정 결과를 원래 명단과 대조하기 쉬워진다.
    const order = new Map(slugs.map((s, i) => [s, i]))
    rows.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
    const offset = Number(arg('offset') ?? 0)
    const limit = arg('limit') ? Number(arg('limit')) : rows.length
    rows = rows.slice(offset, offset + limit)
  } else {
    // 같은 seed면 같은 표본이 나오도록 slug 기준으로 안정 정렬한다.
    const seed = arg('seed') ?? 'contact-sheet'
    rows.sort((a, b) => hash(a.slug + seed) - hash(b.slug + seed))
    const offset = Number(arg('offset') ?? 0)
    const limit = Number(arg('limit') ?? 36)
    rows = rows.slice(offset, offset + limit)
  }
  return rows
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function guideSvg(cell: number, label: number, text: string): Buffer {
  const y = (r: number) => label + cell * r
  const line = (r: number, color: string) =>
    `<line x1="0" y1="${y(r)}" x2="${cell}" y2="${y(r)}" stroke="${color}" stroke-width="1" opacity="0.85"/>`
  const guides = flag('no-guides')
    ? ''
    : line(AVATAR_SPEC.eyeLine, '#ffe600') +
      line(AVATAR_SPEC.chinLine, '#ff3d00') +
      `<line x1="${cell * AVATAR_SPEC.centerX}" y1="${label}" x2="${cell * AVATAR_SPEC.centerX}" y2="${label + cell}" stroke="#ffffff" stroke-width="1" opacity="0.3"/>`
  return Buffer.from(
    `<svg width="${cell}" height="${cell + label}">` +
      `<rect x="0" y="0" width="${cell}" height="${label}" fill="#1f2933"/>` +
      `<text x="5" y="${label - 7}" font-size="13" font-family="Arial" fill="#e6edf3">${text}</text>` +
      guides +
      `</svg>`
  )
}

async function main() {
  loadEnv()
  const outDir = arg('out')
  if (!outDir) {
    console.error('사용법: npx tsx scripts/build-avatar-contact-sheet.ts --out <출력폴더> [--limit 36] [--offset 0] [--slugs a,b] [--seed x]')
    process.exit(1)
  }
  mkdirSync(outDir, { recursive: true })

  const people = await fetchTargets()
  if (!people.length) {
    console.error('대상이 없다')
    process.exit(1)
  }

  const cell = Number(arg('cell') ?? 220)
  const cols = Number(arg('cols') ?? 6)
  const label = 22
  const perSheet = cols * 6

  const index: { sheet: string; cellNo: number; slug: string; nickname: string }[] = []
  let sheetNo = 0

  for (let start = 0; start < people.length; start += perSheet) {
    const chunk = people.slice(start, start + perSheet)
    const rows = Math.ceil(chunk.length / cols)
    const composites: sharp.OverlayOptions[] = []
    sheetNo++
    const sheetName = `sheet-${String(sheetNo).padStart(3, '0')}.png`

    for (let i = 0; i < chunk.length; i++) {
      const p = chunk[i]
      const x = (i % cols) * cell
      const y = Math.floor(i / cols) * (cell + label)
      try {
        const res = await fetch(p.avatar_url)
        if (!res.ok) {
          console.warn(`  받기 실패 ${p.slug} (${res.status})`)
          continue
        }
        const img = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize(cell, cell, { fit: 'cover' })
          // 배경을 지운 이미지는 흰 바탕에서 어깨선이 안 보인다. 중간 회색을 깐다.
          .flatten({ background: '#9aa0a6' })
          .png()
          .toBuffer()
        composites.push({ input: img, left: x, top: y + label })
        composites.push({ input: guideSvg(cell, label, `${i} ${p.slug}`), left: x, top: y })
        index.push({ sheet: sheetName, cellNo: i, slug: p.slug, nickname: p.nickname })
      } catch (e) {
        console.warn(`  오류 ${p.slug}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    await sharp({
      create: { width: cell * cols, height: (cell + label) * rows, channels: 3, background: '#11151a' },
    })
      .composite(composites)
      .png()
      .toFile(join(outDir, sheetName))
    console.log(`${sheetName}  ${chunk.length}명`)
  }

  writeFileSync(join(outDir, 'sheet-index.json'), JSON.stringify(index, null, 2))
  console.log('')
  console.log(`격자 ${sheetNo}장 · 인물 ${index.length}명 → ${outDir}`)
  console.log(
    `기준선: 노랑=눈높이 ${AVATAR_SPEC.eyeLine * 100} · 주황=턱끝 ${AVATAR_SPEC.chinLine * 100} · 흰 세로=중심축 ${AVATAR_SPEC.centerX * 100}`
  )
  console.log('판정 기준은 docs/project/celeb-avatar-spec.md §5.3')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
