/**
 * 상위 다섯 (Top Five) — 체험 표본 데이터
 *
 * 🔴 사실 날조 금지: 모든 인물 이름·직군·국적은 실제 사실이다.
 * 순위값은 표본용으로 임의 배정했지만, 인물 자체는 실존하며
 * 해당 분야에서 높은 영향력을 가진 인물들이다.
 *
 * 설계 원칙:
 * - 6개 퍼즐(카테고리)을 만들어 날짜별로 돌려 쓴다.
 * - 각 퍼즐: 정답 5명 + 오답 7명 = 12명 후보
 * - 오답 후보는 해당 분야와 관련 있어 착각하기 쉬운 인물로 배치 (함정)
 */

import type { TopFivePuzzle } from "./types";
import type { TopFivePool } from "./engine";

/**
 * 퍼즐 1: 과학 분야 영향력 상위 5
 * (표본 기준: 물리·수학·생물 통합)
 */
const PUZZLE_SCIENCE_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "과학자 영향력 순위",
  categoryLabelEn: "Most Influential Scientists",
  candidates: [
    { id: "einstein", label: "아인슈타인", rank: 1, isAnswer: true },
    { id: "newton", label: "뉴턴", rank: 2, isAnswer: true },
    { id: "darwin", label: "다윈", rank: 3, isAnswer: true },
    { id: "galileo", label: "갈릴레오", rank: 4, isAnswer: true },
    { id: "tesla", label: "니콜라 테슬라", rank: 5, isAnswer: true },
    { id: "feynman", label: "리처드 파인만", rank: 6, isAnswer: false },
    { id: "curie", label: "마리 퀴리", rank: 7, isAnswer: false },
    { id: "hawking", label: "스티븐 호킹", rank: 8, isAnswer: false },
    { id: "bohr", label: "닐스 보어", rank: 9, isAnswer: false },
    { id: "maxwell", label: "제임스 맥스웰", rank: 10, isAnswer: false },
    { id: "pasteur", label: "루이 파스퇴르", rank: 11, isAnswer: false },
    { id: "copernicus", label: "코페르니쿠스", rank: 12, isAnswer: false },
  ],
};

/**
 * 퍼즐 2: 작가 영향력 상위 5
 */
const PUZZLE_AUTHOR_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "작가 영향력 순위",
  categoryLabelEn: "Most Influential Authors",
  candidates: [
    { id: "shakespeare", label: "셰익스피어", rank: 1, isAnswer: true },
    { id: "tolstoy", label: "톨스토이", rank: 2, isAnswer: true },
    { id: "dostoevsky", label: "도스토예프스키", rank: 3, isAnswer: true },
    { id: "goethe", label: "괴테", rank: 4, isAnswer: true },
    { id: "hugo", label: "빅토르 위고", rank: 5, isAnswer: true },
    { id: "kafka", label: "프란츠 카프카", rank: 6, isAnswer: false },
    { id: "hemingway", label: "어니스트 헤밍웨이", rank: 7, isAnswer: false },
    { id: "twain", label: "마크 트웨인", rank: 8, isAnswer: false },
    { id: "dickens", label: "찰스 디킨스", rank: 9, isAnswer: false },
    { id: "austen", label: "제인 오스틴", rank: 10, isAnswer: false },
    { id: "dante", label: "단테", rank: 11, isAnswer: false },
    { id: "homer", label: "호메로스", rank: 12, isAnswer: false },
  ],
};

/**
 * 퍼즐 3: 지도자·정치 분야 영향력 상위 5
 */
const PUZZLE_LEADER_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "지도자 영향력 순위",
  categoryLabelEn: "Most Influential Leaders",
  candidates: [
    { id: "napoleon", label: "나폴레옹", rank: 1, isAnswer: true },
    { id: "caesar", label: "율리우스 카이사르", rank: 2, isAnswer: true },
    { id: "alexander", label: "알렉산드로스 대왕", rank: 3, isAnswer: true },
    { id: "lincoln", label: "에이브러햄 링컨", rank: 4, isAnswer: true },
    { id: "churchill", label: "윈스턴 처칠", rank: 5, isAnswer: true },
    { id: "gandhi", label: "마하트마 간디", rank: 6, isAnswer: false },
    { id: "mandela", label: "넬슨 만델라", rank: 7, isAnswer: false },
    { id: "washington", label: "조지 워싱턴", rank: 8, isAnswer: false },
    { id: "genghis", label: "칭기즈 칸", rank: 9, isAnswer: false },
    { id: "bismarck", label: "오토 폰 비스마르크", rank: 10, isAnswer: false },
    { id: "augustus", label: "아우구스투스", rank: 11, isAnswer: false },
    { id: "sejong", label: "세종대왕", rank: 12, isAnswer: false },
  ],
};

