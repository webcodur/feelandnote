/**
 * 넷씩 넷 (Groups) — 체험 표본 데이터
 *
 * 🔴 사실 날조 금지: 인물 이름·직군·국적은 실제 사실만.
 * 묶음 축은 DB에 실재하는 값(profession, nationality, celeb_tags)을 기반으로 한다.
 *
 * 표본 설계 원칙:
 * - 각 인물은 정확히 한 묶음에만 해당하도록 배치한다.
 * - 겹칠 듯 겹치지 않는 함정 구조: 같은 시대·같은 분야인데 다른 축으로 묶임.
 * - 난이도 0(쉬움)~3(매우 어려움) 순서.
 */

import type { GroupDef, GroupItem } from "./types";
import type { PuzzlePool } from "./engine";

/**
 * 체험용 퍼즐 풀 — 6개 묶음 (4개를 날짜별로 선택)
 *
 * 함정 설계:
 * - 묶음 A: 과학자(scientist) 4명 → 국적이 모두 다름(독일·영국·미국·폴란드)
 * - 묶음 B: 기업가(entrepreneur) 4명 → 미국인이 3명 있지만 국적이 아니라 직군이 기준
 * - 묶음 C: 한국인(Korea) 4명 → 직군이 모두 다름(지도자·지휘관·작가·과학자)
 * - 묶음 D: 작가(author) 4명 → 국적이 모두 다름(러시아·프랑스·영국·콜롬비아)
 * - 묶음 E: 일본인(Japan) 4명 → 직군이 모두 다름
 * - 묶음 F: 지휘관(commander) 4명 → 국적이 모두 다름
 *
 * 핵심 함정:
 * - 세종(한국 과학 업적)은 과학자가 아니라 "한국인" 묶음 (지도자)
 * - 장영실(한국 과학자)은 "한국인" 묶음 (한국 과학자이지만 "과학자" 묶음은 외국인들)
 * - 스티브 잡스(미국)는 기업가 묶음이지 미국인 묶음이 아님
 * - 톨스토이(러시아 작가)는 작가 묶음이지 국적 묶음 아님
 */

const FIXTURE_GROUPS: GroupDef[] = [
  {
    label: "과학자",
    difficulty: 0,
    axis: "profession",
    axisValue: "scientist",
  },
  {
    label: "기업가",
    difficulty: 1,
    axis: "profession",
    axisValue: "entrepreneur",
  },
  {
    label: "한국인",
    difficulty: 2,
    axis: "nationality",
    axisValue: "Korea",
  },
  {
    label: "작가",
    difficulty: 3,
    axis: "profession",
    axisValue: "author",
  },
  {
    label: "일본인",
    difficulty: 2,
    axis: "nationality",
    axisValue: "Japan",
  },
  {
    label: "지휘관",
    difficulty: 1,
    axis: "profession",
    axisValue: "commander",
  },
];

const FIXTURE_GROUPS_EN: GroupDef[] = [
  {
    label: "Scientists",
    difficulty: 0,
    axis: "profession",
    axisValue: "scientist",
  },
  {
    label: "Entrepreneurs",
    difficulty: 1,
    axis: "profession",
    axisValue: "entrepreneur",
  },
  {
    label: "Korean",
    difficulty: 2,
    axis: "nationality",
    axisValue: "Korea",
  },
  {
    label: "Authors",
    difficulty: 3,
    axis: "profession",
    axisValue: "author",
  },
  {
    label: "Japanese",
    difficulty: 2,
    axis: "nationality",
    axisValue: "Japan",
  },
  {
    label: "Commanders",
    difficulty: 1,
    axis: "profession",
    axisValue: "commander",
  },
];

/**
 * 묶음별 인물 — 각 인물은 정확히 한 묶음에만 해당
 *
 * 검증:
 * - 과학자 4명: 아인슈타인(독일), 뉴턴(영국), 파인만(미국), 코페르니쿠스(폴란드)
 *   → 기업가 아님, 한국인 아님, 작가 아님
 * - 기업가 4명: 잡스(미국), 머스크(남아공/미국), 록펠러(미국), 카네기(영국→미국)
 *   → 과학자 아님, 한국인 아님, 작가 아님
 * - 한국인 4명: 세종(지도자), 이순신(지휘관), 정약용(인문학자), 장영실(과학자)
 *   → 기업가 아님, 작가 아님 (정약용은 학자이지 문학 작가 분류 아님)
 * - 작가 4명: 톨스토이(러시아), 빅토르 위고(프랑스), 셰익스피어(영국), 마르케스(콜롬비아)
 *   → 과학자 아님, 기업가 아님, 한국인 아님
 */
