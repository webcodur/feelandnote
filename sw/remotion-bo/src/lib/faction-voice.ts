/**
 * 세력도(Faction) 음성 파일명·경로 규칙 — BO 측 정의.
 *
 * sw/remotion/src/compositions/Faction/voice-names.ts(vnPersonQuote)와
 * 렌더 인덱싱(buildCues)의 명명 규칙을 그대로 옮긴다. BO에서 인물 음성 파일명을
 * 계산해 재생·재생성할 수 있게 한다.
 *
 * 핵심 규칙(렌더와 동일):
 *   - solo(무소속 개인군) 세력  → F{gi+1}P{pi+1}-quote.wav        (C 없음)
 *   - 그 외 세력(묶음 유무 무관) → F{gi+1}C{ci+1}P{pi+1}-quote.wav (묶음 없으면 C01)
 *   - personIndex 는 묶음별(또는 묶음 없을 때 세력) 로컬 인덱스다.
 */

/**
 * 인물 대사 음성 파일명. 0패딩으로 정렬 순서 보장.
 * 예: F01P01-quote.wav / 분할 세력 F02C01P03-quote.wav
 *
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/voice-names.ts 의 vnPersonQuote 와 규칙이 100% 일치해야 한다.
 *   워크스페이스 경계상 import 불가라 복제한다. 한쪽을 바꾸면 반드시 다른 쪽도 함께 바꾼다.
 */
export function vnPersonQuote(groupIndex: number, personIndex: number, clusterIndex?: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = clusterIndex != null ? `C${String(clusterIndex + 1).padStart(2, '0')}` : ''
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-quote.wav`
}

/**
 * 세력·묶음·인물 좌표로 음성 파일명을 만든다.
 *
 * @param groupIndex  세력 인덱스 (0-based)
 * @param personIndex 묶음 내(또는 묶음 없을 때 세력 내) 로컬 인물 인덱스 (0-based)
 * @param solo        무소속 개인군 세력 여부 — true면 C 미부착
 * @param clusterIndex 묶음 인덱스 (분할 세력) — 미지정이고 비-solo면 C01(=0)로 정규화
 */
export function factionVoiceFile(
  groupIndex: number,
  personIndex: number,
  solo: boolean,
  clusterIndex?: number,
): string {
  if (solo) return vnPersonQuote(groupIndex, personIndex)
  // 비-solo 세력은 묶음이 없어도 렌더가 단일 묶음(C01)으로 정규화한다.
  return vnPersonQuote(groupIndex, personIndex, clusterIndex ?? 0)
}