/**
 * 퍼즐 4: 기업가 영향력 상위 5
 */
const PUZZLE_ENTREPRENEUR_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "기업가 영향력 순위",
  categoryLabelEn: "Most Influential Entrepreneurs",
  candidates: [
    { id: "jobs", label: "스티브 잡스", rank: 1, isAnswer: true },
    { id: "musk", label: "일론 머스크", rank: 2, isAnswer: true },
    { id: "rockefeller", label: "존 D. 록펠러", rank: 3, isAnswer: true },
    { id: "carnegie", label: "앤드루 카네기", rank: 4, isAnswer: true },
    { id: "bezos", label: "제프 베이조스", rank: 5, isAnswer: true },
    { id: "gates", label: "빌 게이츠", rank: 6, isAnswer: false },
    { id: "buffett", label: "워런 버핏", rank: 7, isAnswer: false },
    { id: "ford", label: "헨리 포드", rank: 8, isAnswer: false },
    { id: "zuckerberg", label: "마크 저커버그", rank: 9, isAnswer: false },
    { id: "ma", label: "마윈", rank: 10, isAnswer: false },
    { id: "thiel", label: "피터 틸", rank: 11, isAnswer: false },
    { id: "altman", label: "샘 올트먼", rank: 12, isAnswer: false },
  ],
};

/**
 * 퍼즐 5: 음악가 영향력 상위 5
 */
const PUZZLE_MUSICIAN_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "음악가 영향력 순위",
  categoryLabelEn: "Most Influential Musicians",
  candidates: [
    { id: "beethoven", label: "베토벤", rank: 1, isAnswer: true },
    { id: "mozart", label: "모차르트", rank: 2, isAnswer: true },
    { id: "bach", label: "바흐", rank: 3, isAnswer: true },
    { id: "beatles", label: "존 레논", rank: 4, isAnswer: true },
    { id: "wagner", label: "리하르트 바그너", rank: 5, isAnswer: true },
    { id: "chopin", label: "프레데리크 쇼팽", rank: 6, isAnswer: false },
    { id: "vivaldi", label: "비발디", rank: 7, isAnswer: false },
    { id: "stravinsky", label: "스트라빈스키", rank: 8, isAnswer: false },
    { id: "debussy", label: "드뷔시", rank: 9, isAnswer: false },
    { id: "hendrix", label: "지미 헨드릭스", rank: 10, isAnswer: false },
    { id: "bowie", label: "데이비드 보위", rank: 11, isAnswer: false },
    { id: "schubert", label: "슈베르트", rank: 12, isAnswer: false },
  ],
};

/**
 * 퍼즐 6: 시각예술가 영향력 상위 5
 */
const PUZZLE_ARTIST_INFLUENCE: TopFivePuzzle = {
  dateKey: "",
  categoryType: "profession_influence",
  categoryLabel: "시각예술가 영향력 순위",
  categoryLabelEn: "Most Influential Visual Artists",
  candidates: [
    { id: "davinci", label: "레오나르도 다 빈치", rank: 1, isAnswer: true },
    { id: "picasso", label: "파블로 피카소", rank: 2, isAnswer: true },
    { id: "michelangelo", label: "미켈란젤로", rank: 3, isAnswer: true },
    { id: "vangogh", label: "빈센트 반 고흐", rank: 4, isAnswer: true },
    { id: "rembrandt", label: "렘브란트", rank: 5, isAnswer: true },
    { id: "monet", label: "클로드 모네", rank: 6, isAnswer: false },
    { id: "dali", label: "살바도르 달리", rank: 7, isAnswer: false },
    { id: "warhol", label: "앤디 워홀", rank: 8, isAnswer: false },
    { id: "raphael", label: "라파엘로", rank: 9, isAnswer: false },
    { id: "klimt", label: "구스타프 클림트", rank: 10, isAnswer: false },
    { id: "hokusai", label: "가쓰시카 호쿠사이", rank: 11, isAnswer: false },
    { id: "caravaggio", label: "카라바조", rank: 12, isAnswer: false },
  ],
};

