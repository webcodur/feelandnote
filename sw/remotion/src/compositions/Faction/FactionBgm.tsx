import React, { useMemo, useCallback } from 'react'
import { Audio, Sequence, Easing, interpolate, staticFile, useVideoConfig } from 'remotion'
import type { FactionScript, FactionTrack, FactionGroup } from './types'
import { f, buildCues, personQuoteEnterSec } from './timing'
import { clampRate } from './voice-names'

/** 음량 배율 정규화 — 미지정이면 1(원음). 0~1.5 로 제한(과증폭 방지) */
const vol01 = (v?: number) => (v == null ? 1 : Math.min(1.5, Math.max(0, v)))

/** 곡 경계 크로스 구간(초) — 한 곡 끝과 다음 곡 시작에 짧은 페이드를 줘 끊김을 막는다 */
const EDGE_FADE_SEC = 0.6
/** 세력 전환 크로스페이드(초) — 새 곡이 세력 경계보다 이만큼 일찍 들어와 이전 곡과 겹치며 교차한다 */
const CROSS_SEC = 1.2
/** 영상 끝 음악 페이드아웃(초) — 마지막 인물 컷에서 화면이 검정으로 잠기는 동안 음악도 함께 감쇠한다 */
const END_FADE_SEC = 2.0

/**
 * 팩션 배경음악.
 * - 세력별 음원(롱폼=group.musicLongform / 쇼츠=group.musicShorts)이 하나라도 있으면 「세력 단위 모드」: 세력 진입 시 곡을 갈아끼우고(이전 곡 페이드아웃) 구간을 반복 재생으로 채운다.
 * - 없으면 「전역 모드」: tracks를 순서대로 이어 깔고 영상이 더 길면 순환. tracks도 없으면 music 한 곡.
 * - 영상 끝(마지막 인물 컷 페이드아웃 구간)에서 함께 페이드아웃.
 */
