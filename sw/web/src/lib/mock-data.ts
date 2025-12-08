export const USER_PROFILE = {
  name: "WebCoder",
  avatarColor: "linear-gradient(135deg, #7c4dff, #ff4d4d)",
};

export const USER_STATS = [
  { label: "총 감상", value: 152, change: "+8 이번 달" },
  { label: "리뷰", value: 80, change: "+3 이번 주" },
  { label: "업적 점수", value: "1,530", change: "+25 오늘" },
];

export const READING_LIST = [
  {
    id: 1,
    title: "해리 포터와 마법사의 돌",
    type: "도서",
    progress: "8/17 챕터 · 45%",
    percentage: 45,
    coverColor: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
  },
  {
    id: 2,
    title: "기묘한 이야기 S4",
    type: "드라마",
    progress: "E07/E09 · 78%",
    percentage: 78,
    coverColor: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  },
  {
    id: 3,
    title: "젤다의 전설: 왕국의 눈물",
    type: "게임",
    progress: "메인 퀘스트 65% · 120시간",
    percentage: 65,
    coverColor: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
  },
  {
    id: 4,
    title: "인터스텔라",
    type: "영화",
    progress: "2회차 관람 · 분석 중",
    percentage: 100,
    coverColor: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    id: 5,
    title: "삼체",
    type: "도서",
    progress: "2권 중 1권 완료",
    percentage: 50,
    coverColor: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)",
  },
  {
    id: 6,
    title: "더 라스트 오브 어스",
    type: "게임",
    progress: "챕터 10/12 · 83%",
    percentage: 83,
    coverColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: 7,
    title: "브레이킹 배드 S3",
    type: "드라마",
    progress: "E05/E13 · 38%",
    percentage: 38,
    coverColor: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: 8,
    title: "노인을 위한 나라는 없다",
    type: "영화",
    progress: "첫 관람 완료 · 리뷰 작성 중",
    percentage: 100,
    coverColor: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  {
    id: 9,
    title: "1Q84",
    type: "도서",
    progress: "3권 중 2권 · 190/300p",
    percentage: 63,
    coverColor: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: 10,
    title: "호빗: 뜻밖의 여정",
    type: "영화",
    progress: "1/3 부작",
    percentage: 33,
    coverColor: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  },
  {
    id: 11,
    title: "페르소나 5",
    type: "게임",
    progress: "팰리스 4/9 · 55시간",
    percentage: 44,
    coverColor: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    id: 12,
    title: "왕좌의 게임 S1",
    type: "드라마",
    progress: "E02/E10 · 20%",
    percentage: 20,
    coverColor: "linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)",
  },
];

export const RECENT_CREATIONS = [
  {
    id: 1,
    type: "what-if",
    typeLabel: "What If · 다른 결말",
    title: "인셉션",
    preview: "만약 코브가 마지막에 현실로 돌아오지 못했다면? 팽이는 계속 돌았을까?",
  },
  {
    id: 2,
    type: "media",
    typeLabel: "매체 전환 · 영화",
    title: "삼체",
    preview: "이 소설을 영화로 만든다면? 감독은 드니 빌뇌브, 주인공은...",
  },
];

export const FEED_ITEMS = [
  {
    id: 1,
    user: "빌 게이츠",
    avatarColor: "linear-gradient(135deg, #FFD700, #FFA500)",
    action: "reviewed",
    title: "사피엀스 ★★★★★",
    content: "인류의 역사를 새로운 관점으로 바라보게 해준 책. 특히 인지혁명 부분이...",
    likes: "2.4k",
    comments: 156,
    time: "3시간 전",
    section: "celebrity",
  },
  {
    id: 2,
    user: "김영하 작가",
    avatarColor: "linear-gradient(135deg, #E91E63, #9C27B0)",
    action: "noted",
    title: "무라카미 하루키 - 1Q84",
    content: '"문장은 리듬이다." 다시 읽으며 느낀 점. 번역으로 읽어도 하루키의 리듬은...',
    likes: "1.8k",
    comments: 89,
    time: "1일 전",
    section: "celebrity",
  },
];

