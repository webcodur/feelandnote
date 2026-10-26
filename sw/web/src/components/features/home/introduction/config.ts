export const HOME_GRAPH_PREVIEW_COUNT = 2
export const HOME_GRAPH_CANDIDATE_COUNT = 12
export const HOME_PERSON_ROTATION_STORAGE_PREFIX = 'feelandnote:home-rotation:v1'
export const HOME_GRAPH_MEDIA = ['BOOK', 'MUSIC', 'VIDEO', 'GAME'] as const
export const HOME_GRAPH_PEOPLE = {
  appreciations: ['lex-fridman', 'stephen-fry', 'henry-cavill'],
  books: ['carl-sagan', 'albert-einstein', 'bill-gates'],
} as const

// 연결도는 실제 공개 감상 기록이 있는 대표 작품으로 구성한다.
export const HOME_GRAPH_PICKS = {
  BOOK: ['449813c5-cae4-482c-9737-37c5dcc803d7'],
  MUSIC: ['72632fc3-3ee2-4e20-a6bc-1c3a43f230e8'],
  VIDEO: ['3ee05146-1c7a-4783-b7bc-dd60e0a34516'],
  GAME: ['8d04dc77-f779-4205-8565-4e856d1b182c'],
  read: ['e601261f-6a2d-4abd-8352-ec176c0d5250', 'b8910192-789f-4bd1-a111-02624ef3e2ba'],
} as const

export const HOME_GRAPH_READING_PICKS: Readonly<Record<string, readonly string[]>> = {
  'carl-sagan': HOME_GRAPH_PICKS.read,
  'bill-gates': ['b2520026-e0e7-42d6-868c-ff9b0b93d033', 'dfbbbb0c-a1e2-4728-b80d-4b0be820da36'],
}
