/**
 * discourse-voice-names.ts — 가상 담화(Discourse) 음성 파일명·경로 규칙 **단일원천(SSoT)**
 *
 * 팩션은 인물 자리(FxxCxxPxx)로 이름을 붙인다. 담화는 인물이 여러 번 말하므로 **발언 자리**로 붙인다.
 *
 * ## 왜 shared 로 올렸나
 *
 * 이 규칙은 26.07.26 이전까지 렌더(`Discourse/voice-names.ts`)와 BO(`remotion-bo/lib/discourse-voice.ts`)에
 * **96줄이 통째로 복제**돼 있었고, 두 파일 머리에 "한쪽을 바꾸면 반드시 다른 쪽도" 라는 경고만 붙어 있었다.
 * 경고는 규칙이 아니다 — 팩션에서 이미 같은 복제가 어긋나 사고가 났다.
 * 그래서 규칙을 여기 한 벌만 두고 렌더·BO 는 재export 만 한다.
 *
 * ## 파일명에 slug 를 함께 넣는 이유
 *
 * 발언을 중간에 삽입·재배치하면 뒤 발언의 번호가 한 칸씩 밀린다. 번호만 쓰면 밀림이 소리로만
 * 드러나지만, 번호와 slug 를 함께 쓰면 `T03-musk.wav` 가 알트만 자리에 놓인 순간 눈으로 잡힌다.
 * 검증 함수(`vnVerify`)가 이 대조를 자동으로 한다.
 *
 * ## 타입은 경량 자체 정의
 *
 * packages/shared 는 sw/remotion 에 역의존할 수 없다(팩션 youtube-faction-meta 와 같은 원칙).
 * 그래서 필요한 필드만 구조적으로 선언한다. 렌더의 `DiscourseScript`·`Speaker`·`Turn` 은
 * 이 형태를 만족하므로 그대로 넘길 수 있다.
 */

/** 파일명 규칙이 인물에게서 필요로 하는 것 — slug 하나뿐 */
export interface VoiceSpeakerLike {
  slug?: string
  disabled?: boolean
}

/** 파일명 규칙이 발언에게서 필요로 하는 것 — 발언자 위치와 제외 여부 */
export interface VoiceTurnLike {
  cast: number
  disabled?: boolean
}

/** 음원 자리 검증이 요구하는 최소 스크립트 형태 */
export interface VoiceScriptLike {
  cast: VoiceSpeakerLike[]
  turns: VoiceTurnLike[]
}

/** slug 가 없는 인물의 파일명 대체 — 이름에서 ASCII 안전 문자열을 못 만들면 자리 번호만 쓴다 */
const FALLBACK = 'unknown'

/** 파일명에 쓸 수 있게 정리 — ASCII 소문자·숫자·하이픈만 */
export function vnSafeSlug(slug?: string): string {
  if (!slug) return FALLBACK
  const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
  return s || FALLBACK
}

/**
 * 발언 음성 파일명 — 발언 자리(1-based, 0패딩) + 발언자 slug.
 * 예: T01-qin-shi-huang.wav, T04-sam-altman.wav
 * 0패딩은 파일 정렬 순서 = 재생 순서를 보장한다(팩션과 동일 원리).
 */
export function vnTurn(turnIndex: number, slug?: string): string {
  return `T${String(turnIndex + 1).padStart(2, '0')}-${vnSafeSlug(slug)}.wav`
}

/**
 * 인물 수식어 낭독 음성 파일명 — 소개 컷에서 나레이터가 읽는다.
 * 발언이 아니라 인물에 붙으므로 cast 자리를 쓴다. 예: C01-qin-shi-huang-epithet.wav
 */
export function vnCastEpithet(castIndex: number, slug?: string): string {
  return `C${String(castIndex + 1).padStart(2, '0')}-${vnSafeSlug(slug)}-epithet.wav`
}

/** 음성 파일 상대 경로 (staticFile 기준) — public/discourses/<에피소드>/voice/<파일> */
export function voiceRelPath(episodeName: string, file: string): string {
  return `discourses/${episodeName}/voice/${file}`
}

/**
 * 음성 파일명 → 발화 시각 맵(voiceTimings) 키. 확장자만 뗀 stem.
 * data.timing.<locale>.json 생성(discourse-align)과 렌더 조회가 이 키를 공유한다.
 */
export function vnTimingKey(file: string): string {
  return file.replace(/\.wav$/i, '')
}

/** dB 게인 → 선형 볼륨 배율 (0dB=1.0) */
export function dbToLinear(db?: number): number {
  return db == null ? 1 : Math.pow(10, db / 20)
}

/** 재생 배속 클램프 — Remotion Audio 허용 범위(0.5~2) */
export function clampRate(rate?: number): number {
  return Math.min(2, Math.max(0.5, rate ?? 1))
}

/** 발언의 음원 파일명 — 발언자를 cast 에서 찾아 slug 를 붙인다 */
export function turnVoiceFile(
  cast: VoiceSpeakerLike[], turns: VoiceTurnLike[], turnIndex: number,
): string {
  return vnTurn(turnIndex, cast[turns[turnIndex]?.cast]?.slug)
}

/**
 * 음원 자리 검증 — 발언 배열과 디스크의 wav 이름이 어긋나는지 잡는다.
 * BO 편집기가 발언을 옮긴 뒤 이 함수로 경고를 띄운다. 렌더는 이 검증을 거치지 않는다(경고 전용).
 *
 * @param actualFiles voice/ 폴더에 실제로 있는 파일명 목록
 * @returns 어긋난 항목 — expected 가 있어야 할 이름, found 는 그 자리에 실제로 있는 이름
 */
export function vnVerify(
  script: VoiceScriptLike,
  actualFiles: string[],
): { turnIndex: number; expected: string; found?: string }[] {
  const have = new Set(actualFiles)
  const issues: { turnIndex: number; expected: string; found?: string }[] = []
  script.turns.forEach((t, i) => {
    if (t.disabled) return
    const expected = vnTurn(i, script.cast[t.cast]?.slug)
    if (have.has(expected)) return
    // 같은 자리 번호의 다른 인물 파일이 있으면 = 발언이 밀렸다는 신호
    const prefix = `T${String(i + 1).padStart(2, '0')}-`
    const found = actualFiles.find(f => f.startsWith(prefix))
    issues.push({ turnIndex: i, expected, found })
  })
  return issues
}
