#!/usr/bin/env node
/**
 * Gemini 웹 생성 이미지 우측 하단의 스파클(다이아몬드) 워터마크를 지운다.
 * 스파클 왼쪽의 같은 높이 영역을 복사해 덮는다 — 아바타의 그 자리는
 * 대부분 평평한 배경이라 자연스럽게 메워진다. 어깨·옷이 걸린 컷은
 * 패치가 어색할 수 있으니 결과를 눈으로 확인하고, 안 맞으면 Photoroom으로 간다.
 *
 * 사용 (sw/web-bo 에서):
 *   node scripts/photo/remove-gemini-mark.mjs <입력> [출력]
 * 출력을 생략하면 입력을 덮어쓴다.
 */
import sharp from 'sharp'

const [src, dst] = process.argv.slice(2)
if (!src) { console.log('사용: node scripts/photo/remove-gemini-mark.mjs <입력> [출력]'); process.exit(1) }

const img = sharp(src)
const { width: W, height: H } = await img.metadata()

// 1024 기준 스파클은 대략 x 860~1000, y 840~960. 비율로 잡고 조금 넉넉히 덮는다.
const box = {
  left: Math.round(W * 0.84),
  top: Math.round(H * 0.82),
  width: Math.round(W * 0.16),
  height: Math.round(H * 0.18),
}
// 같은 높이에서 바로 왼쪽의 배경을 가져와 덮는다.
const donor = {
  left: Math.max(0, box.left - box.width - Math.round(W * 0.01)),
  top: box.top,
  width: box.width,
  height: box.height,
}

const patch = await sharp(src).extract(donor).toBuffer()
await sharp(src)
  .composite([{ input: patch, left: box.left, top: box.top }])
  .toFile(dst || src + '.tmp.png')

if (!dst) {
  const { renameSync } = await import('fs')
  renameSync(src + '.tmp.png', src)
}
console.log(`OK ${dst || src} (${W}x${H}, 패치 ${box.width}x${box.height} @ ${box.left},${box.top})`)
