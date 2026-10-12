import { getCoverImageIndex, sceneBoundaryFormat, serializeTeamImages, toTeamImages, type FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'

// serverActions.bodySizeLimit(10 MB) 안에서 FormData로 전송한다. 이미지 비율·해상도 제한은 없다.
export const SCENE_UPLOAD_MAX_BYTES = 9 * 1024 * 1024

/** jsonb는 객체 키 순서를 바꾸므로, 수정 충돌 판정에는 키 순서와 무관한 값을 쓴다. */
export function stableArtworkJSON(value: unknown): string {
  return JSON.stringify(value ?? null, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item)
}

export function coverIndex(value: unknown, isMyth: boolean): number {
  return getCoverImageIndex(value, isMyth)
}

export function validateSceneDraft(scenes: FactionTeamImage[], cover: FactionTeamImage | null, isMyth: boolean): string | null {
  if (!Array.isArray(scenes)) return '장면 목록을 확인해 주세요.'
  let htmlUsed = false
  for (const [index, image] of [...scenes, ...(cover ? [cover] : [])].entries()) {
    if (!image || typeof image !== 'object' || typeof image.url !== 'string') return '이미지 주소를 확인해 주세요.'
    try { if (!['https:', 'http:'].includes(new URL(image.url).protocol)) throw new Error() } catch { return '이미지에는 http 또는 https 주소를 사용해 주세요.' }
    for (const field of ['label', 'labelEn', 'caption', 'captionEn'] as const) {
      if (image[field] !== undefined && typeof image[field] !== 'string') return '제목과 설명은 글자로 입력해 주세요.'
    }
    if (image.celebIds && (!Array.isArray(image.celebIds) || image.celebIds.some(id => typeof id !== 'string'))) return '등장인물을 확인해 주세요.'
    if (index < scenes.length && image.kind !== 'scene') return '주요 장면의 구분을 확인해 주세요.'
    if (image.opening) htmlUsed = false
    for (const side of ['opening', 'ending'] as const) {
      const boundary = image[side]
      if (!boundary) continue
      if (typeof boundary.title !== 'string' || typeof boundary.text !== 'string' || !boundary.title.trim() || !boundary.text.trim()) return '도입·마무리의 한국어 제목과 본문을 함께 입력해 주세요.'
      if (boundary.format !== undefined && boundary.format !== 'image' && boundary.format !== 'html') return '도입·마무리의 표시 방식을 확인해 주세요.'
      if ((boundary.titleEn !== undefined && typeof boundary.titleEn !== 'string') || (boundary.textEn !== undefined && typeof boundary.textEn !== 'string')) return '도입·마무리의 영어 제목과 본문을 확인해 주세요.'
      if (Boolean(boundary.titleEn?.trim()) !== Boolean(boundary.textEn?.trim())) return '도입·마무리의 영어 제목과 본문을 함께 입력해 주세요.'
      if (sceneBoundaryFormat(boundary, side) === 'html') {
        if (htmlUsed) return '한 이야기에서 도입·마무리 중 한쪽만 HTML로 표시할 수 있습니다.'
        htmlUsed = true
      }
    }
    if (image.ending) {
      if (index !== scenes.length - 1 && !scenes[index + 1]?.opening) return '엔딩은 각 이야기의 마지막 장면에만 넣을 수 있습니다.'
    }
  }
  if (cover?.kind === 'scene' || cover?.opening || cover?.ending) return '표지에는 장면이나 도입·마무리를 지정할 수 없습니다.'
  if (cover && isMyth && !cover.url.includes('/myth/title-art/')) return '신화 시작 이미지는 파일 교체 버튼으로 등록해 주세요.'
  return null
}

/** 기존 단체 사진·알 수 없는 필드는 그대로 두고 장면과 시작 그림만 교체한다. */
export function mergeSceneArtwork(value: unknown, scenes: FactionTeamImage[], cover: FactionTeamImage | null, isMyth: boolean): unknown[] {
  const original = Array.isArray(value) ? value : []
  const target = coverIndex(original, isMyth)
  const cleanScenes = serializeTeamImages(scenes)
  const cleanCover = cover ? serializeTeamImages([{ ...cover, ...(!isMyth ? { kind: 'cover' as const } : {}) }])[0] : null
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
