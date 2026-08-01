/**
 * AI 패권 전쟁 팩션(01-AI패권전쟁) 진영별 단체샷·인물 화보를 세력도감에 채운다.
 *   - 1편(BIG-4): openai · google-deepmind · anthropic · xai
 *   - 2편(오픈 프론티어): ai-pioneers · meta · mistral · hugging-face · deepseek · thinking-machines · ssi
 *   - 단체샷 → celeb_tags.team_images (상단 배너)
 *   - 인물 전용 화보 → celeb_tag_assignments.faction_image_url
 *   - 파일명이 인물명과 다른 진영은 personFiles로 명시 매핑
 *   - 점증 업로드: 이미 채워진 팀/인물은 건너뜀 (재실행 안전)
 *   - _logo·보관/복사본/번호변형 파일은 제외
 *
 * 실행: sw/web-bo 에서  node --env-file=.env --import tsx scripts/fill-faction-llm.ts
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

// --force: 인물 전용 화보를 이미 있어도 폴더값으로 강제 재업로드(덮어쓰기). 단체화보는 항상 점증.
const FORCE_PERSON = process.argv.includes('--force')

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

const FACTION_ROOT = resolve(process.cwd(), '../remotion/public/factions/01-AI패권전쟁')

// 팀별 설정: slug + 폴더 + 단체샷 파일(순서) + (선택) 인물 파일 명시 매핑
// personFiles: 파일명이 DB nickname과 다른 진영(영어·숫자 파일명)에만 지정. 없으면 파일명=nickname 자동 매칭.
const TEAMS: { slug: string; dir: string; teamFiles: string[]; personFiles?: Record<string, string> }[] = [
  // ── 1편 BIG-4 (이미 업로드 완료 — 점증 로직으로 건너뜀) ──
  { slug: 'openai', dir: '03-openai', teamFiles: ['_group.png'] },
  { slug: 'google-deepmind', dir: '02-google-deepmind', teamFiles: ['_deepmind.png', '_founders.png'] },
  { slug: 'anthropic', dir: '04-anthropic', teamFiles: ['_group.png', '_founders.png', '_hires.png'] },
  { slug: 'xai', dir: '05-xai', teamFiles: ['_group.png'] },
  // ── 2편 오픈 프론티어 ──
  {
    slug: 'ai-pioneers', dir: '01-pioneers',
    teamFiles: ['ai_origin_group_shot.png', 'ai_masters_group_shot_same_depth.png'],
    personFiles: {
      '앨런 튜링': 'origin_solo_turing_v3.png',
      '존 매카시': 'origin_solo_mccarthy.png',
      '제프리 힌턴': 'masters_solo_hinton.png',
      '요슈아 벤지오': 'masters_solo_bengio.png',
      '얀 르쿤': 'masters_solo_lecun_v3.png',
    },
  },
  { slug: 'meta', dir: '06-meta', teamFiles: ['_group.png'] }, // 인물 파일명=nickname 자동
  {
    slug: 'mistral', dir: '07-mistral', teamFiles: ['0.png'],
    personFiles: {
      '아르투르 멘쉬': '1.png',
      '기욤 람플': '2.png',
      '티모테 라크루아': '3.png',
    },
  },
  { slug: 'hugging-face', dir: '08-huggingface', teamFiles: ['_group.png'] }, // 자동
  { slug: 'deepseek', dir: '10-china', teamFiles: ['_duo.png'] }, // 자동(량원펑·뤄푸리)
  {
    slug: 'thinking-machines', dir: '11-tml', teamFiles: ['tml_group_shot.png'],
    personFiles: {
      '미라 무라티': 'tml_solo_murati.png',
      '존 슐만': 'tml_solo_schulman.png',
    },
  },
  { slug: 'ssi', dir: '10-ssi', teamFiles: ['_group.png'] }, // 자동(일리야 수츠케버·다니엘 레비)
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
    CacheControl: 'public, max-age=31536000, immutable',
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

    // 태그 + 배정 인물 조회 (기존 team_images / faction_image_url 포함 — 점증 업로드)
    const { data: tag } = await supabase.from('celeb_tags').select('id, team_images').eq('slug', team.slug).single()
    if (!tag) { console.log('  태그 없음 — 건너뜀'); continue }
    const { data: assigns } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, faction_image_url, profiles!celeb_tag_assignments_celeb_id_fkey(nickname)')
      .eq('tag_id', tag.id)
    const people = (assigns ?? []).map((a) => ({
      celeb_id: a.celeb_id,
      nickname: (a.profiles as unknown as { nickname: string }).nickname,
      hasImage: !!a.faction_image_url,
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
        const url = await upload(`faction/${tag.id}/team/${randomUUID()}.webp`, await toWebp(p))
        teamUrls.push(url)
        console.log(`  [단체] ${f} → 업로드`)
      }
      if (teamUrls.length) {
        await supabase.from('celeb_tags').update({ team_images: teamUrls, updated_at: new Date().toISOString() }).eq('id', tag.id)
      }
    }

    // 2) 인물 화보 → faction_image_url (이미 있으면 건너뜀)
    //    personFiles 명시 매핑 우선, 없으면 파일명=nickname 자동 매칭
    const fileMap = team.personFiles
      ? Object.fromEntries(Object.entries(team.personFiles).map(([nick, f]) => [nick, resolve(dir, f)]))
      : personFileMap(dir)
    for (const person of people) {
      if (person.hasImage && !FORCE_PERSON) continue
      const path = fileMap[person.nickname]
      if (!path) { console.log(`  [인물] 파일 없음: ${person.nickname}`); continue }
      const url = await upload(`faction/${tag.id}/celeb-${person.celeb_id}.webp`, await toWebp(path))
      await supabase.from('celeb_tag_assignments')
        .update({ faction_image_url: url }).eq('tag_id', tag.id).eq('celeb_id', person.celeb_id)
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
