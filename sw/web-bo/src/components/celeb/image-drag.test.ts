import assert from 'node:assert/strict'
import test from 'node:test'
import { acceptsCelebImageDrop, CELEB_IMAGE_DRAG_TYPE, readCelebImageDrag, writeCelebImageDrag } from './image-drag'

function dragData() {
  const values = new Map<string, string>()
  return {
    setData: (type: string, value: string) => { values.set(type, value) },
    getData: (type: string) => values.get(type) ?? '',
  }
}

test('칸 사이 드래그는 이미지 파일·기존 외부 드래그와 함께 받고 일반 링크와 구분한다', () => {
  assert.equal(acceptsCelebImageDrop([CELEB_IMAGE_DRAG_TYPE]), true)
  assert.equal(acceptsCelebImageDrop(['Files']), true)
  assert.equal(acceptsCelebImageDrop(['application/x-ranking-image'], 'application/x-ranking-image'), true)
  assert.equal(acceptsCelebImageDrop(['text/plain', 'text/uri-list']), false)
})

test('아직 저장하지 않은 이미지도 원본 픽셀을 담은 파일로 다른 칸에 전달한다', async () => {
  const data = dragData()
  writeCelebImageDrag(data, 'data:image/png;base64,AQIDBA==')
  const image = await readCelebImageDrag(data)
  assert.equal(image?.type, 'image/png')
  assert.deepEqual(new Uint8Array(await image!.arrayBuffer()), new Uint8Array([1, 2, 3, 4]))
  assert.equal(await readCelebImageDrag(dragData()), null)
})

test('저장된 R2 이미지는 기존 관리자 중계를 거쳐 읽는다', async (t) => {
  const source = 'https://assets.example.com/celebs/person/photo.webp?v=2'
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    assert.equal(input, `/api/admin/image-clipboard?url=${encodeURIComponent(source)}`)
    return new Response(new Uint8Array([5, 6]), { headers: { 'content-type': 'image/webp' } })
  })
  const data = dragData()
  writeCelebImageDrag(data, source)
  const image = await readCelebImageDrag(data)
  assert.equal(image?.type, 'image/webp')
  assert.deepEqual(new Uint8Array(await image!.arrayBuffer()), new Uint8Array([5, 6]))
})

test('이미지 조회 실패는 원본 대신 오류로 알린다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '이미지 조회 실패' }, { status: 502 }))
  const data = dragData()
  writeCelebImageDrag(data, 'https://assets.example.com/celebs/person/photo.webp')
  await assert.rejects(readCelebImageDrag(data), /이미지 조회 실패/)
})
