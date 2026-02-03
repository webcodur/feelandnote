import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { generateCelebProfileWithInfluence, generateCelebPhilosophy } from '@feelandnote/ai-services/celeb-profile'
import dotenv from 'dotenv'

// .env 로드 (API Key 확인용)
dotenv.config({ path: '../web/.env' })
dotenv.config({ path: '.env' }) // 우선순위 높음

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wouqtpvfctednlffross.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// 입력 폴더: 바탕 화면 경로 하드코딩 (사용자 환경)
const BASE_DIR = 'C:/Users/webco/바탕 화면/윤시준/PRJ/feelandnote'
const INPUT_DIR = path.join(BASE_DIR, '인물/no')
const PORTRAIT_WIDTH = 675
const PORTRAIT_HEIGHT = 1200

// 이미지 처리 함수 (seed-portraits.mjs 재사용)
async function processImage(imagePath) {
  const image = sharp(imagePath)
  const metadata = await image.metadata()

  const originalWidth = metadata.width
  const originalHeight = metadata.height
  const targetRatio = PORTRAIT_WIDTH / PORTRAIT_HEIGHT // 9:16
  const originalRatio = originalWidth / originalHeight

  let extractWidth, extractHeight, left, top

  if (originalRatio > targetRatio) {
    extractHeight = originalHeight
    extractWidth = Math.round(originalHeight * targetRatio)
    left = Math.round((originalWidth - extractWidth) / 2)
    top = 0
  } else {
    extractWidth = originalWidth
    extractHeight = Math.round(originalWidth / targetRatio)
    left = 0
    top = 0
  }

  const buffer = await image
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .resize(PORTRAIT_WIDTH, PORTRAIT_HEIGHT)
    .webp({ quality: 85 })
    .toBuffer()

  return buffer
}

async function uploadPortrait(celebId, buffer) {
  const filePath = `celebs/${celebId}/portrait.webp`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, buffer, { contentType: 'image/webp', upsert: true })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return publicUrl.publicUrl
}

