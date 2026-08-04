/**
 * 경로 잇기 (Travel) 체험 표본
 *
 * ⚠️ 모든 인물·국적·직군은 실제 사실이다. 날조 없음.
 * ⚠️ 연결 이유(공유 콘텐츠 제목·세력 이름)는 실제 서비스 데이터 구조를 모사한 것이며,
 *    "이 인물이 실제로 이 책을 읽었다"는 주장이 아니라 "서비스에서 이 인물의 서재에
 *    이 콘텐츠가 등록되어 있다"는 가정이다. 명언·발언은 포함하지 않는다.
 *
 * 설계 원칙: BFS 최적 경로 3~5를 가진 쌍이 다수 존재하도록 클러스터를 구성했다.
 * - 과학자 클러스터, 문학가 클러스터, 지도자 클러스터, 사상가 클러스터를 만들고
 * - 클러스터 간 다리(bridge) 노드를 배치해 장거리 경로가 성립하게 했다.
 */

import type { AdjacencyEdge, TravelCeleb, TravelGraph } from "./types";

// ━━━ 인물 정의 (50명) ━━━

const celebList: TravelCeleb[] = [
  // 과학자 클러스터 (S)
  { id: "t-newton", nickname: "아이작 뉴턴", nicknameEn: "Isaac Newton", slug: "isaac-newton", avatarUrl: null, profession: "scientist", nationality: "GB" },
  { id: "t-einstein", nickname: "알베르트 아인슈타인", nicknameEn: "Albert Einstein", slug: "albert-einstein", avatarUrl: null, profession: "scientist", nationality: "DE" },
  { id: "t-darwin", nickname: "찰스 다윈", nicknameEn: "Charles Darwin", slug: "charles-darwin", avatarUrl: null, profession: "scientist", nationality: "GB" },
  { id: "t-curie", nickname: "마리 퀴리", nicknameEn: "Marie Curie", slug: "marie-curie", avatarUrl: null, profession: "scientist", nationality: "PL" },
  { id: "t-tesla", nickname: "니콜라 테슬라", nicknameEn: "Nikola Tesla", slug: "nikola-tesla", avatarUrl: null, profession: "scientist", nationality: "US" },
  { id: "t-feynman", nickname: "리처드 파인만", nicknameEn: "Richard Feynman", slug: "richard-feynman", avatarUrl: null, profession: "scientist", nationality: "US" },
  { id: "t-galileo", nickname: "갈릴레오 갈릴레이", nicknameEn: "Galileo Galilei", slug: "galileo-galilei", avatarUrl: null, profession: "scientist", nationality: "IT" },
  { id: "t-hawking", nickname: "스티븐 호킹", nicknameEn: "Stephen Hawking", slug: "stephen-hawking", avatarUrl: null, profession: "scientist", nationality: "GB" },

  // 문학가 클러스터 (L)
  { id: "t-shakespeare", nickname: "셰익스피어", nicknameEn: "William Shakespeare", slug: "william-shakespeare", avatarUrl: null, profession: "author", nationality: "GB" },
  { id: "t-tolstoy", nickname: "톨스토이", nicknameEn: "Leo Tolstoy", slug: "leo-tolstoy", avatarUrl: null, profession: "author", nationality: "RU" },
  { id: "t-dostoevsky", nickname: "도스토예프스키", nicknameEn: "Fyodor Dostoevsky", slug: "fyodor-dostoevsky", avatarUrl: null, profession: "author", nationality: "RU" },
  { id: "t-goethe", nickname: "괴테", nicknameEn: "Johann Wolfgang von Goethe", slug: "goethe", avatarUrl: null, profession: "author", nationality: "DE" },
  { id: "t-hugo", nickname: "빅토르 위고", nicknameEn: "Victor Hugo", slug: "victor-hugo", avatarUrl: null, profession: "author", nationality: "FR" },
  { id: "t-hemingway", nickname: "어니스트 헤밍웨이", nicknameEn: "Ernest Hemingway", slug: "ernest-hemingway", avatarUrl: null, profession: "author", nationality: "US" },
  { id: "t-borges", nickname: "호르헤 루이스 보르헤스", nicknameEn: "Jorge Luis Borges", slug: "jorge-luis-borges", avatarUrl: null, profession: "author", nationality: "AR" },

  // 지도자 클러스터 (P)
  { id: "t-napoleon", nickname: "나폴레옹", nicknameEn: "Napoleon Bonaparte", slug: "napoleon-bonaparte", avatarUrl: null, profession: "commander", nationality: "FR" },
  { id: "t-lincoln", nickname: "에이브러햄 링컨", nicknameEn: "Abraham Lincoln", slug: "abraham-lincoln", avatarUrl: null, profession: "politician", nationality: "US" },
  { id: "t-churchill", nickname: "윈스턴 처칠", nicknameEn: "Winston Churchill", slug: "winston-churchill", avatarUrl: null, profession: "politician", nationality: "GB" },
  { id: "t-gandhi", nickname: "간디", nicknameEn: "Mahatma Gandhi", slug: "mahatma-gandhi", avatarUrl: null, profession: "leader", nationality: "IN" },
  { id: "t-mandela", nickname: "넬슨 만델라", nicknameEn: "Nelson Mandela", slug: "nelson-mandela", avatarUrl: null, profession: "politician", nationality: "ZA" },
  { id: "t-caesar", nickname: "율리우스 카이사르", nicknameEn: "Julius Caesar", slug: "julius-caesar", avatarUrl: null, profession: "politician", nationality: "IT" },
  { id: "t-alexander", nickname: "알렉산드로스 대왕", nicknameEn: "Alexander the Great", slug: "alexander-the-great", avatarUrl: null, profession: "commander", nationality: "GR" },
  { id: "t-washington", nickname: "조지 워싱턴", nicknameEn: "George Washington", slug: "george-washington", avatarUrl: null, profession: "commander", nationality: "US" },

  // 사상가 클러스터 (T)
  { id: "t-socrates", nickname: "소크라테스", nicknameEn: "Socrates", slug: "socrates", avatarUrl: null, profession: "humanities_scholar", nationality: "GR" },
  { id: "t-plato", nickname: "플라톤", nicknameEn: "Plato", slug: "plato", avatarUrl: null, profession: "humanities_scholar", nationality: "GR" },
  { id: "t-aristotle", nickname: "아리스토텔레스", nicknameEn: "Aristotle", slug: "aristotle", avatarUrl: null, profession: "humanities_scholar", nationality: "GR" },
  { id: "t-confucius", nickname: "공자", nicknameEn: "Confucius", slug: "confucius", avatarUrl: null, profession: "humanities_scholar", nationality: "CN" },
  { id: "t-marx", nickname: "카를 마르크스", nicknameEn: "Karl Marx", slug: "karl-marx", avatarUrl: null, profession: "social_scientist", nationality: "DE" },
  { id: "t-nietzsche", nickname: "니체", nicknameEn: "Friedrich Nietzsche", slug: "friedrich-nietzsche", avatarUrl: null, profession: "humanities_scholar", nationality: "DE" },
  { id: "t-kant", nickname: "임마누엘 칸트", nicknameEn: "Immanuel Kant", slug: "immanuel-kant", avatarUrl: null, profession: "humanities_scholar", nationality: "DE" },
  { id: "t-descartes", nickname: "르네 데카르트", nicknameEn: "Rene Descartes", slug: "rene-descartes", avatarUrl: null, profession: "humanities_scholar", nationality: "FR" },

  // 예술가 클러스터 (A)
  { id: "t-davinci", nickname: "레오나르도 다 빈치", nicknameEn: "Leonardo da Vinci", slug: "leonardo-da-vinci", avatarUrl: null, profession: "scientist", nationality: "IT" },
  { id: "t-michelangelo", nickname: "미켈란젤로", nicknameEn: "Michelangelo", slug: "michelangelo", avatarUrl: null, profession: "visual_artist", nationality: "IT" },
  { id: "t-mozart", nickname: "모차르트", nicknameEn: "Wolfgang Amadeus Mozart", slug: "mozart", avatarUrl: null, profession: "musician", nationality: "AT" },
  { id: "t-beethoven", nickname: "베토벤", nicknameEn: "Ludwig van Beethoven", slug: "beethoven", avatarUrl: null, profession: "musician", nationality: "DE" },
  { id: "t-vangogh", nickname: "빈센트 반 고흐", nicknameEn: "Vincent van Gogh", slug: "vincent-van-gogh", avatarUrl: null, profession: "visual_artist", nationality: "NL" },

  // 현대 혁신가 클러스터 (M)
  { id: "t-jobs", nickname: "스티브 잡스", nicknameEn: "Steve Jobs", slug: "steve-jobs", avatarUrl: null, profession: "entrepreneur", nationality: "US" },
  { id: "t-musk", nickname: "일론 머스크", nicknameEn: "Elon Musk", slug: "elon-musk", avatarUrl: null, profession: "entrepreneur", nationality: "US" },
  { id: "t-gates", nickname: "빌 게이츠", nicknameEn: "Bill Gates", slug: "bill-gates", avatarUrl: null, profession: "entrepreneur", nationality: "US" },
  { id: "t-turing", nickname: "앨런 튜링", nicknameEn: "Alan Turing", slug: "alan-turing", avatarUrl: null, profession: "scientist", nationality: "GB" },

  // 동아시아 클러스터 (E)
  { id: "t-sejong", nickname: "세종대왕", nicknameEn: "Sejong the Great", slug: "sejong-the-great", avatarUrl: null, profession: "politician", nationality: "KR" },
  { id: "t-sunzi", nickname: "손자", nicknameEn: "Sun Tzu", slug: "sun-tzu", avatarUrl: null, profession: "commander", nationality: "CN" },
  { id: "t-zhuge", nickname: "제갈량", nicknameEn: "Zhuge Liang", slug: "zhuge-liang", avatarUrl: null, profession: "politician", nationality: "CN" },
  { id: "t-caocao", nickname: "조조", nicknameEn: "Cao Cao", slug: "cao-cao", avatarUrl: null, profession: "commander", nationality: "CN" },
  { id: "t-yisunsin", nickname: "이순신", nicknameEn: "Yi Sun-sin", slug: "yi-sun-sin", avatarUrl: null, profession: "commander", nationality: "KR" },

  // 다리 역할 인물들 (B)
  { id: "t-franklin", nickname: "벤저민 프랭클린", nicknameEn: "Benjamin Franklin", slug: "benjamin-franklin", avatarUrl: null, profession: "politician", nationality: "US" },
  { id: "t-voltaire", nickname: "볼테르", nicknameEn: "Voltaire", slug: "voltaire", avatarUrl: null, profession: "author", nationality: "FR" },
  { id: "t-ada", nickname: "에이다 러브레이스", nicknameEn: "Ada Lovelace", slug: "ada-lovelace", avatarUrl: null, profession: "scientist", nationality: "GB" },
  { id: "t-oppenheimer", nickname: "로버트 오펜하이머", nicknameEn: "J. Robert Oppenheimer", slug: "robert-oppenheimer", avatarUrl: null, profession: "scientist", nationality: "US" },
];

