import type { FactionScript } from '@/lib/faction-types'

export const ASSET_BASE = '/api/rm-asset'

export const RATIOS = [
  { id: '4x5', label: '4:5', w: 1080, h: 1350 },
  { id: '3x4', label: '3:4', w: 1080, h: 1440 },
  { id: '1x1', label: '1:1', w: 1080, h: 1080 },
  { id: '9x16', label: '9:16', w: 1080, h: 1920 },
] as const
export type RatioId = (typeof RATIOS)[number]['id']

export const COMMON_PERSON_CARD_GUIDES = {
  shot: '더 많은 인물과 세력의 흐름이 궁금하다면,',
  map: '필앤노트에서 전체 지도를 확인하세요',
} as const

// 세력의 인물 목록 — 항상 그룹(clusters)별 합산. (렌더러 groupPeople 과 동일 정규화)
export function peopleOf(g: FactionScript['groups'][number]) {
  return (g.clusters ?? []).flatMap(c => c.people ?? []).filter(person => person.isPerson !== false)
}

export type FactionCardInitialTarget = {
  personName?: string
  cardPath?: string[]
}

export function normalizeLookup(value: string) {
  return value.trim().normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, '')
}

export function findPersonSelection(groups: NonNullable<FactionScript['groups']>, query: string): { view: 'person' | 'cluster' | 'group', gi: number, pi: number } | null {
  let view: 'person' | 'cluster' | 'group' = 'person'
  let rawQuery = query
  if (query.startsWith('!group-')) {
    view = 'group'
    rawQuery = query.slice(7)
  } else if (query.startsWith('!cluster-')) {
    view = 'cluster'
    rawQuery = query.slice(9)
  }
  const q = normalizeLookup(rawQuery)
  if (!q) return null

  if (view === 'group' || view === 'cluster') {
    for (const [gi, group] of groups.entries()) {
      const name = normalizeLookup(group.name ?? '')
      if (name === q || name.includes(q)) return { view, gi, pi: 0 }
    }
  }

  let partial: { view: 'person' | 'cluster' | 'group', gi: number; pi: number } | null = null
  for (const [gi, group] of groups.entries()) {
    const people = peopleOf(group)
    for (const [pi, person] of people.entries()) {
      const name = normalizeLookup(person.name ?? '')
      const slug = normalizeLookup(person.slug ?? '')
      if (name === q || slug === q) return { view, gi, pi }
      if (!partial && (name.includes(q) || slug.includes(q))) partial = { view, gi, pi }
    }
  }
  return partial
}

export function resolveCardId(cardPath: string[] | undefined, cards: { id: string }[]) {
  const [rawKind, rawIndex] = cardPath ?? []
  if (!rawKind) return null

  const kind = normalizeLookup(rawKind).replace(/[-_]/g, '')
  const index = rawIndex ? Number(rawIndex) : undefined
  if ((kind === 'story' || kind === '스토리') && Number.isFinite(index) && index! > 0) return `story${index! - 1}`

  const storyMatch = kind.match(/^(story|스토리)(\d+)$/)
  if (storyMatch) return `story${Math.max(0, Number(storyMatch[2]) - 1)}`

  const aliases: Record<string, string> = {
    quote: 'quote',
    인용: 'quote',
    명언: 'quote',
    대사: 'quote',
    identity: 'identity',
    id: 'identity',
    profile: 'identity',
    신원: 'identity',
    정체: 'identity',
    인물: 'identity',
    shot: 'shot',
    group: 'shot',
    소속: 'shot',
    단체: 'shot',
    map: 'map',
    지도: 'map',
    계보: 'map',
  }
  return aliases[kind] ?? (cards.some(c => c.id === kind) ? kind : null)
}

export function cardIdToRoutePath(id: string) {
  const story = id.match(/^story(\d+)$/)
  if (story) return ['story', String(Number(story[1]) + 1)]
  return [id]
}

export function pushCardRoute(basePath: string | undefined, view: 'person' | 'cluster' | 'group', targetName?: string, cardId?: string) {
  if (!basePath) return
  const parts = [basePath]
  if (targetName) {
    if (view === 'group') parts.push(encodeURIComponent(`!group-${targetName}`))
    else if (view === 'cluster') parts.push(encodeURIComponent(`!cluster-${targetName}`))
    else parts.push(encodeURIComponent(targetName))
  }
  if (targetName && cardId) parts.push(...cardIdToRoutePath(cardId).map(encodeURIComponent))
  window.history.pushState(null, '', parts.join('/'))
}

