import assert from 'node:assert/strict'
import test from 'node:test'
import { FILM_FACES, filmFaceStyle } from './filmGeometry'

// CSS 행렬에 넘긴 계수로 포스터 위 좌표가 놓일 실제 위치를 계산한다.
function point(row: number, progress: number, sourceY: number, height: number) {
  const style = filmFaceStyle(FILM_FACES[row]) as Record<string, string | number>
  const start = parseFloat(String(style['--film-start'])) / 100
  const bend = 1 - progress
  const localY = (sourceY - start) * height
  return {
    y: start * height + Number(style['--film-y']) * height * bend
      + localY * (1 + Number(style['--film-cos-delta']) * bend),
    z: Number(style['--film-z']) * height * bend + localY * Number(style['--film-sin']) * bend,
  }
}

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`)

test('정면에서는 모든 조각이 원본 포스터의 같은 좌표와 Z=0에 놓인다', () => {
  for (const height of [173.37, 472.5864, 701.111]) {
    FILM_FACES.forEach((face, row) => {
      for (const sourceY of [face.start, (face.start + face.end) / 2, face.end]) {
        const result = point(row, 1, sourceY, height)
        near(result.y, sourceY * height)
        near(result.z, 0)
      }
    })
  }
})

test('펼치는 도중에도 인접 조각의 위아래 경계가 같은 위치에 이어진다', () => {
  for (const height of [173.37, 472.5864, 701.111]) {
    for (let step = 0; step <= 100; step++) {
      for (let row = 0; row < FILM_FACES.length - 1; row++) {
        const edge = FILM_FACES[row].end
        const above = point(row, step / 100, edge, height)
        const below = point(row + 1, step / 100, edge, height)
        near(above.y, below.y)
        near(above.z, below.z)
      }
    }
  }
})

test('마지막 구간은 정면 좌표로 연속 수렴하고 완료 이후 위치가 바뀌지 않는다', () => {
  FILM_FACES.forEach((face, row) => {
    let previousDistance = Infinity
    for (const progress of [.9, .99, .999, .9999, 1, 1]) {
      const result = point(row, progress, face.end, 701.111)
      const distance = Math.hypot(result.y - face.end * 701.111, result.z)
      assert.ok(distance <= previousDistance + 1e-9)
      if (progress >= .9999) assert.ok(distance < .01)
      previousDistance = distance
    }
  })
})
