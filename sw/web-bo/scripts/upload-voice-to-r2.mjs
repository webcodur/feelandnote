/**
 * 셀럽 음성 파일 Cloudflare R2 업로드 스크립트
 *
 * 실행 (프로젝트 루트에서):
 *   node scripts/upload-voice-to-r2.mjs
 *
 * 소스: ~/바탕 화면/lines/{닉네임}-{한|영}/
 * 대상: R2 celebs/{id}/voice/{locale}/{type}{variant}.mp3
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// web-bo .env 파싱
function loadEnv(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
  }
  return env
}

const boEnv = loadEnv(resolve(__dirname, '..', '.env'))

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${boEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: boEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: boEnv.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = boEnv.R2_BUCKET_NAME
const PUBLIC_URL = boEnv.R2_PUBLIC_URL

// 업로드 대상 매핑
const CELEBS = [
  {
    id: 'deb5a570-a009-410d-9436-77180a85a058',
    nickname: '알렉산더 대왕',
    folders: { ko: '알렉산더 대왕-한', en: '알렉산더 대왕-영' },
  },
  {
    id: '73d5da05-cccf-47ba-bc52-5b1a39725b9b',
    nickname: '이순신',
    folders: { ko: '이순신-한', en: '이순신-영' },
  },
]

const LINES_DIR = 'C:/Users/webco/바탕 화면/lines'

async function uploadFile(localPath, r2Key) {
  const body = readFileSync(localPath)
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: body,
      ContentType: 'audio/mpeg',
    })
  )
}

async function main() {
  let total = 0
  let success = 0
  let failed = 0

  for (const celeb of CELEBS) {
    console.log(`\n[${celeb.nickname}] ${celeb.id}`)

    for (const [locale, folderName] of Object.entries(celeb.folders)) {
      const folderPath = join(LINES_DIR, folderName)
      const files = readdirSync(folderPath).filter((f) => f.endsWith('.mp3'))

      for (const file of files) {
        total++
        const localPath = join(folderPath, file)
        // quote_ko.mp3 / quote_kr.mp3 / quote_en.mp3 → quote.mp3
        const normalizedFile = file.replace(/^quote_\w+\.mp3$/, 'quote.mp3')
        const r2Key = `celebs/${celeb.id}/voice/${locale}/${normalizedFile}`

        try {
          await uploadFile(localPath, r2Key)
          success++
          process.stdout.write('.')
        } catch (err) {
          failed++
          console.error(`\n[FAIL] ${r2Key}: ${err.message}`)
        }
      }
    }
  }

  console.log(`\n\n완료: 성공 ${success} / 실패 ${failed} / 전체 ${total}`)
  console.log(`공개 URL 예시: ${PUBLIC_URL}/celebs/${CELEBS[0].id}/voice/ko/g1.mp3`)
}

main()
