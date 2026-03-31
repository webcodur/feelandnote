/**
 * BookRecommend 이미지 생성 — fal.ai Flux / Gemini Imagen
 *
 * 사용법:
 *   pnpm tsx scripts/image/generate-images.ts --episode elon-musk
 *   pnpm tsx scripts/image/generate-images.ts --episode elon-musk --gemini       # Gemini Imagen 3 (유료)
 *   pnpm tsx scripts/image/generate-images.ts --episode elon-musk --dry          # 프롬프트만 확인
 *   pnpm tsx scripts/image/generate-images.ts --episode elon-musk --only 1-1     # 특정 이미지만
 *   pnpm tsx scripts/image/generate-images.ts --episode elon-musk --force        # 기존 파일 덮어쓰기
 *
 * 출력: public/episodes/{person}/images/{i}-{1|2}.jpg
 */

import 'dotenv/config'
import { fal } from '@fal-ai/client'
import { GoogleGenAI } from '@google/genai'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath } from '../lib/episode.js'

// CLI
const args = process.argv.slice(2)
const flag = (name: string) => {
  const idx = args.indexOf(`--${name}`)
  return idx >= 0 ? args[idx + 1] : undefined
}
const EPISODE = flag('episode') ?? 'elon-musk'
const ONLY = flag('only') ?? null           // "1-1" 또는 "1"
const DRY = args.includes('--dry')
const FORCE = args.includes('--force')
const USE_GEMINI = args.includes('--gemini')

// fal.ai
fal.config({ credentials: process.env.FAL_KEY })

// Gemini Imagen
const geminiAi = USE_GEMINI
  ? new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY_PAID1! })
  : null

const SLOTS = ['1', '2'] as const

async function generateImageFal(prompt: string): Promise<Buffer> {
  const model = process.argv.includes('--pro') ? 'fal-ai/flux-pro/v1.1'
    : process.argv.includes('--schnell') ? 'fal-ai/flux/schnell'
    : 'fal-ai/flux/dev'
  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
    },
  }) as { data: { images: Array<{ url: string }> } }

  const imageUrl = result.data.images[0].url
  const resp = await fetch(imageUrl)
  return Buffer.from(await resp.arrayBuffer())
}

async function generateImageGemini(prompt: string): Promise<Buffer> {
  if (!geminiAi) throw new Error('Gemini 미초기화')
  const response = await geminiAi.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '16:9',
    },
  })
  const img = response.generatedImages?.[0]
  if (!img?.image?.imageBytes) throw new Error('Gemini 이미지 응답 없음')
  return Buffer.from(img.image.imageBytes, 'base64')
}

async function generateImage(prompt: string): Promise<Buffer> {
  return USE_GEMINI ? generateImageGemini(prompt) : generateImageFal(prompt)
}


async function main() {
  // 에피소드 JSON 확인
  const epPath = resolveEpisodePath(EPISODE)
  if (!existsSync(epPath)) {
    console.error(`에피소드 없음: ${epPath}`)
    process.exit(1)
  }
  const script = JSON.parse(await readFile(epPath, 'utf-8'))

  // 에피소드 JSON의 books[].imagePrompts에서 직접 읽기
  const STYLE = 'hyperrealistic photograph, cinematic lighting, dark moody atmosphere, shot on ARRI Alexa, shallow depth of field, no text, no letters, no words, no writing, 16:9 widescreen'
  const { person: epPerson } = parseEpName(EPISODE)
  const outDir = path.join(findEpisodeDir(epPerson), 'images')
  await mkdir(outDir, { recursive: true })

  console.log(`\n=== 이미지 생성: ${EPISODE} (${script.books.length}권 × ${SLOTS.length}장) ===`)
  console.log(`출력: ${outDir}\n`)

  let generated = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < script.books.length; i++) {
    const book = script.books[i]
    const ip = book.imagePrompts
    if (!ip) { console.log(`  [${i + 1}] ${book.title}: imagePrompts 없음`); continue }

    const num = i + 1
    if (ONLY && !ONLY.startsWith(`${num}-`) && ONLY !== `${num}`) continue

    for (const slot of SLOTS) {
      const fileKey = `${num}-${slot}`
      if (ONLY && ONLY !== `${num}` && ONLY !== fileKey) continue

      const filename = `${fileKey}.jpg`
      const outputPath = path.join(outDir, filename)

      if (existsSync(outputPath) && !FORCE) {
        console.log(`  건너뜀: ${filename}`)
        skipped++
        continue
      }

      const entry = ip[slot as '1' | '2']
      if (!entry) { console.log(`  프롬프트 없음: ${fileKey}`); continue }

      const fullPrompt = `${entry.prompt}. ${STYLE}`

      console.log(`[${num}/${script.books.length}] ${book.title} — ${slot}`)

      if (DRY) {
        console.log(`  프롬프트: ${fullPrompt.slice(0, 150)}...`)
        console.log()
        continue
      }

      try {
        console.log(`  생성 중...`)
        const buffer = await generateImage(fullPrompt)
        await writeFile(outputPath, buffer)
        console.log(`  저장: ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`)
        generated++
      } catch (err: any) {
        console.error(`  오류: ${err.message}`)
        errors++
      }
    }
  }

  console.log(`\n완료! 생성 ${generated}장, 건너뜀 ${skipped}장${errors ? `, 오류 ${errors}건` : ''}`)
}

main().catch((err) => {
  console.error('오류:', err)
  process.exit(1)
})
