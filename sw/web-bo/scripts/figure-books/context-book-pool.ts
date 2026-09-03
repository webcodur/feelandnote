export type ContextBook = {
  contentId: string
  title: string
  contextKeys: readonly string[]
}

/** 서지와 분야 적합성을 사람이 확인한 대표책만 둔다. 관계 확정은 별도 인물별 검수가 맡는다. */
export const CONTEXT_BOOK_POOL: readonly ContextBook[] = [
  {
    contentId: '79f559b6-7ea8-4855-81c4-1ddfd16ffafd',
    title: '스크린 연기의 비밀',
    contextKeys: ['acting'],
  },
  {
    contentId: '4b42e7a2-06a1-4ba9-9259-e2b80672e1c9',
    title: '영화를 만든다는 것',
    contextKeys: ['film'],
  },
  {
    contentId: 'e2a48a82-f72c-40e4-80b3-c0759b0382a0',
    title: '시네마토그라프에 대한 노트',
    contextKeys: ['film'],
  },
  {
    contentId: '2fb7025e-ece3-49b1-a527-de2bd0a99751',
    title: '테니스 이너 게임',
    contextKeys: ['tennis'],
  },
  {
    contentId: '26f99e55-858e-4a4d-a070-a2d7ac2224a5',
    title: '잭 니클러스 Golf My Way 골프 마이웨이',
    contextKeys: ['golf'],
  },
  {
    contentId: 'fbf23797-60bd-4115-9b4d-5e9822420fb1',
    title: '리그 오브 레전드 플레이어 중심주의',
    contextKeys: ['league-of-legends'],
  },
  {
    contentId: '79626c70-3d60-4dd0-8f6d-812828a44d7c',
    title: '스포츠 유전자',
    contextKeys: [
      'football', 'baseball', 'basketball', 'tennis', 'golf', 'boxing', 'mma', 'swimming',
      'athletics', 'distance-running', 'gymnastics', 'figure-skating', 'speed-skating',
      'volleyball', 'badminton', 'table-tennis', 'cycling', 'cricket', 'american-football', 'rugby',
    ],
  },
  {
    contentId: 'bca11827-2438-459e-be9c-9c77441ba3b5',
    title: '체스의 기본',
    contextKeys: ['chess'],
  },
  {
    contentId: '46640283-0588-4308-aad3-59ad1de4e4b4',
    title: '파퓰러음악이론',
    contextKeys: ['popular-music'],
  },
  {
    contentId: '078d2a59-859a-4573-ae63-e7c398e7ce50',
    title: '아무튼, 아이돌',
    contextKeys: ['kpop'],
  },
  {
    contentId: 'd0ade488-08e6-4212-b578-cbe376c2ccdd',
    title: '그림 아는 만큼 보인다',
    contextKeys: ['painting'],
  },
  {
    contentId: '5a9feb90-e6d9-42f9-bff3-17ae177d0b4b',
    title: '한눈에 보는 조각사',
    contextKeys: ['sculpture'],
  },
  {
    contentId: '66bb3155-4375-4102-9368-96e6621c9b63',
    title: '건축 음악처럼 듣고 미술처럼 보다',
    contextKeys: ['architecture'],
  },
  {
    contentId: 'd5669be5-c1a1-4422-b92f-2a4e457a6b08',
    title: '디자인과 인간심리',
    contextKeys: ['design'],
  },
  {
    contentId: '15a28c5f-87b0-4027-8cf2-f69707194c9b',
    title: '패션디자인 아이디어 문화에서 찾기',
    contextKeys: ['fashion'],
  },
  {
    contentId: '4f016e14-1898-457c-8097-55b61d724ea7',
    title: '하버드 글쓰기 강의',
    contextKeys: ['writing'],
  },
  {
    contentId: '0925e1cc-92c1-4b74-b691-f125bde6ccde',
    title: '손자병법',
    contextKeys: ['military-strategy'],
  },
  {
    contentId: '9a440027-cdd0-4f91-8c98-bdd5527b7cee',
    title: '정치학',
    contextKeys: ['political-theory'],
  },
  {
    contentId: 'df094f0f-db6b-458f-99bf-66ffdb45de30',
    title: '군주론',
    contextKeys: ['political-theory'],
  },
  {
    contentId: '0d620197-af40-4501-9643-e4062b5b448b',
    title: '사회계약론',
    contextKeys: ['political-theory'],
  },
  {
    contentId: 'b7ca85bc-fcfd-4ac3-aa6e-f0543da14879',
    title: '리바이어던',
    contextKeys: ['political-theory'],
  },
] as const

const CONTEXT_BOOK_BY_ID = new Map(CONTEXT_BOOK_POOL.map((book) => [book.contentId, book]))

export function contextBook(contentId: string): ContextBook | undefined {
  return CONTEXT_BOOK_BY_ID.get(contentId)
}
