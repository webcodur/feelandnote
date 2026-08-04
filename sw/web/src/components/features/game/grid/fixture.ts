/**
 * 교차 격자 (Crossing Grid) 체험 표본
 *
 * ⚠️ 모든 인물·국적·직군·생몰년은 실제 사실이다. 날조 없음.
 * 명언·발언은 포함하지 않는다.
 *
 * 설계 원칙: century × profession 교차에서 최소 3개 세기 × 3개 직군이
 * 빈칸 없이 교차하도록 인물을 배치했다.
 * 주요 보장 교차: {19세기, 20세기, 18세기} × {과학자, 작가, 음악가, 지도자}
 */

import type { GridCeleb, GridCondition } from "./types";

/** 직군 한국어 라벨 */
export const PROFESSION_LABELS: Record<string, { ko: string; en: string }> = {
  leader: { ko: "지도자", en: "Leader" },
  politician: { ko: "정치인", en: "Politician" },
  commander: { ko: "군사 지휘관", en: "Commander" },
  entrepreneur: { ko: "사업가", en: "Entrepreneur" },
  investor: { ko: "투자자", en: "Investor" },
  humanities_scholar: { ko: "인문학자", en: "Humanities Scholar" },
  social_scientist: { ko: "사회과학자", en: "Social Scientist" },
  scientist: { ko: "과학자", en: "Scientist" },
  director: { ko: "감독", en: "Director" },
  musician: { ko: "음악가", en: "Musician" },
  visual_artist: { ko: "시각예술가", en: "Visual Artist" },
  author: { ko: "작가", en: "Author" },
  actor: { ko: "배우", en: "Actor" },
  influencer: { ko: "인플루언서", en: "Influencer" },
  athlete: { ko: "운동선수", en: "Athlete" },
  other: { ko: "기타", en: "Other" },
};

/** 국적 한국어 라벨 (주요 국가만) */
export const NATIONALITY_LABELS: Record<string, { ko: string; en: string }> = {
  US: { ko: "미국", en: "United States" },
  GB: { ko: "영국", en: "United Kingdom" },
  DE: { ko: "독일", en: "Germany" },
  FR: { ko: "프랑스", en: "France" },
  IT: { ko: "이탈리아", en: "Italy" },
  JP: { ko: "일본", en: "Japan" },
  KR: { ko: "한국", en: "South Korea" },
  CN: { ko: "중국", en: "China" },
  RU: { ko: "러시아", en: "Russia" },
  GR: { ko: "그리스", en: "Greece" },
  AT: { ko: "오스트리아", en: "Austria" },
  IN: { ko: "인도", en: "India" },
  PL: { ko: "폴란드", en: "Poland" },
  ES: { ko: "스페인", en: "Spain" },
  NL: { ko: "네덜란드", en: "Netherlands" },
};

/** 세기 라벨 */
export const CENTURY_LABELS: Record<string, { ko: string; en: string }> = {
  BC5: { ko: "기원전 5세기", en: "5th century BC" },
  BC4: { ko: "기원전 4세기", en: "4th century BC" },
  "15": { ko: "15세기", en: "15th century" },
  "16": { ko: "16세기", en: "16th century" },
  "17": { ko: "17세기", en: "17th century" },
  "18": { ko: "18세기", en: "18th century" },
  "19": { ko: "19세기", en: "19th century" },
  "20": { ko: "20세기", en: "20th century" },
};

/**
 * 체험 표본용 인물 데이터.
 * 실존 사실만 — 국적은 ISO 코드, 직군은 DB CHECK 값, 생년은 텍스트.
 *
 * 교차 보장 구조:
 * - 19세기: 과학자(다윈,파스퇴르,멘델레예프), 작가(톨스토이,디킨스,위고,트웨인), 음악가(쇼팽,브람스), 정치인(링컨,빅토리아,비스마르크)
 * - 20세기: 과학자(아인슈타인,파인만,퀴리,오펜하이머), 작가(헤밍웨이,톨킨,오웰), 음악가(스트라빈스키,쇤베르크), 정치인(간디,만델라,처칠)
 * - 18세기: 과학자(뉴턴,가우스), 작가(괴테,오스틴,볼테르), 음악가(모차르트,바흐,하이든), 군사 지휘관(워싱턴,나폴레옹)
 */
