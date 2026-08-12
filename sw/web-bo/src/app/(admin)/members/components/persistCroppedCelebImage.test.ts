import assert from 'node:assert/strict'
import test from 'node:test'
import { persistCroppedCelebImage } from './persistCroppedCelebImage'

test('편집 화면의 크롭 완료는 관리자 화면 새로고침 없이 즉시 저장한다', async () => {
  const file = { name: 'avatar.png' } as File
  const calls: Array<{ celebId: string; file: File; revalidate: boolean | undefined }> = []

  const url = await persistCroppedCelebImage({
    mode: 'edit',
    celebId: 'celeb-id',
    file,
    persist: async (celebId, croppedFile, revalidate) => {
      calls.push({ celebId, file: croppedFile, revalidate })
      return 'https://images.example/avatar.webp?v=1'
    },
  })

  assert.equal(url, 'https://images.example/avatar.webp?v=1')
  assert.deepEqual(calls, [{ celebId: 'celeb-id', file, revalidate: false }])
})

test('신규 생성 화면은 인물 ID가 생길 때까지 이미지를 임시 보관한다', async () => {
  let called = false

  const url = await persistCroppedCelebImage({
    mode: 'create',
    file: { name: 'avatar.png' } as File,
    persist: async () => {
      called = true
      return 'unexpected'
    },
  })

  assert.equal(url, null)
  assert.equal(called, false)
})
