import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'
import { prepareNobgAvatars, encodeNobgAvatar } from './reframe-avatar'

test('nobg 배치를 한 번만 reframe하고 개별 성공·실패를 구분한다', async () => {
  const parent = path.join(tmpdir(), 'feelandnote')
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(path.join(parent, 'reframe-test-'))
  try {
    let calls = 0
    const results = await prepareNobgAvatars(root, { run: async (input, output) => {
      calls++
      assert.equal(input, path.join(root, 'nobg'))
      await mkdir(output)
      await writeFile(path.join(output, '_report.json'), JSON.stringify([
        { name: 'person_nobg', crop: { left: 0, top: 0, size: 800 } },
        { name: 'no-face_nobg', error: '얼굴 미검출' },
        { name: 'off-center_nobg', error: '최종 얼굴 구도 이탈: 얼굴 중심축 58.0', crop: { left: 0, top: 0, size: 800 } },
        { name: 'profile_nobg', crop: { left: 87, top: 99, size: 522 } },
        { name: 'nose-clipped_nobg', error: '코끝이 크롭 가장자리에 붙거나 잘립니다.' },
      ]))
    } })
    assert.equal(calls, 1)
    assert.equal(results.get('person_nobg')?.file, path.join(root, 'reframed', 'person_nobg.webp'))
    assert.deepEqual(results.get('no-face_nobg'), { error: '얼굴 미검출' })
    assert.deepEqual(results.get('off-center_nobg'), { error: '최종 얼굴 구도 이탈: 얼굴 중심축 58.0' })
    assert.equal(results.get('profile_nobg')?.file, path.join(root, 'reframed', 'profile_nobg.webp'))
    assert.deepEqual(results.get('nose-clipped_nobg'), { error: '코끝이 크롭 가장자리에 붙거나 잘립니다.' })
    await assert.rejects(prepareNobgAvatars(root, { run: async () => { throw new Error('model failed') } }), /model failed/)
  } finally {
    if (path.dirname(root) === parent && path.basename(root).startsWith('reframe-test-')) {
      await rm(root, { recursive: true })
    }
  }
})

test('nobg만 고르면 얼굴이 없는 결과도 reframe을 호출하지 않고 그대로 전달한다', async () => {
  const parent = path.join(tmpdir(), 'feelandnote')
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(path.join(parent, 'reframe-test-'))
  try {
    const inputDir = path.join(root, 'nobg')
    await mkdir(inputDir)
    const file = path.join(inputDir, 'no-face_nobg.webp')
    await sharp({ create: { width: 100, height: 50, channels: 4, background: { r: 180, g: 20, b: 10, alpha: 0.5 } } })
      .webp({ lossless: true }).toFile(file)
    const results = await prepareNobgAvatars(root, {
      reframe: false,
      run: async () => { throw new Error('reframe을 호출하면 안 된다') },
    })
    assert.deepEqual(results.get('no-face_nobg'), { file })
  } finally {
    if (path.dirname(root) === parent && path.basename(root).startsWith('reframe-test-')) await rm(root, { recursive: true })
  }
})

test('nobg만 등록할 때 원래 구도를 자르거나 늘리지 않고 투명도를 유지한다', async () => {
  const input = await sharp({ create: { width: 100, height: 50, channels: 4, background: { r: 180, g: 20, b: 10, alpha: 0.5 } } })
    .webp({ lossless: true }).toBuffer()
  const result = await encodeNobgAvatar(input, false)
  const { data, info } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]
  assert.equal(info.width, info.height)
  assert.equal(alphaAt(info.width / 2, 0), 0)
  assert.ok(Math.abs(alphaAt(info.width / 2, info.height / 2) - 128) <= 1)
  assert.ok(alphaAt(0, info.height / 2) > 0)
  assert.ok(alphaAt(info.width - 1, info.height / 2) > 0)
  assert.equal(alphaAt(info.width / 2, info.height - 1), 0)
  assert.equal(await encodeNobgAvatar(result, true), result, 'reframe 완성본은 재압축하지 않는다')
})