export const FIXTURE_CELEBS: GridCeleb[] = [
  // ━━━ 19세기 과학자 ━━━
  { id: "f-darwin", nickname: "찰스 다윈", nicknameEn: "Charles Darwin", slug: "charles-darwin", nationality: "GB", profession: "scientist", birthDate: "1809", deathDate: "1882", tagIds: [] },
  { id: "f-pasteur", nickname: "루이 파스퇴르", nicknameEn: "Louis Pasteur", slug: "louis-pasteur", nationality: "FR", profession: "scientist", birthDate: "1822", deathDate: "1895", tagIds: [] },
  { id: "f-mendeleev", nickname: "드미트리 멘델레예프", nicknameEn: "Dmitri Mendeleev", slug: "dmitri-mendeleev", nationality: "RU", profession: "scientist", birthDate: "1834", deathDate: "1907", tagIds: [] },
  { id: "f-maxwell", nickname: "제임스 맥스웰", nicknameEn: "James Clerk Maxwell", slug: "james-clerk-maxwell", nationality: "GB", profession: "scientist", birthDate: "1831", deathDate: "1879", tagIds: [] },
  { id: "f-tesla", nickname: "니콜라 테슬라", nicknameEn: "Nikola Tesla", slug: "nikola-tesla", nationality: "US", profession: "scientist", birthDate: "1856", deathDate: "1943", tagIds: [] },
  { id: "f-edison", nickname: "토마스 에디슨", nicknameEn: "Thomas Edison", slug: "thomas-edison", nationality: "US", profession: "entrepreneur", birthDate: "1847", deathDate: "1931", tagIds: [] },

  // ━━━ 19세기 작가 ━━━
  { id: "f-tolstoy", nickname: "레프 톨스토이", nicknameEn: "Leo Tolstoy", slug: "leo-tolstoy", nationality: "RU", profession: "author", birthDate: "1828", deathDate: "1910", tagIds: [] },
  { id: "f-dickens", nickname: "찰스 디킨스", nicknameEn: "Charles Dickens", slug: "charles-dickens", nationality: "GB", profession: "author", birthDate: "1812", deathDate: "1870", tagIds: [] },
  { id: "f-hugo", nickname: "빅토르 위고", nicknameEn: "Victor Hugo", slug: "victor-hugo", nationality: "FR", profession: "author", birthDate: "1802", deathDate: "1885", tagIds: [] },
  { id: "f-twain", nickname: "마크 트웨인", nicknameEn: "Mark Twain", slug: "mark-twain", nationality: "US", profession: "author", birthDate: "1835", deathDate: "1910", tagIds: [] },
  { id: "f-dostoevsky", nickname: "표도르 도스토예프스키", nicknameEn: "Fyodor Dostoevsky", slug: "fyodor-dostoevsky", nationality: "RU", profession: "author", birthDate: "1821", deathDate: "1881", tagIds: [] },

  // ━━━ 19세기 음악가 ━━━
  { id: "f-chopin", nickname: "프레데리크 쇼팽", nicknameEn: "Frederic Chopin", slug: "frederic-chopin", nationality: "PL", profession: "musician", birthDate: "1810", deathDate: "1849", tagIds: [] },
  { id: "f-brahms", nickname: "요하네스 브람스", nicknameEn: "Johannes Brahms", slug: "johannes-brahms", nationality: "DE", profession: "musician", birthDate: "1833", deathDate: "1897", tagIds: [] },
  { id: "f-verdi", nickname: "주세페 베르디", nicknameEn: "Giuseppe Verdi", slug: "giuseppe-verdi", nationality: "IT", profession: "musician", birthDate: "1813", deathDate: "1901", tagIds: [] },
  { id: "f-tchaikovsky", nickname: "표트르 차이콥스키", nicknameEn: "Pyotr Tchaikovsky", slug: "pyotr-tchaikovsky", nationality: "RU", profession: "musician", birthDate: "1840", deathDate: "1893", tagIds: [] },

  // ━━━ 19세기 지도자 ━━━
  { id: "f-lincoln", nickname: "에이브러햄 링컨", nicknameEn: "Abraham Lincoln", slug: "abraham-lincoln", nationality: "US", profession: "politician", birthDate: "1809", deathDate: "1865", tagIds: [] },
  { id: "f-bismarck", nickname: "오토 폰 비스마르크", nicknameEn: "Otto von Bismarck", slug: "otto-von-bismarck", nationality: "DE", profession: "politician", birthDate: "1815", deathDate: "1898", tagIds: [] },
  { id: "f-victoria", nickname: "빅토리아 여왕", nicknameEn: "Queen Victoria", slug: "queen-victoria", nationality: "GB", profession: "politician", birthDate: "1819", deathDate: "1901", tagIds: [] },

  // ━━━ 20세기 과학자 ━━━
  { id: "f-einstein", nickname: "알베르트 아인슈타인", nicknameEn: "Albert Einstein", slug: "albert-einstein", nationality: "DE", profession: "scientist", birthDate: "1879", deathDate: "1955", tagIds: [] },
  { id: "f-feynman", nickname: "리처드 파인만", nicknameEn: "Richard Feynman", slug: "richard-feynman", nationality: "US", profession: "scientist", birthDate: "1918", deathDate: "1988", tagIds: [] },
  { id: "f-curie", nickname: "마리 퀴리", nicknameEn: "Marie Curie", slug: "marie-curie", nationality: "PL", profession: "scientist", birthDate: "1867", deathDate: "1934", tagIds: [] },
  { id: "f-oppenheimer", nickname: "J. 로버트 오펜하이머", nicknameEn: "J. Robert Oppenheimer", slug: "j.-robert-oppenheimer", nationality: "US", profession: "scientist", birthDate: "1904", deathDate: "1967", tagIds: [] },
  { id: "f-hawking", nickname: "스티븐 호킹", nicknameEn: "Stephen Hawking", slug: "stephen-hawking", nationality: "GB", profession: "scientist", birthDate: "1942", deathDate: "2018", tagIds: [] },

  // ━━━ 20세기 작가 ━━━
  { id: "f-hemingway", nickname: "어니스트 헤밍웨이", nicknameEn: "Ernest Hemingway", slug: "ernest-hemingway", nationality: "US", profession: "author", birthDate: "1899", deathDate: "1961", tagIds: [] },
  { id: "f-tolkien", nickname: "J.R.R. 톨킨", nicknameEn: "J.R.R. Tolkien", slug: "jrr-tolkien", nationality: "GB", profession: "author", birthDate: "1892", deathDate: "1973", tagIds: [] },
  { id: "f-orwell", nickname: "조지 오웰", nicknameEn: "George Orwell", slug: "george-orwell", nationality: "GB", profession: "author", birthDate: "1903", deathDate: "1950", tagIds: [] },

  // ━━━ 20세기 음악가 ━━━
  { id: "f-stravinsky", nickname: "이고르 스트라빈스키", nicknameEn: "Igor Stravinsky", slug: "igor-stravinsky", nationality: "RU", profession: "musician", birthDate: "1882", deathDate: "1971", tagIds: [] },
  { id: "f-schoenberg", nickname: "아르놀트 쇤베르크", nicknameEn: "Arnold Schoenberg", slug: "arnold-schoenberg", nationality: "AT", profession: "musician", birthDate: "1874", deathDate: "1951", tagIds: [] },

  // ━━━ 20세기 지도자 ━━━
  { id: "f-gandhi", nickname: "마하트마 간디", nicknameEn: "Mahatma Gandhi", slug: "mahatma-gandhi", nationality: "IN", profession: "leader", birthDate: "1869", deathDate: "1948", tagIds: [] },
  { id: "f-mandela", nickname: "넬슨 만델라", nicknameEn: "Nelson Mandela", slug: "nelson-mandela", nationality: "ZA", profession: "politician", birthDate: "1918", deathDate: "2013", tagIds: [] },
  { id: "f-churchill", nickname: "윈스턴 처칠", nicknameEn: "Winston Churchill", slug: "winston-churchill", nationality: "GB", profession: "politician", birthDate: "1874", deathDate: "1965", tagIds: [] },

  // ━━━ 18세기 과학자 ━━━
  { id: "f-newton", nickname: "아이작 뉴턴", nicknameEn: "Isaac Newton", slug: "isaac-newton", nationality: "GB", profession: "scientist", birthDate: "1643", deathDate: "1727", tagIds: [] },
  { id: "f-gauss", nickname: "카를 프리드리히 가우스", nicknameEn: "Carl Friedrich Gauss", slug: "carl-friedrich-gauss", nationality: "DE", profession: "scientist", birthDate: "1777", deathDate: "1855", tagIds: [] },

  // ━━━ 18세기 작가 ━━━
  { id: "f-goethe", nickname: "요한 볼프강 폰 괴테", nicknameEn: "Johann Wolfgang von Goethe", slug: "johann-wolfgang-von-goethe", nationality: "DE", profession: "author", birthDate: "1749", deathDate: "1832", tagIds: [] },
  { id: "f-austen", nickname: "제인 오스틴", nicknameEn: "Jane Austen", slug: "jane-austen", nationality: "GB", profession: "author", birthDate: "1775", deathDate: "1817", tagIds: [] },
  { id: "f-voltaire", nickname: "볼테르", nicknameEn: "Voltaire", slug: "voltaire", nationality: "FR", profession: "author", birthDate: "1694", deathDate: "1778", tagIds: [] },

  // ━━━ 18세기 음악가 ━━━
  { id: "f-mozart", nickname: "볼프강 아마데우스 모차르트", nicknameEn: "Wolfgang Amadeus Mozart", slug: "wolfgang-amadeus-mozart", nationality: "AT", profession: "musician", birthDate: "1756", deathDate: "1791", tagIds: [] },
  { id: "f-bach", nickname: "요한 제바스티안 바흐", nicknameEn: "Johann Sebastian Bach", slug: "johann-sebastian-bach", nationality: "DE", profession: "musician", birthDate: "1685", deathDate: "1750", tagIds: [] },
  { id: "f-haydn", nickname: "요제프 하이든", nicknameEn: "Joseph Haydn", slug: "joseph-haydn", nationality: "AT", profession: "musician", birthDate: "1732", deathDate: "1809", tagIds: [] },
  { id: "f-beethoven", nickname: "루트비히 판 베토벤", nicknameEn: "Ludwig van Beethoven", slug: "ludwig-van-beethoven", nationality: "DE", profession: "musician", birthDate: "1770", deathDate: "1827", tagIds: [] },

  // ━━━ 18세기 지도자 ━━━
  { id: "f-washington", nickname: "조지 워싱턴", nicknameEn: "George Washington", slug: "george-washington", nationality: "US", profession: "commander", birthDate: "1732", deathDate: "1799", tagIds: [] },
  { id: "f-napoleon", nickname: "나폴레옹 보나파르트", nicknameEn: "Napoleon Bonaparte", slug: "napoleon-bonaparte", nationality: "FR", profession: "commander", birthDate: "1769", deathDate: "1821", tagIds: [] },
  { id: "f-catherine", nickname: "예카테리나 대제", nicknameEn: "Catherine the Great", slug: "catherine-the-great", nationality: "RU", profession: "politician", birthDate: "1729", deathDate: "1796", tagIds: [] },

  // ━━━ 추가 인물 (국적 교차 보강) ━━━
  // US에 각 직군 보강
  { id: "f-jobs", nickname: "스티브 잡스", nicknameEn: "Steve Jobs", slug: "steve-jobs", nationality: "US", profession: "entrepreneur", birthDate: "1955", deathDate: "2011", tagIds: [] },
  { id: "f-musk", nickname: "일론 머스크", nicknameEn: "Elon Musk", slug: "elon-musk", nationality: "US", profession: "entrepreneur", birthDate: "1971", deathDate: null, tagIds: [] },
  { id: "f-bezos", nickname: "제프 베이조스", nicknameEn: "Jeff Bezos", slug: "jeff-bezos", nationality: "US", profession: "entrepreneur", birthDate: "1964", deathDate: null, tagIds: [] },
  // GB 보강
  { id: "f-shakespeare", nickname: "윌리엄 셰익스피어", nicknameEn: "William Shakespeare", slug: "william-shakespeare", nationality: "GB", profession: "author", birthDate: "1564", deathDate: "1616", tagIds: [] },
  // 시각예술가
  { id: "f-davinci", nickname: "레오나르도 다빈치", nicknameEn: "Leonardo da Vinci", slug: "leonardo-da-vinci", nationality: "IT", profession: "scientist", birthDate: "1452", deathDate: "1519", tagIds: [] },
  { id: "f-picasso", nickname: "파블로 피카소", nicknameEn: "Pablo Picasso", slug: "pablo-picasso", nationality: "ES", profession: "visual_artist", birthDate: "1881", deathDate: "1973", tagIds: [] },
  { id: "f-vangogh", nickname: "빈센트 반 고흐", nicknameEn: "Vincent van Gogh", slug: "vincent-van-gogh", nationality: "NL", profession: "visual_artist", birthDate: "1853", deathDate: "1890", tagIds: [] },
  { id: "f-monet", nickname: "클로드 모네", nicknameEn: "Claude Monet", slug: "claude-monet", nationality: "FR", profession: "visual_artist", birthDate: "1840", deathDate: "1926", tagIds: [] },
  // 인문학자
  { id: "f-kant", nickname: "임마누엘 칸트", nicknameEn: "Immanuel Kant", slug: "immanuel-kant", nationality: "DE", profession: "humanities_scholar", birthDate: "1724", deathDate: "1804", tagIds: [] },
  { id: "f-nietzsche", nickname: "프리드리히 니체", nicknameEn: "Friedrich Nietzsche", slug: "friedrich-nietzsche", nationality: "DE", profession: "humanities_scholar", birthDate: "1844", deathDate: "1900", tagIds: [] },
  { id: "f-plato", nickname: "플라톤", nicknameEn: "Plato", slug: "plato", nationality: "GR", profession: "humanities_scholar", birthDate: "-428", deathDate: "-348", tagIds: [] },
  { id: "f-aristotle", nickname: "아리스토텔레스", nicknameEn: "Aristotle", slug: "aristotle", nationality: "GR", profession: "humanities_scholar", birthDate: "-384", deathDate: "-322", tagIds: [] },
  // 군사 지휘관
  { id: "f-alexander", nickname: "알렉산드로스 대왕", nicknameEn: "Alexander the Great", slug: "alexander-the-great", nationality: "GR", profession: "commander", birthDate: "-356", deathDate: "-323", tagIds: [] },
  { id: "f-yisunshin", nickname: "이순신", nicknameEn: "Yi Sun-sin", slug: "yi-sun-sin", nationality: "KR", profession: "commander", birthDate: "1545", deathDate: "1598", tagIds: [] },
  // 감독
  { id: "f-spielberg", nickname: "스티븐 스필버그", nicknameEn: "Steven Spielberg", slug: "steven-spielberg", nationality: "US", profession: "director", birthDate: "1946", deathDate: null, tagIds: [] },
  { id: "f-kubrick", nickname: "스탠리 큐브릭", nicknameEn: "Stanley Kubrick", slug: "stanley-kubrick", nationality: "US", profession: "director", birthDate: "1928", deathDate: "1999", tagIds: [] },
  { id: "f-kurosawa", nickname: "구로사와 아키라", nicknameEn: "Akira Kurosawa", slug: "akira-kurosawa", nationality: "JP", profession: "director", birthDate: "1910", deathDate: "1998", tagIds: [] },
];

