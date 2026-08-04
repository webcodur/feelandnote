/*
  파일명: game/redact/engine.ts
  기능: 가림 해제 게임 — 토큰화·추측 처리·힌트 로직
  책임:
    1. 본문을 어절 단위로 분할하여 토큰 배열 생성
    2. 기능어(조사 단독·1글자)를 처음부터 공개 처리
    3. 추측 단어를 본문 전역에서 매칭 (정규화 비교)
    4. 힌트 제공

  🔴 한국어 단위 판단:
    한국어는 영어와 달리 조사가 단어에 붙는다. Redactle 방식(단어 단위)을 그대로 옮기면
    "의", "을", "에서" 같은 조사만 맞히다 끝난다.
    →  **어절(공백 기준 분할) 단위를 채택한다.**
    근거: 한국어 텍스트의 최소 의미 단위는 "체언+조사" 또는 "용언+어미"가 결합된 어절이다.
    형태소 분석기 없이도 공백 기준 분할은 일관되고, 유저가 "뉴턴", "물리학자" 같은
    내용어를 추측하면 해당 어절 전체가 드러나는 직관적 흐름을 만든다.
    단, 어절 내의 핵심 어근과 비교할 때는 조사·어미를 제거한 정규화를 적용한다.
*/

import {
  KOREAN_FREEBIE_WORDS,
  FREEBIE_MAX_LENGTH,
  REDACT_HINTS,
  type RedactToken,
  type RedactRoundData,
} from './types';

// ── 정규화 ──

/** 끝에 붙는 흔한 한국어 조사·어미를 제거 (추측 매칭용) */
const KOREAN_SUFFIX_PATTERN = /(?:이다|였다|이며|으로|에서|에게|까지|부터|처럼|만큼|라는|이라|으로서|라고|한다|했다|된다|였으며|이고|이자|에는|과는|와는|로는|서는)[.,:;!?…]*$/;

/** 특수문자·마침표 등 제거, 소문자화 */
function normalize(word: string): string {
  // 기본 정규화: 소문자, 양끝 특수문자 제거
  const norm = word.toLowerCase().replace(/^[^가-힣ㄱ-ㅎa-z0-9]+|[^가-힣ㄱ-ㅎa-z0-9]+$/g, '');
  return norm;
}

/** 추측용 정규화 — 조사 제거까지 적용 */
function normalizeForGuess(word: string): string {
  let norm = normalize(word);
  // 한국어 접미사 제거
  norm = norm.replace(KOREAN_SUFFIX_PATTERN, '');
  return norm;
}

/** 어절의 핵심 어근 추출 (매칭에 사용) */
function extractStem(token: string): string {
  return normalizeForGuess(token);
}

// ── 토큰화 ──

/** 본문을 어절 단위로 분할하여 토큰 배열 생성 */
export function tokenize(text: string, censoredWords: string[]): RedactToken[] {
  // 공백 기준 분할
  const rawWords = text.split(/\s+/).filter(Boolean);
  const censoredNorms = new Set(censoredWords.map((w) => normalize(w)));

  return rawWords.map((word) => {
    const norm = normalize(word);
    const isCensored = censoredNorms.has(norm) || word.includes('■■■');
    const isFreebie = !isCensored && (
      word.length <= FREEBIE_MAX_LENGTH ||
      KOREAN_FREEBIE_WORDS.has(norm)
    );

    return {
      text: word,
      normalized: norm,
      revealed: isFreebie, // 기능어는 처음부터 공개
      censored: isCensored,
      freebie: isFreebie,
    };
  });
}

// ── 추측 처리 ──

/**
 * 유저의 추측을 처리한다.
 * 매칭 전략: 입력 단어의 정규화된 형태가 어절의 어근(stem)에 **포함**되면 hit.
 * "물리" 를 치면 "물리학자이자" 도 드러난다.
 *
 * 최소 입력 길이: 2글자 (1글자 추측은 무의미)
 */
export function processGuess(
  guessWord: string,
  tokens: RedactToken[]
): { updatedTokens: RedactToken[]; hits: number } {
  const guessNorm = normalizeForGuess(guessWord);
  if (guessNorm.length < 2) {
    return { updatedTokens: tokens, hits: 0 };
  }

  let hits = 0;
  const updatedTokens = tokens.map((token) => {
    if (token.revealed || token.censored) return token;

    const stem = extractStem(token.text);
    // 매칭: 정규화된 추측이 어절 어근에 포함되는지
    const matched = stem.includes(guessNorm) || guessNorm.includes(stem);
    // 또는 원문의 정규화와 완전 일치
    const exactMatch = token.normalized === guessNorm;

    if (matched || exactMatch) {
      hits++;
      return { ...token, revealed: true };
    }
    return token;
  });

  return { updatedTokens, hits };
}

// ── 통계 ──

/** 현재 공개된 토큰 비율 (0~1) */
export function getRevealedRatio(tokens: RedactToken[]): number {
  const total = tokens.filter((t) => !t.censored).length;
  if (total === 0) return 1;
  const revealed = tokens.filter((t) => t.revealed && !t.censored).length;
  return revealed / total;
}

/** 아직 숨겨진 토큰 수 */
export function getHiddenCount(tokens: RedactToken[]): number {
  return tokens.filter((t) => !t.revealed && !t.censored).length;
}

// ── 힌트 ──

export type HintType = typeof REDACT_HINTS[keyof typeof REDACT_HINTS];

export interface HintResult {
  type: HintType;
  value: string;
}

/** 힌트를 반환한다 */
export function getHint(
  hintType: HintType,
  roundData: RedactRoundData
): HintResult {
  switch (hintType) {
    case REDACT_HINTS.PROFESSION:
      return { type: hintType, value: roundData.profession };
    case REDACT_HINTS.ERA:
      return { type: hintType, value: roundData.birthDeath };
    case REDACT_HINTS.NATIONALITY:
      return { type: hintType, value: roundData.nationality ?? '?' };
    default:
      return { type: hintType, value: '?' };
  }
}