// ━━━ 인접 관계 정의 ━━━
// 간선은 양방향이다. 한쪽만 정의하면 buildGraph에서 대칭 삽입.

type RawEdge = [string, string, { type: "content" | "tag"; label: string }];

const rawEdges: RawEdge[] = [
  // 과학자 클러스터 내부
  ["t-newton", "t-einstein", { type: "content", label: "프린키피아" }],
  ["t-einstein", "t-curie", { type: "tag", label: "노벨 물리학상" }],
  ["t-einstein", "t-feynman", { type: "content", label: "상대성 이론" }],
  ["t-darwin", "t-newton", { type: "content", label: "종의 기원" }],
  ["t-curie", "t-feynman", { type: "tag", label: "노벨 물리학상" }],
  ["t-tesla", "t-einstein", { type: "content", label: "전기의 역사" }],
  ["t-galileo", "t-newton", { type: "content", label: "천문학 대화" }],
  ["t-hawking", "t-einstein", { type: "content", label: "시간의 역사" }],
  ["t-hawking", "t-feynman", { type: "content", label: "시간의 역사" }],

  // 문학가 클러스터 내부
  ["t-shakespeare", "t-goethe", { type: "content", label: "햄릿" }],
  ["t-tolstoy", "t-dostoevsky", { type: "tag", label: "러시아 문호" }],
  ["t-tolstoy", "t-hugo", { type: "content", label: "전쟁과 평화" }],
  ["t-dostoevsky", "t-borges", { type: "content", label: "죄와 벌" }],
  ["t-hemingway", "t-tolstoy", { type: "content", label: "안나 카레니나" }],
  ["t-hemingway", "t-hugo", { type: "content", label: "레 미제라블" }],
  ["t-goethe", "t-hugo", { type: "content", label: "파우스트" }],
  ["t-borges", "t-shakespeare", { type: "content", label: "돈키호테" }],

  // 지도자 클러스터 내부
  ["t-napoleon", "t-caesar", { type: "content", label: "갈리아 전쟁기" }],
  ["t-napoleon", "t-alexander", { type: "content", label: "알렉산드로스 원정기" }],
  ["t-lincoln", "t-washington", { type: "tag", label: "미국 대통령" }],
  ["t-lincoln", "t-churchill", { type: "content", label: "게티즈버그 연설" }],
  ["t-churchill", "t-mandela", { type: "content", label: "자유를 향한 긴 여정" }],
  ["t-gandhi", "t-mandela", { type: "tag", label: "비폭력 지도자" }],
  ["t-gandhi", "t-lincoln", { type: "content", label: "자서전" }],
  ["t-caesar", "t-alexander", { type: "tag", label: "고대 정복자" }],
  ["t-washington", "t-churchill", { type: "content", label: "연방주의자 논집" }],

  // 사상가 클러스터 내부
  ["t-socrates", "t-plato", { type: "tag", label: "고대 그리스 철학" }],
  ["t-plato", "t-aristotle", { type: "tag", label: "고대 그리스 철학" }],
  ["t-aristotle", "t-alexander", { type: "content", label: "니코마코스 윤리학" }],
  ["t-confucius", "t-sunzi", { type: "content", label: "논어" }],
  ["t-marx", "t-nietzsche", { type: "content", label: "자본론" }],
  ["t-nietzsche", "t-dostoevsky", { type: "content", label: "차라투스트라는 이렇게 말했다" }],
  ["t-kant", "t-nietzsche", { type: "content", label: "순수이성비판" }],
  ["t-kant", "t-descartes", { type: "content", label: "방법서설" }],
  ["t-descartes", "t-galileo", { type: "content", label: "방법서설" }],
  ["t-marx", "t-gandhi", { type: "content", label: "공산당 선언" }],

  // 예술가 클러스터 내부
  ["t-davinci", "t-michelangelo", { type: "tag", label: "르네상스 마에스트로" }],
  ["t-davinci", "t-galileo", { type: "content", label: "해부학 노트" }],
  ["t-mozart", "t-beethoven", { type: "content", label: "교향곡" }],
  ["t-beethoven", "t-goethe", { type: "content", label: "파우스트" }],
  ["t-vangogh", "t-hugo", { type: "content", label: "레 미제라블" }],

  // 현대 혁신가 클러스터 내부
  ["t-jobs", "t-gates", { type: "tag", label: "실리콘밸리 거인" }],
  ["t-jobs", "t-musk", { type: "content", label: "스티브 잡스 전기" }],
  ["t-musk", "t-gates", { type: "content", label: "제로 투 원" }],
  ["t-turing", "t-ada", { type: "content", label: "계산 기계와 지능" }],
  ["t-turing", "t-hawking", { type: "content", label: "앨런 튜링 전기" }],
  ["t-jobs", "t-feynman", { type: "content", label: "파인만 씨 농담도 잘하시네" }],

  // 동아시아 클러스터 내부
  ["t-sejong", "t-yisunsin", { type: "tag", label: "조선의 위인" }],
  ["t-sunzi", "t-zhuge", { type: "content", label: "손자병법" }],
  ["t-zhuge", "t-caocao", { type: "tag", label: "삼국지" }],
  ["t-caocao", "t-sunzi", { type: "content", label: "손자병법" }],
  ["t-confucius", "t-sejong", { type: "content", label: "논어" }],

  // 클러스터 간 다리 (Bridge edges)
  ["t-franklin", "t-voltaire", { type: "content", label: "자서전" }],
  ["t-franklin", "t-washington", { type: "tag", label: "미국 건국의 아버지" }],
  ["t-franklin", "t-newton", { type: "content", label: "광학" }],
  ["t-voltaire", "t-hugo", { type: "content", label: "캉디드" }],
  ["t-voltaire", "t-descartes", { type: "content", label: "철학 서간" }],
  ["t-voltaire", "t-napoleon", { type: "content", label: "캉디드" }],
  ["t-oppenheimer", "t-einstein", { type: "tag", label: "맨해튼 프로젝트" }],
  ["t-oppenheimer", "t-feynman", { type: "tag", label: "맨해튼 프로젝트" }],
  ["t-oppenheimer", "t-turing", { type: "content", label: "원자폭탄 이야기" }],
  ["t-ada", "t-darwin", { type: "content", label: "찰스 배비지 전기" }],
  ["t-marx", "t-lincoln", { type: "content", label: "자본론" }],
  ["t-nietzsche", "t-dostoevsky", { type: "content", label: "카라마조프 가의 형제들" }],
  ["t-tolstoy", "t-gandhi", { type: "content", label: "참회록" }],
  ["t-davinci", "t-newton", { type: "content", label: "광학" }],
  ["t-napoleon", "t-beethoven", { type: "content", label: "영웅 교향곡" }],
  ["t-sunzi", "t-napoleon", { type: "content", label: "손자병법" }],
  ["t-yisunsin", "t-napoleon", { type: "content", label: "전쟁 전략" }],
  ["t-musk", "t-oppenheimer", { type: "content", label: "물리학의 원리" }],
];

// ━━━ 그래프 구축 ━━━

function buildGraph(): TravelGraph {
  const celebs: Record<string, TravelCeleb> = {};
  for (const c of celebList) {
    celebs[c.id] = c;
  }

  const adjacency: Record<string, AdjacencyEdge[]> = {};
  // 초기화
  for (const c of celebList) {
    adjacency[c.id] = [];
  }

  for (const [from, to, reason] of rawEdges) {
    // from → to
    const existingFwd = adjacency[from].find((e) => e.targetId === to);
    if (existingFwd) {
      existingFwd.reasons.push(reason);
    } else {
      adjacency[from].push({ targetId: to, reasons: [reason] });
    }

    // to → from (양방향)
    const existingRev = adjacency[to].find((e) => e.targetId === from);
    if (existingRev) {
      existingRev.reasons.push(reason);
    } else {
      adjacency[to].push({ targetId: from, reasons: [reason] });
    }
  }

  return { adjacency, celebs };
}

export const FIXTURE_GRAPH: TravelGraph = buildGraph();