const FactionBgmInner: React.FC<{ script: FactionScript; total: number; portrait?: boolean; part?: number; lvPart?: number }> = ({ script, total, portrait = false, part, lvPart }) => {
  const { fps } = useVideoConfig()

  // 컷 목록 — 덕킹 구간·세력 전환점 계산이 공유한다. 프레임마다 재계산하지 않게 캐시.
  const cues = useMemo(() => buildCues(script, portrait, part, lvPart), [script, portrait, part, lvPart])

  // ── 대사 덕킹 ── voice 인물 음성 구간엔 BGM을 musicDuckVolume(예 0.4)으로 낮추고 평소엔 원음(1).
  const duck = script.musicDuckVolume != null ? Math.min(1, Math.max(0, script.musicDuckVolume)) : 1
  // 들어갈 때(attack)는 음성 시작 직전에 미리 낮추고, 빠질 때(release)는 더 길게 끌어 부드럽게 복귀.
  const DUCK_ATTACK = Math.round(0.7 * fps)
  const DUCK_RELEASE = Math.round(1.3 * fps)
  // 음성 구간 사이 간격이 이 값 이하로 가까우면 한 덩어리로 묶는다 — 대사가 연달아 나올 때
  // 대사 사이마다 음악이 원음으로 확 올라왔다 다시 내려가는 펌핑(들썩임)을 막는다.
  const DUCK_MERGE_GAP = Math.round(2.6 * fps)
  const duckWindows = useMemo(() => {
    const rawWindows: [number, number][] = []
    if (duck < 1) {
      for (const tc of cues) {
        const c = tc.cue
        // 음성 스텝이 켜진 컷만 BGM 덕킹(음량 낮추기) 대상.
        if (c.kind !== 'person' || !c.steps.voice) continue
        const g = script.groups[c.groupIndex]
        const p = g.clusters?.[c.clusterIndex]?.people[c.personIndex]
        if (!p?.quoteDuration || p.quoteDuration <= 0) continue
        const s = tc.start + f(personQuoteEnterSec(p, c.steps, portrait))
        const playF = f(p.quoteDuration / clampRate(p.quotePlaybackRate))
        rawWindows.push([s, s + playF])
      }
    }
    // 인접 음성 구간 병합 — 시작순 정렬 후 간격이 좁은 것끼리 하나로 합친다.
    rawWindows.sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const w of rawWindows) {
      const last = merged[merged.length - 1]
      if (last && w[0] - last[1] <= DUCK_MERGE_GAP) last[1] = Math.max(last[1], w[1])
      else merged.push([w[0], w[1]])
    }
    return merged
  }, [duck, cues, script, portrait, DUCK_MERGE_GAP])
  // 전역 프레임의 덕킹 배율 — 음성 구간이면 duck, 가장자리 RAMP로 부드럽게.
  // 병합 간격(2.6s) > attack+release(2.0s) 이므로 확장 구간끼리 겹치지 않는다 —
  // 전 구간을 훑지 않고 gf가 속한 구간 하나만 보간한다(Studio가 음량 곡선을 그리며 수만 번 호출해도 가볍게).
  const duckAt = useCallback((gf: number): number => {
    if (duck >= 1 || !duckWindows.length) return 1
    for (const [s, e] of duckWindows) {
      if (gf < s - DUCK_ATTACK) break
      if (gf <= e + DUCK_RELEASE) {
        return interpolate(gf, [s - DUCK_ATTACK, s, e, e + DUCK_RELEASE], [1, duck, duck, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease) })
      }
    }
    return 1
  }, [duck, duckWindows, DUCK_ATTACK, DUCK_RELEASE])

  if (total <= 0) return null

  const outroFadeF = f(END_FADE_SEC)
  const edgeF = Math.round(EDGE_FADE_SEC * fps)

  // ── 세력 단위 모드 ── 세력마다 방향(롱폼/쇼츠)에 맞는 곡을 골라, 세력 전환점에서 갈아끼운다.
  //    롱폼은 musicLongform, 세로 쇼츠는 musicShorts 를 본다. 하나라도 있으면 세력 모드로 진입.
  const groupMusicOf = (g?: FactionGroup) => (portrait ? g?.musicShorts : g?.musicLongform)
  const groupVolOf = (g?: FactionGroup) => (portrait ? g?.musicShortsVolume : g?.musicLongformVolume)
  const hasGroupMusic = (script.groups ?? []).some(g => groupMusicOf(g))
  if (hasGroupMusic) {
    // 세력별 첫 등장 프레임(등장 순서). intro/outro는 groupIndex가 없어 건너뛴다.
    const starts: { gi: number; start: number }[] = []
    const seen = new Set<number>()
    for (const tc of cues) {
      const gi = (tc.cue as { groupIndex?: number }).groupIndex
      if (gi != null && !seen.has(gi)) { seen.add(gi); starts.push({ gi, start: tc.start }) }
    }
    // 곡 전환 경계 — 미지정 세력은 직전 곡을 이어간다. 첫 곡은 영상 시작(0)부터.
    const fallback = script.music || script.tracks?.[0]?.file
    // 곡 음량 우선순위: 세력별 musicVolume → 같은 곡의 전역 tracks volume → 1(원음).
    // 같은 곡이 전역 재생목록에도 등록돼 있으면, BO 전역 곡 음량 슬라이더로 조절한 값이 세력 모드에서도 반영된다.
    const trackVolOf = (file?: string) => (file ? script.tracks?.find(t => t.file === file)?.volume : undefined)
    const segs: { file: string; from: number; vol: number }[] = []
    let cur: string | undefined
    starts.forEach(({ gi, start }, idx) => {
      const m = groupMusicOf(script.groups[gi])
      const gv = groupVolOf(script.groups[gi])
      if (idx === 0) {
        cur = m || fallback
        if (cur) segs.push({ file: cur, from: 0, vol: vol01((m ? gv : undefined) ?? trackVolOf(cur)) })
      } else if (m && m !== cur) {
        cur = m
        segs.push({ file: m, from: start, vol: vol01(gv ?? trackVolOf(m)) })
      }
    })
    if (!segs.length) return null
    const crossF = Math.round(CROSS_SEC * fps)
    return (
      <>
        {segs.map((s, i) => {
          const isFirst = i === 0
          const isLast = i + 1 >= segs.length
          // 새 곡은 세력 경계보다 crossF 일찍 들어와(playFrom) 이전 곡 끝과 겹치며 교차한다.
          // 같은 crossF 구간에서 이전 곡은 페이드아웃, 새 곡은 페이드인 → 진짜 크로스페이드.
          const playFrom = isFirst ? 0 : s.from - crossF
          const end = isLast ? total : segs[i + 1].from
          const dur = end - playFrom
          if (dur <= 0) return null
          const baseVol = s.vol // 곡 음량 배율(세력 musicVolume). 미지정 시 1(원음).
          const volume = (lf: number) => {
            const globalF = playFrom + lf
            const fadeIn = isFirst ? 1 : interpolate(lf, [0, crossF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            // 마지막 곡은 다음 곡이 없으니 끝 크로스페이드 없이 아웃트로 페이드만 받는다
            const fadeOut = isLast ? 1 : interpolate(lf, [dur - crossF, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const outro = interpolate(globalF, [total - outroFadeF, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return Math.min(fadeIn, fadeOut, outro) * baseVol * duckAt(globalF)
          }
          return (
            <Sequence key={i} from={playFrom} durationInFrames={dur}>
              <Audio src={staticFile(`music/${s.file}`)} volume={volume} loop />
            </Sequence>
          )
        })}
      </>
    )
  }

  // ── 전역 모드 ── 재생 목록 정규화 — tracks 우선, 없으면 legacy music 한 곡
  const tracks: FactionTrack[] = script.tracks?.length
    ? script.tracks
    : script.music
      ? [{ file: script.music }]
      : []

  if (!tracks.length) return null

  // 단일 곡이거나 길이 정보가 없는 곡이 섞여 있으면 순차 배치 불가 → 첫 곡 한 장만 전체에 깐다(기존 동작)
  const canSequence = tracks.length > 1 && tracks.every(t => t.durationSec && t.durationSec > 0)
  if (!canSequence) {
    const baseVol = vol01(tracks[0].volume)
    return (
      <Audio
        src={staticFile(`music/${tracks[0].file}`)}
        volume={fr =>
          interpolate(fr, [total - outroFadeF, total], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }) * baseVol * duckAt(fr)
        }
      />
    )
  }

  // 순차 + 순환 — total을 채울 때까지 곡을 돌려가며 배치
  const segs: { file: string; from: number; dur: number; vol: number }[] = []
  let cursor = 0
  let idx = 0
  while (cursor < total) {
    const t = tracks[idx % tracks.length]
    const clipF = Math.round((t.durationSec as number) * fps)
    if (clipF <= 0) break
    segs.push({ file: t.file, from: cursor, dur: Math.min(clipF, total - cursor), vol: vol01(t.volume) })
    cursor += clipF
    idx++
  }

  return (
    <>
      {segs.map((s, i) => {
        const baseVol = s.vol // 곡 음량 배율(트랙 volume). 미지정 시 1(원음).
        const volume = (lf: number) => {
          const globalF = s.from + lf
          // 곡 시작 페이드인(첫 곡 제외), 곡 끝 페이드아웃, 영상 끝 아웃트로 페이드 — 셋 중 가장 낮은 값
          const fadeIn =
            i === 0
              ? 1
              : interpolate(lf, [0, edgeF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const fadeOut = interpolate(lf, [s.dur - edgeF, s.dur], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const outro = interpolate(globalF, [total - outroFadeF, total], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return Math.min(fadeIn, fadeOut, outro) * baseVol * duckAt(globalF)
        }
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.dur}>
            <Audio src={staticFile(`music/${s.file}`)} volume={volume} />
          </Sequence>
        )
      })}
    </>
  )
}

// 부모(Faction)가 useCurrentFrame으로 매 프레임 재렌더되지만, BGM 배치는 프레임과 무관하다.
// memo로 재렌더를 끊어 음량 콜백의 참조를 고정한다(Studio 타임라인 음량 곡선 캐시가 살아난다).
export const FactionBgm = React.memo(FactionBgmInner)
