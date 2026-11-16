/**
 * 기관 로고에서 팔레트를 뽑아 curators.logo_palette에 넣는다
 *
 * 로고(logo_url)를 내려받아 512px 표본으로 맞춘 뒤(128px로 줄이면 가는 흰 선이 섞여 종이 바탕 판정이 흔들린다) 유채색을 24단계로 묶어 비중 상위 3색을 고른다.
 * 흰 픽셀이 불투명 영역의 30%를 넘으면 종이 바탕(paper), 아니면 투명(transparent)으로 본다.
 * 강조색은 대표색이 어두우면 밝기를 0.6으로 올려 다크 화면에서 읽히게 한다.
 * dark(검은 바탕)·original(배색 완성)·monochrome은 자동 판정하지 않는다 — 그런 로고는 dry 결과를 보고 손으로 고친다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/logo-palette.ts <기관 slug>...           # 계산만
 *   npx tsx scripts/curated/logo-palette.ts <기관 slug>... --apply   # DB에 쓴다
 *   npx tsx scripts/curated/logo-palette.ts --missing [--apply]      # 팔레트가 빈 기관 전부
 */
import { createClient } from '@feelandnote/db'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { boPath } from '../lib/paths'

for (const raw of readFileSync(boPath('.env'), 'utf8').split(/\r?\n/)) {
  const m = raw.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

type Rgb = [number, number, number]
const hex = (c: Rgb) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
function hsl([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2, d = mx - mn
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) h = (mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60
  return [h < 0 ? h + 360 : h, s, l]
}
function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return hex([r, g, b].map((v) => Math.round((v + m) * 255)) as Rgb)
}

export async function paletteFromImage(buf: Buffer) {
  const { data } = await sharp(buf).ensureAlpha()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw().toBuffer({ resolveWithObject: true })
  const q = (v: number) => Math.min(240, Math.round(v / 24) * 24)
  const bins = new Map<string, number>()
  let opaque = 0, white = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    opaque++
    const rgb: Rgb = [data[i], data[i + 1], data[i + 2]]
    const [, s, l] = hsl(rgb)
    if (l > 0.9) white++
    if (s < 0.2 || l < 0.1 || l > 0.92) continue
    const k = hex(rgb.map(q) as Rgb)
    bins.set(k, (bins.get(k) ?? 0) + 1)
  }
  const colors = [...bins].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([h, n]) => ({ hex: h, weight: Math.round((n / opaque) * 1000) / 1000 }))
  const top = colors[0]?.hex
  let accent = '#c4bdad'
  if (top) {
    const [h, s, l] = hsl([1, 3, 5].map((i) => parseInt(top.slice(i, i + 2), 16)) as Rgb)
    accent = l < 0.55 ? fromHsl(h, Math.min(s, 0.75), 0.6) : top
  }
  return {
    treatment: opaque && white / opaque > 0.3 ? 'paper' : 'transparent',
    monochrome: colors.length === 0,
    colors,
    accent,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
  const slugs = args.filter((a) => !a.startsWith('--'))
  let query = db.from('curators').select('slug,logo_url,logo_palette')
  query = args.includes('--missing') ? query.is('logo_palette', null) : query.in('slug', slugs)
  const { data, error } = await query
  if (error) throw error
  if (!data?.length) return console.log('대상 기관 없음')
  for (const c of data) {
    if (!c.logo_url) { console.log(`건너뜀 ${c.slug} — logo_url 없음`); continue }
    const url = c.logo_url.startsWith('/') ? `https://feelandnote.com${c.logo_url}` : c.logo_url
    const res = await fetch(url)
    if (!res.ok) { console.log(`건너뜀 ${c.slug} — 로고 ${res.status}`); continue }
    const palette = await paletteFromImage(Buffer.from(await res.arrayBuffer()))
    console.log(`${c.slug}\t${JSON.stringify(palette)}`)
    if (apply) {
      const { error: e } = await db.from('curators').update({ logo_palette: palette }).eq('slug', c.slug)
      if (e) throw e
    }
  }
  if (!apply) console.log('\n[점검만] DB에 쓰려면 --apply')
}

main().catch((e) => { console.error(e); process.exit(1) })
