/*
  파일명: components/features/game/hegemony/text/josa.ts
  기능: 한국어 조사 고르기
  책임: 인물 이름·명령 이름 뒤에 받침에 맞는 조사를 붙인다 (소하를·책략을·전투가).
*/

function lastSyllable(word: string): number | null {
  const code = word.trim().charCodeAt(word.trim().length - 1);
  return code >= 0xac00 && code <= 0xd7a3 ? code - 0xac00 : null;
}

/** 받침이 있는가. 한글로 끝나지 않으면(영문·숫자) 받침 없음으로 본다 */
export function hasBatchim(word: string): boolean {
  const s = lastSyllable(word);
  return s !== null && s % 28 !== 0;
}

/** 받침이 ㄹ인가 — '로/으로'에서 ㄹ받침은 '로'를 쓴다 */
function endsWithRieul(word: string): boolean {
  const s = lastSyllable(word);
  return s !== null && s % 28 === 8;
}

export const eulReul = (w: string) => `${w}${hasBatchim(w) ? "을" : "를"}`;
export const iGa = (w: string) => `${w}${hasBatchim(w) ? "이" : "가"}`;
export const eunNeun = (w: string) => `${w}${hasBatchim(w) ? "은" : "는"}`;
export const euro = (w: string) => `${w}${hasBatchim(w) && !endsWithRieul(w) ? "으로" : "로"}`;
