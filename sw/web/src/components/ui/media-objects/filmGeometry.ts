import type { CSSProperties } from 'react'

const SLICES = 20
const BEND_PER_JOINT = 1.46 * Math.PI / 180

// 정면 필름의 높이를 1로 두고, 같은 꼭짓점을 공유하는 굽힌 면을 만든다.
export const FILM_FACES = (() => {
  let angle = 0
  let y = 0
  let z = 0
  return Array.from({ length: SLICES }, (_, row) => {
    angle += BEND_PER_JOINT * (row / (SLICES - 1)) ** 1.4
    const start = row / SLICES
    const end = (row + 1) / SLICES
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const face = { start, end, y, z, cos, sin }
    y += (end - start) * cos
    z += (end - start) * sin
    return face
  })
})()

export function filmFaceStyle(face: typeof FILM_FACES[number]): CSSProperties {
  return {
    '--film-start': `${face.start * 100}%`,
    '--film-end-inset': `${(1 - face.end) * 100}%`,
    '--film-y': face.y - face.start,
    '--film-z': face.z,
    '--film-cos-delta': face.cos - 1,
    '--film-sin': face.sin,
  } as CSSProperties
}
