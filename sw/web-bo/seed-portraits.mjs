import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://wouqtpvfctednlffross.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdXF0cHZmY3RlZG5sZmZyb3NzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTI0MTE0MSwiZXhwIjoyMDQ2ODE3MTQxfQ.VKrNmhyxKOl3ZLSlNt6_3GSI3s2m3dLvpbHqbLuGOzM'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TEMP_DIR = 'c:/Users/webco/바탕 화면/윤시준/PRJ/feelandnote/temp'
const PORTRAIT_WIDTH = 675
const PORTRAIT_HEIGHT = 1200

// 영문명을 한국어로 매핑
const NAME_MAP = {
  'J.K. Rowling': 'J.K. 롤링',
  'Joe Rogan': '조 로건',
  'Malcolm Gladwell': '말콤 글래드웰',
  'Sam Altman': '샘 알트먼',
  'Sam Harris': '샘 해리스',
  'Stephen King': '스티븐 킹'
}

async function processImage(imagePath) {
  const image = sharp(imagePath)
  const metadata = await image.metadata()

  const originalWidth = metadata.width
  const originalHeight = metadata.height
  const targetRatio = PORTRAIT_WIDTH / PORTRAIT_HEIGHT // 9:16
  const originalRatio = originalWidth / originalHeight

  let extractWidth, extractHeight, left, top

  if (originalRatio > targetRatio) {
    // 이미지가 더 넓음 → 가로 중앙 크롭
    extractHeight = originalHeight
    extractWidth = Math.round(originalHeight * targetRatio)
    left = Math.round((originalWidth - extractWidth) / 2)
    top = 0
  } else {
    // 이미지가 더 좁거나 같음 → 세로 상단 크롭
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
    .upload(filePath, buffer, {
      contentType: 'image/webp',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  return publicUrl.publicUrl
}

async function main() {
  // 모든 셀럽 가져오기
  const { data: celebs, error } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('is_celeb', true)

  if (error) {
    console.error('Failed to fetch celebs:', error)
    return
  }

  console.log(`Found ${celebs.length} celebs`)

  // temp 폴더 이미지 파일 목록
  const files = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.png'))

  let success = 0
  let failed = 0

  for (const file of files) {
    // UUID 형식 파일은 스킵
    if (file.match(/^[0-9a-f-]{36}\.png$/i)) {
      console.log(`Skipping UUID file: ${file}`)
      continue
    }

    const nameFromFile = file.replace('.png', '')
    const nickname = NAME_MAP[nameFromFile] || nameFromFile

    const celeb = celebs.find(c => c.nickname === nickname)
    if (!celeb) {
      console.log(`Celeb not found: ${nickname}`)
      failed++
      continue
    }

    const imagePath = path.join(TEMP_DIR, file)

    try {
      console.log(`Processing: ${nickname}...`)
      const buffer = await processImage(imagePath)
      const url = await uploadPortrait(celeb.id, buffer)

      // profile 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ portrait_url: url })
        .eq('id', celeb.id)

      if (updateError) {
        console.log(`  Update failed: ${updateError.message}`)
        failed++
      } else {
        console.log(`  Done: ${url}`)
        success++
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`)
      failed++
    }
  }

  console.log(`\nComplete: ${success} success, ${failed} failed`)
}

main()
