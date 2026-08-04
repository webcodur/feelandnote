/*
  파일명: game/redact/types.ts
  기능: 가림 해제 게임 타입·상수
  책임: 게임 로직에서 쓰이는 타입과 규칙 상수를 단일 지점에서 관리한다.
*/

/** 본문에서 가려진 단일 어절 */
export interface RedactToken {
  /** 어절 원문 (정답 대조용) */
  text: string;
  /** 화면에 표시할 정규화된 텍스트 (비교용: 소문자, 특수문자 제거) */
  normalized: string;
  /** 이 어절이 현재 드러났는가 */
  revealed: boolean;
  /** 영구 가림 (이름·별명 등 — 추측 불가) */
  censored: boolean;
  /** 기능어라 처음부터 열린 어절 */
  freebie: boolean;
}

/** 한 번의 추측 기록 */
export interface RedactGuess {
  /** 입력한 단어 */
  word: string;
  /** 본문에서 드러난 어절 수 */
  hits: number;
  /** 추측 순번 (1-based) */
  order: number;
}

/** 게임 단계 */
export type RedactPhase = "lobby" | "playing" | "won" | "lost";

/** 게임 상태 */
export interface RedactGameState {
  phase: RedactPhase;
  tokens: RedactToken[];
  guesses: RedactGuess[];
  /** 정답 인물 이름 */
  answerName: string;
  /** 정답 인물 직군 */
  answerProfession: string;
  /** 정답 인물 국적 */
  answerNationality: string | null;
  /** 정답 인물 생몰년 */
  answerBirthDeath: string;
  /** 아바타 URL */
  answerAvatarUrl: string | null;
  /** 힌트 사용 내역 */
  hintsUsed: Set<string>;
  /** 정체 맞히기 모드 진입 여부 */
  identityGuessMode: boolean;
}

/** 서버에서 내려오는 라운드 데이터 */
export interface RedactRoundData {
  /** 인물 ID */
  celebId: string;
  /** 본문 원문 (이름·별명 가린 상태) */
  text: string;
  /** 인물 이름 (결과 화면용) */
  nickname: string;
  /** 직군 */
  profession: string;
  /** 국적 */
  nationality: string | null;
  /** 생몰년 표시 */
  birthDeath: string;
  /** 아바타 URL */
  avatarUrl: string | null;
  /** 영구 가림된 단어 목록 (이름 토큰들) — 추측 불가 */
  censoredWords: string[];
  /** 체험 표본 여부 */
  isSample: boolean;
}

// ── 규칙 상수 ──

/** 최대 추측 횟수 */
export const REDACT_MAX_GUESSES = 30;

/** 힌트 종류 */
export const REDACT_HINTS = {
  /** 직군 공개 */
  PROFESSION: "profession",
  /** 활동 시대 공개 */
  ERA: "era",
  /** 국적 공개 */
  NATIONALITY: "nationality",
} as const;

/** 기능어 목록 — 이 어절들은 처음부터 열린다 (한국어 조사 단독 출현은 거의 없으므로 접속사·지시어 위주) */
export const KOREAN_FREEBIE_WORDS = new Set([
  "그", "이", "저", "그리고", "하지만", "또한", "그러나", "또", "및",
  "등", "위해", "통해", "대해", "따라", "의해", "있다", "없다", "있다.",
  "없다.", "된다.", "한다.", "것이다.", "이다.", "있으며", "없으며",
]);

/** 1글자 어절은 기본 공개 (조사·접속 단독은 단서 없음) */
export const FREEBIE_MAX_LENGTH = 1;
