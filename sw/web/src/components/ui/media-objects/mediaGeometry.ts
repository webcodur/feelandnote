import type { CSSProperties } from 'react'
import type { MediaKind } from './MediaObject'

export const DEFAULT_COVER_RATIOS: Record<MediaKind, number> = { book: 2 / 3, music: 1, game: 3 / 4, video: 2 / 3 }

type Panel = { width: number; height: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))
// 아주 긴 배너·이미지 오류까지 실물 형태에 그대로 옮기지 않는다.
const MIN_RATIO = .45
const MAX_RATIO = 2
const MIN_COMPACT_COVERAGE = .60
const MIN_3D_BOOK_WIDTH = 160
const COMPACT_INSETS: Record<Exclude<MediaKind, 'music'>, Panel> = {
  book: { width: 6, height: 0 },
  game: { width: 10, height: 12 }, video: { width: 14, height: 0 },
}

export function getMediaGeometry(kind: MediaKind, sourceRatio: number | undefined, panel: Panel, compact: boolean) {
  const natural = sourceRatio && Number.isFinite(sourceRatio) && sourceRatio > 0 ? sourceRatio : DEFAULT_COVER_RATIOS[kind]
  const ratio = clamp(natural, MIN_RATIO, MAX_RATIO)
  // 작은 표지는 PC에서도 회전 없이 정면으로 표시해 읽을 수 있는 폭을 확보한다.
  compact ||= kind === 'book' && panel.width > 0 && panel.width < MIN_3D_BOOK_WIDTH
  const caseRatio = clamp(ratio * .77 / .90, .60, 1.50)
  const cropped = natural !== ratio || (kind === 'music' && (natural < .75 || natural > 4 / 3))
  const style: CSSProperties = {
    '--mo-cover-ratio': ratio, '--mo-case-ratio': caseRatio,
    '--mo-book-depth': .18 / Math.max(1, ratio),
    '--mo-film-height': .83 / ratio + .523,
    '--mo-image-fit': kind === 'music' || kind === 'game' ? (cropped ? 'cover' : 'contain') : 'cover',
  } as CSSProperties
  const { width, height } = panel
  if (width <= 0 || height <= 0) return { style, cropped, compact }

  if (compact) {
    if (kind === 'music') {
      // 표지를 줄여 판을 끼워 넣지 않고, 남는 세로 공간만큼 아래로 드러낸다.
      const sleeve = Math.min(width * .96, height * .96)
      const reveal = Math.min(.32, Math.max(0, height * .96 / sleeve - 1))
      Object.assign(style, {
        '--mo-compact-width': `${sleeve / width * 100}%`,
        '--mo-compact-height': `${sleeve * (1 + reveal) / height * 100}%`,
        '--mo-image-fit': cropped ? 'cover' : 'contain',
        '--object-size': `${sleeve}px`,
      })
      return { style, cropped, compact }
    }
    const inset = COMPACT_INSETS[kind]
    const availableWidth = Math.max(1, width - inset.width)
    const availableHeight = Math.max(1, height - inset.height)
    const imageWidth = Math.min(availableWidth, availableHeight * natural)
    const imageHeight = imageWidth / natural
    const preserve = imageWidth * imageHeight / (availableWidth * availableHeight) >= MIN_COMPACT_COVERAGE
    Object.assign(style, {
      '--mo-compact-width': `${preserve ? (imageWidth + inset.width) / width * 100 : 100}%`,
      '--mo-compact-height': `${preserve ? (imageHeight + inset.height) / height * 100 : 100}%`,
      '--mo-image-fit': preserve ? 'contain' : 'cover',
      '--object-size': `${preserve ? imageWidth + inset.width : width}px`,
    })
    return { style, cropped: !preserve, compact }
  }

  let rest: number
  let focus: number
  if (kind === 'book') {
    rest = Math.min(.90 * width, .885 * height * ratio)
    focus = Math.min(.94 * width, .94 * height * ratio)
  } else if (kind === 'music') {
    rest = Math.min(.96 * width, .68 * height)
    focus = rest * 1.01
  } else if (kind === 'game') {
    rest = Math.min(1.02 * width, .88 * height * caseRatio)
    const labelHeight = .77 / caseRatio
    const imageWidth = cropped ? .90 : Math.min(.90, labelHeight * natural)
    const imageHeight = cropped ? labelHeight : imageWidth / natural
    focus = Math.min(.98 * width / imageWidth, .98 * height / imageHeight)
  } else {
    rest = Math.min(width, .99 * height * ratio)
    focus = Math.min(.98 * width / .83, .98 * height * ratio / .83)
  }
  const scale = Math.max(1, focus / rest)
  // 책은 부모 레이어를 축소하지 않고 실제 폭을 바꿔 표지를 다시 그린다.
  Object.assign(style, {
    '--object-size': `${rest}px`, '--mo-hover-grow': scale - 1,
    '--mo-game-center-offset': .015 / caseRatio * scale,
  })
  return { style, cropped, compact }
}
