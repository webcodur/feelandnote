import assert from 'node:assert/strict'
import test from 'node:test'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, parse } from 'node:path'
import sharp from 'sharp'
import { removeBackgrounds } from './reframe-nobg'
import { makeSheet } from './reframe-sheet'

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'reframe-test-'))
  const input = join(root, 'input')
  const output = join(root, 'output')
  mkdirSync(input)
  await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 77, g: 100, b: 135, alpha: 0.5 } } })
    .png().toFile(join(input, 'portrait.png'))
  return { root, input, output }
}

test('PNG·WebP 전체를 배치 한 번으로 전달하고 중간본·파일명을 보존한다', async () => {
  const { input, output } = await fixture()
  await sharp(join(input, 'portrait.png')).webp({ lossless: true }).toFile(join(input, 'other.webp'))
  let calls = 0
  const processed = await removeBackgrounds(['portrait.png', 'other.webp'], input, output, async (workDir) => {
    calls++
    mkdirSync(join(workDir, 'nobg'))
    for (const name of ['portrait', 'other']) {
      const intermediate = join(workDir, 'originals', `${name}.webp`)
      const originalPixels = await sharp(join(input, name === 'portrait' ? 'portrait.png' : 'other.webp')).ensureAlpha().raw().toBuffer()
      assert.ok((await sharp(intermediate).ensureAlpha().raw().toBuffer()).equals(originalPixels), 'RGBA 픽셀 보존')
      copyFileSync(intermediate, join(workDir, 'nobg', `${name}_nobg.webp`))
    }
  })
  assert.equal(calls, 1)
  assert.equal(processed.size, 2)
  assert.ok(existsSync(join(input, 'portrait.png')))
  for (const [file, path] of processed) {
    assert.equal(parse(path).name, `${parse(file).name}_nobg`)
    assert.ok(existsSync(path))
  }
})

test('배치 exit 0이어도 결과가 하나라도 빠지면 재배치 입력을 반환하지 않는다', async () => {
  const { input, output } = await fixture()
  await assert.rejects(removeBackgrounds(['portrait.png'], input, output, async () => {}), /nobg 결과 누락/)
})

test('배치 실행 실패는 원본으로 대체하지 않고 전달한다', async () => {
  const { input, output } = await fixture()
  await assert.rejects(removeBackgrounds(['portrait.png'], input, output, async () => {
    throw new Error('batch failed')
  }), /batch failed/)
})

test('PNG 원본도 전·후 대조 시트에 사용할 수 있다', async () => {
  const { input, output } = await fixture()
  mkdirSync(output)
  await sharp(join(input, 'portrait.png')).webp().toFile(join(output, 'portrait.webp'))
  await makeSheet([{ name: 'portrait', crop: { left: 0, top: 0, size: 32 } }],
    new Map([['portrait', join(input, 'portrait.png')]]), output)
  assert.ok(existsSync(join(output, '_sheet-001.png')))
})