export const FRIENDS_FEED = [
  {
    id: 1,
    user: "BookLover99",
    avatarColor: "linear-gradient(135deg, #7c4dff, #ff4d4d)",
    action: "reviewed",
    title: "인셉션 ★★★★★",
    content: "꿈속의 꿈이라는 설정이 너무나 매력적이었다. 마지막 팽이가 쓰러질지...",
    likes: "24",
    comments: 3,
    time: "2시간 전",
  },
  {
    id: 2,
    user: "MidnightReader",
    avatarColor: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    action: "noted",
    title: "해리 포터와 마법사의 돌",
    content: '"거울을 보는 자는 자신의 가장 깊은 욕망을 보게 된다." 이 문장이 왜...',
    likes: "12",
    comments: 1,
    time: "5시간 전",
  },
  {
    id: 3,
    user: "GameEnthusiast",
    avatarColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    action: "reviewed",
    title: "젤다의 전설: 왕국의 눈물 ★★★★★",
    content: "오픈월드의 새로운 기준. 물리엔진 활용도가 정말 놀랍다...",
    likes: "18",
    comments: 5,
    time: "12시간 전",
  },
];

export const DISCOVERY_FEED = [
  {
    id: 1,
    user: "CreativeMind",
    avatarColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    action: "imagined",
    title: "기묘한 이야기 S4",
    content: "What If: 만약 에디가 마지막에 도망쳤다면 어땠을까?",
    likes: "45",
    comments: 8,
    time: "1일 전",
  },
  {
    id: 2,
    user: "NovelExplorer",
    avatarColor: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    action: "reviewed",
    title: "물고기는 존재하지 않는다 ★★★★☆",
    content: "과학과 철학이 만나는 아름다운 지점. 분류학의 이야기가 이렇게 감동적일 줄...",
    likes: "67",
    comments: 12,
    time: "2일 전",
  },
];

export const ARCHIVE_ITEMS = [
  {
    id: 1,
    title: "해리 포터와 마법사의 돌",
    type: "도서",
    rating: 4.5,
    date: "2023.10.15",
    coverColor: "linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)",
    status: "reading",
  },
  {
    id: 2,
    title: "인셉션",
    type: "영화",
    rating: 5.0,
    date: "2023.09.20",
    coverColor: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    status: "completed",
  },
  {
    id: 3,
    title: "젤다의 전설: 야생의 숨결",
    type: "게임",
    rating: 5.0,
    date: "2023.08.10",
    coverColor: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    status: "completed",
  },
  {
    id: 4,
    title: "기묘한 이야기 S4",
    type: "드라마",
    rating: 4.0,
    date: "2023.11.01",
    coverColor: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
    status: "watching",
  },
  {
    id: 5,
    title: "슬램덩크",
    type: "만화",
    rating: 5.0,
    date: "2023.07.05",
    coverColor: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)",
    status: "completed",
  },
];

// 히트맵 데이터 생성 함수
function generateActivityHeatmap() {
  const data = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const count = Math.floor(Math.random() * 8);

    data.push({
      date: date.toISOString().split("T")[0],
      count,
      level: count === 0 ? 0 : Math.min(Math.ceil(count / 2), 4),
    });
  }

  return data;
}

