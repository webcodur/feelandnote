#!/usr/bin/env node
/**
 * Grok에서 받은 아바타 파일 한 장을 검사해 국문 이름으로 옮긴다.
 * 다운로드 폴더를 뒤지는 grok-avatar-save.sh와 달리 파일 경로를 직접 받으므로
 * 어느 브라우저 도구로 받았든 상관없다.
 *
 * 사용 (sw/web-bo 에서):
 *   node scripts/photo/grok-avatar-save.mjs <slug> <받은 파일 경로>
 *
 * 출력 한 줄:
 *   OK        정사각 → .tmp/hero-out/_avatars/<국문 이름>.jpg
 *   VERTICAL  세로   → .tmp/hero-out/_redo/<국문 이름>-세로-<원본>.jpg
 *   DUP       기존 결과와 같은 파일이다(내려받기가 먹지 않았다)
 *   NONE      파일이 없다
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync } from 'fs'
import { createHash } from 'crypto'
import { join, basename } from 'path'
import sharp from 'sharp'

const [slug, src] = process.argv.slice(2)
if (!slug || !src) { console.log('사용: node scripts/photo/grok-avatar-save.mjs <slug> <파일 경로>'); process.exit(1) }
if (!existsSync(src)) { console.log(`NONE 파일 없음 (${src})`); process.exit(0) }

const OUT = '.tmp/hero-out'
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex')
const srcHash = md5(src)
const dupDir = ['_avatars', '_redo', '_ab', '_ab2'].find((d) => {
  const dir = join(OUT, d)
  return existsSync(dir) && readdirSync(dir)
    .filter((f) => /\.(jpg|png|webp)$/i.test(f))
    .some((f) => md5(join(dir, f)) === srcHash)
})
if (dupDir) { console.log(`DUP ${basename(src)} 중복: ${dupDir} 안에 같은 해시`); process.exit(0) }

const { width, height } = await sharp(src).metadata()
const dim = `${width}x${height}`
const name = JSON.parse(readFileSync(`.tmp/grok-queue/${slug}.json`, 'utf-8')).nickname
const dstDir = join(OUT, width === height ? '_avatars' : '_redo')
mkdirSync(dstDir, { recursive: true })
const dst = width === height
  ? join(dstDir, `${name}.jpg`)
  : join(dstDir, `${name}-세로-${basename(src)}`)
copyFileSync(src, dst)
console.log(width === height ? `OK ${basename(src)} → _avatars/${name}.jpg (${dim})` : `VERTICAL ${basename(src)} → _redo/${name}-세로-${basename(src)} (${dim})`)
