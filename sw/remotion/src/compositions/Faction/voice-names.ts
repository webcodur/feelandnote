/**
 * 세력도(Faction) 음성 파일명·경로 규칙.
 * BookRecommend voice-names의 "정렬 가능한 0패딩 명명"을 참고한다.
 */

/**
 * 인물 대사 음성 파일명 — 세력·(묶음)·인물 인덱스로 유일하게. 0패딩으로 재생 정렬 순서 보장.
 * 예: F01P01-quote.wav / 분할 세력은 F02C01P03-quote.wav
 *
 * ⚠ 동기화 대상: sw/remotion-bo/src/lib/faction-voice.ts 의 vnPersonQuote 와 규칙이 100% 일치해야 한다.
 *   워크스페이스 경계상 import 불가라 복제한다. 한쪽을 바꾸면 반드시 다른 쪽도 함께 바꾼다.
 */
export function vnPersonQuote(groupIndex: number, personIndex: number, clusterIndex?: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = clusterIndex != null ? `C${String(clusterIndex + 1).padStart(2, '0')}` : ''
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-quote.wav`
}

/**
 * 인물 수식어 나레이션 음성 파일명 — 대사(quote)와 같은 자리 규칙, 접미사만 -epithet.
 * 예: F01P01-epithet.wav / 분할 세력은 F02C01P03-epithet.wav.
 * 나레이터가 그 인물의 수식어 한 문장을 낭독한 음원. 없으면 렌더는 글자 수 읽기 추정으로 정지만 한다.
 *
 * ⚠ 동기화 대상: sw/remotion-bo/src/lib/faction-voice.ts 와 규칙이 일치해야 한다(워크스페이스 경계상 복제).
 */
export function vnPersonEpithet(groupIndex: number, personIndex: number, clusterIndex?: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = clusterIndex != null ? `C${String(clusterIndex + 1).padStart(2, '0')}` : ''
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-epithet.wav`
}

/**
 * 음성 파일 상대 경로 (staticFile 기준) — public/factions/<에피소드>/voice/<파일>.
 * locale·engine 분기는 추후 확장(현재는 단일 폴더).
 */
export function voiceRelPath(episodeName: string, file: string): string {
  return `factions/${episodeName}/voice/${file}`
}

/**
 * 음성 파일명 → 발화 시각 맵(voiceTimings) 키. 파일명에서 .wav 확장자만 뗀 stem.
 * data.timing.<locale>.json 생성(faction-align)과 렌더 조회(Faction.tsx)가 이 키를 공유한다.
 */
export function vnTimingKey(file: string): string {
  return file.replace(/\.wav$/i, '')
}

/** dB 게인 → 선형 볼륨 배율 (0dB=1.0) */
export function dbToLinear(db?: number): number {
  return db == null ? 1 : Math.pow(10, db / 20)
}

/** 재생 배속 클램프 — Remotion Audio 허용 범위(0.5~2)로 제한 */
export function clampRate(rate?: number): number {
  return Math.min(2, Math.max(0.5, rate ?? 1))
}
