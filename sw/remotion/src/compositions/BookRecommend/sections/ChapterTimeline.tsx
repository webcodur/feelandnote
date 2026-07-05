/**
 * ChapterTimeline — 가로(16:9) 롱폼 하단 챕터 타임라인
 *
 * 전체 영상 길이를 바탕으로 각 책 구간을 연속 스펙트럼 색으로 칠하고,
 * 구간 경계에 눈금을 찍어 진행 위치를 한눈에 보여준다. 화면 좌우 끝까지 채운다.
 * - 책 색은 hue가 점진적으로 흐르는 그라데이션(인접 책끼리 색이 이어짐)
 * - 지나온 구간: 선명 / 현재 재생 구간: 가장 밝게 강조 / 아직 안 온 구간: 흐리게
 * - 오프닝·엔딩(인트로/리캡/아웃트로)은 무채색 띠로 표시
 * - 진행 위치 마커(흰 세로선)가 좌→우로 이동
 * - 세로(portrait) 롱폼에는 별도 진행 바가 있으므로 이 컴포넌트는 가로 전용.
 */
import React from 'react'
import { useCurrentFrame } from 'remotion'
import type { Timeline } from '../useTimeline'
import { LOGO_FRAMES } from '../timing'
import { FONT } from '../fonts'

// 책 색 — amber에서 magenta까지 hue를 균등 분포해 연속 스펙트럼을 만든다
const colorOf = (i: number, n: number) => {
  const hue = 36 + (n <= 1 ? 0 : (i / (n - 1)) * 288) // 36(amber) → 324(magenta)
  return `hsl(${hue}, 44%, 56%)`
}

const NEUTRAL = '#4a4138' // 오프닝·엔딩 무채색 띠

const BAR_H = 40

interface Props {
  tl: Timeline
}

export const ChapterTimeline: React.FC<Props> = ({ tl }) => {
  const frame = useCurrentFrame()
  const totalF = tl.outroStart + tl.outroFrames + LOGO_FRAMES
  if (tl.bookStarts.length === 0 || totalF <= 0) return null

  const progress = Math.min(1, Math.max(0, frame / totalF))
  const pct = (fr: number) => (fr / totalF) * 100
  const n = tl.bookTimings.length

  // 구간 상태별 불투명도
  const opacOf = (start: number, end: number) =>
    frame >= end ? 0.9 : frame >= start ? 1 : 0.28

  const firstBookStart = tl.bookStarts[0]
  const booksEnd = tl.bookStarts[n - 1] + tl.bookTimings[n - 1].total

  // 색 구간 정의 — 오프닝(무채색) → 책들(스펙트럼) → 엔딩(무채색)
  type Seg = { start: number; end: number; color: string; label?: string }
  const segs: Seg[] = []
  if (firstBookStart > 0) segs.push({ start: 0, end: firstBookStart, color: NEUTRAL })
  tl.bookStarts.forEach((bs, i) => {
    segs.push({ start: bs, end: bs + tl.bookTimings[i].total, color: colorOf(i, n), label: String(i + 1) })
  })
  if (booksEnd < totalF) segs.push({ start: booksEnd, end: totalF, color: NEUTRAL })

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 85,
      height: BAR_H + 6, pointerEvents: 'none',
    }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR_H }}>
        {/* 트랙 바닥 — 구간 사이 틈으로 비쳐 눈금 역할 */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(16,12,8,0.92)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.55)',
        }} />

        {/* 색 구간들 — 화면 끝까지 풀블리드, 구간 사이 1px 틈이 눈금 */}
        {segs.map((s, i) => {
          const left = pct(s.start)
          const width = pct(s.end - s.start)
          const opacity = opacOf(s.start, s.end)
          const isCurrent = frame >= s.start && frame < s.end
          return (
            <div key={i} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `calc(${left}% + 1px)`, width: `calc(${width}% - 1px)`,
              background: s.color, opacity,
              boxShadow: isCurrent ? `0 0 12px ${s.color}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.label && width > 1.6 && (
                <span style={{
                  fontFamily: FONT.sans, fontSize: Math.round(BAR_H * 0.72), fontWeight: 800,
                  color: isCurrent ? '#120c03' : 'rgba(18,11,4,0.72)', lineHeight: 1,
                }}>
                  {s.label}
                </span>
              )}
            </div>
          )
        })}

        {/* 진행 위치 마커 */}
        <div style={{
          position: 'absolute', top: -5, bottom: 0, left: `${progress * 100}%`,
          width: 3, marginLeft: -1.5, background: '#fff',
          boxShadow: '0 0 8px rgba(255,255,255,0.9)',
        }} />
      </div>
    </div>
  )
}