const FIXTURE_MEMBERS: GroupItem[][] = [
  // 묶음 0: 과학자
  [
    { id: "einstein", name: "알버트 아인슈타인", avatarUrl: null, groupIndex: 0 },
    { id: "newton", name: "아이작 뉴턴", avatarUrl: null, groupIndex: 0 },
    { id: "feynman", name: "리처드 파인만", avatarUrl: null, groupIndex: 0 },
    { id: "copernicus", name: "니콜라우스 코페르니쿠스", avatarUrl: null, groupIndex: 0 },
  ],
  // 묶음 1: 기업가
  [
    { id: "jobs", name: "스티브 잡스", avatarUrl: null, groupIndex: 1 },
    { id: "musk", name: "일론 머스크", avatarUrl: null, groupIndex: 1 },
    { id: "rockefeller", name: "존 D. 록펠러", avatarUrl: null, groupIndex: 1 },
    { id: "carnegie", name: "앤드류 카네기", avatarUrl: null, groupIndex: 1 },
  ],
  // 묶음 2: 한국인
  [
    { id: "sejong", name: "세종대왕", avatarUrl: null, groupIndex: 2 },
    { id: "yi-sun-sin", name: "이순신", avatarUrl: null, groupIndex: 2 },
    { id: "jeong-yak-yong", name: "정약용", avatarUrl: null, groupIndex: 2 },
    { id: "han-kang", name: "한강", avatarUrl: null, groupIndex: 2 },
  ],
  // 묶음 3: 작가
  [
    { id: "tolstoy", name: "레오 톨스토이", avatarUrl: null, groupIndex: 3 },
    { id: "hugo", name: "빅토르 위고", avatarUrl: null, groupIndex: 3 },
    { id: "shakespeare", name: "윌리엄 셰익스피어", avatarUrl: null, groupIndex: 3 },
    { id: "marquez", name: "가브리엘 가르시아 마르케스", avatarUrl: null, groupIndex: 3 },
  ],
  // 묶음 4: 일본인
  [
    { id: "miyamoto-musashi", name: "미야모토 무사시", avatarUrl: null, groupIndex: 4 },
    { id: "akira-kurosawa", name: "구로사와 아키라", avatarUrl: null, groupIndex: 4 },
    { id: "hayao-miyazaki", name: "미야자키 하야오", avatarUrl: null, groupIndex: 4 },
    { id: "natsume-soseki", name: "나쓰메 소세키", avatarUrl: null, groupIndex: 4 },
  ],
  // 묶음 5: 지휘관
  [
    { id: "napoleon", name: "나폴레옹 보나파르트", avatarUrl: null, groupIndex: 5 },
    { id: "alexander", name: "알렉산더 대왕", avatarUrl: null, groupIndex: 5 },
    { id: "hannibal", name: "한니발 바르카", avatarUrl: null, groupIndex: 5 },
    { id: "julius-caesar", name: "율리우스 카이사르", avatarUrl: null, groupIndex: 5 },
  ],
];

const FIXTURE_MEMBERS_EN: GroupItem[][] = [
  [
    { id: "einstein", name: "Albert Einstein", avatarUrl: null, groupIndex: 0 },
    { id: "newton", name: "Isaac Newton", avatarUrl: null, groupIndex: 0 },
    { id: "feynman", name: "Richard Feynman", avatarUrl: null, groupIndex: 0 },
    { id: "copernicus", name: "Nicolaus Copernicus", avatarUrl: null, groupIndex: 0 },
  ],
  [
    { id: "jobs", name: "Steve Jobs", avatarUrl: null, groupIndex: 1 },
    { id: "musk", name: "Elon Musk", avatarUrl: null, groupIndex: 1 },
    { id: "rockefeller", name: "John D. Rockefeller", avatarUrl: null, groupIndex: 1 },
    { id: "carnegie", name: "Andrew Carnegie", avatarUrl: null, groupIndex: 1 },
  ],
  [
    { id: "sejong", name: "Sejong the Great", avatarUrl: null, groupIndex: 2 },
    { id: "yi-sun-sin", name: "Yi Sun-sin", avatarUrl: null, groupIndex: 2 },
    { id: "jeong-yak-yong", name: "Jeong Yak-yong", avatarUrl: null, groupIndex: 2 },
    { id: "han-kang", name: "Han Kang", avatarUrl: null, groupIndex: 2 },
  ],
  [
    { id: "tolstoy", name: "Leo Tolstoy", avatarUrl: null, groupIndex: 3 },
    { id: "hugo", name: "Victor Hugo", avatarUrl: null, groupIndex: 3 },
    { id: "shakespeare", name: "William Shakespeare", avatarUrl: null, groupIndex: 3 },
    { id: "marquez", name: "Gabriel García Márquez", avatarUrl: null, groupIndex: 3 },
  ],
  [
    { id: "miyamoto-musashi", name: "Miyamoto Musashi", avatarUrl: null, groupIndex: 4 },
    { id: "akira-kurosawa", name: "Akira Kurosawa", avatarUrl: null, groupIndex: 4 },
    { id: "hayao-miyazaki", name: "Hayao Miyazaki", avatarUrl: null, groupIndex: 4 },
    { id: "natsume-soseki", name: "Natsume Soseki", avatarUrl: null, groupIndex: 4 },
  ],
  [
    { id: "napoleon", name: "Napoleon Bonaparte", avatarUrl: null, groupIndex: 5 },
    { id: "alexander", name: "Alexander the Great", avatarUrl: null, groupIndex: 5 },
    { id: "hannibal", name: "Hannibal Barca", avatarUrl: null, groupIndex: 5 },
    { id: "julius-caesar", name: "Julius Caesar", avatarUrl: null, groupIndex: 5 },
  ],
];

export function getFixturePool(locale: string): PuzzlePool {
  const isEn = locale === "en";
  return {
    groups: isEn ? FIXTURE_GROUPS_EN : FIXTURE_GROUPS,
    members: isEn ? FIXTURE_MEMBERS_EN : FIXTURE_MEMBERS,
  };
}

/** 체험 모드인지 여부 (환경값 미설정 시 true) */
export function isFixtureMode(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
