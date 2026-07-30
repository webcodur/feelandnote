#!/usr/bin/env node
/*
  파일명: /scripts/generate-app-icons.mjs
  기능: PWA·Play Store 앱 아이콘 4종 생성
  책임: public/icon.png 하나를 원본으로 안드로이드 설치·스토어 등록용 아이콘을 만든다.

  사용 (sw/web 디렉토리에서):
    node scripts/generate-app-icons.mjs

  산출물 (public/icons/):
    android-192.png           192x192  일반(any)
    android-512.png           512x512  일반(any)
    android-maskable-512.png  512x512  maskable — 로고 80% + 브랜드 배경 여백
    play-store-512.png        512x512  Play Console 등록용(불투명)

  원본 public/icon.png 과 public/apple-icon.png 은 읽기만 한다. 덮어쓰지 않는다.

  maskable 규격: 런처가 원형·둥근사각 등 임의 마스크로 잘라내므로 안전영역은
  중앙 80% 뿐이다. 원본을 512로 늘리면 가장자리 글자가 잘리므로 로고를
  80%로 줄이고 브랜드 배경색 여백을 둘러 넣는다.
*/

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(WEB_ROOT, 'public', 'icon.png')
const OUT_DIR = join(WEB_ROOT, 'public', 'icons')

// 브랜드 배경색 — manifest 의 background_color 와 같다
const BRAND_BG = { r: 0x0a, g: 0x0a, b: 0x0a, alpha: 1 }
// maskable 안전영역 비율
const SAFE_RATIO = 0.8

// 원본을 지정 크기로 채운다(any 용도 — 전면 사용)
function fullBleed(size) {
  return sharp(SOURCE)
    .resize(size, size, { kernel: 'lanczos3', fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// 로고를 안전영역 안으로 축소하고 브랜드 배경 여백을 두른다.
// 원본 배경은 거의 순수 검정이라 #0a0a0a 여백과 맞대면 안쪽 사각형 경계가
// 옅게 드러난다. screen 합성으로 배경색을 아래에서 들어올려 경계를 없앤다.
// 검정은 정확히 #0a0a0a 가 되고 금색은 1~2단계만 밝아진다.
async function maskable(size) {
  const inner = Math.round(size * SAFE_RATIO)
  const offset = Math.round((size - inner) / 2)
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { kernel: 'lanczos3', fit: 'cover' })
    .png()
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, top: offset, left: offset, blend: 'screen' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// Play Console 등록 아이콘 — 투명도를 허용하지 않으므로 배경을 합성해 불투명화
function playStore(size) {
  return sharp(SOURCE)
    .resize(size, size, { kernel: 'lanczos3', fit: 'cover' })
    .flatten({ background: BRAND_BG })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

const TARGETS = [
  { file: 'android-192.png', build: () => fullBleed(192) },
  { file: 'android-512.png', build: () => fullBleed(512) },
  { file: 'android-maskable-512.png', build: () => maskable(512) },
  { file: 'play-store-512.png', build: () => playStore(512) },
]

async function main() {
  const source = await sharp(SOURCE).metadata()
  console.log(`원본 ${SOURCE}`)
  console.log(`원본 규격 ${source.width}x${source.height} ${source.format} 채널 ${source.channels}`)

  await mkdir(OUT_DIR, { recursive: true })

  for (const target of TARGETS) {
    const buffer = await target.build()
    const path = join(OUT_DIR, target.file)
    await writeFile(path, buffer)

    const made = await sharp(path).metadata()
    console.log(
      `생성 ${target.file} ${made.width}x${made.height} ${made.format} 채널 ${made.channels} ${(buffer.length / 1024).toFixed(1)}KB`
    )
  }

  console.log(`완료 ${TARGETS.length}종. 출력 ${OUT_DIR}`)
}

main().catch((error) => {
  console.error('실패:', error.message)
  process.exit(1)
})
