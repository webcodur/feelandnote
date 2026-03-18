/**
 * DevOverlay — 스튜디오 전용 섹션 표시기
 * 현재 프레임이 어느 섹션에 있는지 우측 상단에 표시.
 */
import React from 'react'
import type { BookEntry } from '../types'
import type { Timeline } from '../useTimeline'
import { BRAND_FRAMES, RECAP_FRAMES } from '../timing'

interface Props {
  frame: number
  tl: Timeline
  books: BookEntry[]
}

export const DevOverlay: React.FC<Props> = ({ frame, tl, books }) => {
  const outroEnd = tl.outroStart + tl.outroFrames

  const sections: [number, string, string][] = [
    [tl.brandStart + BRAND_FRAMES, 'BRAND', '로고 + 태그라인'],
    ...(tl.cont ? [
      [tl.returnIntroStart + tl.returnIntroFrames, 'RETURN INTRO', '복귀 인사'] as [number, string, string],
    ] : [
      [tl.svcGreetingStart + tl.svcGreetingFrames, 'GREETING', '인사 + 촛불'] as [number, string, string],
      [tl.svcIntroStart + tl.svcIntroFrames, 'SVC INTRO', '서재탐방 본문'] as [number, string, string],
    ]),
    [tl.fQuoteStart + tl.fQuoteFrames, 'FEATURED QUOTE', '대표 명언'],
    ...(tl.cont ? [
      [tl.prevRecapStart + tl.prevRecapFrames, 'PREV RECAP', '이전 파트 요약'] as [number, string, string],
    ] : [
      [tl.hostIntroStart + tl.celebIntroFrames, 'CELEB INTRO', '나레이터 인물소개'] as [number, string, string],
      [tl.hostIntroStart + tl.hostIntroFrames, 'PHILOSOPHY', '셀럽 감상철학'] as [number, string, string],
    ]),
    [tl.bridgeStart + tl.bridgeFrames, 'BRIDGE', '서재 이동'],
    [tl.recapStart, 'BOOKS', '도서 구간'],
    [tl.recapStart + RECAP_FRAMES, 'RECAP', '리캡'],
    [outroEnd, 'OUTRO', '아웃트로'],
    [Infinity, 'LOGO', '엔딩'],
  ]

  const match = sections.find(([end]) => frame < end)
  let label = match?.[1] ?? '—'
  let sub = match?.[2] ?? ''

  if (label === 'GREETING') sub = '서재 탐방 소개'
  if (label === 'SVC INTRO') sub = '인물 소개'

  // BOOKS 세부 분할
  if (label === 'BOOKS') {
    const bi2 = tl.bookStarts.findIndex((s, i) => frame >= s && frame < s + tl.bookTimings[i].total)
    if (bi2 >= 0) {
      const bLocal = frame - tl.bookStarts[bi2]
      const bt2 = tl.bookTimings[bi2]
      const phase = bLocal >= bt2.contextEnd && bt2.hasQuote ? 'QUOTE'
        : bLocal >= bt2.summaryEnd ? 'CONTEXT'
        : bLocal >= bt2.titleFrames ? 'SUMMARY' : 'TITLE'
      label = `BOOK ${bi2 + 1}/${books.length}`
      sub = `${books[bi2].title} · ${phase}`
    } else {
      label = 'BOOK GAP'
      sub = '전환'
    }
  }

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 999,
      backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 10,
      padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: 'monospace', fontWeight: 700 }}>
        {label}
      </div>
      {sub && <div style={{ color: '#aaa', fontSize: 13, fontFamily: 'monospace' }}>{sub}</div>}
    </div>
  )
}
