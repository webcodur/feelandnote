import assert from 'node:assert/strict'
import test from 'node:test'
import { chunkByCount, packByWeight, uniqueBy } from './itunes-batch.mjs'

test('기존 iTunes ID 820개를 9회 이하의 lookup 묶음으로 만든다', () => {
  const rows = Array.from({ length: 820 }, (_, index) => ({ id: index + 1 }))
  const batches = chunkByCount(rows, 100)
  assert.equal(batches.length, 9)
  assert.equal(batches.flat().length, rows.length)
  assert.ok(batches.every((batch) => batch.length <= 100))
})

test('앨범 lookup은 예상 반환 행 수 180 이하로 묶는다', () => {
  const albums = [12, 16, 75, 100, 4, 30, 8].map((tracks, index) => ({ id: index, tracks }))
  const packs = packByWeight(albums, {
    maxItems: 20,
    maxWeight: 180,
    weightOf: (album) => album.tracks + 1,
  })
  assert.deepEqual(packs.flat().map((album) => album.id), albums.map((album) => album.id))
  assert.ok(packs.every((pack) => pack.reduce((sum, album) => sum + album.tracks + 1, 0) <= 180))
})

test('동일 앨범 ID는 한 lookup 묶음에 한 번만 넣는다', () => {
  const albums = uniqueBy([{ id: 1 }, { id: 2 }, { id: 1 }], (album) => album.id)
  assert.deepEqual(albums, [{ id: 1 }, { id: 2 }])
})
