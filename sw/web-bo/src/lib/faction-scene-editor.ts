import { serializeTeamImages, toTeamImages, type FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'

// serverActions.bodySizeLimit(10 MB) 안에서 FormData로 전송한다. 이미지 비율·해상도 제한은 없다.
export const SCENE_UPLOAD_MAX_BYTES = 9 * 1024 * 1024

/** jsonb는 객체 키 순서를 바꾸므로, 수정 충돌 판정에는 키 순서와 무관한 값을 쓴다. */
export function stableArtworkJSON(value: unknown): string {
  return JSON.stringify(value ?? null, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
}

export function coverIndex(value: unknown, isMyth: boolean): number {
  if (!Array.isArray(value)) return -1
  return value.findIndex(item => {
    const image = toTeamImages([item])[0]
    return image && image.kind !== 'scene' && (!isMyth || image.url.includes('/myth/title-art/'))
  })
}

export function validateSceneDraft(scenes: FactionTeamImage[], cover: FactionTeamImage | null, isMyth: boolean): string | null {
  if (!Array.isArray(scenes)) return '장면 목록을 확인해 주세요.'
  for (const [index, image] of [...scenes, ...(cover ? [cover] : [])].entries()) {
    if (!image || typeof image !== 'object' || typeof image.url !== 'string') return '이미지 주소를 확인해 주세요.'
    try { if (!['https:', 'http:'].includes(new URL(image.url).protocol)) throw new Error() } catch { return '이미지에는 http 또는 https 주소를 사용해 주세요.' }
    for (const field of ['label', 'labelEn', 'caption', 'captionEn'] as const) {
      if (image[field] !== undefined && typeof image[field] !== 'string') return '제목과 설명은 글자로 입력해 주세요.'
    }
    if (image.celebIds && (!Array.isArray(image.celebIds) || image.celebIds.some(id => typeof id !== 'string'))) return '등장인물을 확인해 주세요.'
    if (index < scenes.length && image.kind !== 'scene') return '주요 장면의 구분을 확인해 주세요.'
    if (image.ending) {
      if (index !== scenes.length - 1) return '엔딩은 마지막 장면에만 넣을 수 있습니다.'
      const ending = image.ending
      if (typeof ending.title !== 'string' || typeof ending.text !== 'string' || !ending.title.trim() || !ending.text.trim()) return '엔딩의 한국어 제목과 본문을 함께 입력해 주세요.'
      if ((ending.titleEn !== undefined && typeof ending.titleEn !== 'string') || (ending.textEn !== undefined && typeof ending.textEn !== 'string')) return '영문 엔딩을 확인해 주세요.'
      if (Boolean(ending.titleEn?.trim()) !== Boolean(ending.textEn?.trim())) return '엔딩의 영어 제목과 본문을 함께 입력해 주세요.'
    }
  }
  if (cover?.kind === 'scene' || cover?.ending) return '시작 이미지에는 장면이나 엔딩을 지정할 수 없습니다.'
  if (cover && isMyth && !cover.url.includes('/myth/title-art/')) return '신화 시작 이미지는 파일 교체 버튼으로 등록해 주세요.'
  return null
}

/** 기존 단체 사진·알 수 없는 필드는 그대로 두고 장면과 시작 그림만 교체한다. */
export function mergeSceneArtwork(value: unknown, scenes: FactionTeamImage[], cover: FactionTeamImage | null, isMyth: boolean): unknown[] {
  const original = Array.isArray(value) ? value : []
  const target = coverIndex(original, isMyth)
  const cleanScenes = serializeTeamImages(scenes)
  const cleanCover = cover ? serializeTeamImages([cover])[0] : null
  let cursor = 0
  const next: unknown[] = []
  if (target < 0 && cleanCover) next.push(cleanCover)
  original.forEach((item, index) => {
    if (index === target) {
      if (cleanCover) {
        const extra = typeof item === 'object' && item ? { ...item } as Record<string, unknown> : {}
        for (const key of ['url', 'kind', 'label', 'labelEn', 'caption', 'captionEn', 'ending', 'celebIds']) delete extra[key]
        next.push({ ...extra, ...cleanCover })
      }
    } else if (item && typeof item === 'object' && item.kind === 'scene') {
      if (cursor < cleanScenes.length) next.push(cleanScenes[cursor++])
    } else next.push(item)
  })
  next.push(...cleanScenes.slice(cursor))
  return next
}
