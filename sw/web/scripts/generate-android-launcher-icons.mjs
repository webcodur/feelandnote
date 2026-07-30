/*
  파일명: /sw/web/scripts/generate-android-launcher-icons.mjs
  기능: 안드로이드 런처 아이콘 자산 생성
  책임: 웹 아이콘 원본에서 레거시 런처 아이콘과 adaptive icon 전경을 밀도별로 뽑아 sw/android 로 넣는다.

  실행: cd sw/web && node scripts/generate-android-launcher-icons.mjs
  (sharp 가 sw/web 에만 설치돼 있어 이 위치에 둔다. 산출물만 sw/android 로 나간다)

  원본: sw/web/public/icon.png
  산출: sw/android/app/src/main/res 의 밀도별 mipmap 폴더

  전경 크기 근거: adaptive icon 은 108dp 캔버스를 받아 바깥을 깎고 가운데 72dp 만 보장한다.
  따라서 로고를 캔버스의 55% 로 줄여 어떤 마스크에서도 잘리지 않게 한다.
  웹의 maskable(로고 80%)을 그대로 쓰면 adaptive 안전원을 넘겨 잘린다.
*/

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const WEB_ROOT = resolve(import.meta.dirname, '..')
const SOURCE = resolve(WEB_ROOT, 'public/icon.png')
const RES = resolve(WEB_ROOT, '../android/app/src/main/res')

const BACKGROUND = { r: 10, g: 10, b: 10, alpha: 1 }
const FOREGROUND_RATIO = 0.55

// 밀도별 변 길이. 런처 아이콘은 48dp, adaptive 전경은 108dp 기준이다.
const DENSITIES = [
  { name: 'mdpi', launcher: 48, foreground: 108 },
  { name: 'hdpi', launcher: 72, foreground: 162 },
  { name: 'xhdpi', launcher: 96, foreground: 216 },
  { name: 'xxhdpi', launcher: 144, foreground: 324 },
  { name: 'xxxhdpi', launcher: 192, foreground: 432 },
]

async function writeImage(path, buffer) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buffer)
  const meta = await sharp(path).metadata()
  console.log(`생성 ${path.replace(WEB_ROOT, '')} → ${meta.width}×${meta.height}`)
}

async function buildLauncher(size) {
  return sharp(SOURCE)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .png()
    .toBuffer()
}

async function buildForeground(size) {
  const logo = Math.round(size * FOREGROUND_RATIO)
  const scaled = await sharp(SOURCE)
    .resize(logo, logo, { fit: 'contain', background: BACKGROUND, kernel: 'lanczos3' })
    .toBuffer()

  // 원본 배경이 순수 검정이라 단순 합성 시 사각 경계가 드러난다. screen 으로 밑판을 들어올려 경계를 없앤다.
  return sharp({
    create: { width: size, height: size, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: scaled, blend: 'screen', gravity: 'center' }])
    .png()
    .toBuffer()
}

async function main() {
  const source = await sharp(SOURCE).metadata()
  console.log(`원본 public/icon.png → ${source.width}×${source.height}`)
  if (source.width < 192) throw new Error('원본이 192px 미만이다. 더 큰 원본을 준비하라')

  for (const density of DENSITIES) {
    const dir = resolve(RES, `mipmap-${density.name}`)
    await writeImage(resolve(dir, 'ic_launcher.png'), await buildLauncher(density.launcher))
    await writeImage(resolve(dir, 'ic_launcher_foreground.png'), await buildForeground(density.foreground))
  }

  console.log('런처 아이콘 생성 완료')
}

main().catch((error) => {
  console.error(`실패: ${error.message}`)
  process.exit(1)
})
