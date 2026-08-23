/**
 * 세력도감(Faction) 음성 파일명·경로 규칙 — BO 측 정의.
 *
 * sw/remotion/src/compositions/Faction/voice-names.ts(vnPersonQuote)와
 * 렌더 인덱싱(buildCues)의 명명 규칙을 그대로 옮긴다. BO에서 인물 음성 파일명을
 * 계산해 재생·재생성할 수 있게 한다.
 *
 * 핵심 규칙(렌더와 동일):
 *   - 모든 세력(solo 포함) → F{gi+1}C{ci+1}P{pi+1}-quote.wav — 인물은 항상 그룹(clusters) 안에 있으므로 C 자리가 항상 있다.
 *   - personIndex 는 그룹(cluster) 내 로컬 인덱스다.
 */

import type { FactionGroup, FactionNarratorVoice, FactionPerson, FactionScript } from './faction-types'
import { folderToParam } from '@/lib/faction-edit-route'

/**
 * 인물 대사 음성 파일명. 0패딩으로 정렬 순서 보장.
 * 예: F01C01P01-quote.wav
 *
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/voice-names.ts 의 vnPersonQuote 와 규칙이 100% 일치해야 한다.
 *   워크스페이스 경계상 import 불가라 복제한다. 한쪽을 바꾸면 반드시 다른 쪽도 함께 바꾼다.
 */
