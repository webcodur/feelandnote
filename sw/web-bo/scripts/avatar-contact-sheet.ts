/**
 * ⚠️ 옛 도구다. 새 작업에는 `build-avatar-contact-sheet.ts` 를 쓴다.
 *
 * 차이: 새 도구는 규격 기준선(눈높이·턱끝·중심축)을 겹쳐 그리고, 그 수치를
 * `src/lib/avatar-geometry.ts` 의 AVATAR_SPEC 에서 가져온다. 칸 번호 ↔ 인물 대응표도 함께 낸다.
 * 이 파일은 기준선 없이 격자만 만들며 규격을 참조하지 않는다.
 * 검수 절차는 `docs/project/celeb/celeb-avatar-spec.md` §5.2 를 따른다.
 *
 * ── 이하 원문 ──
 * 아바타 검수 보조 — 지정한 slug들의 아바타를 격자 한 장으로 합성한다.
 *
 * 읽기 전용. 사람이 한눈에 훑어 불량을 가려내기 위한 도구다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/avatar-contact-sheet.ts --slugs a,b,c --out sheet.png [--cell 220] [--cols 6]
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const get = (k: string): string | undefined => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : undefined
}
const SLUGS = (get('--slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const OUT = get('--out') ?? resolve(__dirname, 'sheet.png')
const CELL = Number(get('--cell') ?? 220)
const COLS = Number(get('--cols') ?? 6)
const BACKGROUND = get('--background') ?? '#ffffff'

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const f of ['.env.local', '.env']) {
    const p = resolve(__dirname, '..', f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return { ...env, ...process.env } as Record<string, string>
}

async function main() {
  if (SLUGS.length === 0) throw new Error('--slugs 필요')
  const env = loadEnv()
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data, error } = await sb
    .from('celebs')
    .select('slug, avatar_url')
    .in('slug', SLUGS)
  if (error) throw new Error(error.message)

  const bySlug = new Map((data ?? []).map((r) => [r.slug as string, r.avatar_url as string]))
  const rows = Math.ceil(SLUGS.length / COLS)
  const LABEL = 26
  const W = COLS * CELL
  const H = rows * (CELL + LABEL)

  const composites: sharp.OverlayOptions[] = []
  for (let i = 0; i < SLUGS.length; i++) {
    const slug = SLUGS[i]
    const url = bySlug.get(slug)
    const cx = (i % COLS) * CELL
    const cy = Math.floor(i / COLS) * (CELL + LABEL)
    if (url) {
      try {
        const res = await fetch(url)
        const buf = Buffer.from(await res.arrayBuffer())
        const img = await sharp(buf)
          .flatten({ background: BACKGROUND })
          .resize(CELL, CELL, { fit: 'cover' })
          .png()
          .toBuffer()
        composites.push({ input: img, left: cx, top: cy })
      } catch {
        /* 실패한 칸은 비워 둔다 */
      }
    }
    const label = Buffer.from(
      `<svg width="${CELL}" height="${LABEL}"><rect width="${CELL}" height="${LABEL}" fill="#111"/><text x="6" y="18" font-family="sans-serif" font-size="15" fill="#fff">${i + 1}. ${slug}</text></svg>`
    )
    composites.push({ input: label, left: cx, top: cy + CELL })
  }

  await sharp({
    create: { width: W, height: H, channels: 3, background: '#333' },
  })
    .composite(composites)
    .png()
    .toFile(OUT)
  console.log(`시트 저장: ${OUT} (${SLUGS.length}명, ${W}x${H})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