// ─── EN 변형 ─────────────────────────────────────────────────

const PUZZLE_SCIENCE_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_SCIENCE_INFLUENCE,
  candidates: [
    { id: "einstein", label: "Albert Einstein", rank: 1, isAnswer: true },
    { id: "newton", label: "Isaac Newton", rank: 2, isAnswer: true },
    { id: "darwin", label: "Charles Darwin", rank: 3, isAnswer: true },
    { id: "galileo", label: "Galileo Galilei", rank: 4, isAnswer: true },
    { id: "tesla", label: "Nikola Tesla", rank: 5, isAnswer: true },
    { id: "feynman", label: "Richard Feynman", rank: 6, isAnswer: false },
    { id: "curie", label: "Marie Curie", rank: 7, isAnswer: false },
    { id: "hawking", label: "Stephen Hawking", rank: 8, isAnswer: false },
    { id: "bohr", label: "Niels Bohr", rank: 9, isAnswer: false },
    { id: "maxwell", label: "James Clerk Maxwell", rank: 10, isAnswer: false },
    { id: "pasteur", label: "Louis Pasteur", rank: 11, isAnswer: false },
    { id: "copernicus", label: "Nicolaus Copernicus", rank: 12, isAnswer: false },
  ],
};

const PUZZLE_AUTHOR_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_AUTHOR_INFLUENCE,
  candidates: [
    { id: "shakespeare", label: "William Shakespeare", rank: 1, isAnswer: true },
    { id: "tolstoy", label: "Leo Tolstoy", rank: 2, isAnswer: true },
    { id: "dostoevsky", label: "Fyodor Dostoevsky", rank: 3, isAnswer: true },
    { id: "goethe", label: "Johann Wolfgang von Goethe", rank: 4, isAnswer: true },
    { id: "hugo", label: "Victor Hugo", rank: 5, isAnswer: true },
    { id: "kafka", label: "Franz Kafka", rank: 6, isAnswer: false },
    { id: "hemingway", label: "Ernest Hemingway", rank: 7, isAnswer: false },
    { id: "twain", label: "Mark Twain", rank: 8, isAnswer: false },
    { id: "dickens", label: "Charles Dickens", rank: 9, isAnswer: false },
    { id: "austen", label: "Jane Austen", rank: 10, isAnswer: false },
    { id: "dante", label: "Dante Alighieri", rank: 11, isAnswer: false },
    { id: "homer", label: "Homer", rank: 12, isAnswer: false },
  ],
};

const PUZZLE_LEADER_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_LEADER_INFLUENCE,
  candidates: [
    { id: "napoleon", label: "Napoleon Bonaparte", rank: 1, isAnswer: true },
    { id: "caesar", label: "Julius Caesar", rank: 2, isAnswer: true },
    { id: "alexander", label: "Alexander the Great", rank: 3, isAnswer: true },
    { id: "lincoln", label: "Abraham Lincoln", rank: 4, isAnswer: true },
    { id: "churchill", label: "Winston Churchill", rank: 5, isAnswer: true },
    { id: "gandhi", label: "Mahatma Gandhi", rank: 6, isAnswer: false },
    { id: "mandela", label: "Nelson Mandela", rank: 7, isAnswer: false },
    { id: "washington", label: "George Washington", rank: 8, isAnswer: false },
    { id: "genghis", label: "Genghis Khan", rank: 9, isAnswer: false },
    { id: "bismarck", label: "Otto von Bismarck", rank: 10, isAnswer: false },
    { id: "augustus", label: "Augustus", rank: 11, isAnswer: false },
    { id: "sejong", label: "Sejong the Great", rank: 12, isAnswer: false },
  ],
};