export function vnPersonQuote(groupIndex: number, personIndex: number, clusterIndex: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = `C${String(clusterIndex + 1).padStart(2, '0')}`
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-quote.wav`
}

/**
 * 인물 수식어 나레이션 음성 파일명 — 대사(quote)와 같은 자리 규칙, 접미사만 -epithet.
 * 예: F01C01P01-epithet.wav.
 *
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/voice-names.ts 의 vnPersonEpithet 와 규칙이 일치해야 한다.
 */
export function vnPersonEpithet(groupIndex: number, personIndex: number, clusterIndex: number): string {
  const g = `F${String(groupIndex + 1).padStart(2, '0')}`
  const c = `C${String(clusterIndex + 1).padStart(2, '0')}`
  const p = `P${String(personIndex + 1).padStart(2, '0')}`
  return `${g}${c}${p}-epithet.wav`
}

/**
 * 나레이터 낭독 음성 파일명 — 세력·인물 좌표 밖의 에피소드 전역 고정명(재배치 rename 무관).
 *  - narrator-logline.wav  시작 화면에서 시작문구 낭독
 *  - narrator-outro.wav    마무리 화면에서 닫는 한마디 낭독
 *  - narrator-intro.wav    나레이터 소개 컷 대사
 *
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/voice-names.ts 와 규칙이 일치해야 한다.
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

/**
 * 서사 항목 덩어리(해설·대사) 음성 파일명 — 인물 좌표(FxxCxxPxx) 밖의 항목이라 화자 + 본문 해시로 명명한다.
 * 예: scene-1k2j3h4.wav. 장면을 옮기거나 순서를 바꿔도 음원이 따라오고, 본문을 고치면
 * 파일명이 달라져 옛 음원이 남아 재생되지 않는다. 같은 말을 다른 인물이 해도 목소리가 달라야 하므로
 * 화자를 해시에 함께 넣는다.
 *
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/voice-names.ts 의 vnSceneBeat 와 규칙이 100% 일치해야 한다.
 */
export function vnSceneBeat(speaker: string | undefined, text: string): string {
  return `scene-${narrationTextKey(`${(speaker ?? '').trim()}\n${text}`)}.wav`
}

/** 제목 기반 안정 키 — 챕터 재배치에는 유지되고 제목 수정 시 옛 음원을 잘못 재생하지 않는다. */
function chapterTitleKey(title: string): string {
  let hash = 0x811c9dc5
  for (const ch of title.trim().replace(/\r\n/g, '\n')) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** 챕터명 낭독 음원. 영문 제목은 다른 키가 되어 KO/EN 파일이 자동 분리된다. */
export function vnChapterTitle(title: string): string {
  return `chapter-${chapterTitleKey(title)}.wav`
}

/** 공용 낭독자가 시작 화면에서 읽을 문장. read* 미지정인 기존 데이터는 시작문구만 읽는다. */
export function factionOpeningReadText(script: FactionScript): string {
  const n = script.narrator
  if (!n) return ''
  return [
    (n.readTitle ?? false) ? script.title : undefined,
    (n.readLogline ?? true) ? script.logline : undefined,
  ].filter((v): v is string => !!v?.trim()).join('\n')
}

const EPITHET_INHERIT_FIELDS = [
  ['epithetSpeaker', 'quoteSpeaker'],
  ['epithetStyle', 'quoteStyle'],
  ['epithetElevenlabsVoiceId', 'quoteElevenlabsVoiceId'],
  ['epithetEleOptions', 'quoteEleOptions'],
  ['epithetEleEmotions', 'quoteEleEmotions'],
  ['epithetEleTrail', 'quoteEleTrail'],
  ['epithetGainDb', 'quoteGainDb'],
  ['epithetPlaybackRate', 'quotePlaybackRate'],
] as const satisfies ReadonlyArray<readonly [keyof FactionPerson, keyof FactionNarratorVoice]>

/** 렌더와 동일하게 공용 낭독 음성 설정을 인물 수식어 슬롯의 빈 필드에만 펼친다. */
export function withCommonEpithetVoice(person: FactionPerson, common?: FactionNarratorVoice): FactionPerson {
  if (!common) return person
  const next = { ...person }
  for (const [epithetKey, commonKey] of EPITHET_INHERIT_FIELDS) {
    if (next[epithetKey] == null && common[commonKey] != null) {
      ;(next as Record<string, unknown>)[epithetKey] = common[commonKey]
    }
  }
  return next
}

const sameValue = (a: unknown, b: unknown): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b)

const COMMON_NARRATION_KEYS = [
  'quoteSpeaker',
  'quoteStyle',
  'quoteElevenlabsVoiceId',
  'quoteEleOptions',
  'quoteEleEmotions',
  'quoteEleTrail',
  'quoteGainDb',
  'quotePlaybackRate',
] as const satisfies ReadonlyArray<keyof FactionNarratorVoice>

/** 챕터 같은 공용 낭독 슬롯에서 공용값과 같은 음성 설정 중복을 제거한다. */
export function stripCommonNarrationVoice(
  voice: FactionNarratorVoice,
  common?: FactionNarratorVoice,
): FactionNarratorVoice {
  if (!common) return voice
  const next = { ...voice }
  for (const key of COMMON_NARRATION_KEYS) {
    if (common[key] != null && sameValue(next[key], common[key])) {
      delete (next as Record<string, unknown>)[key]
    }
  }
  return next
}

/**
 * 편집 패널에 펼쳤던 공용 기본값을 인물 데이터에서 다시 걷어낸다.
 * 공용값과 다른 필드만 인물별 예외로 남아 JSON 중복을 막는다.
 */
export function stripCommonEpithetVoice(person: FactionPerson, common?: FactionNarratorVoice): FactionPerson {
  if (!common) return person
  const next = { ...person }
  for (const [epithetKey, commonKey] of EPITHET_INHERIT_FIELDS) {
    if (common[commonKey] != null && sameValue(next[epithetKey], common[commonKey])) {
      delete (next as Record<string, unknown>)[epithetKey]
    }
  }
  return next
}

/**
 * 세력·그룹·인물 좌표로 음성 파일명을 만든다.
 *
 * @param groupIndex   세력 인덱스 (0-based)
 * @param personIndex  그룹 내 로컬 인물 인덱스 (0-based)
 * @param clusterIndex 그룹 인덱스 (0-based) — 항상 존재(안 나눈 세력·solo 포함 clusters[0])
 */
export function factionVoiceFile(
  groupIndex: number,
  personIndex: number,
  clusterIndex: number,
  kind: 'quote' | 'epithet' = 'quote',
): string {
  const fn = kind === 'epithet' ? vnPersonEpithet : vnPersonQuote
  return fn(groupIndex, personIndex, clusterIndex)
}

/* ───────────────────────────────────────────────────────────────────────────
 * 위치(F·C·P) 기반 음원 재배치 — 세력·묶음·인물을 옮기면 그 자리의 wav 파일명도 함께 옮겨야
 * 옛 음원이 다른 인물 목소리로 새지 않는다. reorder API(/faction-voice/<ep>/reorder)에 넘길
 * rename 목록을 만든다. quote·epithet 두 음원을 모두 포함한다(둘 다 위치 기반).
 * ─────────────────────────────────────────────────────────────────────────── */

/** 음원 재배치 한 쌍 — from 파일명을 to 파일명으로 옮긴다. */
export type FactionRename = { from: string; to: string }

const KINDS = ['quote', 'epithet'] as const

/** 한 세력의 모든 인물 음원 슬롯 — (clusterIndex, personIndex). 항상 clusters 경유. */
function groupSlots(group: FactionGroup): { clusterIndex: number; personIndex: number }[] {
  const slots: { clusterIndex: number; personIndex: number }[] = []
  ;(group.clusters ?? []).forEach((c, ci) => (c.people ?? []).forEach((entry, pi) => {
    if (entry.isPerson !== false) slots.push({ clusterIndex: ci, personIndex: pi })
  }))
  return slots
}

/**
 * 세력 블록 하나를 fromG 자리에서 toG 자리로 옮길 때의 음원 rename 목록(quote+epithet).
 * 세력 내부 구성(그룹·인물 위치)은 그대로라 C·P는 유지되고 F(세력 번호)만 바뀐다.
 */
export function buildGroupMoveRenames(group: FactionGroup, fromG: number, toG: number): FactionRename[] {
  if (fromG === toG) return []
  return groupSlots(group).flatMap(s =>
    KINDS.map(kind => ({
      from: factionVoiceFile(fromG, s.personIndex, s.clusterIndex, kind),
      to: factionVoiceFile(toG, s.personIndex, s.clusterIndex, kind),
    })),
  )
}

/**
 * 한 세력(groupIndex) 안에서 그룹 fromCi 의 인물들을 그룹 toCi 자리로 옮길 때의 rename 목록.
 * (그룹 swap 은 두 방향을 합쳐 넘긴다.) F·P는 유지되고 C(그룹 번호)만 바뀐다.
 */
export function buildClusterMoveRenames(group: FactionGroup, groupIndex: number, fromCi: number, toCi: number): FactionRename[] {
  if (fromCi === toCi) return []
  const people = group.clusters?.[fromCi]?.people ?? []
  return people.flatMap((entry, pi) => entry.isPerson === false ? [] :
    KINDS.map(kind => ({
      from: factionVoiceFile(groupIndex, pi, fromCi, kind),
      to: factionVoiceFile(groupIndex, pi, toCi, kind),
    })),
  )
}

/**
 * 같은 세력·그룹 안에서 인물 pi ↔ pj 음원을 맞바꾸는 rename 목록(quote+epithet 양방향).
 */
export function buildPersonSwapRenames(groupIndex: number, pi: number, pj: number, clusterIndex: number): FactionRename[] {
  return KINDS.flatMap(kind => [
    { from: factionVoiceFile(groupIndex, pi, clusterIndex, kind), to: factionVoiceFile(groupIndex, pj, clusterIndex, kind) },
    { from: factionVoiceFile(groupIndex, pj, clusterIndex, kind), to: factionVoiceFile(groupIndex, pi, clusterIndex, kind) },
  ])
}

/**
 * 한 세력 내의 특정 그룹(fromCi)에서 다른 그룹(toCi)으로, 또는 다른 세력(toGi)의 특정 그룹(toCi)으로
 * 인물을 이동시킬 때의 음원 rename 목록.
 * fromGi/fromCi 의 fromPi 위치 인물을 toGi/toCi 의 맨 끝(toPi)으로 이동하며,
 * fromGi/fromCi 의 fromPi 이후 인물들은 인덱스가 1씩 당겨진다.
 */
export function buildPersonCrossMoveRenames(
  fromGi: number,
  fromCi: number,
  fromPi: number,
  toGi: number,
  toCi: number,
  sourcePeopleCount: number,
  targetPeopleCount: number
): FactionRename[] {
  const renames: FactionRename[] = []

  // 1. 옮기는 사람 (fromGi, fromCi, fromPi) -> (toGi, toCi, targetPeopleCount)
  renames.push(...KINDS.map(kind => ({
    from: factionVoiceFile(fromGi, fromPi, fromCi, kind),
    to: factionVoiceFile(toGi, targetPeopleCount, toCi, kind),
  })))

  // 2. 소스 그룹의 뒤쪽 사람들 당기기 (fromGi, fromCi, fromPi+1 ~ sourcePeopleCount-1)
  for (let i = fromPi + 1; i < sourcePeopleCount; i++) {
    renames.push(...KINDS.map(kind => ({
      from: factionVoiceFile(fromGi, i, fromCi, kind),
      to: factionVoiceFile(fromGi, i - 1, fromCi, kind),
    })))
  }

  return renames
}

/**
 * reorder API 호출 — 디스크 wav + 발화시각(data.timing·2-word-timings) 키를 한꺼번에 안전 재배치한다.
 * 겹치는 from/to(swap)는 서버가 임시명 경유로 처리한다. 없는 파일은 조용히 skip.
 * @returns ok=true 면 성공(또는 옮길 게 없음). 실패 시 error 메시지.
 */
export async function reorderFactionVoice(series: string, episode: string, renames: FactionRename[]): Promise<{ ok: boolean; error?: string }> {
  const valid = renames.filter(r => r.from !== r.to)
  if (valid.length === 0) return { ok: true }
  try {
    const res = await fetch(`/api/${series}/voice/${folderToParam(episode)}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renames: valid }),
    })
    if (!res.ok) return { ok: false, error: `${res.status} ${await res.text().catch(() => '')}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
