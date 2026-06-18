import React from 'react'
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'
import type { FactionScript, FactionTrack } from './types'
import { f, OUTRO_SEC, buildCues } from './timing'

/** 곡 경계 크로스 구간(초) — 한 곡 끝과 다음 곡 시작에 짧은 페이드를 줘 끊김을 막는다 */
const EDGE_FADE_SEC = 0.6
/** 세력 전환 크로스페이드(초) — 새 곡이 세력 경계보다 이만큼 일찍 들어와 이전 곡과 겹치며 교차한다 */
const CROSS_SEC = 1.2

/**
 * 팩션 배경음악.
 * - 세력별 음원(group.music)이 하나라도 있으면 「세력 단위 모드」: 세력 진입 시 곡을 갈아끼우고(이전 곡 페이드아웃) 구간을 반복 재생으로 채운다.
 * - 없으면 「전역 모드」: tracks를 순서대로 이어 깔고 영상이 더 길면 순환. tracks도 없으면 music 한 곡.
 * - 영상 끝(아웃트로 구간)에서 페이드아웃.
 */
export const FactionBgm: React.FC<{ script: FactionScript; total: number; portrait?: boolean }> = ({ script, total, portrait = false }) => {
  const { fps } = useVideoConfig()

  if (total <= 0) return null

  const outroFadeF = f(OUTRO_SEC)
  const edgeF = Math.round(EDGE_FADE_SEC * fps)

  // ── 세력 단위 모드 ── 하나라도 group.music이 지정되면 세력 전환점에서 곡을 갈아끼운다
  const hasGroupMusic = (script.groups ?? []).some(g => g.music)
  if (hasGroupMusic) {
    const cues = buildCues(script, portrait)
    // 세력별 첫 등장 프레임(등장 순서). intro/outro는 groupIndex가 없어 건너뛴다.
    const starts: { gi: number; start: number }[] = []
    const seen = new Set<number>()
    for (const tc of cues) {
      const gi = (tc.cue as { groupIndex?: number }).groupIndex
      if (gi != null && !seen.has(gi)) { seen.add(gi); starts.push({ gi, start: tc.start }) }
    }
    // 곡 전환 경계 — 미지정 세력은 직전 곡을 이어간다. 첫 곡은 영상 시작(0)부터.
    const fallback = script.music || script.tracks?.[0]?.file
    const segs: { file: string; from: number }[] = []
    let cur: string | undefined
    starts.forEach(({ gi, start }, idx) => {
      const m = script.groups[gi]?.music
      if (idx === 0) {
        cur = m || fallback
        if (cur) segs.push({ file: cur, from: 0 })
      } else if (m && m !== cur) {
        cur = m
        segs.push({ file: m, from: start })
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
          const volume = (lf: number) => {
            const globalF = playFrom + lf
            const fadeIn = isFirst ? 1 : interpolate(lf, [0, crossF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            // 마지막 곡은 다음 곡이 없으니 끝 크로스페이드 없이 아웃트로 페이드만 받는다
            const fadeOut = isLast ? 1 : interpolate(lf, [dur - crossF, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            const outro = interpolate(globalF, [total - outroFadeF, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
            return Math.min(fadeIn, fadeOut, outro)
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
    return (
      <Audio
        src={staticFile(`music/${tracks[0].file}`)}
        volume={fr =>
          interpolate(fr, [total - outroFadeF, total], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        }
      />
    )
  }

  // 순차 + 순환 — total을 채울 때까지 곡을 돌려가며 배치
  const segs: { file: string; from: number; dur: number }[] = []
  let cursor = 0
  let idx = 0
  while (cursor < total) {
    const t = tracks[idx % tracks.length]
    const clipF = Math.round((t.durationSec as number) * fps)
    if (clipF <= 0) break
    segs.push({ file: t.file, from: cursor, dur: Math.min(clipF, total - cursor) })
    cursor += clipF
    idx++
  }

  return (
    <>
      {segs.map((s, i) => {
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
          return Math.min(fadeIn, fadeOut, outro)
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