// 메인 함수
async function main() {
  console.log(`Scanning directory: ${INPUT_DIR}`)
  if (!fs.existsSync(INPUT_DIR)) {
    console.error('Directory not found:', INPUT_DIR)
    return
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  console.log(`Found ${files.length} images to process.`)

  let success = 0
  let failed = 0

  for (const file of files) {
    const nameFromFile = path.parse(file).name
    console.log(`\n------------------------------------------------`)
    console.log(`Processing [${nameFromFile}]...`)

    try {
      // 1. 중복 확인 (이미 존재하는지)
      // (닉네임으로 체크하거나, 여기서는 그냥 없으면 생성하는 로직)
      // 다만 동명이인 문제 등이 있을 수 있으므로 주의. 여기서는 그냥 진행.

      // 2. AI 프로필 + 영향력 생성
      console.log('  > Generating Profile & Influence...')
      const profileRes = await generateCelebProfileWithInfluence(GEMINI_API_KEY, {
        name: nameFromFile,
        description: '유명 인물' 
      })

      if (!profileRes.success || !profileRes.profile) {
        throw new Error(`Profile generation failed: ${profileRes.error}`)
      }
      const pf = profileRes.profile
      console.log(`    - Name: ${pf.fullname} (${pf.profession})`)
      console.log(`    - Rank: ${pf.influence.rank} (Score: ${pf.influence.totalScore})`)

      // 3. AI 감상 철학 생성
      console.log('  > Generating Philosophy...')
      const philoRes = await generateCelebPhilosophy(GEMINI_API_KEY, {
        name: pf.fullname || nameFromFile, // AI가 정제한 풀네임 사용 등
        description: `${pf.title}, ${pf.bio}`
      })

      if (!philoRes.success || !philoRes.philosophy) {
        throw new Error(`Philosophy generation failed: ${philoRes.error}`)
      }
      console.log('    - Philosophy generated.')

      // 4. DB Insert
      // ID 생성
      // Supabase SQL로 처리하거나, 여기서 UUID 생성해서 Insert
      // 여기서는 RPC나 supabase-js Insert 사용
      
      // UUID 생성을 위해 crypto 사용 (Node 19+ global, or import)
      const newId = crypto.randomUUID()
      const email = `celeb_${newId}@feelandnote.local`

      console.log(`  > Inserting into DB (ID: ${newId})...`)
      
      // 4-1. auth.users (Admin API 필요. 하지만 service_role로 auth.admin.createUser 사용 가능)
      // 또는 직접 INSERT (SQL RPC 권장). 여기서는 RPC 호출이 가장 확실함.
      // 하지만 RPC가 없을 수 있으므로, auth.admin 사용.
      
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password: 'dummy-password-hashtexthash',
        email_confirm: true,
        user_metadata: { role: 'user' } // service_role로 생성해도 user 메타데이터 필요할 수 있음
      })

      if (userError) {
        // 이미 존재할 수도?
        if (!userError.message.includes('already registered')) {
            throw new Error(`Auth create failed: ${userError.message}`)
        }
        console.log('    (User might already exist, skipping auth creation)')
        // 기존 ID 조회를 위해 로직 추가가 필요하지만 일단 패스 (새 ID로 생성 시도했으므로)
      }
      
      const userId = userData?.user?.id || newId // 생성이 안됐으면 에러지만..

      // *중요*: auth.admin.createUser로 만들면 ID가 자동 생성됨. 우리가 지정하려면 직접 SQL을 써야 함.
      // 여기서는 그냥 생성된 userId를 사용하기로 한다.

      // 4-2. profiles Insert
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        nickname: nameFromFile, // 파일명 우선, or pf.fullname? -> 기획상 파일명(통상명칭)이 더 나을듯
        // 하지만 pf.fullname이 더 정확할 수 있음. 질문: "이름" 컬럼은 nickname임.
        // Display Name은 nickname을 씀. -> pf.fullname(알베르트 아인슈타인) vs nameFromFile(아인슈타인)
        // 일단 AI 결과인 fullname 사용 권장, 단 파일명이 더 익숙한 경우도 있음.
        // 여기서는 파일명(nameFromFile)을 nickname으로 사용 (검색 용이성)
        // fullname 등은 bio 시작부분에 넣거나.. DB 스키마에 fullname 필드는 없음.
        profession: pf.profession,
        title: pf.title,
        nationality: pf.nationality,
        birth_date: pf.birthDate || null,
        death_date: pf.deathDate || null,
        bio: pf.bio,
        quotes: pf.quotes,
        consumption_philosophy: philoRes.philosophy,
        profile_type: 'CELEB',
        is_verified: true,
        role: 'user', // celeb이지만 role은 user (admin 아님)
        status: 'active'
      })
      if (profileError) throw new Error(`Profile insert failed: ${profileError.message}`)

      // 4-3. user_social, user_scores
      await supabase.from('user_social').upsert({ user_id: userId, influence: pf.influence.totalScore })
      await supabase.from('user_scores').upsert({ user_id: userId })

      // 4-4. celeb_influence
      const inf = pf.influence
      await supabase.from('celeb_influence').upsert({
        celeb_id: userId,
        political: inf.political.score,
        political_exp: inf.political.exp,
        strategic: inf.strategic.score,
        strategic_exp: inf.strategic.exp,
        tech: inf.tech.score,
        tech_exp: inf.tech.exp,
        social: inf.social.score,
        social_exp: inf.social.exp,
        economic: inf.economic.score,
        economic_exp: inf.economic.exp,
        cultural: inf.cultural.score,
        cultural_exp: inf.cultural.exp,
        transhistoricity: inf.transhistoricity.score,
        transhistoricity_exp: inf.transhistoricity.exp,
        total_score: inf.totalScore
      })

      // 5. Image Upload
      console.log('  > Uploading Portrait...')
      const imagePath = path.join(INPUT_DIR, file)
      const buffer = await processImage(imagePath)
      const publicUrl = await uploadPortrait(userId, buffer)
      
      // Update profile with image url
      await supabase.from('profiles').update({ portrait_url: publicUrl }).eq('id', userId)

      console.log(`  [Done] Created ${nameFromFile} (ID: ${userId})`)
      success++

    } catch (err) {
      console.error(`  [Failed] ${nameFromFile}: ${err.message}`)
      failed++
    }
  }

  console.log(`\nBatch Complete: ${success} success, ${failed} failed`)
}

main()
