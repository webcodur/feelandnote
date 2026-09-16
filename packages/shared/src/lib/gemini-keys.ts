/**
 * gemini-keys.ts — Google 무료 API 키 풀 규약 (단일 원천)
 *
 * env 규약: GOOGLE_GENAI_API_KEY_FREE<n> (연번, 상한 없음, 숫자 오름차순 로테이션).
 * AIza(Standard, legacy) 형식과 AQ.(Auth, 신규) 형식을 함께 받는다 — 형식으로 거르지 않는다.
 * 빈 번호가 있어도 된다(현재 FREE11~19 비어 있음). 고정 슬롯 스캔을 쓰지 않으므로
 * 번호를 늘려도 코드 수정이 필요 없다.
 * 계정 × 프로젝트로 발급한 무료 키만 둔다 — 결제 계정이 붙은 GCP 프로젝트 키 금지
 * (AGENTS.md 전역 불변사항). 유료 Gemini·Vertex·Cloud TTS 경로는 만들지 않는다.
 *
 * 로그의 keyIndex(1-based)는 아래 정렬 배열에서의 위치이며 변수 번호와 다를 수 있다.
 * 무효 키를 찾을 때는 googleFreeKeyName(keyIndex)으로 변수명을 확인한다.
 *
 * 소비자: remotion 합성 스크립트(voice/lib/gemini-engine.ts), web-bo 미리듣기 라우트
 * (lib/gemini-tts.ts), web 읽기 TTS 라우트(api/tts/route.ts).
 */

const FREE_KEY_PATTERN = /^GOOGLE_GENAI_API_KEY_FREE(\d+)$/

/** FREE 키의 [변수명, 값] — 변수 번호 오름차순 정렬. */
function sortedFreeEntries(): Array<[string, string]> {
  return Object.entries(process.env)
    .filter((entry): entry is [string, string] => {
      const [key, value] = entry
      return FREE_KEY_PATTERN.test(key) && typeof value === 'string' && value.length > 0
    })
    .sort(([a], [b]) => parseInt(a.match(/\d+$/)![0], 10) - parseInt(b.match(/\d+$/)![0], 10))
}

/** 등록된 무료 키의 변수명 목록 — 숫자 오름차순. */
export function googleFreeKeyNames(): string[] {
  return sortedFreeEntries().map(([name]) => name)
}

/** 등록된 무료 키 목록 — 빈 배열이면 키 미설정. */
export function googleFreeApiKeys(): string[] {
  return sortedFreeEntries().map(([, value]) => value)
}

/** 1-based 순번 → 변수명. 로그의 keyIndex를 변수명으로 되짚을 때 쓴다. */
export function googleFreeKeyName(index1Based: number): string | undefined {
  return googleFreeKeyNames()[index1Based - 1]
}