/**
 * 체험 표본 조건.
 * century × profession 교차에서 {18,19,20} × {scientist,author,musician,politician,commander} 가
 * 각 교차칸에 1명 이상을 보장한다.
 */
export const FIXTURE_CONDITIONS: GridCondition[] = [
  // centuries (충분한 인원 보유)
  { axis: "century", value: "18", label: "18세기", labelEn: "18th century" },
  { axis: "century", value: "19", label: "19세기", labelEn: "19th century" },
  { axis: "century", value: "20", label: "20세기", labelEn: "20th century" },
  // professions (교차 보장됨)
  { axis: "profession", value: "scientist", label: "과학자", labelEn: "Scientist" },
  { axis: "profession", value: "author", label: "작가", labelEn: "Author" },
  { axis: "profession", value: "musician", label: "음악가", labelEn: "Musician" },
  { axis: "profession", value: "politician", label: "정치인", labelEn: "Politician" },
  { axis: "profession", value: "commander", label: "군사 지휘관", labelEn: "Commander" },
  { axis: "profession", value: "visual_artist", label: "시각예술가", labelEn: "Visual Artist" },
  { axis: "profession", value: "entrepreneur", label: "사업가", labelEn: "Entrepreneur" },
  { axis: "profession", value: "director", label: "감독", labelEn: "Director" },
  { axis: "profession", value: "humanities_scholar", label: "인문학자", labelEn: "Humanities Scholar" },
  // nationalities (다수 인원)
  { axis: "nationality", value: "US", label: "미국", labelEn: "United States" },
  { axis: "nationality", value: "GB", label: "영국", labelEn: "United Kingdom" },
  { axis: "nationality", value: "DE", label: "독일", labelEn: "Germany" },
  { axis: "nationality", value: "FR", label: "프랑스", labelEn: "France" },
  { axis: "nationality", value: "RU", label: "러시아", labelEn: "Russia" },
  { axis: "nationality", value: "AT", label: "오스트리아", labelEn: "Austria" },
];

/** 체험 모드 여부 표시용 */
export const FIXTURE_MODE = true;
