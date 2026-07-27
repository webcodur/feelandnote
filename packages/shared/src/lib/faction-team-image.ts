/**
 * 도감 테마의 단체 사진 한 장 — 사진과 "누구를 찍은 것인지"를 함께 쥔다.
 *
 * 원래는 사진 주소만 늘어놓은 목록이라, 테마에 사진이 여러 장 붙으면 각 장이 무엇을 담았는지
 * 알 방법이 없었다. 앤트로픽 테마에 12명이 있고 사진이 4장인데 그 넷이 각각 누구인지
 * 화면도 사람도 몰랐다. 사진 파일 이름에만 세력·묶음 번호(g04c02)로 흔적이 남아 있었다.
 *
 * 영상 제작 데이터에는 그 정보가 처음부터 있다 — 묶음마다 제목이 있고 그 아래 인물이 달려 있다.
 * 그래서 새로 만드는 게 아니라 출간 때 함께 실어 나른다.
 *
 * 저장은 `celeb_tags.team_images`(jsonb) 한 자리다. 예전에 저장된 문자열 배열도 그대로 읽히게
 * 두 형태를 모두 받는다 — 문자열이면 사진 주소만 있고 제목·인물은 비어 있는 것으로 본다.
 */

export interface FactionTeamImage {
  /** 사진 주소 */
  url: string
  /** 이 사진이 담은 묶음의 제목 (예: "안전을 설계한 사람들") */
  label?: string
  labelEn?: string
  /** 이 사진에 나오는 인물들의 셀럽 id. 도감에서 이름을 띄우고 그 사람으로 넘어가는 데 쓴다 */
  celebIds?: string[]
}

/** 저장된 값이 무엇이든 사진 목록으로 정규화한다. 형태가 깨진 항목은 버린다 */
export function toTeamImages(v: unknown): FactionTeamImage[] {
  if (!Array.isArray(v)) return []
  const out: FactionTeamImage[] = []
  for (const item of v) {
    if (typeof item === 'string') {
      if (item.length > 0) out.push({ url: item })
      continue
    }
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const url = typeof row.url === 'string' ? row.url : ''
    if (!url) continue
    const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : undefined
    const labelEn = typeof row.labelEn === 'string' && row.labelEn.trim() ? row.labelEn.trim() : undefined
    const celebIds = Array.isArray(row.celebIds)
      ? row.celebIds.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : undefined
    out.push({
      url,
      ...(label ? { label } : {}),
      ...(labelEn ? { labelEn } : {}),
      ...(celebIds && celebIds.length ? { celebIds } : {}),
    })
  }
  return out
}

/** 사진 주소만 필요한 자리(썸네일 한 장, 장수 세기)를 위한 지름길 */
export function toTeamImageUrls(v: unknown): string[] {
  return toTeamImages(v).map(img => img.url)
}

/** 저장용 — 비어 있는 항목을 떨어내 jsonb 를 깔끔하게 유지한다 */
export function serializeTeamImages(images: FactionTeamImage[]): FactionTeamImage[] {
  return images
    .filter(img => typeof img.url === 'string' && img.url.length > 0)
    .map(img => ({
      url: img.url,
      ...(img.label?.trim() ? { label: img.label.trim() } : {}),
      ...(img.labelEn?.trim() ? { labelEn: img.labelEn.trim() } : {}),
      ...(img.celebIds?.length ? { celebIds: [...img.celebIds] } : {}),
    }))
}
