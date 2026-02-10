import type { CategoryId } from "./categories";

export type ReviewSentiment = "positive" | "negative" | "neutral" | "etc";

export interface ReviewPreset {
  id: string; // "COMMON_01", "BOOK_01" 등
  keyword: string; // "강력 추천"
  description?: string; // 설명을 표시해야 할 경우 사용
  sentiment: ReviewSentiment;
}

export type ReviewPresetCategory = "common" | "positive" | "negative" | "neutral" | CategoryId;

interface PresetGroup {
  label: string;
  presets: ReviewPreset[];
}

// 1. 공통 프리셋
export const COMMON_PRESETS: PresetGroup[] = [
  {
    label: "긍정 계열",
    presets: [
      { id: "POS_01", keyword: "강력 추천", sentiment: "positive" },
      { id: "POS_02", keyword: "재미있어요", sentiment: "positive" },
      { id: "POS_03", keyword: "유익해요", sentiment: "positive" },
      { id: "POS_04", keyword: "감동적이에요", sentiment: "positive" },
      { id: "POS_05", keyword: "잘 만들어짐", sentiment: "positive" },
      { id: "POS_06", keyword: "다시 볼/할 만해요", sentiment: "positive" },
      { id: "POS_07", keyword: "깊이 있는 내용", sentiment: "positive" },
      { id: "POS_08", keyword: "시간 순삭", sentiment: "positive" },
      { id: "POS_09", keyword: "취향 저격", sentiment: "positive" },
      { id: "POS_10", keyword: "몰입감 최고", sentiment: "positive" },
    ],
  },
  {
    label: "부정 계열",
    presets: [
      { id: "NEG_01", keyword: "어려워요", sentiment: "negative" },
      { id: "NEG_02", keyword: "지루해요", sentiment: "negative" },
      { id: "NEG_03", keyword: "실망스러워요", sentiment: "negative" },
      { id: "NEG_04", keyword: "비추천", sentiment: "negative" },
      { id: "NEG_05", keyword: "기대 이해요", sentiment: "negative" },
      { id: "NEG_06", keyword: "집중 안 됨", sentiment: "negative" },
      { id: "NEG_07", keyword: "너무 뻔해요", sentiment: "negative" },
    ],
  },
  {
    label: "중립·기타 계열",
    presets: [
      { id: "NEU_01", keyword: "보통이에요", sentiment: "neutral" },
      { id: "NEU_02", keyword: "생각할 점 많아요", sentiment: "neutral" },
      { id: "NEU_03", keyword: "무난해요", sentiment: "neutral" },
      { id: "NEU_04", keyword: "취향 탈 듯", sentiment: "neutral" },
      { id: "NEU_05", keyword: "킬링타임용", sentiment: "neutral" },
    ],
  },
];