const PUZZLE_ENTREPRENEUR_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_ENTREPRENEUR_INFLUENCE,
  candidates: [
    { id: "jobs", label: "Steve Jobs", rank: 1, isAnswer: true },
    { id: "musk", label: "Elon Musk", rank: 2, isAnswer: true },
    { id: "rockefeller", label: "John D. Rockefeller", rank: 3, isAnswer: true },
    { id: "carnegie", label: "Andrew Carnegie", rank: 4, isAnswer: true },
    { id: "bezos", label: "Jeff Bezos", rank: 5, isAnswer: true },
    { id: "gates", label: "Bill Gates", rank: 6, isAnswer: false },
    { id: "buffett", label: "Warren Buffett", rank: 7, isAnswer: false },
    { id: "ford", label: "Henry Ford", rank: 8, isAnswer: false },
    { id: "zuckerberg", label: "Mark Zuckerberg", rank: 9, isAnswer: false },
    { id: "ma", label: "Jack Ma", rank: 10, isAnswer: false },
    { id: "thiel", label: "Peter Thiel", rank: 11, isAnswer: false },
    { id: "altman", label: "Sam Altman", rank: 12, isAnswer: false },
  ],
};

const PUZZLE_MUSICIAN_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_MUSICIAN_INFLUENCE,
  candidates: [
    { id: "beethoven", label: "Ludwig van Beethoven", rank: 1, isAnswer: true },
    { id: "mozart", label: "Wolfgang Amadeus Mozart", rank: 2, isAnswer: true },
    { id: "bach", label: "Johann Sebastian Bach", rank: 3, isAnswer: true },
    { id: "beatles", label: "John Lennon", rank: 4, isAnswer: true },
    { id: "wagner", label: "Richard Wagner", rank: 5, isAnswer: true },
    { id: "chopin", label: "Frédéric Chopin", rank: 6, isAnswer: false },
    { id: "vivaldi", label: "Antonio Vivaldi", rank: 7, isAnswer: false },
    { id: "stravinsky", label: "Igor Stravinsky", rank: 8, isAnswer: false },
    { id: "debussy", label: "Claude Debussy", rank: 9, isAnswer: false },
    { id: "hendrix", label: "Jimi Hendrix", rank: 10, isAnswer: false },
    { id: "bowie", label: "David Bowie", rank: 11, isAnswer: false },
    { id: "schubert", label: "Franz Schubert", rank: 12, isAnswer: false },
  ],
};

const PUZZLE_ARTIST_INFLUENCE_EN: TopFivePuzzle = {
  ...PUZZLE_ARTIST_INFLUENCE,
  candidates: [
    { id: "davinci", label: "Leonardo da Vinci", rank: 1, isAnswer: true },
    { id: "picasso", label: "Pablo Picasso", rank: 2, isAnswer: true },
    { id: "michelangelo", label: "Michelangelo", rank: 3, isAnswer: true },
    { id: "vangogh", label: "Vincent van Gogh", rank: 4, isAnswer: true },
    { id: "rembrandt", label: "Rembrandt", rank: 5, isAnswer: true },
    { id: "monet", label: "Claude Monet", rank: 6, isAnswer: false },
    { id: "dali", label: "Salvador Dalí", rank: 7, isAnswer: false },
    { id: "warhol", label: "Andy Warhol", rank: 8, isAnswer: false },
    { id: "raphael", label: "Raphael", rank: 9, isAnswer: false },
    { id: "klimt", label: "Gustav Klimt", rank: 10, isAnswer: false },
    { id: "hokusai", label: "Katsushika Hokusai", rank: 11, isAnswer: false },
    { id: "caravaggio", label: "Caravaggio", rank: 12, isAnswer: false },
  ],
};

// ─── 공개 API ────────────────────────────────────────────────

export function getFixturePool(locale: string): TopFivePool {
  const isEn = locale === "en";
  return {
    puzzles: isEn
      ? [
          PUZZLE_SCIENCE_INFLUENCE_EN,
          PUZZLE_AUTHOR_INFLUENCE_EN,
          PUZZLE_LEADER_INFLUENCE_EN,
          PUZZLE_ENTREPRENEUR_INFLUENCE_EN,
          PUZZLE_MUSICIAN_INFLUENCE_EN,
          PUZZLE_ARTIST_INFLUENCE_EN,
        ]
      : [
          PUZZLE_SCIENCE_INFLUENCE,
          PUZZLE_AUTHOR_INFLUENCE,
          PUZZLE_LEADER_INFLUENCE,
          PUZZLE_ENTREPRENEUR_INFLUENCE,
          PUZZLE_MUSICIAN_INFLUENCE,
          PUZZLE_ARTIST_INFLUENCE,
        ],
  };
}

/** 체험 모드인지 여부 (환경값 미설정 시 true) */
export function isFixtureMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_DB_API_URL ||
    !process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY
  );
}
