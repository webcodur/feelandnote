/**
 * 세력도감(Faction) 음성 파일명·경로 규칙.
 * BookRecommend voice-names의 "정렬 가능한 0패딩 명명"을 참고한다.
 */

/**
 * 인물 대사 음성 파일명 — 세력·그룹·인물 인덱스로 유일하게. 0패딩으로 재생 정렬 순서 보장.
 * 인물 컷 cue 에 clusterIndex 가 항상 들어가므로 파일명은 항상 FxxCxxPxx 형태다(solo 세력 포함).
 * 예: F01C01P01-quote.wav. clusterIndex 파라미터가 옵셔널인 것은 시그니처 호환용일 뿐, 렌더·파이프라인은 항상 넘긴다.
 *
 * ⚠ 동기화 대상: sw/web-bo/src/lib/faction-voice.ts 의 vnPersonQuote 와 규칙이 100% 일치해야 한다.
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
 * 대사와 마찬가지로 항상 FxxCxxPxx 형태(예: F01C01P01-epithet.wav, solo 세력 포함).
 * 나레이터가 그 인물의 수식어 한 문장을 낭독한 음원. 없으면 렌더는 글자 수 읽기 추정으로 정지만 한다.
 *
 * ⚠ 동기화 대상: sw/web-bo/src/lib/faction-voice.ts 와 규칙이 일치해야 한다(워크스페이스 경계상 복제).
 */
export function vnPersonEpithet(groupIndex: number, personIndex: number, clusterIndex?: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = clusterIndex != null ? `C${String(clusterIndex + 1).padStart(2, '0')}` : ''
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-epithet.wav`
}

/**
 * 나레이터 낭독 음성 파일명 — 나레이터는 세력·인물 좌표(FxxCxxPxx) 밖의 에피소드 전역 엔티티라 고정명을 쓴다.
 * 인물 이동·세력 재배치 rename 대상에서도 제외된다. 낭독 자리별 세 파일:
 *  - narrator-logline.wav  시작 화면에서 시작문구 낭독
 *  - narrator-outro.wav    마무리 화면에서 닫는 한마디 낭독
 *  - narrator-intro.wav    나레이터 소개 컷 대사
 *
 * ⚠ 동기화 대상: sw/web-bo/src/lib/faction-voice.ts 와 규칙이 일치해야 한다(워크스페이스 경계상 복제).
 */
export function vnNarratorLogline(): string {
  return 'narrator-logline.wav'
}
export function vnNarratorOutro(): string {
  return 'narrator-outro.wav'
}
export function vnNarratorIntro(): string {
  return 'narrator-intro.wav'
}

/** 본문 기반 안정 키 — 항목을 재배치해도 음성이 다른 항목으로 바뀌지 않고, 본문 수정 시 옛 음원을 재생하지 않는다. */
function narrationTextKey(text: string): string {
  let hash = 0x811c9dc5
  for (const ch of text.trim().replace(/\r\n/g, '\n')) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** 챕터명 낭독 음원. 언어별 제목이 다르면 파일도 자동 분리된다. */
export function vnChapterTitle(title: string): string {
  return `chapter-${narrationTextKey(title)}.wav`
}

/**
 * 서사 항목 덩어리(해설·대사) 음원 — 인물 좌표(FxxCxxPxx) 밖의 항목이라 챕터와 같은 본문 해시 명명을 쓴다.
 * 장면을 세력 사이에서 옮기거나 순서를 바꿔도 음원이 따라오고, 본문을 고치면 파일명이 달라져
 * 옛 음원이 남아 재생되는 일이 없다. 언어별 본문이 다르면 파일도 자동 분리된다.
 *
 * 화자를 해시에 함께 넣는다 — 같은 말을 다른 인물이 해도 목소리가 달라야 하므로 음원이 갈려야 한다.
 *
 * ⚠ 동기화 대상: sw/web-bo/src/lib/faction-voice.ts 의 vnSceneBeat 와 규칙이 100% 일치해야 한다.
 *   워크스페이스 경계상 import 불가라 복제한다. 한쪽을 바꾸면 반드시 다른 쪽도 함께 바꾼다.
 */
export function vnSceneBeat(speaker: string | undefined, text: string): string {
  // 합성기는 화면 조판용 줄바꿈·빈 줄을 한 흐름으로 펴서 읽는다. 파일 신원도 실제 발화문을
  // 따라야 줄바꿈이나 화면 전환만 고쳤을 때 이미 만든 음원이 사라지지 않는다.
  const spokenText = text.replace(/\s+/g, ' ').trim()
  return `scene-${narrationTextKey(`${(speaker ?? '').trim()}\n${spokenText}`)}.wav`
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