// 2. 카테고리별 특화 프리셋
export const CATEGORY_PRESETS: Record<string, ReviewPreset[]> = {
  book: [
    { id: "BOOK_01", keyword: "페이지 턴너예요", description: "읽는 속도가 빨라서 한 번에 끝냄", sentiment: "positive" },
    { id: "BOOK_02", keyword: "지식 폭발", description: "새로운 지식·통찰이 엄청 많이 얻어짐", sentiment: "positive" },
    { id: "BOOK_03", keyword: "문장 미쳤음", description: "문체·문장이 너무 아름답거나 강렬함", sentiment: "positive" },
    { id: "BOOK_04", keyword: "여운 길어요", description: "읽고 나서 오랫동안 생각하게 됨", sentiment: "positive" },
    { id: "BOOK_05", keyword: "읽기 힘들었음", description: "내용이 너무 어렵거나 무거워서 읽기 고통스러움", sentiment: "negative" },
  ],
  music: [
    { id: "MUSIC_01", keyword: "귀에 착착", description: "멜로디가 너무 잘 박혀서 계속 흥얼거림", sentiment: "positive" },
    { id: "MUSIC_02", keyword: "분위기 업", description: "듣기만 해도 기분 좋아짐·기분 전환 최고", sentiment: "positive" },
    { id: "MUSIC_03", keyword: "중독성 쩔어요", description: "반복 재생 중독됨", sentiment: "positive" },
    { id: "MUSIC_04", keyword: "가사 와닿음", description: "가사가 내 상황·감정과 너무 잘 맞음", sentiment: "positive" },
    { id: "MUSIC_05", keyword: "사운드 퀄 미쳤음", description: "음질·믹싱·프로덕션이 레벨급", sentiment: "positive" },
  ],
  video: [
    { id: "VIDEO_01", keyword: "스토리 충격", description: "반전·플롯 트위스트가 미쳤음", sentiment: "positive" },
    { id: "VIDEO_02", keyword: "시각 만족", description: "영상미·촬영·색감이 너무 예쁨·멋짐", sentiment: "positive" },
    { id: "VIDEO_03", keyword: "웃겨 죽음", description: "진짜 배꼽 빠지게 웃음", sentiment: "positive" },
    { id: "VIDEO_04", keyword: "눈물 버튼", description: "감동·슬픔 폭발해서 울음", sentiment: "neutral" },
    { id: "VIDEO_05", keyword: "편집 레전드", description: "편집·연출·연속성이 미쳤음", sentiment: "positive" },
  ],
  game: [
    { id: "GAME_01", keyword: "중독성 강함", description: "시간 가는 줄 모르고 계속 플레이", sentiment: "positive" },
    { id: "GAME_02", keyword: "멀티 재미", description: "친구·온라인 모드에서 진짜 재밌음", sentiment: "positive" },
    { id: "GAME_03", keyword: "조작감 좋음", description: "컨트롤·조작감이 매우 만족스러움", sentiment: "positive" },
    { id: "GAME_04", keyword: "스토리 몰입", description: "내러티브·세계관에 완전히 빠짐", sentiment: "positive" },
    { id: "GAME_05", keyword: "밸런스 망함", description: "밸런스가 너무 엉망이라 재미 반감", sentiment: "negative" },
  ],
  certificate: [
    { id: "CERT_01", keyword: "합격 가치 높음", description: "취득 후 취업·승진·연봉에 실제로 큰 도움이 됨", sentiment: "positive" },
    { id: "CERT_02", keyword: "실무 바로 써먹음", description: "공부한 내용이 현업에서 바로 적용 가능", sentiment: "positive" },
    { id: "CERT_03", keyword: "공부량 적당", description: "준비 기간·양이 합리적 (직장인 추천)", sentiment: "positive" },
    { id: "CERT_04", keyword: "난이도 적당", description: "예상보다 어렵지 않아서 무난함", sentiment: "neutral" },
    { id: "CERT_05", keyword: "개념 잡기 좋음", description: "이론·기본 개념 이해에 큰 도움 (초보자 추천)", sentiment: "positive" },
    { id: "CERT_06", keyword: "시간 아까움", description: "투자 대비 효율이 너무 떨어짐 (비추천 핵심)", sentiment: "negative" },
    { id: "CERT_07", keyword: "공부 고생 많음", description: "준비 과정이 매우 힘들었음 (공감 유발)", sentiment: "negative" },
    { id: "CERT_08", keyword: "덤프 의존도 높음", description: "기출·덤프 위주로 공부하면 합격 가능", sentiment: "neutral" },
    { id: "CERT_09", keyword: "1트 합격 가능", description: "한 번에 붙을 수 있을 정도로 쉬운 난이도", sentiment: "positive" },
    { id: "CERT_10", keyword: "재도전 의지 생김", description: "떨어졌지만 다시 도전하고 싶어질 만큼 가치 있음", sentiment: "positive" },
  ],
};

// 모든 공통 프리셋을 하나의 배열로 반환
export const getAllCommonPresets = (): ReviewPreset[] => {
  return COMMON_PRESETS.flatMap(group => group.presets);
};

// 특정 카테고리의 프리셋 반환
export const getPresetsByCategory = (category: CategoryId): ReviewPreset[] => {
  return CATEGORY_PRESETS[category] || [];
};

// 모든 프리셋 (공통 + 카테고리 전체)
export const getAllPresets = (): ReviewPreset[] => {
  const common = getAllCommonPresets();
  const category = Object.values(CATEGORY_PRESETS).flat();
  return [...common, ...category];
};

// 키워드로 프리셋 찾기
export const getPresetByKeyword = (keyword: string): ReviewPreset | undefined => {
  const all = getAllPresets();
  return all.find(p => p.keyword === keyword);
};

// 감성별 색상 클래스 반환
export const getSentimentColorClasses = (sentiment?: ReviewSentiment) => {
    switch (sentiment) {
        case "positive":
            return "bg-green-500/10 border-green-500/20 text-green-500";
        case "negative":
            return "bg-red-500/10 border-red-500/20 text-red-500";
        case "neutral":
            return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
        case "etc":
        default:
            return "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";
    }
};
