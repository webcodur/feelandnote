import React from 'react'
import type { FactionScript } from '../types'
import type { TimedCue } from '../timing'
import { DEFAULT_ACCENT, FONT, TEXT_PAINT } from '../constants'
import { nameHead } from '../utils'

/**
 * 가로 롱폼 전용 진행 표시.
 *  - 하단: 세력색 구간 타임라인. 세력마다 고유색(group.color) 칸으로 화면 폭을 나누고,
 *          현재 재생 위치에 흰 마커가 지나간다. 지나온 칸은 진하게, 남은 칸은 흐리게.
 *  - 우상단: 현재 세력명 + 세력 카운트(예: 02 / 07). 세력이 없는 구간(인트로·시대카드·아웃트로)에선 숨는다.
 *
 * 시간축은 전체 길이(total) 대비 비율로 배치해 영상 진행과 어긋나지 않는다.
 */

type Seg = { gi: number; start: number; end: number }

/** 세력을 보유한 컷(세력카드·화보·인물)을 인접 동일 세력끼리 묶어 구간으로 만든다. */
function buildSegments(cues: TimedCue[]): Seg[] {
  const segs: Seg[] = []
  for (const tc of cues) {
    const c = tc.cue
    const gi = c.kind === 'group' || c.kind === 'cluster' || c.kind === 'person' ? c.groupIndex : -1
    if (gi < 0) continue
    const end = tc.start + tc.duration
    const last = segs[segs.length - 1]
    if (last && last.gi === gi) last.end = end
    else segs.push({ gi, start: tc.start, end })
  }
  return segs
}

const BAR_H = 10
/** 우상단 상태표시줄 화면 여백 */
const CORNER_EDGE = 48

export const FactionProgress: React.FC<{
  script: FactionScript
  cues: TimedCue[]
  frame: number
  total: number
}> = ({ script, cues, frame, total }) => {
  if (total <= 0) return null
  const segs = buildSegments(cues)
  if (!segs.length) return null

  // 현재 프레임이 속한 컷 — 세력·인물 여부·시작 프레임
  let curGi = -1
  let curStart = -1
  let curIsPerson = false
  for (const tc of cues) {
    if (frame >= tc.start && frame < tc.start + tc.duration) {
      const c = tc.cue
      if (c.kind === 'group' || c.kind === 'cluster' || c.kind === 'person') curGi = c.groupIndex
      curIsPerson = c.kind === 'person'
      curStart = tc.start
      break
    }
  }
  // 현재 세력의 인물 컷 목록(등장 순서) — 지금 인물이 이 세력에서 몇 번째인지 / 총 몇 명인지
  const personCuesOfGroup = curGi >= 0
    ? cues.filter(tc => tc.cue.kind === 'person' && tc.cue.groupIndex === curGi)
    : []
  const personTotal = personCuesOfGroup.length
  const personNo = curIsPerson ? personCuesOfGroup.findIndex(tc => tc.start === curStart) + 1 : 0

  // 영상 전체 인물 총원
  const totalPeople = cues.filter(tc => tc.cue.kind === 'person').length

  const progress = Math.min(1, Math.max(0, frame / total))
  const colorOf = (gi: number) => script.groups[gi]?.color ?? DEFAULT_ACCENT
  const pct = (fr: number) => (fr / total) * 100

  return (
    <>
      {/* 하단 세력색 구간 타임라인 — 화면 바닥·좌우 끝까지 꽉 채운다(여백 없음) */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 85, pointerEvents: 'none',
          paddingTop: 60,
          background: 'linear-gradient(to top, rgba(10,10,15,0.85), rgba(10,10,15,0))',
        }}
      >
        {/* 세력명 라벨 — 바 위. 현재 세력은 밝게, 나머지는 흐리게 */}
        <div style={{ position: 'relative', height: 30, marginBottom: 12 }}>
          {segs.map((s, i) => {
            const active = frame >= s.start && frame < s.end
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', left: `${pct(s.start)}%`, width: `${pct(s.end - s.start)}%`,
                  textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  padding: '0 6px', boxSizing: 'border-box',
                  fontFamily: FONT, fontSize: 20, fontWeight: active ? 800 : 600, letterSpacing: 0.5,
                  color: active ? colorOf(s.gi) : 'rgba(245,242,234,0.42)',
                }}
              >
                {nameHead(script.groups[s.gi]?.name)}
              </div>
            )
          })}
        </div>
        {/* 바 트랙 + 세력 칸 + 마커 — 바닥·좌우 끝까지 */}
        <div style={{ position: 'relative', height: BAR_H }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,242,234,0.14)' }} />
          {segs.map((s, i) => {
            const active = frame >= s.start && frame < s.end
            const passed = frame >= s.end
            const c = colorOf(s.gi)
            return (
              <div
                key={i}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${pct(s.start)}%`, width: `${pct(s.end - s.start)}%`,
                  background: c, opacity: active ? 1 : passed ? 0.85 : 0.32,
                  boxShadow: active ? `0 0 14px ${c}` : 'none',
                }}
              />
            )
          })}
          {/* 현재 위치 마커 */}
          <div
            style={{
              position: 'absolute', top: -5, bottom: 0, left: `${progress * 100}%`,
              width: 3, marginLeft: -1.5, background: '#fff',
              boxShadow: '0 0 8px rgba(255,255,255,0.9)',
            }}
          />
        </div>
      </div>

      {/* 우상단 상태표시줄 — 배경 없이 텍스트 + 세로선 구분. 세력명·세력 내 순번 | 전체 총원 */}
      {curGi >= 0 && (
        <div
          style={{
            position: 'absolute', top: 44, right: CORNER_EDGE, zIndex: 86, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: 16,
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: colorOf(curGi), boxShadow: `0 0 10px ${colorOf(curGi)}` }} />
          <span
            style={{
              fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 1, color: colorOf(curGi),
              whiteSpace: 'pre-line', lineHeight: 1.15, textAlign: 'right', ...TEXT_PAINT,
            }}
          >
            {script.statusFullName ? (script.groups[curGi]?.name ?? '') : nameHead(script.groups[curGi]?.name)}
          </span>
          {curIsPerson && personTotal > 0 && (
            <span style={{ fontFamily: FONT, fontSize: 25, fontWeight: 700, letterSpacing: 2, color: '#f5f2ea', ...TEXT_PAINT }}>
              {String(personNo).padStart(2, '0')} / {String(personTotal).padStart(2, '0')}
            </span>
          )}
          {totalPeople > 0 && (
            <>
              {/* 세로선 구분 */}
              <span style={{ width: 2, height: 26, background: 'rgba(245,242,234,0.4)' }} />
              <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, letterSpacing: 1, color: '#f5f2ea', ...TEXT_PAINT }}>
                전체 {totalPeople}명
              </span>
            </>
          )}
        </div>
      )}
    </>
  )
}