export type PlatformId = 'instagram' | 'threads' | 'x' | 'tiktok' | 'naver'
export const DEPLOY_GUIDE: { ratio: string; targets: PlatformId[] }[] = [
  { ratio: '4:5', targets: ['instagram', 'threads', 'x'] },
  { ratio: '3:4', targets: ['instagram', 'threads'] },
  { ratio: '1:1', targets: ['x', 'naver'] },
  { ratio: '9:16', targets: ['tiktok', 'instagram'] },
]
export const PLATFORM_INFO: Record<PlatformId, { name: string; company: string; lines: string[] }> = {
  instagram: {
    name: '인스타그램', company: 'Meta',
    lines: [
      '피드 캐러셀: 개인 팩 9장 전체를 한 게시물로. 한도 20장.',
      '3:4(1080×1440) = 오가닉 최적 — 피드·프로필 그리드 모두 안 잘림. 단 광고(부스트) 불가.',
      '4:5(1080×1350) = 광고 겸용 표준 — 피드는 온전, 프로필 그리드(3:4)에서 양옆 살짝 잘림.',
      '9:16 = 스토리·릴스 표지용. 상단 250px·하단 340~420px은 UI에 가려지니 핵심을 중앙에.',
      '운영: 카드 주 2~3회, KPI는 조회수 아닌 저장·공유. 쓰레드와 같은 캐러셀 그대로 교차 게시.',
      '수익(보너스 프로그램): 한국·미국 지원 — 메타가 게시물(캐러셀·단일 이미지 포함) 조회수에 직접 지급. 프로페셔널 계정 → 보너스 탭에서 조건 확인(3개월 조회수 기준, 월 150개 한도, 월 2회 정산, 팔로워 무관). 단가 조회당 ~0.1원대, 시즌제라 조건·지속 변동.',
      '수익 이원 운영: 팩 캐러셀(주 2~3회, 브랜드·저장) + 단독 대사 카드 등 단일 이미지(매일 수 개, 보너스 물량). 릴스 광고 배분(55%)은 영상 트랙 별도.',
    ],
  },
  threads: {
    name: '쓰레드', company: 'Meta (인스타그램 계정 연동)',
    lines: [
      '계정 따로 안 만듦 — 인스타그램 계정으로 로그인하는 자매 서비스(메타). 카드 파일도 같은 것 사용.',
      '올리는 법: 인스타 게시 시 Threads에 공유 토글(간편) 또는 따로 업로드(권장 — 첫 줄 후크 문구만 쓰레드용으로 다르게).',
      '강제 크롭 없음(1:1~9:16 원본 그대로). 4:5가 피드 점유 최대라 권장. 이미지 20장 한도.',
      '첫 줄 텍스트 후크(브리핑 나레이션 재활용) + 카드 묶음. 링크는 본문 말고 답글·바이오에.',
      '운영: 하루 1~2회 + 책 토픽 답글 활동(답글이 확산 엔진). 게시 직후 30~60분 응대.',
    ],
  },
  x: {
    name: 'X (트위터)', company: 'X Corp.',
    lines: [
      '캐러셀 없음 — 이미지 최대 4장, 2장 이상은 격자 크롭(4장이면 가로 2:1로 세로 카드 반토막). 묶음 게시 금지.',
      '단일 이미지는 가로 2:1~세로 3:4 범위 무크롭 — 4:5·1:1 카드 1장씩은 안전. 9:16은 3:4로 잘림.',
      '방식 ① 캐러셀 1번 대사 카드(인물 사진+대사+발화자 표기) 1장 + 본문 텍스트 트윗. 방식 ② 타래 — 답글로 1장씩 이어 캐러셀 경험 재현(주 1회 인물 타래).',
      '본문 텍스트 구성: 카드에 대사가 있으니 텍스트는 맥락 담당 — 하단 나레이션 대본을 트윗 본문으로 그대로 옮긴다(캐러셀의 하단 구간 역할을 본문이 대신, 추가 집필 0). 타래도 장마다 같은 요령.',
      '명언 텍스트 트윗은 가공 0으로 병행(X 토착 포맷). 링크는 항상 첫 답글에.',
      '언어 레인: 영어 우선 권고(유명인 독서는 영어권 X 토착 장르), 한국어는 미러링.',
    ],
  },
  tiktok: {
    name: '틱톡', company: 'ByteDance',
    lines: [
      '사진 모드(이미지 캐러셀): 최대 35장, 배경음악 자동 — 개인 팩 9장 그대로 가능. 카드뉴스가 주류 포맷.',
      '화면이 9:16이라 9:16 출력이 꽉 참(4:5는 위아래 여백). 하단 320~420px은 캡션·버튼에 가려짐.',
      '전제: 영어권 레인 결정 먼저. 계정 정체성을 "셀럽·역사인물" 축으로 좁게 고정(첫 5~10개가 분류 결정).',
      '워터마크 없는 클린본만. 지정학 리스크로 단일 의존 금물.',
    ],
  },
  naver: {
    name: '네이버 블로그', company: 'NAVER (현재 보류)',
    lines: [
      '보류 중 — 카드가 아니라 글 중심 채널이라 별도 원고 작업이 필요해서 뒤로 미룸.',
      '재개 시: 표지(대표 이미지)만 1:1 필수 — 브리핑 카드 1:1 출력 사용. 본문은 세로 카드 나열 가능.',
      '팩 텍스트(나레이션 7문장 + 스토리 3문단)가 글 원고 재료 — 1,500자로 살 붙여 검색 자산화.',
      '기계 문체는 저품질 필터에 걸림 — 관점·맥락 가미 필수. 글 하단에 feelandnote.com 링크.',
    ],
  },
}
