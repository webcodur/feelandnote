import React, { useRef, useState, useLayoutEffect } from 'react'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { FONT } from '../Faction/constants'
import { nameHead } from '../Faction/utils'
import { DEFAULT_COLOR, colorOf, FramePadContext, GuideBar, CardPropsBase } from './shared'
import * as Cards from './cards'
import type { FactionScript } from '../Faction/types'

type CardData = { type: string; groupIndex?: number; personIndex?: number; [key: string]: any }
export type Props = { card: CardData; script: FactionScript; episodeName: string; assetBase?: string }
export type FactionCardSpec = CardData

// Map card types to their component implementations
const CardRenderers: Record<string, React.FC<CardPropsBase>> = {
  groupshot: Cards.GroupshotCard,
  cover: Cards.CoverCard,
  personCover: Cards.PersonCoverCard,
  quote: Cards.QuoteCard,
  dquote: Cards.DQuoteCard,
  hook: Cards.HookCard,
  epithet: Cards.EpithetCard,
  identity: Cards.IdentityCard,
  context: Cards.ContextCard,
  mystery: Cards.MysteryCard,
  timeline: Cards.TimelineCard,
  outro: Cards.OutroCard,
  about: Cards.AboutCard,
  logo: Cards.LogoCard,
  story: Cards.StoryCard,
  map: Cards.MapCard,
  grid: Cards.GridCard,
  number: Cards.NumberCard,
}

const CardBody: React.FC<Props> = (props) => {
  const { card } = props
  const Renderer = CardRenderers[card.type]
  
  if (!Renderer) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#ff0000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
        Unknown Card Type: {card.type}
      </AbsoluteFill>
    )
  }

  return <Renderer {...props} />
}

/** 카드 본체 + 좌상단 시리즈 마크 + 우상단 넘버링 + (지시가 있으면) 하단 안내 구간 */
export const FactionCard: React.FC<Props> = (props) => {
  const { width } = useVideoConfig()
  const r = (n: number): number => (n * width) / 320
  const { card, script } = props
  const gi = 'groupIndex' in card ? card.groupIndex : undefined
  const c = gi != null && script.groups[gi] ? colorOf(script.groups[gi]) : DEFAULT_COLOR
  // 프레임 실측 — 마크·나레이션의 실제 렌더 높이를 재서 본문 예약 폭으로 전달한다(추정 상수 금지).
  // 값이 같으면 setState 를 건너뛰어 무한 재렌더를 막는다.
  const markRef = useRef<HTMLDivElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const [pads, setPads] = useState({ top: 0, bottom: 0 })
  useLayoutEffect(() => {
    const markH = markRef.current?.offsetHeight ?? 0
    const guideH = card.guide ? guideRef.current?.offsetHeight ?? 0 : 0
    const FRAME_GAP = 12
    const next = { top: r(14) + markH + r(FRAME_GAP), bottom: guideH }
    setPads(p => (p.top === next.top && p.bottom === next.bottom ? p : next))
  })
  return (
    <AbsoluteFill>
      <FramePadContext.Provider value={pads}>
        <CardBody {...props} />
      </FramePadContext.Provider>
      {/* 시리즈 마크 — 모든 카드 좌상단 공통(채널 통일감의 뼈대): 세력도감 + 렌즈형 밑줄 + 에피소드 편. 밝은 사진 위 가독용 어두운 받침 */}
      {card.type !== 'groupshot' && (
        <div ref={markRef} style={{
          position: 'absolute', zIndex: 10, top: r(14), left: r(16), fontFamily: FONT,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: `${r(6)}px ${r(12)}px`, borderRadius: r(7),
          background: 'rgba(10,12,16,0.4)', backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: r(12.5), fontWeight: 900, letterSpacing: r(1.5), lineHeight: 1.25, color: '#fff' }}>
            세력도감
          </div>
        </div>
      )}
      {/* 우상단 넘버링은 두지 않는다 — 캐러셀 위치 표시는 각 서비스(인스타 점·틱톡 카운터)가 자체 제공 */}
      {card.guide && <GuideBar text={card.guide} c={c} r={r} innerRef={guideRef} />}
    </AbsoluteFill>
  )
}