export const USER_DETAILED_STATS = {
  // 요약 정보
  summary: {
    totalContents: 152,
    totalReviews: 80,
    totalNotes: 45,
    totalCreations: 12,
    activityScore: 1530,
    achievementBonus: 350,
    totalScore: 1880,
  },

  // 활동 점수 상세
  activityBreakdown: {
    contentsAdded: { count: 152, points: 152 },
    reviewsWritten: { count: 80, points: 400 },
    notesWritten: { count: 45, points: 135 },
    creations: { count: 12, points: 120 },
    comments: { count: 234, points: 234 },
    likesReceived: { count: 489, points: 978 },
  },

  // 카테고리별 분포 (도넛 차트용)
  categoryDistribution: [
    { name: "도서", value: 45, color: "#7c4dff" },
    { name: "영화", value: 52, color: "#f59e0b" },
    { name: "드라마", value: 35, color: "#10b981" },
    { name: "게임", value: 20, color: "#ec4899" },
  ],

  // 월별 활동 데이터 (히트맵용)
  activityHeatmap: generateActivityHeatmap(),

  // 영향력 정보
  influence: {
    friends: 24,
    followers: 156,
    achievementScore: 1880,
    totalInfluence: 2900,
    rank: "나무",
    rankEmoji: "🌳",
    nextRank: "숲",
    nextRankThreshold: 5000,
    progress: 58,
  },

  // 영향력 등급 정보
  influenceRanks: [
    { name: "새싹", min: 0, max: 499, emoji: "🌱", color: "#4ade80" },
    { name: "묘목", min: 500, max: 1999, emoji: "🌿", color: "#22c55e" },
    { name: "나무", min: 2000, max: 4999, emoji: "🌳", color: "#16a34a" },
    { name: "숲", min: 5000, max: 14999, emoji: "🌲", color: "#7c4dff" },
    { name: "산맥", min: 15000, max: 49999, emoji: "🏔️", color: "#f59e0b" },
    { name: "대륙", min: 50000, max: Infinity, emoji: "🌍", color: "#f43f5e" },
  ],

  // 획득 칭호
  titles: [
    { id: 1, name: "첫 발자국", desc: "첫 콘텐츠 기록", rarity: "일반", earned: true, date: "2023.01.15", bonus: 20 },
    { id: 2, name: "열 걸음", desc: "10개 콘텐츠 기록", rarity: "일반", earned: true, date: "2023.02.20", bonus: 20 },
    { id: 3, name: "독서광", desc: "도서 50권 완독", rarity: "고급", earned: true, date: "2023.05.20", bonus: 50 },
    { id: 4, name: "비평가", desc: "리뷰 50개 작성", rarity: "희귀", earned: true, date: "2023.08.10", bonus: 100 },
    { id: 5, name: "백 권의 무게", desc: "100개 콘텐츠 기록", rarity: "고급", earned: true, date: "2023.09.15", bonus: 50 },
    { id: 6, name: "창작자", desc: "창작 20개 작성", rarity: "영웅", earned: false, progress: 60, bonus: 200 },
    { id: 7, name: "르네상스인", desc: "모든 카테고리 10개 이상", rarity: "영웅", earned: false, progress: 75, bonus: 200 },
    { id: 8, name: "기록의 화신", desc: "1000개 콘텐츠 기록", rarity: "전설", earned: false, progress: 15, bonus: 500 },
  ],

  // 장르별 선호도 (레이더 차트용)
  genrePreferences: [
    { genre: "SF", score: 85 },
    { genre: "판타지", score: 72 },
    { genre: "스릴러", score: 58 },
    { genre: "로맨스", score: 40 },
    { genre: "액션", score: 65 },
    { genre: "드라마", score: 78 },
  ],

  // 월별 트렌드 (라인 차트용)
  monthlyTrend: [
    { month: "1월", contents: 8, reviews: 5, notes: 3 },
    { month: "2월", contents: 12, reviews: 8, notes: 5 },
    { month: "3월", contents: 15, reviews: 10, notes: 7 },
    { month: "4월", contents: 10, reviews: 6, notes: 4 },
    { month: "5월", contents: 18, reviews: 12, notes: 8 },
    { month: "6월", contents: 14, reviews: 9, notes: 6 },
    { month: "7월", contents: 20, reviews: 15, notes: 10 },
    { month: "8월", contents: 16, reviews: 11, notes: 7 },
    { month: "9월", contents: 13, reviews: 8, notes: 5 },
    { month: "10월", contents: 11, reviews: 7, notes: 4 },
    { month: "11월", contents: 9, reviews: 5, notes: 3 },
    { month: "12월", contents: 6, reviews: 4, notes: 2 },
  ],

  // 최근 활동
  recentActivities: [
    { id: 1, type: "review", title: "인셉션", time: "2시간 전", points: 5, icon: "FileText" },
    { id: 2, type: "content", title: "듄 파트2", time: "5시간 전", points: 1, icon: "Plus" },
    { id: 3, type: "creation", title: "What-if: 인터스텔라", time: "1일 전", points: 10, icon: "Sparkles" },
    { id: 4, type: "note", title: "삼체 3권", time: "2일 전", points: 3, icon: "Edit" },
    { id: 5, type: "like", title: "기생충 리뷰에 좋아요", time: "2일 전", points: 2, icon: "Heart" },
    { id: 6, type: "comment", title: "인셉션 리뷰에 댓글", time: "3일 전", points: 1, icon: "MessageCircle" },
  ],
};
