// 인물별 기록을 전부 싣는다. 한 번의 조회 응답 최대 행 수에 맞춘다.
export const HOME_GRAPH_FETCH_LIMIT = 1000
export const HOME_PERSON_ROTATION_STORAGE_PREFIX = 'feelandnote:home-rotation:v2'
import { SHELF_DIRECT_TYPES } from '@/components/shared/ShelfCategoryTabs/shelfCategories'

// 「인물과 책」의 두 줄 분류. 직접 감상은 매체, 인물 탐색은 인물과 책의 관계다.
export const HOME_GRAPH_MEDIA = SHELF_DIRECT_TYPES
export const HOME_GRAPH_RELATIONS = ['appearance', 'authored', 'profession', 'affiliation'] as const

// 연결도는 실제 공개 감상 기록이 있는 대표 작품으로 구성한다.
export const HOME_GRAPH_PICKS = {
  BOOK: ['449813c5-cae4-482c-9737-37c5dcc803d7'],
  MUSIC: ['72632fc3-3ee2-4e20-a6bc-1c3a43f230e8'],
  VIDEO: ['3ee05146-1c7a-4783-b7bc-dd60e0a34516'],
  GAME: ['8d04dc77-f779-4205-8565-4e856d1b182c'],
} as const

