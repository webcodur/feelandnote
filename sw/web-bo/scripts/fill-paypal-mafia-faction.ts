/**
 * 페이팔 마피아 세력도감 이미지 채우기.
 * 세력도(faction) 영상용 인물 개인샷 → 세력도감 전용 화보(spotlight_image_url),
 * 진영 단체샷 → 세력도감 상단 단체 배너(team_images)로 옮긴다.
 * 정사각 1024 원본 → 1080 webp 변환 후 R2 업로드.
 *
 * 실행: sw/web-bo 에서  node --env-file=.env --import tsx scripts/fill-paypal-mafia-faction.ts
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const TAG_ID = 'e4a87099-b467-4d2d-a7d8-77e7e16aeb87'
const FACTION_ROOT = resolve(process.cwd(), '../remotion/public/factions/02-페이팔마피아')

const CELEBS = [
  // 마피아 본가
  { id: 'fbdf6dda-c4cd-416d-8a9b-a2a5fc7d30e1', name: '피터 틸', file: '01-the-dons/peter-thiel_1.png' },
  { id: 'c8ac8c9d-c229-4570-ad5f-0b68a59153c0', name: '일론 머스크', file: '01-the-dons/elon-musk_1.png' },
  { id: '703ab957-8a6d-41b2-955f-9b957029e152', name: '맥스 레브친', file: '01-the-dons/max-levchin_1.png' },
  // 유튜브 제국
  { id: '4386088a-d061-46e7-b3a0-6bdc3911c1d9', name: '스티브 첸', file: '02-media-empire/steve-chen_1.png' },
  { id: 'e8c50145-ccf6-4440-8ee8-1580626f29be', name: '채드 헐리', file: '02-media-empire/chad-hurley_1.png' },
  { id: '722ef671-9203-4978-a2d9-617438695e06', name: '자베드 카림', file: '02-media-empire/jawed_karim_1.png' },
  // 소셜 제국
  { id: '66b5640e-e37a-40cd-aece-56bf6e6cf638', name: '리드 호프먼', file: '03-social-empire/reid-hoffman_1.png' },
  { id: 'ef117e5d-e66c-433b-bc40-1874ee7b5f0b', name: '제레미 스토플먼', file: '03-social-empire/jeremy-stoppelman_1.png' },
  { id: 'f0c9450b-9423-48a7-bf9e-14204f5fd67a', name: '러셀 시몬스', file: '03-social-empire/russel-simmons.png' },
  // 킹메이커
  { id: 'f61f1bc5-1a34-4c21-b22d-ca65c406ef7e', name: '로엘로프 보타', file: '04-kingmakers/roelof-botha_1.png' },
  { id: 'e8b962ac-f0de-482c-a994-130be4ce8bfc', name: '키스 라보이스', file: '04-kingmakers/keith-rabois_1.png' },
  { id: 'de012c28-ba65-499d-abf6-5c7200ad6013', name: '데이비드 색스', file: '04-kingmakers/david-sacks_1.png' },
  { id: '87be84f8-e19c-4995-b3d8-18a934e9ad47', name: '켄 하워리', file: '04-kingmakers/ken-howery_1.png' },
  { id: 'cc7309e1-aa46-4b04-b424-897892246ac3', name: '루크 노섹', file: '04-kingmakers/luke-nosek_1.png' },
]

const TEAM = [
  '01-the-dons/_group.png',
  '02-media-empire/_group.png',
  '03-social-empire/_group.png',
  '04-kingmakers/_group.png',
]

async function toWebp(path: string): Promise<Buffer> {
  return sharp(readFileSync(path)).resize(1080, 1080, { fit: 'cover' }).webp({ quality: 88 }).toBuffer()
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  })
  const Bucket = process.env.R2_BUCKET_NAME!

  // 1) 개인 화보
  for (const c of CELEBS) {
    const path = resolve(FACTION_ROOT, c.file)
    if (!existsSync(path)) { console.log(`  파일 없음: ${c.name} (${c.file})`); continue }
    const body = await toWebp(path)
    const key = `spotlight/${TAG_ID}/celeb-${c.id}.webp`
    await r2.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }))
    const url = `${R2_PUBLIC_URL}/${key}?v=${Date.now()}`
    const { error } = await supabase.from('celeb_tag_assignments').update({ spotlight_image_url: url }).eq('tag_id', TAG_ID).eq('celeb_id', c.id)
    console.log(`  ${c.name} → 화보 등록${error ? ' [DB오류:' + error.message + ']' : ''}`)
  }

  // 2) 단체 배너
  const teamUrls: string[] = []
  for (const [i, rel] of TEAM.entries()) {
    const path = resolve(FACTION_ROOT, rel)
    if (!existsSync(path)) { console.log(`  단체샷 없음: ${rel}`); continue }
    const body = await toWebp(path)
    const key = `spotlight/${TAG_ID}/team/${i}.webp`
    await r2.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable' }))
    teamUrls.push(`${R2_PUBLIC_URL}/${key}`)
    console.log(`  단체샷 업로드: ${rel}`)
  }
  if (teamUrls.length) {
    const { error } = await supabase.from('celeb_tags').update({ team_images: teamUrls }).eq('id', TAG_ID)
    console.log(`  단체 배너 ${teamUrls.length}장 등록${error ? ' [DB오류:' + error.message + ']' : ''}`)
  }

  // 3) 캐시 무효화
  const secret = process.env.CRON_SECRET
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  if (secret) {
    try {
      const res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'celebs', secret }),
      })
      console.log(`캐시 무효화: ${res.status}`)
    } catch { console.log('캐시 무효화 실패') }
  }
  console.log('완료.')
}

main().catch((e) => { console.error(e); process.exit(1) })
