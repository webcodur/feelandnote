/**
 * LLM 팩션(01-llm) 4팀의 단체샷·인물 화보를 스포트라이트에 채운다.
 *   - 단체샷(_group/_deepmind/_founders/_hires) → celeb_tags.team_images (상단 배너)
 *   - 인물 전용 화보(인물명.png) → celeb_tag_assignments.spotlight_image_url
 *   - _step*(미완성 마네킹)·_logo·보관/복사본/번호변형 파일은 제외
 *
 * 실행: sw/web-bo 에서  node --env-file=.env --import tsx scripts/fill-spotlight-llm.ts
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

// ── .env 직접 로드 (--env-file 미사용 환경 대비) ──
function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
const BUCKET = process.env.R2_BUCKET_NAME!
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const FACTION_ROOT = resolve(process.cwd(), '../remotion/public/factions/01-llm')

// 팀별 설정: slug + 폴더 + 단체샷 파일(순서)
const TEAMS: { slug: string; dir: string; teamFiles: string[] }[] = [
  { slug: 'openai', dir: '03-openai', teamFiles: ['_group.png'] },
  { slug: 'google-deepmind', dir: '02-google-deepmind', teamFiles: ['_deepmind.png', '_founders.png'] },
  { slug: 'anthropic', dir: '04-anthropic', teamFiles: ['_group.png', '_founders.png', '_hires.png'] },
  { slug: 'xai', dir: '05-xai', teamFiles: ['_group.png'] },
]

// 파일명 표기 → DB nickname 보정
const ALIAS: Record<string, string> = {
  '피터 스타인버그': '피터 스타인버거',
  '제이슨 긴스버그': '제이슨 긴즈버그',
  '안드레이 카파시': '안드레 카파시',
}

async function toWebp(path: string): Promise<Buffer> {
  return sharp(path).resize(1080, 1080, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer()
}

async function upload(key: string, body: Buffer): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: 'image/webp',
    CacheControl: 'no-cache, must-revalidate',
  }))
  return `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
}

// 인물 파일만 추려 nickname → 경로 맵
function personFileMap(dir: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.png')) continue
    if (f.startsWith('_')) continue            // 단체샷·로고
    if (f.startsWith('보관') || /복사본/.test(f)) continue   // 보관본
    if (/ \d+\.png$/.test(f)) continue          // " 2", " 3" 변형
    const nick = f.replace(/\.png$/, '').trim()
    map[ALIAS[nick] ?? nick] = resolve(dir, f)
  }
  return map
}

async function run() {
  for (const team of TEAMS) {
    const dir = resolve(FACTION_ROOT, team.dir)
    console.log(`\n=== ${team.slug} (${team.dir}) ===`)

    // 태그 + 배정 인물 조회 (기존 team_images / spotlight_image_url 포함 — 점증 업로드)
    const { data: tag } = await supabase.from('celeb_tags').select('id, team_images').eq('slug', team.slug).single()
    if (!tag) { console.log('  태그 없음 — 건너뜀'); continue }
    const { data: assigns } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, spotlight_image_url, profiles!celeb_tag_assignments_celeb_id_fkey(nickname)')
      .eq('tag_id', tag.id)
    const people = (assigns ?? []).map((a) => ({
      celeb_id: a.celeb_id,
      nickname: (a.profiles as unknown as { nickname: string }).nickname,
      hasImage: !!a.spotlight_image_url,
    }))

    // 1) 단체샷 → team_images (이미 있으면 건너뜀)
    const existingTeam = Array.isArray(tag.team_images) ? tag.team_images : []
    if (existingTeam.length > 0) {
      console.log(`  [단체] 이미 ${existingTeam.length}장 존재 — 건너뜀`)
    } else {
      const teamUrls: string[] = []
      for (const f of team.teamFiles) {
        const p = resolve(dir, f)
        if (!existsSync(p)) { console.log(`  [단체] 누락: ${f}`); continue }
        const url = await upload(`spotlight/${tag.id}/team/${randomUUID()}.webp`, await toWebp(p))
        teamUrls.push(url)
        console.log(`  [단체] ${f} → 업로드`)
      }
      if (teamUrls.length) {
        await supabase.from('celeb_tags').update({ team_images: teamUrls, updated_at: new Date().toISOString() }).eq('id', tag.id)
      }
    }

    // 2) 인물 화보 → spotlight_image_url (이미 있으면 건너뜀)
    const fileMap = personFileMap(dir)
    for (const person of people) {
      if (person.hasImage) continue
      const path = fileMap[person.nickname]
      if (!path) { console.log(`  [인물] 파일 없음: ${person.nickname}`); continue }
      const url = await upload(`spotlight/${tag.id}/celeb-${person.celeb_id}.webp`, await toWebp(path))
      await supabase.from('celeb_tag_assignments')
        .update({ spotlight_image_url: url }).eq('tag_id', tag.id).eq('celeb_id', person.celeb_id)
      console.log(`  [인물] ${person.nickname} → 업로드`)
    }
  }

  // 캐시 무효화
  const secret = process.env.CRON_SECRET
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  if (secret) {
    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'celebs', secret }),
      })
      console.log(`\n캐시 무효화: ${res.status}`)
    } catch { console.log('\n캐시 무효화 실패 — 자동 갱신 대기') }
  }
  console.log('\n완료.')
}

run().catch((e) => { console.error(e); process.exit(1) })
